import { NextRequest, NextResponse } from 'next/server';
import { equipmentService } from '@/lib/services/equipment.service';
import type { EquipmentCategory, ListingType } from '@/lib/types';
import { supabaseServer } from '@/lib/supabase/server';
import { notifyAdmins, notifyUser } from '@/lib/notifications';
import { verifyMerchantAuth } from '@/lib/admin-auth';
import { checkRateLimit, COST_CONTROLS, getClientIp } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const listingParam = searchParams.get('listing');
    let listingType: ListingType | undefined = undefined;
    if (listingParam === 'buy' || listingParam === 'FOR_SALE') {
      listingType = 'FOR_SALE';
    } else if (listingParam === 'rent' || listingParam === 'FOR_RENT') {
      listingType = 'FOR_RENT';
    }

    const filters = {
      category: searchParams.get('category') as EquipmentCategory | undefined,
      listingType,
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

export async function POST(request: NextRequest) {
  try {
    // 1. Verify user authentication & resolve merchant profile
    const auth = await verifyMerchantAuth(request);
    if (!auth.authorized) {
      return NextResponse.json(
        { error: auth.error || 'Unauthorized: Invalid authentication' },
        { status: auth.status || 401 }
      );
    }

    const merchantProfile = {
      id: auth.merchantProfileId,
      business_name: auth.businessName,
    };
    const user = { id: auth.userId, email: auth.email };

    // Rate limit listing creation: max 10 per 5 minutes per user/IP
    const clientKey = auth.userId || getClientIp(request);
    const rateLimit = await checkRateLimit(`listing_create:${clientKey}`, 10, 300_000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many listings created recently. Please wait a few minutes before submitting another listing.' },
        { status: 429 }
      );
    }

    // Enforce tier listing quota (prevents spam fleets & excessive database/storage consumption)
    const isVerified = auth.verificationStatus === 'VERIFIED';
    const maxAllowedListings = isVerified
      ? COST_CONTROLS.MAX_VERIFIED_MERCHANT_LISTINGS
      : COST_CONTROLS.MAX_UNVERIFIED_MERCHANT_LISTINGS;

    const { count: existingCount, error: countError } = await supabaseServer
      .from('equipment')
      .select('id', { count: 'exact', head: true })
      .eq('merchant_id', merchantProfile.id);

    if (!countError && existingCount !== null && existingCount >= maxAllowedListings) {
      const quotaMsg = isVerified
        ? `Fleet quota reached: Your account is capped at ${maxAllowedListings} equipment listings. Contact enterprise support for higher fleet limits.`
        : `Fleet quota reached: Unverified merchants are limited to ${maxAllowedListings} equipment listings. Please submit business verification to unlock up to ${COST_CONTROLS.MAX_VERIFIED_MERCHANT_LISTINGS} listings.`;
      return NextResponse.json({ error: quotaMsg }, { status: 403 });
    }

    const body = await request.json();

    // 5. Generate unique slug from name
    const rawName = body.name || 'equipment';
    const slug =
      rawName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') +
      '-' +
      Date.now().toString(36);

    // 6. Insert equipment listing using service role to bypass RLS
    const { data: equipment, error: insertError } = await supabaseServer
      .from('equipment')
      .insert({
        merchant_id: merchantProfile.id,
        slug,
        name: body.name,
        category: body.category,
        brand: body.brand,
        model: body.model || '',
        year: body.year || new Date().getFullYear(),
        condition: body.condition || 'USED_GOOD',
        location_state: body.locationState || 'Lagos',
        location_city: body.locationCity || 'Lagos',
        operating_hours: body.operatingHours || 0,
        description: body.description || '',
        specs: body.specs || {},
        listing_type: body.listingType || 'FOR_RENT',
        sale_price: body.salePrice ?? null,
        merchant_rental_rate: body.merchantRentalRate ?? null,
        cheesco_adjusted_rate: body.merchantRentalRate ? body.merchantRentalRate * 1.15 : null,
        is_operator_included: body.isOperatorIncluded || false,
        is_delivery_available: body.isDeliveryAvailable !== false,
        verification_status: 'SUBMITTED',
        availability_status: 'AVAILABLE',
      })
      .select()
      .single();

    if (insertError) {
      console.error('[/api/equipment] Equipment insert error:', insertError);
      return NextResponse.json(
        { error: 'An internal error occurred. Please try again.' },
        { status: 500 }
      );
    }

    // 7. Insert images into equipment_images
    if (body.images && body.images.length > 0) {
      const imageInserts = body.images.map((url: string, idx: number) => ({
        equipment_id: equipment.id,
        image_url: url,
        is_primary: idx === 0,
        display_order: idx,
      }));

      const { error: imgErr } = await supabaseServer
        .from('equipment_images')
        .insert(imageInserts);

      if (imgErr) {
        console.warn('Equipment images insert warning:', imgErr);
      }
    }

    // 8. Handle document URLs if present
    if (body.documents && Array.isArray(body.documents) && body.documents.length > 0) {
      try {
        const documentUrls = body.documents
          .map((d: any) => (typeof d === 'string' ? d : d.url || d.document_url))
          .filter(Boolean);

        const documentInserts = documentUrls.map((url: string, idx: number) => ({
          equipment_id: equipment.id,
          document_url: url,
          display_order: idx,
        }));

        if (documentInserts.length > 0) {
          await supabaseServer.from('equipment_documents').insert(documentInserts);
        }
      } catch (docErr) {
        console.warn('Document storage warning:', docErr);
      }
    }

    // 9. Dispatch notifications to Admin team and Merchant
    try {
      await notifyAdmins(['OPERATIONS_ADMIN', 'VERIFICATION_ADMIN', 'SUPER_ADMIN'], {
        title: `🚜 New Equipment Submitted for Verification`,
        message: `Merchant "${merchantProfile.business_name || 'Fleet Owner'}" submitted "${equipment.name}" (${equipment.category}) for review.`,
        link: '/admin/operations',
        type: 'SYSTEM',
      });

      if (user?.id) {
        await notifyUser(user.id, {
          title: 'Equipment Listing Submitted',
          message: `Your machinery "${equipment.name}" was submitted and is now in the review queue.`,
          link: '/merchant/equipment',
          type: 'SYSTEM',
        });
      }
    } catch (notifErr) {
      console.warn('Equipment notification dispatch notice:', notifErr);
    }

    return NextResponse.json({
      success: true,
      data: equipment,
      message: 'Equipment listing submitted successfully for verification',
    });
  } catch (error: any) {
    console.error('[/api/equipment] Error in equipment POST route:', error);
    return NextResponse.json(
      { error: 'An internal error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
