import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user has verification admin role
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userData || !['VERIFICATION_ADMIN', 'SUPER_ADMIN'].includes(userData.role)) {
      return NextResponse.json(
        { error: 'Forbidden: Verification admin access required' },
        { status: 403 }
      );
    }

    // Fetch pending equipment with merchant info and images
    const { data: equipment, error } = await supabase
      .from('equipment')
      .select(`
        *,
        merchant:merchant_profiles!inner(
          id,
          business_name,
          user:users!inner(full_name)
        ),
        images:equipment_images(image_url, is_primary, display_order)
      `)
      .in('verification_status', ['SUBMITTED', 'UNDER_REVIEW', 'MORE_INFORMATION_REQUIRED'])
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching pending equipment:', error);
      throw error;
    }

    // Format the response
    const formattedEquipment = equipment.map((eq: any) => ({
      id: eq.id,
      slug: eq.slug,
      merchantName: eq.merchant.business_name || eq.merchant.user.full_name,
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
      images: eq.images
        .sort((a: any, b: any) => a.display_order - b.display_order)
        .map((img: any) => img.image_url),
    }));

    return NextResponse.json({
      success: true,
      data: formattedEquipment,
    });
  } catch (error: any) {
    console.error('Error in pending equipment route:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch pending equipment' },
      { status: 500 }
    );
  }
}
