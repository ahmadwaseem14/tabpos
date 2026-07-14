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
    const supplierId = searchParams.get('supplierId');

    if (!supplierId) {
      return NextResponse.json({ error: 'Supplier ID is required' }, { status: 400 });
    }

    const quotations = await prisma.quotation.findMany({
      where: { supplierId },
      orderBy: { date: 'desc' }
    });

    return NextResponse.json({ success: true, quotations });
  } catch (error) {
    console.error('Error fetching quotations:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!await isAuthenticated(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { supplierId, title, details, notes } = await req.json();

    if (!supplierId || !title || !details) {
      return NextResponse.json({ error: 'Supplier ID, title, and details are required' }, { status: 400 });
    }

    const quotation = await prisma.quotation.create({
      data: {
        supplierId,
        title: title.trim(),
        details: typeof details === 'string' ? details : JSON.stringify(details),
        notes: notes?.trim() || null
      }
    });

    await prisma.auditLog.create({
      data: {
        type: 'SYSTEM',
        details: `Quotation '${quotation.title}' created.`
      }
    });

    return NextResponse.json({ success: true, quotation });
  } catch (error) {
    console.error('Error creating quotation:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
