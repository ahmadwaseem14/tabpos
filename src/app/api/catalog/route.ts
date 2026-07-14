import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getTokenFromRequest, getUserFromToken } from '@/lib/auth';

async function isAuthenticated(req: NextRequest) {
  const token = getTokenFromRequest(req);
  return token ? !!getUserFromToken(token) : false;
}

export async function GET(req: NextRequest) {
  try {
    if (!await isAuthenticated(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q') || '';

    const where: any = q.trim() ? {
      OR: [
        { brand: { contains: q } },
        { model: { contains: q } },
        { color: { contains: q } },
      ]
    } : {};

    const models = await prisma.tabletModel.findMany({
      where,
      orderBy: [{ brand: 'asc' }, { model: 'asc' }],
      include: {
        _count: {
          select: {
            instances: {
              where: { status: 'AVAILABLE' }
            }
          }
        }
      }
    });

    const result = models.map(m => ({
      id: m.id,
      brand: m.brand,
      model: m.model,
      ram: m.ram,
      storage: m.storage,
      color: m.color,
      stockAvailable: m._count.instances,
      createdAt: m.createdAt.toISOString(),
    }));

    return NextResponse.json({ success: true, models: result });
  } catch (error) {
    console.error('Catalog fetch error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!await isAuthenticated(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { brand, model, ram, storage, color } = await req.json();

    if (!brand?.trim() || !model?.trim() || !ram?.trim() || !storage?.trim() || !color?.trim()) {
      return NextResponse.json({ error: 'All fields (brand, model, RAM, storage, color) are required.' }, { status: 400 });
    }

    // Check if this exact combination already exists
    const existing = await prisma.tabletModel.findUnique({
      where: { brand_model_ram_storage_color: { brand: brand.trim(), model: model.trim(), ram: ram.trim(), storage: storage.trim(), color: color.trim() } }
    });

    if (existing) {
      return NextResponse.json({ error: 'This exact model configuration already exists in the catalog.' }, { status: 409 });
    }

    const created = await prisma.tabletModel.create({
      data: { brand: brand.trim(), model: model.trim(), ram: ram.trim(), storage: storage.trim(), color: color.trim() }
    });

    return NextResponse.json({ success: true, model: created });
  } catch (error) {
    console.error('Catalog create error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    if (!await isAuthenticated(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Model ID required.' }, { status: 400 });

    const model = await prisma.tabletModel.findUnique({
      where: { id },
      include: { _count: { select: { instances: true } } }
    });

    if (!model) return NextResponse.json({ error: 'Model not found.' }, { status: 404 });
    if (model._count.instances > 0) {
      return NextResponse.json({ error: `Cannot delete — ${model._count.instances} tablet(s) are linked to this model.` }, { status: 400 });
    }

    await prisma.tabletModel.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Catalog delete error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
