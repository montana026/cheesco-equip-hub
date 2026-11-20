import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { verifyCustomerAuth } from '@/lib/admin-auth';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

/** Safe columns on equipment that can be returned to customer */
const SAFE_EQUIPMENT_SELECT = `
  id,
  slug,
  merchant_id,
  name,
  category,
  brand,
  model,
  year,
  condition,
  location_state,
  location_city,
  operating_hours,
  description,
  specs,
  listing_type,
  sale_price,
  cheesco_adjusted_rate,
  is_operator_included,
  is_delivery_available,
  verification_status,
  availability_status,
  is_featured,
  promotion_tier,
  promotion_expires_at,
  created_at,
  merchant:merchant_profiles!inner(id, business_name, verification_status),
  images:equipment_images(image_url, is_primary)
`;

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyCustomerAuth(request);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: auth.status || 401 });
    }

    const clientKey = auth.userId || getClientIp(request);
    const rl = await checkRateLimit(`saved_eq_get:${clientKey}`, 60, 60_000);
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many requests. Please slow down.' }, { status: 429 });
    }

    const { data, error } = await supabaseServer
      .from('saved_equipment')
      .select(`
        id,
        saved_at,
        equipment:equipment!inner(${SAFE_EQUIPMENT_SELECT})
      `)
      .eq('user_id', auth.userId)
      .order('saved_at', { ascending: false });

    if (error) {
      console.error('[/api/saved-equipment GET] Error:', error);
      throw error;
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch saved equipment' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyCustomerAuth(request);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: auth.status || 401 });
    }

    const clientKey = auth.userId || getClientIp(request);
    const rl = await checkRateLimit(`saved_eq:${clientKey}`, 30, 60_000);
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many requests. Please slow down.' }, { status: 429 });
    }

    const body = await request.json().catch(() => ({}));
    const { equipmentId } = body;

    if (!equipmentId) {
      return NextResponse.json({ error: 'equipmentId is required' }, { status: 400 });
    }

    // Check if already saved
    const { data: existing } = await supabaseServer
      .from('saved_equipment')
      .select('id')
      .eq('user_id', auth.userId)
      .eq('equipment_id', equipmentId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ success: true, saved: true, message: 'Already saved' });
    }

    const { error: insertErr } = await supabaseServer
      .from('saved_equipment')
      .insert({
        user_id: auth.userId,
        equipment_id: equipmentId,
      });

    if (insertErr) {
      console.error('[/api/saved-equipment POST] Insert error:', insertErr);
      throw insertErr;
    }

    return NextResponse.json({ success: true, saved: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to save equipment' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await verifyCustomerAuth(request);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: auth.status || 401 });
    }

    const clientKey = auth.userId || getClientIp(request);
    const rl = await checkRateLimit(`saved_eq:${clientKey}`, 30, 60_000);
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many requests. Please slow down.' }, { status: 429 });
    }

    let equipmentId = request.nextUrl.searchParams.get('equipmentId');
    if (!equipmentId) {
      const body = await request.json().catch(() => ({}));
      equipmentId = body.equipmentId;
    }

    if (!equipmentId) {
      return NextResponse.json({ error: 'equipmentId is required' }, { status: 400 });
    }

    const { error: deleteErr } = await supabaseServer
      .from('saved_equipment')
      .delete()
      .eq('user_id', auth.userId)
      .eq('equipment_id', equipmentId);

    if (deleteErr) {
      console.error('[/api/saved-equipment DELETE] Delete error:', deleteErr);
      throw deleteErr;
    }

    return NextResponse.json({ success: true, saved: false });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to unsave equipment' },
      { status: 500 }
    );
  }
}
