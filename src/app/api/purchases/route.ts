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

    const invoices = await prisma.purchaseInvoice.findMany({
      orderBy: { date: 'desc' },
      include: {
        supplier: {
          select: { name: true }
        },
        _count: {
          select: { tablets: true }
        }
      }
    });

    return NextResponse.json({ success: true, invoices });
  } catch (error) {
    console.error('Error fetching purchase invoices:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!await isAuthenticated(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      invoiceRef,
      date,
      supplierId,
      tax,
      discount,
      freight,
      extraCharges,
      notes,
      tablets
    } = await req.json();

    // Validations
    if (!supplierId || !tablets || !tablets.length) {
      return NextResponse.json({ error: 'Supplier and tablets list are required' }, { status: 400 });
    }

    // Auto-generate invoice number
    const now = new Date();
    const yy = now.getFullYear().toString().slice(2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const rand = Math.floor(Math.random() * 9000) + 1000;
    const invoiceNo = invoiceRef?.trim() || `PUR-${yy}${mm}${dd}-${rand}`;

    const taxVal = parseFloat(tax) || 0;
    const discountVal = parseFloat(discount) || 0;
    const freightVal = parseFloat(freight) || 0;
    const extraChargesVal = parseFloat(extraCharges) || 0;

    // Run inside database transaction to guarantee integrity
    const result = await prisma.$transaction(async (tx) => {
      // 1. Check if invoiceNo already exists
      const existingInvoice = await tx.purchaseInvoice.findUnique({
        where: { invoiceNo }
      });
      if (existingInvoice) {
        throw new Error(`Invoice number '${invoiceNo}' already exists.`);
      }

      // 2. Check if supplier exists
      const supplier = await tx.supplier.findUnique({
        where: { id: supplierId }
      });
      if (!supplier) {
        throw new Error('Selected supplier does not exist.');
      }

      // 3. Check for IMEI duplicates in this input list and in the database
      const inputImeis = tablets.map((t: any) => t.imei.trim());
      const uniqueInputImeis = new Set(inputImeis);
      if (inputImeis.length !== uniqueInputImeis.size) {
        throw new Error('Duplicate IMEIs detected in the input list.');
      }

      const existingInstances = await tx.tabletInstance.findMany({
        where: { imei: { in: inputImeis } }
      });
      if (existingInstances.length > 0) {
        const dupImeis = existingInstances.map(e => e.imei).join(', ');
        throw new Error(`The following IMEIs already exist in inventory: ${dupImeis}`);
      }

      // 4. Calculate total base cost
      const subtotal = tablets.reduce((sum: number, t: any) => sum + (parseFloat(t.purchasePrice) || 0), 0);
      if (subtotal <= 0) {
        throw new Error('Total purchase cost must be greater than zero.');
      }

      // 5. Calculate landing cost ratio to distribute overhead charges proportionally
      // Landing Cost = purchasePrice + Proportional (tax + freight + extraCharges - discount)
      const overheadTotal = taxVal + freightVal + extraChargesVal - discountVal;
      const overheadRatio = overheadTotal / subtotal;

      const totalInvoiceAmount = subtotal + overheadTotal;

      // 6. Create the Purchase Invoice record
      const invoice = await tx.purchaseInvoice.create({
        data: {
          invoiceNo: invoiceNo.trim(),
          date: date ? new Date(date) : new Date(),
          supplierId,
          tax: taxVal,
          discount: discountVal,
          freight: freightVal,
          extraCharges: extraChargesVal,
          totalAmount: totalInvoiceAmount,
          notes: notes?.trim() || null,
        }
      });

      // 7. Process tablets and insert instances
      for (const t of tablets) {
        const brand = t.brand.trim();
        const model = t.model.trim();
        const ram = t.ram.trim();
        const storage = t.storage.trim();
        const color = t.color.trim();
        const imei = t.imei.trim();
        const serialNumber = t.serialNumber?.trim() || null;
        
        const rawPrice = parseFloat(t.purchasePrice) || 0;
        // Distribute landed cost proportionally
        const landedCost = rawPrice * (1 + overheadRatio);

        // Find or create TabletModel configuration
        let tabletModel = await tx.tabletModel.findUnique({
          where: {
            brand_model_ram_storage_color: {
              brand, model, ram, storage, color
            }
          }
        });

        if (!tabletModel) {
          tabletModel = await tx.tabletModel.create({
            data: { brand, model, ram, storage, color }
          });
        }

        // Create the TabletInstance record
        await tx.tabletInstance.create({
          data: {
            imei,
            serialNumber,
            modelId: tabletModel.id,
            purchaseInvoiceId: invoice.id,
            purchasePrice: landedCost, // Storing landed price for exact profit margins
            locationType: 'WAREHOUSE',
            qcStatus: 'UNCHECKED', // QC status begins as UNCHECKED
            status: 'AVAILABLE',
          }
        });
      }

      // 8. Update supplier ledger balance (increase payables)
      await tx.supplier.update({
        where: { id: supplierId },
        data: {
          balance: {
            increment: totalInvoiceAmount
          }
        }
      });

      // 9. Add audit log
      await tx.auditLog.create({
        data: {
          type: 'PURCHASE',
          details: `Recorded purchase invoice '${invoiceNo}' from supplier '${supplier.name}' totaling Rs. ${totalInvoiceAmount.toLocaleString()}. Added ${tablets.length} tablets to warehouse.`
        }
      });

      return invoice;
    });

    return NextResponse.json({ success: true, invoiceNo: result.invoiceNo, invoice: result });
  } catch (error: any) {
    console.error('Purchase invoice error:', error.message || error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 400 });
  }
}
