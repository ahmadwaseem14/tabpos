import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getTokenFromRequest, getUserFromToken } from '@/lib/auth';

async function isAuthenticated(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return false;
  return !!getUserFromToken(token);
}

export async function GET(req: NextRequest) {
  try {
    if (!await isAuthenticated(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q') || '';
    const status = searchParams.get('status') || 'ALL';
    const qc = searchParams.get('qc') || 'ALL';
    const location = searchParams.get('location') || 'ALL';
    const shopkeeperId = searchParams.get('shopkeeperId') || '';

    const where: any = {};

    if (q.trim()) {
      where.OR = [
        { imei: { contains: q } },
        { serialNumber: { contains: q } },
        { model: { brand: { contains: q } } },
        { model: { model: { contains: q } } },
      ];
    }

    if (status !== 'ALL') where.status = status;
    if (qc !== 'ALL') where.qcStatus = qc;
    if (location !== 'ALL') where.locationType = location;
    if (shopkeeperId) where.locationShopkeeperId = shopkeeperId;

    const tablets = await prisma.tabletInstance.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 500,
      include: {
        model: true,
        locationShopkeeper: { select: { shopName: true } },
        purchaseInvoice: { select: { invoiceNo: true } },
      },
    });

    const result = tablets.map(t => ({
      imei: t.imei,
      serialNumber: t.serialNumber,
      brand: t.model.brand,
      model: t.model.model,
      ram: t.model.ram,
      storage: t.model.storage,
      color: t.model.color,
      purchasePrice: t.purchasePrice,
      sellingPrice: t.sellingPrice,
      locationType: t.locationType,
      locationShopkeeper: t.locationShopkeeper?.shopName || null,
      qcStatus: t.qcStatus,
      status: t.status,
      purchaseInvoiceNo: t.purchaseInvoice?.invoiceNo || null,
      createdAt: t.createdAt.toISOString(),
      checkedAt: t.checkedAt?.toISOString() || null,
      checkedNotes: t.checkedNotes,
    }));

    return NextResponse.json({ success: true, tablets: result });
  } catch (error) {
    console.error('Inventory fetch error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
