import { NextRequest, NextResponse } from 'next/server';
import { equipmentService } from '@/lib/services/equipment.service';
import type { EquipmentCategory, ListingType } from '@/lib/types';
import { supabase } from '@/lib/supabase/client';
import { storageService } from '@/lib/services/storage.service';

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

export async function POST(request: NextRequest) {
  try {
    // Verify merchant authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is a merchant
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userData || userData.role !== 'MERCHANT') {
      return NextResponse.json(
        { error: 'Forbidden: Merchant access required' },
        { status: 403 }
      );
    }

    // Get merchant profile
    const { data: merchantProfile } = await supabase
      .from('merchant_profiles')
      .select('id, verification_status')
      .eq('user_id', user.id)
      .single();

    if (!merchantProfile) {
      return NextResponse.json(
        { error: 'Merchant profile not found' },
        { status: 404 }
      );
    }

    const body = await request.json();

    // Generate slug from name
    const slug = body.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      + '-' + Date.now().toString(36);

    // Create equipment listing
    const { data: equipment, error: insertError } = await supabase
      .from('equipment')
      .insert({
        merchant_id: merchantProfile.id,
        slug,
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
        cheesco_adjusted_rate: body.merchantRentalRate ? body.merchantRentalRate * 1.15 : null, // 15% margin
        is_operator_included: body.isOperatorIncluded || false,
        is_delivery_available: body.isDeliveryAvailable !== false,
        verification_status: 'SUBMITTED', // Requires verification
        availability_status: 'UNAVAILABLE', // Until verified
      })
      .select()
      .single();

    if (insertError) {
      console.error('Equipment insert error:', insertError);
      throw new Error('Failed to create equipment listing');
    }

    // Insert images
    if (body.images && body.images.length > 0) {
      const imageInserts = body.images.map((url: string, idx: number) => ({
        equipment_id: equipment.id,
        image_url: url,
        is_primary: idx === 0,
        display_order: idx,
      }));

      await supabase.from('equipment_images').insert(imageInserts);
    }

    // Handle document uploads to Supabase Storage
    let documentUrls: string[] = [];
    if (body.documents && body.documents.length > 0) {
      const uploadResults = await storageService.uploadEquipmentDocuments(
        body.documents,
        equipment.id
      );
      documentUrls = uploadResults.map(r => r.url);

      // Insert document records
      const documentInserts = documentUrls.map((url: string, idx: number) => ({
        equipment_id: equipment.id,
        document_url: url,
        display_order: idx,
      }));

      await supabase.from('equipment_documents').insert(documentInserts);
    }

    return NextResponse.json({
      success: true,
      data: equipment,
      message: 'Equipment listing submitted for verification',
    });
  } catch (error: any) {
    console.error('Error creating equipment:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create equipment listing' },
      { status: 500 }
    );
  }
}
