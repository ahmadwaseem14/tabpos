import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getTokenFromRequest, getUserFromToken } from '@/lib/auth';

async function isAuthenticated(req: NextRequest) {
  const token = getTokenFromRequest(req);
  return token ? !!getUserFromToken(token) : false;
}

// Update QC status for a tablet
export async function PUT(req: NextRequest) {
  try {
    if (!await isAuthenticated(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { imei, qcStatus, checkedNotes } = await req.json();
    if (!imei || !qcStatus) {
      return NextResponse.json({ error: 'IMEI and QC status are required.' }, { status: 400 });
    }

    const tablet = await prisma.tabletInstance.findUnique({ where: { imei } });
    if (!tablet) return NextResponse.json({ error: 'Tablet not found.' }, { status: 404 });

    const updated = await prisma.tabletInstance.update({
      where: { imei },
      data: {
        qcStatus,
        checkedAt: new Date(),
        checkedNotes: checkedNotes || null
      }
    });

    return NextResponse.json({ success: true, imei: updated.imei, qcStatus: updated.qcStatus });
  } catch (error) {
    console.error('QC update error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
