import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getTokenFromRequest, getUserFromToken } from '@/lib/auth';

async function isAuthenticated(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return false;
  const user = getUserFromToken(token);
  return !!user;
}

export async function GET(req: NextRequest) {
  try {
    if (!await isAuthenticated(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch shopkeepers, order by name. Place Own Shop at the end or handle accordingly.
    const shopkeepers = await prisma.shopkeeper.findMany({
      orderBy: [
        { isOwnShop: 'asc' },
        { name: 'asc' }
      ],
      include: {
        _count: {
          select: { 
            saleInvoices: true, 
            payments: true,
            tabletInstances: {
              where: { status: 'AVAILABLE' } // Count active inventory at shopkeeper
            }
          }
        }
      }
    });

    return NextResponse.json({ success: true, shopkeepers });
  } catch (error) {
    console.error('Error fetching shopkeepers:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!await isAuthenticated(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, phone, address, shopName, creditLimit, balance, notes } = await req.json();

    if (!name || !phone || !shopName) {
      return NextResponse.json({ error: 'Name, phone, and shop name are required' }, { status: 400 });
    }

    // Check if shopName already exists
    const existingShop = await prisma.shopkeeper.findUnique({
      where: { shopName: shopName.trim() }
    });
    if (existingShop) {
      return NextResponse.json({ error: `Shop name '${shopName}' is already registered.` }, { status: 400 });
    }

    const newShopkeeper = await prisma.shopkeeper.create({
      data: {
        name: name.trim(),
        phone: phone.trim(),
        address: address?.trim() || null,
        shopName: shopName.trim(),
        creditLimit: parseFloat(creditLimit) || 0.0,
        balance: parseFloat(balance) || 0.0,
        isOwnShop: false,
        notes: notes?.trim() || null
      }
    });

    await prisma.auditLog.create({
      data: {
        type: 'SYSTEM',
        details: `Shopkeeper '${newShopkeeper.name}' (${newShopkeeper.shopName}) created.`
      }
    });

    return NextResponse.json({ success: true, shopkeeper: newShopkeeper });
  } catch (error: any) {
    console.error('Error creating shopkeeper:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
