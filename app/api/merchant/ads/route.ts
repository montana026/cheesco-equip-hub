import { NextRequest, NextResponse } from 'next/server';
import { verifyMerchantAuth } from '@/lib/admin-auth';
import { adCampaignService } from '@/lib/services/ad-campaign.service';
import { supabaseServer } from '@/lib/supabase/server';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyMerchantAuth(request);
    if (!auth.authorized) {
      return NextResponse.json(
        { error: auth.error || 'Unauthorized: Please log in as a merchant' },
        { status: auth.status || 401 }
      );
    }

    // 1. Fetch live ad campaigns for this merchant
    const campaigns = await adCampaignService.listMerchantCampaigns(auth.merchantProfileId);

    // 2. Fetch the merchant's real equipment fleet
    const { data: equipmentList, error: eqErr } = await supabaseServer
      .from('equipment')
      .select(`
        id,
        name,
        slug,
        category,
        brand,
        model,
        location_city,
        location_state,
        verification_status,
        availability_status,
        promotion_tier,
        promotion_expires_at,
        equipment_images (image_url, is_primary)
      `)
      .eq('merchant_id', auth.merchantProfileId)
      .order('created_at', { ascending: false });

    if (eqErr) {
      console.error('Error fetching merchant equipment for ads:', eqErr);
    }

    const formattedEquipment = (equipmentList || []).map((e: any) => ({
      id: e.id,
      name: e.name,
      slug: e.slug,
      category: e.category,
      brand: e.brand,
      model: e.model,
      locationCity: e.location_city,
      locationState: e.location_state,
      verificationStatus: e.verification_status,
      availabilityStatus: e.availability_status,
      promotionTier: e.promotion_tier || 'NONE',
      promotionExpiresAt: e.promotion_expires_at,
      primaryImage:
        e.equipment_images?.find((img: any) => img.is_primary)?.image_url ||
        e.equipment_images?.[0]?.image_url ||
        'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=800&q=70',
    }));

    return NextResponse.json({
      success: true,
      data: {
        campaigns,
        equipment: formattedEquipment,
      },
    });
  } catch (error: any) {
    console.error('[/api/merchant/ads] GET Error:', error);
    return NextResponse.json(
      { error: 'An internal error occurred. Please try again.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyMerchantAuth(request);
    if (!auth.authorized) {
      return NextResponse.json(
        { error: auth.error || 'Unauthorized: Please log in as a merchant' },
        { status: auth.status || 401 }
      );
    }

    // Rate limit: max 10 campaign creations per 5 minutes per user/IP
    const clientKey = `ad_create:${auth.userId || getClientIp(request)}`;
    const rateLimit = await checkRateLimit(clientKey, 10, 300_000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a few minutes before launching another campaign.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { equipmentId, packageType, provider = 'paystack' } = body;

    if (!equipmentId || !packageType) {
      return NextResponse.json(
        { error: 'Missing required fields: equipmentId and packageType are required' },
        { status: 400 }
      );
    }

    const result = await adCampaignService.createCampaign(auth.merchantProfileId, {
      equipmentId,
      packageType,
      provider,
      email: auth.email,
      name: auth.businessName,
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Ad campaign created successfully',
    });
  } catch (error: any) {
    console.error('[/api/merchant/ads] POST Error:', error);
    return NextResponse.json(
      { error: 'An internal error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
