import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { verifyAdminAuth } from '@/lib/admin-auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAdminAuth(request, [
      'VERIFICATION_ADMIN',
      'OPERATIONS_ADMIN',
      'SUPER_ADMIN',
    ]);

    if (!auth.authorized) {
      return NextResponse.json(
        { error: auth.error || 'Forbidden: Admin access required' },
        { status: auth.status || 403 }
      );
    }

    // Fetch pending equipment with merchant info using supabaseServer
    const { data: equipment, error } = await supabaseServer
      .from('equipment')
      .select(`
        *,
        merchant:merchant_profiles(
          id,
          business_name,
          user:users!merchant_profiles_user_id_fkey(full_name, email, phone)
        ),
        equipment_images(image_url, is_primary)
      `)
      .neq('verification_status', 'VERIFIED')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching pending equipment:', error);
      const { data: fallbackEq } = await supabaseServer
        .from('equipment')
        .select('*')
        .neq('verification_status', 'VERIFIED')
        .order('created_at', { ascending: false });

      return NextResponse.json({
        success: true,
        data: (fallbackEq || []).map((eq: any) => ({
          id: eq.id,
          slug: eq.slug,
          merchantName: eq.merchant_name || 'Fleet Merchant',
          name: eq.name,
          category: eq.category,
          brand: eq.brand,
          model: eq.model,
          year: eq.year,
          condition: eq.condition,
          locationState: eq.location_state || 'Lagos',
          locationCity: eq.location_city || 'Ikeja',
          listingType: eq.listing_type,
          merchantRentalRate: eq.merchant_rental_rate || 0,
          salePrice: eq.sale_price,
          verificationStatus: eq.verification_status,
          createdAt: eq.created_at,
          images: Array.isArray(eq.images) && eq.images.length > 0 ? eq.images : ["https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=800&q=70"],
          privateDocuments: Array.isArray(eq.private_documents) ? eq.private_documents : [],
        })),
      });
    }

    // Format response
    const formattedEquipment = (equipment || []).map((eq: any) => {
      let imgList: string[] = [];
      if (Array.isArray(eq.equipment_images) && eq.equipment_images.length > 0) {
        imgList = eq.equipment_images.map((i: any) => i.image_url).filter(Boolean);
      } else if (Array.isArray(eq.images) && eq.images.length > 0) {
        imgList = eq.images;
      } else if (typeof eq.images === 'string') {
        try { imgList = JSON.parse(eq.images); } catch { imgList = [eq.images]; }
      }
      if (imgList.length === 0) {
        imgList = ["https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=800&q=70"];
      }

      return {
        id: eq.id,
        slug: eq.slug,
        merchantName: eq.merchant?.business_name || eq.merchant?.user?.full_name || eq.merchant_name || 'Fleet Merchant',
        merchantEmail: eq.merchant?.user?.email || '',
        merchantPhone: eq.merchant?.user?.phone || '',
        name: eq.name,
        category: eq.category,
        brand: eq.brand,
        model: eq.model,
        year: eq.year,
        condition: eq.condition,
        locationState: eq.location_state,
        locationCity: eq.location_city,
        listingType: eq.listing_type,
        merchantRentalRate: eq.merchant_rental_rate,
        salePrice: eq.sale_price,
        verificationStatus: eq.verification_status,
        createdAt: eq.created_at,
        images: imgList,
        privateDocuments: Array.isArray(eq.private_documents) ? eq.private_documents : [],
      };
    });

    return NextResponse.json({
      success: true,
      data: formattedEquipment,
    });
  } catch (error: any) {
    console.error('[/api/admin/equipment/pending] Error:', error);
    return NextResponse.json(
      { error: 'An internal error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
