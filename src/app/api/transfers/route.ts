import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getTokenFromRequest, getUserFromToken } from '@/lib/auth';


async function isAuthenticated(req: NextRequest) {
  const token = getTokenFromRequest(req);
  return token ? !!getUserFromToken(token) : false;
}

function generateTransferNo() {
  const now = new Date();
  const yy = now.getFullYear().toString().slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `TRF-${yy}${mm}${dd}-${rand}`;
}

export async function GET(req: NextRequest) {
  try {
    if (!await isAuthenticated(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const transfers = await prisma.transfer.findMany({
      orderBy: { date: 'desc' },
      take: 100,
      include: {
        fromShopkeeper: { select: { shopName: true } },
        toShopkeeper: { select: { shopName: true } },
        _count: { select: { items: true } }
      }
    });

    return NextResponse.json({ success: true, transfers });
  } catch (error) {
    console.error('Transfer fetch error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!await isAuthenticated(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { fromLocation, fromShopkeeperId, toLocation, toShopkeeperId, imeis, ownerSellingPrice, notes } = await req.json();

    if (!imeis || !Array.isArray(imeis) || imeis.length === 0) {
      return NextResponse.json({ error: 'No tablets specified.' }, { status: 400 });
    }

    // Validate all tablets exist and are available
    const tablets = await prisma.tabletInstance.findMany({
      where: { imei: { in: imeis } }
    });

    if (tablets.length !== imeis.length) {
      const found = tablets.map(t => t.imei);
      const missing = imeis.filter((i: string) => !found.includes(i));
      return NextResponse.json({ error: `Tablets not found: ${missing.join(', ')}` }, { status: 400 });
    }

    const unavailable = tablets.filter(t => t.status !== 'AVAILABLE');
    if (unavailable.length > 0) {
      return NextResponse.json({ error: `Tablets not available for transfer: ${unavailable.map(t => t.imei).join(', ')}` }, { status: 400 });
    }

    // Create transfer record
    const transfer = await prisma.transfer.create({
      data: {
        invoiceNo: generateTransferNo(),
        fromLocation,
        fromShopkeeperId: fromShopkeeperId || null,
        toLocation,
        toShopkeeperId: toShopkeeperId || null,
        notes: notes || null,
        items: {
          create: imeis.map((imei: string) => ({
            imei,
          }))
        }
      }
    });

    // Update tablets location
    await prisma.tabletInstance.updateMany({
      where: { imei: { in: imeis } },
      data: {
        locationType: toLocation,
        locationShopkeeperId: toShopkeeperId || null,
        ...(ownerSellingPrice ? { sellingPrice: ownerSellingPrice } : {}),
      }
    });

    return NextResponse.json({ success: true, transferId: transfer.id, count: imeis.length });
  } catch (error) {
    console.error('Transfer create error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
