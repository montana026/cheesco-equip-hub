import { NextRequest, NextResponse } from 'next/server';
import { equipmentService } from '@/lib/services/equipment.service';
import type { EquipmentCategory, ListingType } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const filters = {
      category: searchParams.get('category') as EquipmentCategory | undefined,
      listingType: searchParams.get('listing') as ListingType | undefined,
      state: searchParams.get('state') || undefined,
      search: searchParams.get('q') || undefined,
      availableOnly: true,
      verifiedOnly: true,
    };

    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const equipment = await equipmentService.browse(filters, limit, offset);

    return NextResponse.json({
      data: equipment,
      count: equipment.length,
    });
  } catch (error) {
    console.error('Equipment browse error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch equipment' },
      { status: 500 }
    );
  }
}
