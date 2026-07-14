import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getTokenFromRequest, getUserFromToken } from '@/lib/auth';

async function isAuthenticated(req: NextRequest) {
  const token = getTokenFromRequest(req);
  return token ? !!getUserFromToken(token) : false;
}

export async function GET(req: NextRequest) {
  try {
    if (!await isAuthenticated(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payments = await prisma.payment.findMany({
      orderBy: { date: 'desc' },
      take: 200,
      include: {
        supplier: { select: { name: true } },
        shopkeeper: { select: { shopName: true } }
      }
    });

    return NextResponse.json({ success: true, payments });
  } catch (error) {
    console.error('Payments fetch error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!await isAuthenticated(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { type, supplierId, shopkeeperId, amount, method, notes } = await req.json();

    if (!type || !amount || amount <= 0) {
      return NextResponse.json({ error: 'Type and valid amount are required.' }, { status: 400 });
    }

    const payment = await prisma.payment.create({
      data: {
        type,
        supplierId: supplierId || null,
        shopkeeperId: shopkeeperId || null,
        amount,
        method: method || 'CASH',
        notes: notes || null
      }
    });

    // Update supplier/shopkeeper balance
    if (type === 'TO_SUPPLIER' && supplierId) {
      // Reducing what we owe the supplier (credit their payment)
      await prisma.supplier.update({
        where: { id: supplierId },
        data: { balance: { decrement: amount } }
      });
    } else if (type === 'FROM_SHOPKEEPER' && shopkeeperId) {
      // Reducing shopkeeper balance (they paid us)
      await prisma.shopkeeper.update({
        where: { id: shopkeeperId },
        data: { balance: { decrement: amount } }
      });
    }

    return NextResponse.json({ success: true, paymentId: payment.id });
  } catch (error) {
    console.error('Payment create error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
