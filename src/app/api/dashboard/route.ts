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

    const now = new Date();
    
    // 1. Time boundary setups
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    
    // 2. Fetch primary metrics in parallel using Promise.all to maximize performance
    const [
      salesToday,
      purchasesToday,
      supplierPayables,
      shopkeeperReceivables,
      warehouseStockCount,
      shopkeeperStockCount,
      ownShopStockCount,
      totalInventoryValue,
      recentLogs
    ] = await Promise.all([
      // Today's Sales
      prisma.saleInvoice.aggregate({
        where: { date: { gte: startOfToday } },
        _sum: { totalAmount: true }
      }),
      // Today's Purchases
      prisma.purchaseInvoice.aggregate({
        where: { date: { gte: startOfToday } },
        _sum: { totalAmount: true }
      }),
      // Supplier Payables
      prisma.supplier.aggregate({
        _sum: { balance: true }
      }),
      // Shopkeeper Receivables (Exclude our own shop)
      prisma.shopkeeper.aggregate({
        where: { isOwnShop: false },
        _sum: { balance: true }
      }),
      // Warehouse Stock count
      prisma.tabletInstance.count({
        where: { status: 'AVAILABLE', locationType: 'WAREHOUSE' }
      }),
      // Shopkeeper Stock count
      prisma.tabletInstance.count({
        where: { status: 'AVAILABLE', locationType: 'SHOPKEEPER' }
      }),
      // Own Shop Stock count
      prisma.tabletInstance.count({
        where: { status: 'AVAILABLE', locationType: 'OWN_SHOP' }
      }),
      // Inventory Asset Value (Purchase Price of all active available stock)
      prisma.tabletInstance.aggregate({
        where: { status: 'AVAILABLE' },
        _sum: { purchasePrice: true }
      }),
      // Recent activity log
      prisma.auditLog.findMany({
        orderBy: { date: 'desc' },
        take: 10
      })
    ]);

    // 3. Profit Calculations
    // Overall Profit = Sum of Sold Tablet (Selling Price - Purchase Price) - Sum of Sales Invoices Discounts
    const soldTabletsOverall = await prisma.tabletInstance.findMany({
      where: { status: 'SOLD' },
      select: { purchasePrice: true, sellingPrice: true }
    });
    
    const saleInvoicesOverall = await prisma.saleInvoice.aggregate({
      _sum: { discount: true }
    });

    const overallProfit = soldTabletsOverall.reduce((sum, tab) => sum + ((tab.sellingPrice || 0) - tab.purchasePrice), 0) - (saleInvoicesOverall._sum.discount || 0);

    // Monthly Profit (tablets sold this month)
    const soldTabletsMonthly = await prisma.tabletInstance.findMany({
      where: {
        status: 'SOLD',
        updatedAt: { gte: startOfMonth }
      },
      select: { purchasePrice: true, sellingPrice: true }
    });

    const saleInvoicesMonthly = await prisma.saleInvoice.aggregate({
      where: { date: { gte: startOfMonth } },
      _sum: { discount: true }
    });

    const monthlyProfit = soldTabletsMonthly.reduce((sum, tab) => sum + ((tab.sellingPrice || 0) - tab.purchasePrice), 0) - (saleInvoicesMonthly._sum.discount || 0);

    // 4. Low Stock Alerts & Out of Stock
    // Load all models and check counts
    const models = await prisma.tabletModel.findMany({
      include: {
        instances: {
          where: { status: 'AVAILABLE' }
        }
      }
    });

    let lowStockCount = 0;
    let outOfStockCount = 0;
    const modelStockLevels: any[] = [];

    models.forEach(m => {
      const stock = m.instances.length;
      modelStockLevels.push({
        id: m.id,
        brand: m.brand,
        model: m.model,
        ram: m.ram,
        storage: m.storage,
        color: m.color,
        stock
      });
      if (stock === 0) {
        outOfStockCount++;
      } else if (stock < 5) {
        lowStockCount++;
      }
    });

    // 5. Fast & Slow Moving Tablets
    // Fetch sold instances count grouped by Model ID
    const soldCounts = await prisma.tabletInstance.groupBy({
      by: ['modelId'],
      where: { status: 'SOLD' },
      _count: { imei: true },
      orderBy: { _count: { imei: 'desc' } },
      take: 5
    });

    const fastMoving = await Promise.all(soldCounts.map(async (sc) => {
      const model = await prisma.tabletModel.findUnique({ where: { id: sc.modelId } });
      return {
        brand: model?.brand,
        model: model?.model,
        ram: model?.ram,
        storage: model?.storage,
        color: model?.color,
        salesCount: sc._count.imei
      };
    }));

    // Most profitable tablet models
    const soldInstances = await prisma.tabletInstance.findMany({
      where: { status: 'SOLD' },
      include: { model: true }
    });

    const modelProfitsMap: Record<string, { brand: string; modelName: string; profit: number }> = {};
    soldInstances.forEach(inst => {
      const key = `${inst.model.brand} ${inst.model.model}`;
      const profit = (inst.sellingPrice || 0) - inst.purchasePrice;
      if (!modelProfitsMap[key]) {
        modelProfitsMap[key] = {
          brand: inst.model.brand,
          modelName: inst.model.model,
          profit: 0
        };
      }
      modelProfitsMap[key].profit += profit;
    });

    const mostProfitableModel = Object.values(modelProfitsMap)
      .sort((a, b) => b.profit - a.profit)[0] || null;

    // Top Selling Shopkeeper
    const shopkeeperSales = await prisma.saleInvoice.groupBy({
      by: ['shopkeeperId'],
      _sum: { totalAmount: true },
      orderBy: { _sum: { totalAmount: 'desc' } },
      take: 5
    });

    const topShopkeepers = await Promise.all(shopkeeperSales.map(async (ss) => {
      const sk = await prisma.shopkeeper.findUnique({ where: { id: ss.shopkeeperId } });
      return {
        shopName: sk?.shopName,
        ownerName: sk?.name,
        isOwnShop: sk?.isOwnShop,
        salesValue: ss._sum.totalAmount || 0
      };
    }));

    // Filter out Own Shop from top selling shopkeeper metric to show trade partner
    const topShopkeeper = topShopkeepers.find(sk => !sk.isOwnShop) || null;

    // 6. Generate 7-Day Chart coordinates
    const chartLabels: string[] = [];
    const salesChartData: number[] = [];
    const purchaseChartData: number[] = [];
    const profitChartData: number[] = [];
    const cashInflowData: number[] = [];
    const cashOutflowData: number[] = [];

    for (let i = 6; i >= 0; i--) {
      const day = new Date();
      day.setDate(now.getDate() - i);
      day.setHours(0, 0, 0, 0);
      
      const dayEnd = new Date(day);
      dayEnd.setHours(23, 59, 59, 999);

      chartLabels.push(day.toLocaleDateString('en-PK', { weekday: 'short', day: '2-digit' }));

      // Query daily sums
      const [salesSum, purchaseSum, soldTabs, dailyInflow, dailyOutflow, dailyDiscount] = await Promise.all([
        prisma.saleInvoice.aggregate({
          where: { date: { gte: day, lte: dayEnd } },
          _sum: { totalAmount: true }
        }),
        prisma.purchaseInvoice.aggregate({
          where: { date: { gte: day, lte: dayEnd } },
          _sum: { totalAmount: true }
        }),
        prisma.tabletInstance.findMany({
          where: { status: 'SOLD', updatedAt: { gte: day, lte: dayEnd } },
          select: { purchasePrice: true, sellingPrice: true }
        }),
        prisma.payment.aggregate({
          where: { type: 'FROM_SHOPKEEPER', date: { gte: day, lte: dayEnd } },
          _sum: { amount: true }
        }),
        prisma.payment.aggregate({
          where: { type: 'TO_SUPPLIER', date: { gte: day, lte: dayEnd } },
          _sum: { amount: true }
        }),
        prisma.saleInvoice.aggregate({
          where: { date: { gte: day, lte: dayEnd } },
          _sum: { discount: true }
        })
      ]);

      salesChartData.push(salesSum._sum.totalAmount || 0);
      purchaseChartData.push(purchaseSum._sum.totalAmount || 0);
      
      const dailyProfitVal = soldTabs.reduce((sum, tab) => sum + ((tab.sellingPrice || 0) - tab.purchasePrice), 0) - (dailyDiscount._sum.discount || 0);
      profitChartData.push(dailyProfitVal);

      cashInflowData.push(dailyInflow._sum.amount || 0);
      cashOutflowData.push(dailyOutflow._sum.amount || 0);
    }

    return NextResponse.json({
      success: true,
      stats: {
        salesToday: salesToday._sum.totalAmount || 0,
        purchasesToday: purchasesToday._sum.totalAmount || 0,
        monthlyProfit,
        overallProfit,
        inventoryValue: totalInventoryValue._sum.purchasePrice || 0,
        warehouseStock: warehouseStockCount,
        stockAtShopkeepers: shopkeeperStockCount,
        stockAtOwnShop: ownShopStockCount,
        outstandingBalance: shopkeeperReceivables._sum.balance || 0,
        supplierPayables: supplierPayables._sum.balance || 0,
        lowStockAlert: lowStockCount,
        outOfStock: outOfStockCount
      },
      rankings: {
        fastMoving,
        mostProfitableModel,
        topSellingShopkeeper: topShopkeeper,
        recentLogs
      },
      charts: {
        labels: chartLabels,
        sales: salesChartData,
        purchases: purchaseChartData,
        profits: profitChartData,
        cashInflow: cashInflowData,
        cashOutflow: cashOutflowData
      }
    });

  } catch (error) {
    console.error('Dashboard aggregation error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
