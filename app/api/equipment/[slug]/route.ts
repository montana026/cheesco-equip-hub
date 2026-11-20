import { NextRequest, NextResponse } from 'next/server';
import { equipmentService } from '@/lib/services/equipment.service';
import { supabaseServer } from '@/lib/supabase/server';
import { verifyMerchantAuth } from '@/lib/admin-auth';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  _request: NextRequest,
  ctx: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await ctx.params;
    let equipment = null;

    if (UUID_REGEX.test(slug)) {
      const { data } = await supabaseServer
        .from('equipment')
        .select('*, equipment_images(*), equipment_documents(*)')
        .eq('id', slug)
        .maybeSingle();
      equipment = data;
    }

    if (!equipment) {
      equipment = await equipmentService.getBySlug(slug);
    }

    if (!equipment) {
      return NextResponse.json(
        { error: 'Equipment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: equipment });
  } catch (error: any) {
    console.error('[/api/equipment/[slug]] Equipment fetch error:', error);
    return NextResponse.json(
      { error: 'An internal error occurred. Please try again.' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await ctx.params;
    const auth = await verifyMerchantAuth(request);
    if (!auth.authorized) {
      return NextResponse.json(
        { error: auth.error || 'Unauthorized' },
        { status: auth.status || 401 }
      );
    }

    const body = await request.json();

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (body.name !== undefined) updatePayload.name = body.name;
    if (body.category !== undefined) updatePayload.category = body.category;
    if (body.brand !== undefined) updatePayload.brand = body.brand;
    if (body.model !== undefined) updatePayload.model = body.model;
    if (body.year !== undefined) updatePayload.year = body.year;
    if (body.condition !== undefined) updatePayload.condition = body.condition;
    if (body.locationState !== undefined) updatePayload.location_state = body.locationState;
    if (body.locationCity !== undefined) updatePayload.location_city = body.locationCity;
    if (body.operatingHours !== undefined) updatePayload.operating_hours = body.operatingHours;
    if (body.description !== undefined) updatePayload.description = body.description;
    if (body.specs !== undefined) updatePayload.specs = body.specs;
    if (body.listingType !== undefined) updatePayload.listing_type = body.listingType;
    if (body.salePrice !== undefined) updatePayload.sale_price = body.salePrice;
    if (body.merchantRentalRate !== undefined) {
      updatePayload.merchant_rental_rate = body.merchantRentalRate;
      updatePayload.cheesco_adjusted_rate = body.merchantRentalRate ? body.merchantRentalRate * 1.15 : null;
    }
    if (body.isOperatorIncluded !== undefined) updatePayload.is_operator_included = body.isOperatorIncluded;
    if (body.isDeliveryAvailable !== undefined) updatePayload.is_delivery_available = body.isDeliveryAvailable;

    const queryField = UUID_REGEX.test(slug) ? 'id' : 'slug';

    const { data: updated, error: updateError } = await supabaseServer
      .from('equipment')
      .update(updatePayload)
      .eq(queryField, slug)
      .select()
      .single();

    if (updateError) {
      console.error('[/api/equipment/[slug]] Update error:', updateError);
      return NextResponse.json({ error: 'An internal error occurred. Please try again.' }, { status: 500 });
    }

    // Sync images if provided
    if (body.images && Array.isArray(body.images) && body.images.length > 0 && updated?.id) {
      await supabaseServer.from('equipment_images').delete().eq('equipment_id', updated.id);

      const imageInserts = body.images.map((url: string, idx: number) => ({
        equipment_id: updated.id,
        image_url: url,
        is_primary: idx === 0,
        display_order: idx,
      }));

      await supabaseServer.from('equipment_images').insert(imageInserts);
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    console.error('[/api/equipment/[slug]] PATCH Error:', err);
    return NextResponse.json({ error: 'An internal error occurred. Please try again.' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  ctx: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await ctx.params;
    const auth = await verifyMerchantAuth(request);
    if (!auth.authorized) {
      return NextResponse.json(
        { error: auth.error || 'Unauthorized' },
        { status: auth.status || 401 }
      );
    }

    const queryField = UUID_REGEX.test(slug) ? 'id' : 'slug';

    // Find the record first to get its ID for related cleanups
    const { data: item } = await supabaseServer
      .from('equipment')
      .select('id')
      .eq(queryField, slug)
      .maybeSingle();

    if (item?.id) {
      await supabaseServer.from('equipment_images').delete().eq('equipment_id', item.id);
      await supabaseServer.from('equipment_documents').delete().eq('equipment_id', item.id);
      await supabaseServer.from('equipment').delete().eq('id', item.id);
    }

    return NextResponse.json({ success: true, message: 'Equipment deleted' });
  } catch (err: any) {
    console.error('[/api/equipment/[slug]] DELETE Error:', err);
    return NextResponse.json({ error: 'An internal error occurred. Please try again.' }, { status: 500 });
  }
}
