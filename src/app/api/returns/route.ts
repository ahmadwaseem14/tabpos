import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getTokenFromRequest, getUserFromToken } from '@/lib/auth';

async function isAuthenticated(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return false;
  const user = getUserFromToken(token);
  return !!user;
}

export async function POST(req: NextRequest) {
  try {
    if (!await isAuthenticated(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { type, imei, refundAmount, notes, action } = await req.json();

    if (!type || !imei) {
      return NextResponse.json({ error: 'Return type and tablet IMEI are required.' }, { status: 400 });
    }

    const refundAmountVal = parseFloat(refundAmount) || 0;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch tablet
      const tablet = await tx.tabletInstance.findUnique({
        where: { imei },
        include: { model: true, purchaseInvoice: true }
      });

      if (!tablet) {
        throw new Error('Tablet IMEI not found in inventory.');
      }

      if (type === 'FROM_SHOPKEEPER') {
        // Return from Shopkeeper to warehouse
        if (tablet.locationType !== 'SHOPKEEPER' && tablet.locationType !== 'OWN_SHOP') {
          throw new Error('Tablet is not currently located at a shopkeeper or own shop.');
        }

        const shopkeeperId = tablet.locationShopkeeperId;
        if (!shopkeeperId) {
          throw new Error('Associated shopkeeper not found.');
        }

        const shopkeeper = await tx.shopkeeper.findUnique({ where: { id: shopkeeperId } });
        if (!shopkeeper) throw new Error('Shopkeeper not found.');

        // Determine destination status
        // If action is WAREHOUSE -> mark as AVAILABLE at warehouse. If DAMAGED -> status = DAMAGED at warehouse.
        const destStatus = action === 'DAMAGED' ? 'DAMAGED' : 'AVAILABLE';

        // Update tablet instance
        await tx.tabletInstance.update({
          where: { imei },
          data: {
            status: destStatus,
            locationType: 'WAREHOUSE',
            locationShopkeeperId: null,
            sellingPrice: null, // Clear selling price since it is returned to warehouse
            saleInvoiceId: null  // Clear sale link since it is returned
          }
        });

        // Credit the shopkeeper's balance (reduce what they owe us)
        if (refundAmountVal > 0) {
          await tx.shopkeeper.update({
            where: { id: shopkeeperId },
            data: {
              balance: {
                decrement: refundAmountVal
              }
            }
          });

          // Create matching credit Payment record for history
          await tx.payment.create({
            data: {
              type: 'FROM_SHOPKEEPER',
              shopkeeperId,
              amount: -refundAmountVal, // Negative amount to represent credit memo/refund
              method: 'CASH',
              notes: `Credit refund for returned tablet IMEI: ${imei}. ${notes ? `- ${notes}` : ''}`,
            }
          });
        }

        // Audit Log
        await tx.auditLog.create({
          data: {
            type: 'RETURN',
            details: `Returned tablet ${tablet.model.brand} ${tablet.model.model} (IMEI: ${imei}) from shopkeeper '${shopkeeper.shopName}' to warehouse. Status set to: ${destStatus}. Credit adjusted: Rs. ${refundAmountVal.toLocaleString()}.`
          }
        });

        return { success: true, message: 'Tablet returned from shopkeeper successfully.' };

      } else if (type === 'TO_SUPPLIER') {
        // Return from Warehouse to Supplier
        if (tablet.locationType !== 'WAREHOUSE') {
          throw new Error('Tablet must be in the Warehouse to return to a supplier.');
        }

        if (tablet.status === 'SOLD' || tablet.status === 'RETURNED_TO_SUPPLIER') {
          throw new Error(`Tablet is already in state: ${tablet.status}.`);
        }

        // Get the supplier from the purchase invoice
        const supplierId = tablet.purchaseInvoice?.supplierId;
        if (!supplierId) {
          throw new Error('No supplier associated with this tablet\'s purchase invoice.');
        }

        const supplier = await tx.supplier.findUnique({ where: { id: supplierId } });
        if (!supplier) throw new Error('Supplier not found.');

        // Update tablet instance
        await tx.tabletInstance.update({
          where: { imei },
          data: {
            status: 'RETURNED_TO_SUPPLIER',
            locationType: 'WAREHOUSE', // Keep warehouse metadata but status is RETURNED
          }
        });

        // Credit the supplier balance (reduce what we owe them)
        if (refundAmountVal > 0) {
          await tx.supplier.update({
            where: { id: supplierId },
            data: {
              balance: {
                decrement: refundAmountVal
              }
            }
          });

          // Create outward Payment log for history (representing credit/debit note)
          await tx.payment.create({
            data: {
              type: 'TO_SUPPLIER',
              supplierId,
              amount: -refundAmountVal, // Negative to represent refund/debit note
              method: 'CASH',
              notes: `Refund debit note for returned tablet IMEI: ${imei} to supplier`,
            }
          });
        }

        // Audit Log
        await tx.auditLog.create({
          data: {
            type: 'RETURN',
            details: `Returned tablet ${tablet.model.brand} ${tablet.model.model} (IMEI: ${imei}) back to supplier '${supplier.name}'. Status set to: RETURNED_TO_SUPPLIER. Refund adjusted: Rs. ${refundAmountVal.toLocaleString()}.`
          }
        });

        return { success: true, message: 'Tablet returned to supplier successfully.' };
      } else {
        throw new Error('Invalid return type.');
      }
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Process return error:', error.message || error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 400 });
  }
}
