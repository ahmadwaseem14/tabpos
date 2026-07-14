import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getTokenFromRequest, getUserFromToken } from '@/lib/auth';

async function isAuthenticated(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return false;
  const user = getUserFromToken(token);
  return !!user;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!await isAuthenticated(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const shopkeeper = await prisma.shopkeeper.findUnique({
      where: { id },
      include: {
        saleInvoices: {
          orderBy: { date: 'desc' }
        },
        payments: {
          orderBy: { date: 'desc' }
        },
        tabletInstances: {
          where: { status: 'AVAILABLE' },
          include: { model: true }
        }
      }
    });

    if (!shopkeeper) {
      return NextResponse.json({ error: 'Shopkeeper not found' }, { status: 404 });
    }

    // Compile Ledger
    const ledger: any[] = [];

    // Add Sales Invoices (increases their outstanding balance)
    shopkeeper.saleInvoices.forEach(inv => {
      ledger.push({
        id: inv.id,
        date: inv.date,
        type: 'SALE',
        reference: inv.invoiceNo,
        description: `Sales Invoice: ${inv.invoiceNo}`,
        amount: inv.totalAmount, // Increases what they owe
        effect: 'INCREASE'
      });
    });

    // Add Payments received from them (decreases their outstanding balance)
    shopkeeper.payments.forEach(pay => {
      ledger.push({
        id: pay.id,
        date: pay.date,
        type: 'PAYMENT',
        reference: pay.id.substring(0, 8),
        description: `Payment Received: ${pay.method} ${pay.notes ? `- ${pay.notes}` : ''}`,
        amount: pay.amount, // Decreases what they owe
        effect: 'DECREASE'
      });
    });

    // Sort chronologically (oldest first) to calculate running balance
    ledger.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let runningBalance = 0;
    const ledgerWithBalance = ledger.map(item => {
      if (item.effect === 'INCREASE') {
        runningBalance += item.amount;
      } else {
        runningBalance -= item.amount;
      }
      return { ...item, runningBalance };
    }).reverse(); // Return newest first for UI display

    return NextResponse.json({
      success: true,
      shopkeeper: {
        id: shopkeeper.id,
        name: shopkeeper.name,
        phone: shopkeeper.phone,
        address: shopkeeper.address,
        shopName: shopkeeper.shopName,
        creditLimit: shopkeeper.creditLimit,
        balance: shopkeeper.balance,
        isOwnShop: shopkeeper.isOwnShop,
        notes: shopkeeper.notes
      },
      inventory: shopkeeper.tabletInstances.map(inst => ({
        imei: inst.imei,
        serialNumber: inst.serialNumber,
        brand: inst.model.brand,
        model: inst.model.model,
        ram: inst.model.ram,
        storage: inst.model.storage,
        color: inst.model.color,
        purchasePrice: inst.purchasePrice,
        qcStatus: inst.qcStatus,
        dateSupplied: inst.updatedAt
      })),
      ledger: ledgerWithBalance
    });
  } catch (error) {
    console.error('Error fetching shopkeeper details:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!await isAuthenticated(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { name, phone, address, shopName, creditLimit, balance, notes } = await req.json();

    const existingShopkeeper = await prisma.shopkeeper.findUnique({ where: { id } });
    if (!existingShopkeeper) {
      return NextResponse.json({ error: 'Shopkeeper not found' }, { status: 404 });
    }

    // Verify shop name unique if changed
    if (shopName && shopName.trim() !== existingShopkeeper.shopName) {
      const dup = await prisma.shopkeeper.findUnique({
        where: { shopName: shopName.trim() }
      });
      if (dup) {
        return NextResponse.json({ error: `Shop name '${shopName}' is already registered.` }, { status: 400 });
      }
    }

    const updated = await prisma.shopkeeper.update({
      where: { id },
      data: {
        name: name !== undefined ? name.trim() : existingShopkeeper.name,
        phone: phone !== undefined ? phone.trim() : existingShopkeeper.phone,
        address: address !== undefined ? address?.trim() || null : existingShopkeeper.address,
        shopName: shopName !== undefined ? shopName.trim() : existingShopkeeper.shopName,
        creditLimit: creditLimit !== undefined ? parseFloat(creditLimit) : existingShopkeeper.creditLimit,
        balance: balance !== undefined ? parseFloat(balance) : existingShopkeeper.balance,
        notes: notes !== undefined ? notes?.trim() || null : existingShopkeeper.notes
      }
    });

    await prisma.auditLog.create({
      data: {
        type: 'SYSTEM',
        details: `Shopkeeper '${updated.name}' details updated.`
      }
    });

    return NextResponse.json({ success: true, shopkeeper: updated });
  } catch (error) {
    console.error('Error updating shopkeeper:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!await isAuthenticated(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const shopkeeper = await prisma.shopkeeper.findUnique({
      where: { id },
      include: {
        _count: {
          select: { saleInvoices: true, tabletInstances: true }
        }
      }
    });

    if (!shopkeeper) {
      return NextResponse.json({ error: 'Shopkeeper not found' }, { status: 404 });
    }

    if (shopkeeper.isOwnShop) {
      return NextResponse.json({ error: 'Cannot delete the internal Own Shop store.' }, { status: 400 });
    }

    if (shopkeeper._count.saleInvoices > 0 || shopkeeper._count.tabletInstances > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete shopkeeper because they have transaction history or active inventory. Clear inventory and delete invoices first.' 
      }, { status: 400 });
    }

    await prisma.shopkeeper.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        type: 'SYSTEM',
        details: `Shopkeeper '${shopkeeper.name}' (${shopkeeper.shopName}) deleted.`
      }
    });

    return NextResponse.json({ success: true, message: 'Shopkeeper deleted successfully' });
  } catch (error) {
    console.error('Error deleting shopkeeper:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
