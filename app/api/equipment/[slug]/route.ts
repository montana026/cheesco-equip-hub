import { NextRequest, NextResponse } from 'next/server';
import { equipmentService } from '@/lib/services/equipment.service';

export async function GET(
  _request: NextRequest,
  ctx: RouteContext<'/api/equipment/[slug]'>
) {
  try {
    const { slug } = await ctx.params;
    const equipment = await equipmentService.getBySlug(slug);

    if (!equipment) {
      return NextResponse.json(
        { error: 'Equipment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: equipment });
  } catch (error) {
    console.error('Equipment fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch equipment' },
      { status: 500 }
    );
  }
}
