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

    // Extract all tables
    const [
      users,
      suppliers,
      quotations,
      shopkeepers,
      tabletModels,
      tabletInstances,
      purchaseInvoices,
      saleInvoices,
      transfers,
      transferItems,
      payments,
      auditLogs
    ] = await Promise.all([
      prisma.user.findMany(),
      prisma.supplier.findMany(),
      prisma.quotation.findMany(),
      prisma.shopkeeper.findMany(),
      prisma.tabletModel.findMany(),
      prisma.tabletInstance.findMany(),
      prisma.purchaseInvoice.findMany(),
      prisma.saleInvoice.findMany(),
      prisma.transfer.findMany(),
      prisma.transferItem.findMany(),
      prisma.payment.findMany(),
      prisma.auditLog.findMany()
    ]);

    const backupData = {
      app: 'tabs-pos',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      data: {
        users,
        suppliers,
        quotations,
        shopkeepers,
        tabletModels,
        tabletInstances,
        purchaseInvoices,
        saleInvoices,
        transfers,
        transferItems,
        payments,
        auditLogs
      }
    };

    return NextResponse.json({ success: true, backup: backupData });
  } catch (error: any) {
    console.error('Backup error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!await isAuthenticated(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { backup } = await req.json();

    if (!backup || backup.app !== 'tabs-pos' || !backup.data) {
      return NextResponse.json({ error: 'Invalid backup file format' }, { status: 400 });
    }

    const {
      users,
      suppliers,
      quotations,
      shopkeepers,
      tabletModels,
      tabletInstances,
      purchaseInvoices,
      saleInvoices,
      transfers,
      transferItems,
      payments,
      auditLogs
    } = backup.data;

    // Run inside database transaction
    await prisma.$transaction(async (tx) => {
      // 1. Wipe all tables
      await tx.auditLog.deleteMany();
      await tx.payment.deleteMany();
      await tx.transferItem.deleteMany();
      await tx.transfer.deleteMany();
      await tx.tabletInstance.deleteMany();
      await tx.saleInvoice.deleteMany();
      await tx.purchaseInvoice.deleteMany();
      await tx.tabletModel.deleteMany();
      await tx.shopkeeper.deleteMany();
      await tx.quotation.deleteMany();
      await tx.supplier.deleteMany();
      await tx.user.deleteMany();

      // 2. Re-seed in dependency order
      if (users?.length) {
        await tx.user.createMany({ data: users });
      }
      if (suppliers?.length) {
        await tx.supplier.createMany({ data: suppliers });
      }
      if (quotations?.length) {
        await tx.quotation.createMany({ data: quotations });
      }
      if (shopkeepers?.length) {
        await tx.shopkeeper.createMany({ data: shopkeepers });
      }
      if (tabletModels?.length) {
        await tx.tabletModel.createMany({ data: tabletModels });
      }
      if (purchaseInvoices?.length) {
        // Remove relationships during createMany and restore manually if needed
        await tx.purchaseInvoice.createMany({ data: purchaseInvoices });
      }
      if (saleInvoices?.length) {
        await tx.saleInvoice.createMany({ data: saleInvoices });
      }
      if (tabletInstances?.length) {
        await tx.tabletInstance.createMany({ data: tabletInstances });
      }
      if (transfers?.length) {
        await tx.transfer.createMany({ data: transfers });
      }
      if (transferItems?.length) {
        await tx.transferItem.createMany({ data: transferItems });
      }
      if (payments?.length) {
        await tx.payment.createMany({ data: payments });
      }
      if (auditLogs?.length) {
        await tx.auditLog.createMany({ data: auditLogs });
      }
    });

    // Create Audit Log of Restore Event
    await prisma.auditLog.create({
      data: {
        type: 'SYSTEM',
        details: 'Full database restore successfully performed from backup file.'
      }
    });

    return NextResponse.json({ success: true, message: 'Database successfully restored from backup.' });

  } catch (error: any) {
    console.error('Restore error:', error.message || error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 400 });
  }
}
