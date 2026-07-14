import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getTokenFromRequest, getUserFromToken } from '@/lib/auth';

// Helper to check auth in API routes
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

    const suppliers = await prisma.supplier.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { purchaseInvoices: true, quotations: true }
        }
      }
    });

    return NextResponse.json({ success: true, suppliers });
  } catch (error: any) {
    console.error('Error fetching suppliers:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!await isAuthenticated(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, phone, address, notes, balance } = await req.json();

    if (!name || !phone) {
      return NextResponse.json({ error: 'Name and phone are required' }, { status: 400 });
    }

    const newSupplier = await prisma.supplier.create({
      data: {
        name: name.trim(),
        phone: phone.trim(),
        address: address?.trim() || null,
        notes: notes?.trim() || null,
        balance: parseFloat(balance) || 0.0,
      },
    });

    // Create Audit Log
    await prisma.auditLog.create({
      data: {
        type: 'SYSTEM',
        details: `Supplier '${newSupplier.name}' created.`
      }
    });

    return NextResponse.json({ success: true, supplier: newSupplier });
  } catch (error: any) {
    console.error('Error creating supplier:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
