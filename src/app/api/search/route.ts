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

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q') || '';
    const cleanQuery = query.trim();

    if (!cleanQuery) {
      return NextResponse.json({ success: true, results: [] });
    }

    // Query tablet instances matching serial, imei, brand, or model name. Limit results to 100 to ensure speed.
    const tablets = await prisma.tabletInstance.findMany({
      where: {
        status: 'AVAILABLE',
        OR: [
          { imei: { contains: cleanQuery } },
          { serialNumber: { contains: cleanQuery } },
          { model: { brand: { contains: cleanQuery } } },
          { model: { model: { contains: cleanQuery } } }
        ]
      },
      include: {
        model: true,
        locationShopkeeper: {
          select: {
            id: true,
            name: true,
            shopName: true,
            isOwnShop: true,
            balance: true
          }
        },
        purchaseInvoice: {
          select: {
            invoiceNo: true
          }
        }
      },
      take: 100
    });

    // Group tablets in-memory by Model -> Location -> Instances
    const modelGroupMap: Record<string, {
      modelId: string;
      brand: string;
      model: string;
      ram: string;
      storage: string;
      color: string;
      locationsMap: Record<string, {
        locationName: string;
        locationType: 'WAREHOUSE' | 'SHOPKEEPER' | 'OWN_SHOP';
        instances: any[];
      }>;
    }> = {};

    tablets.forEach(tab => {
      const modelId = tab.modelId;
      if (!modelGroupMap[modelId]) {
        modelGroupMap[modelId] = {
          modelId,
          brand: tab.model.brand,
          model: tab.model.model,
          ram: tab.model.ram,
          storage: tab.model.storage,
          color: tab.model.color,
          locationsMap: {}
        };
      }

      // Resolve location text label
      let locName = 'Warehouse';
      let locType: 'WAREHOUSE' | 'SHOPKEEPER' | 'OWN_SHOP' = 'WAREHOUSE';

      if (tab.locationType === 'OWN_SHOP') {
        locName = tab.locationShopkeeper?.shopName || 'Own Shop';
        locType = 'OWN_SHOP';
      } else if (tab.locationType === 'SHOPKEEPER') {
        locName = tab.locationShopkeeper?.shopName || 'Unknown Shopkeeper';
        locType = 'SHOPKEEPER';
      }

      const locationsMap = modelGroupMap[modelId].locationsMap;
      if (!locationsMap[locName]) {
        locationsMap[locName] = {
          locationName: locName,
          locationType: locType,
          instances: []
        };
      }

      locationsMap[locName].instances.push({
        imei: tab.imei,
        serialNumber: tab.serialNumber,
        purchasePrice: tab.purchasePrice,
        sellingPrice: tab.sellingPrice,
        qcStatus: tab.qcStatus,
        status: tab.status,
        createdAt: tab.createdAt.toISOString(),
        purchaseInvoiceNo: tab.purchaseInvoice?.invoiceNo || null,
        shopkeeperBalance: tab.locationShopkeeper?.balance || null
      });
    });

    // Format output for consumption
    const results = Object.values(modelGroupMap).map(m => {
      return {
        modelId: m.modelId,
        brand: m.brand,
        model: m.model,
        ram: m.ram,
        storage: m.storage,
        color: m.color,
        locations: Object.values(m.locationsMap).sort((a, b) => {
          // Put Warehouse first, then Own Shop, then other shops alphabetically
          if (a.locationType === 'WAREHOUSE') return -1;
          if (b.locationType === 'WAREHOUSE') return 1;
          if (a.locationType === 'OWN_SHOP') return -1;
          if (b.locationType === 'OWN_SHOP') return 1;
          return a.locationName.localeCompare(b.locationName);
        })
      };
    });

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error('Global search error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
