import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getTokenFromRequest, getUserFromToken } from '@/lib/auth';

async function isAuthenticated(req: NextRequest) {
  const token = getTokenFromRequest(req);
  return token ? !!getUserFromToken(token) : false;
}

function generateSaleNo() {
  const now = new Date();
  const yy = now.getFullYear().toString().slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `INV-${yy}${mm}${dd}-${rand}`;
}

export async function GET(req: NextRequest) {
  try {
    if (!await isAuthenticated(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const invoices = await prisma.saleInvoice.findMany({
      orderBy: { date: 'desc' },
      take: 200,
      include: {
        shopkeeper: { select: { shopName: true, isOwnShop: true } },
        _count: { select: { tablets: true } }
      }
    });

    return NextResponse.json({ success: true, invoices });
  } catch (error) {
    console.error('Sales fetch error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!await isAuthenticated(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { shopkeeperId, tablets, tax, discount, paymentReceived, paymentMethod, notes } = await req.json();

    if (!shopkeeperId || !tablets || !tablets.length) {
      return NextResponse.json({ error: 'Shopkeeper and at least one tablet are required.' }, { status: 400 });
    }

    // Validate tablets
    const imeis = tablets.map((t: any) => t.imei);
    const dbTablets = await prisma.tabletInstance.findMany({ where: { imei: { in: imeis } } });

    if (dbTablets.length !== imeis.length) {
      return NextResponse.json({ error: 'One or more tablets not found.' }, { status: 400 });
    }

    const notAvailable = dbTablets.filter(t => t.status !== 'AVAILABLE');
    if (notAvailable.length) {
      return NextResponse.json({ error: `Not available for sale: ${notAvailable.map(t => t.imei).join(', ')}` }, { status: 400 });
    }

    const totalAmount = tablets.reduce((s: number, t: any) => s + t.sellingPrice, 0) + (tax || 0) - (discount || 0);
    const totalCost = dbTablets.reduce((s, t) => s + t.purchasePrice, 0);
    const ownerProfit = totalAmount - totalCost;
    const balanceDue = totalAmount - (paymentReceived || 0);

    // Create sale invoice
    const invoice = await prisma.saleInvoice.create({
      data: {
        invoiceNo: generateSaleNo(),
        shopkeeperId,
        totalAmount,
        totalCost,
        ownerProfit,
        tax: tax || 0,
        discount: discount || 0,
        paymentReceived: paymentReceived || 0,
        balanceDue,
        paymentMethod: paymentMethod || 'CASH',
        notes: notes || null,
        tablets: {
          connect: imeis.map((imei: string) => ({ imei }))
        }
      }
    });

    // Mark tablets as SOLD and update selling prices
    for (const t of tablets) {
      await prisma.tabletInstance.update({
        where: { imei: t.imei },
        data: {
          status: 'SOLD',
          sellingPrice: t.sellingPrice,
          saleInvoiceId: invoice.id
        }
      });
    }

    // Update shopkeeper balance if there's remaining balance
    if (balanceDue > 0) {
      await prisma.shopkeeper.update({
        where: { id: shopkeeperId },
        data: { balance: { increment: balanceDue } }
      });
    }

    return NextResponse.json({ success: true, invoiceId: invoice.id, invoiceNo: invoice.invoiceNo, totalAmount, ownerProfit });
  } catch (error) {
    console.error('Sale create error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
