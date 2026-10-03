import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const { data, error } = await supabase
      .from('equipment')
      .select(`
        *,
        merchant:merchant_profiles(id, business_name, verification_status),
        images:equipment_images(image_url, is_primary, display_order),
        reviews:reviews(
          overall_rating,
          equipment_condition_rating,
          merchant_service_rating,
          delivery_experience_rating,
          value_for_money_rating,
          review_text,
          would_recommend,
          created_at,
          customer:users(full_name)
        )
      `)
      .eq('id', id)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: 'Equipment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error('Error fetching equipment:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch equipment' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const authHeader = request.headers.get('authorization');

    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify equipment belongs to merchant
    const { data: equipment } = await supabase
      .from('equipment')
      .select('merchant_id')
      .eq('id', id)
      .single();

    if (!equipment) {
      return NextResponse.json(
        { error: 'Equipment not found' },
        { status: 404 }
      );
    }

    const { data: merchantProfile } = await supabase
      .from('merchant_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!merchantProfile || merchantProfile.id !== equipment.merchant_id) {
      return NextResponse.json(
        { error: 'Forbidden: Not your equipment' },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Update equipment
    const { data: updated, error: updateError } = await supabase
      .from('equipment')
      .update({
        name: body.name,
        category: body.category,
        brand: body.brand,
        model: body.model,
        year: body.year,
        condition: body.condition,
        location_state: body.locationState,
        location_city: body.locationCity,
        operating_hours: body.operatingHours || 0,
        description: body.description || '',
        specs: body.specs || {},
        listing_type: body.listingType,
        sale_price: body.salePrice,
        merchant_rental_rate: body.merchantRentalRate,
        cheesco_adjusted_rate: body.merchantRentalRate ? body.merchantRentalRate * 1.15 : null,
        is_operator_included: body.isOperatorIncluded || false,
        is_delivery_available: body.isDeliveryAvailable !== false,
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Equipment updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating equipment:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update equipment' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const authHeader = request.headers.get('authorization');

    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify equipment belongs to merchant
    const { data: equipment } = await supabase
      .from('equipment')
      .select('merchant_id')
      .eq('id', id)
      .single();

    if (!equipment) {
      return NextResponse.json(
        { error: 'Equipment not found' },
        { status: 404 }
      );
    }

    const { data: merchantProfile } = await supabase
      .from('merchant_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!merchantProfile || merchantProfile.id !== equipment.merchant_id) {
      return NextResponse.json(
        { error: 'Forbidden: Not your equipment' },
        { status: 403 }
      );
    }

    // Delete equipment (cascade will handle images, documents, etc.)
    const { error: deleteError } = await supabase
      .from('equipment')
      .delete()
      .eq('id', id);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({
      success: true,
      message: 'Equipment deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting equipment:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete equipment' },
      { status: 500 }
    );
  }
}
