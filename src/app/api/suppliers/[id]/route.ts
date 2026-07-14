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

    const supplier = await prisma.supplier.findUnique({
      where: { id },
      include: {
        purchaseInvoices: {
          orderBy: { date: 'desc' }
        },
        quotations: {
          orderBy: { date: 'desc' }
        },
        payments: {
          orderBy: { date: 'desc' }
        }
      }
    });

    if (!supplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
    }

    // Build chronological ledger
    const ledger: any[] = [];
    
    // Add purchase invoices
    supplier.purchaseInvoices.forEach(inv => {
      ledger.push({
        id: inv.id,
        date: inv.date,
        type: 'PURCHASE',
        reference: inv.invoiceNo,
        description: `Purchase Invoice: ${inv.invoiceNo}`,
        amount: inv.totalAmount, // Increases payables
        effect: 'INCREASE'
      });
    });

    // Add payments
    supplier.payments.forEach(pay => {
      ledger.push({
        id: pay.id,
        date: pay.date,
        type: 'PAYMENT',
        reference: pay.id.substring(0, 8),
        description: `Payment: ${pay.method} ${pay.notes ? `- ${pay.notes}` : ''}`,
        amount: pay.amount, // Decreases payables
        effect: 'DECREASE'
      });
    });

    // Sort by date chronological (oldest first)
    ledger.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Calculate running balance
    let runningBalance = 0;
    const ledgerWithBalance = ledger.map(item => {
      if (item.effect === 'INCREASE') {
        runningBalance += item.amount;
      } else {
        runningBalance -= item.amount;
      }
      return { ...item, runningBalance };
    }).reverse(); // Return newest first for display

    return NextResponse.json({ 
      success: true, 
      supplier: {
        id: supplier.id,
        name: supplier.name,
        phone: supplier.phone,
        address: supplier.address,
        notes: supplier.notes,
        balance: supplier.balance
      },
      quotations: supplier.quotations,
      ledger: ledgerWithBalance
    });
  } catch (error: any) {
    console.error('Error fetching supplier details:', error);
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
    const { name, phone, address, notes, balance } = await req.json();

    const existingSupplier = await prisma.supplier.findUnique({ where: { id } });
    if (!existingSupplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
    }

    const updatedSupplier = await prisma.supplier.update({
      where: { id },
      data: {
        name: name !== undefined ? name.trim() : existingSupplier.name,
        phone: phone !== undefined ? phone.trim() : existingSupplier.phone,
        address: address !== undefined ? address?.trim() || null : existingSupplier.address,
        notes: notes !== undefined ? notes?.trim() || null : existingSupplier.notes,
        balance: balance !== undefined ? parseFloat(balance) : existingSupplier.balance,
      }
    });

    await prisma.auditLog.create({
      data: {
        type: 'SYSTEM',
        details: `Supplier '${updatedSupplier.name}' details updated.`
      }
    });

    return NextResponse.json({ success: true, supplier: updatedSupplier });
  } catch (error) {
    console.error('Error updating supplier:', error);
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

    const supplier = await prisma.supplier.findUnique({
      where: { id },
      include: {
        _count: {
          select: { purchaseInvoices: true }
        }
      }
    });

    if (!supplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
    }

    if (supplier._count.purchaseInvoices > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete supplier because purchase invoices are attached. Delete those invoices first.' 
      }, { status: 400 });
    }

    await prisma.supplier.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        type: 'SYSTEM',
        details: `Supplier '${supplier.name}' deleted.`
      }
    });

    return NextResponse.json({ success: true, message: 'Supplier deleted successfully' });
  } catch (error) {
    console.error('Error deleting supplier:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
