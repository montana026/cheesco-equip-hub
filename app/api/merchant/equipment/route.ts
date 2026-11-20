import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/types";
import { verifyMerchantAuth } from "@/lib/admin-auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyMerchantAuth(request);
    if (!auth.authorized) {
      return NextResponse.json(
        { error: auth.error || "Unauthorized" },
        { status: auth.status || 401 }
      );
    }

    // profileId and businessName already resolved by verifyMerchantAuth
    let profileId: string | null = auth.merchantProfileId || null;
    let businessName: string = auth.businessName || "Fleet Owner";
    let verificationStatus: string = auth.verificationStatus || "NOT_STARTED";

    // 2. Fetch all equipment listings for this merchant
    let query = supabaseServer
      .from("equipment")
      .select(`
        *,
        equipment_images(image_url, is_primary, display_order)
      `)
      .order("created_at", { ascending: false });

    if (profileId) {
      query = query.eq("merchant_id", profileId);
    }

    const { data: equipmentList, error } = await query;

    if (error) {
      console.error("Error fetching merchant equipment:", error);
      throw error;
    }

    // 3. Format listings into clean camelCase with adminFeedback extracted
    const formatted = (equipmentList || []).map((item: any) => {
      const primaryImage =
        item.equipment_images?.find((img: any) => img.is_primary)?.image_url ||
        item.equipment_images?.[0]?.image_url ||
        "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=800&q=75";

      const allImages = (item.equipment_images || []).map((img: any) => img.image_url);
      if (allImages.length === 0) {
        allImages.push(primaryImage);
      }

      // Extract admin feedback notes from specs or verification metadata
      const adminFeedback = item.specs?.admin_feedback || null;

      return {
        id: item.id,
        slug: item.slug,
        name: item.name,
        category: item.category,
        brand: item.brand,
        model: item.model,
        year: item.year,
        condition: item.condition,
        locationCity: item.location_city || "Lagos",
        locationState: item.location_state || "Lagos",
        operatingHours: item.operating_hours || 0,
        description: item.description || "",
        specs: item.specs || {},
        listingType: item.listing_type,
        salePrice: item.sale_price,
        merchantRentalRate: item.merchant_rental_rate,
        cheescoAdjustedRate: item.cheesco_adjusted_rate,
        isOperatorIncluded: Boolean(item.is_operator_included),
        isDeliveryAvailable: Boolean(item.is_delivery_available),
        verificationStatus: item.verification_status, // SUBMITTED, VERIFIED, NEEDS_INFO, REJECTED
        availabilityStatus: item.availability_status,
        images: allImages,
        primaryImage,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        adminFeedback,
      };
    });

    return NextResponse.json({
      success: true,
      data: formatted,
      count: formatted.length,
      businessName,
      verificationStatus,
    });
  } catch (error: any) {
    console.error('[/api/merchant/equipment] GET Error:', error);
    return NextResponse.json(
      { error: 'An internal error occurred. Please try again.' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // 1. Authenticate
    const auth = await verifyMerchantAuth(request);
    if (!auth.authorized) {
      return NextResponse.json(
        { error: auth.error || "Unauthorized" },
        { status: auth.status || 401 }
      );
    }

    // Rate limit: max 30 PATCH updates per minute
    const clientKey = auth.userId || getClientIp(request);
    const rateLimit = await checkRateLimit(`merchant_equipment_patch:${clientKey}`, 30, 60_000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a moment before updating equipment again." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { equipmentId, merchantRentalRate, salePrice, availabilityStatus } = body;

    if (!equipmentId) {
      return NextResponse.json({ error: "Missing equipmentId" }, { status: 400 });
    }

    // 2. Ownership check — verify the equipment belongs to this merchant's profile
    const { data: existing, error: fetchError } = await supabaseServer
      .from("equipment")
      .select("id, merchant_id")
      .eq("id", equipmentId)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: "Equipment not found" }, { status: 404 });
    }

    if (existing.merchant_id !== auth.merchantProfileId) {
      return NextResponse.json(
        { error: "Forbidden: You do not own this equipment" },
        { status: 403 }
      );
    }

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (merchantRentalRate !== undefined) {
      const rate = parseFloat(merchantRentalRate);
      updates.merchant_rental_rate = rate;
      updates.cheesco_adjusted_rate = rate * 1.15;
    }

    if (salePrice !== undefined) {
      updates.sale_price = salePrice ? parseFloat(salePrice) : null;
    }

    if (availabilityStatus) {
      updates.availability_status = availabilityStatus;
    }

    const { data, error } = await supabaseServer
      .from("equipment")
      .update(updates)
      .eq("id", equipmentId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data,
      message: "Equipment details updated successfully",
    });
  } catch (error: any) {
    console.error('[/api/merchant/equipment] PATCH Error:', error);
    return NextResponse.json(
      { error: 'An internal error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
