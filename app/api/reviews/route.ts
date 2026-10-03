import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function POST(request: NextRequest) {
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

    const body = await request.json();

    // Verify rental belongs to this customer and is completed
    const { data: rental, error: rentalError } = await supabase
      .from('rental_requests')
      .select('*, customer:users!customer_id(full_name)')
      .eq('id', body.rentalRequestId)
      .eq('customer_id', user.id)
      .single();

    if (rentalError || !rental) {
      return NextResponse.json({ error: 'Rental not found' }, { status: 404 });
    }

    // Verify rental is completed
    if (rental.current_state !== 'COMPLETED') {
      return NextResponse.json(
        { error: 'Can only review completed rentals' },
        { status: 400 }
      );
    }

    // Check if review already exists
    const { data: existingReview } = await supabase
      .from('reviews')
      .select('id')
      .eq('rental_request_id', body.rentalRequestId)
      .single();

    if (existingReview) {
      return NextResponse.json(
        { error: 'Review already submitted for this rental' },
        { status: 400 }
      );
    }

    // Create review
    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .insert({
        rental_request_id: body.rentalRequestId,
        equipment_id: body.equipmentId,
        merchant_id: body.merchantId,
        customer_id: user.id,
        overall_rating: body.overallRating,
        equipment_condition_rating: body.ratings.equipment_condition,
        merchant_service_rating: body.ratings.merchant_service,
        delivery_experience_rating: body.ratings.delivery_experience,
        value_for_money_rating: body.ratings.value_for_money,
        review_text: body.reviewText,
        would_recommend: body.wouldRecommend,
        review_images: body.images || [],
        status: 'PENDING_MODERATION',
      })
      .select()
      .single();

    if (reviewError) {
      console.error('Review insert error:', reviewError);
      throw new Error('Failed to submit review');
    }

    // Update equipment average rating
    await updateEquipmentRating(body.equipmentId);

    // Update merchant average rating
    await updateMerchantRating(body.merchantId);

    // TODO: Send notification to merchant about new review

    return NextResponse.json({
      success: true,
      data: review,
      message: 'Review submitted successfully',
    });
  } catch (error: any) {
    console.error('Error submitting review:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to submit review' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const equipmentId = searchParams.get('equipmentId');
    const merchantId = searchParams.get('merchantId');
    const status = searchParams.get('status') || 'APPROVED';

    let query = supabase
      .from('reviews')
      .select(`
        *,
        customer:users!customer_id(full_name, avatar_url),
        equipment:equipment(name),
        rental:rental_requests(reference_number)
      `)
      .eq('status', status)
      .order('created_at', { ascending: false });

    if (equipmentId) {
      query = query.eq('equipment_id', equipmentId);
    }

    if (merchantId) {
      query = query.eq('merchant_id', merchantId);
    }

    const { data: reviews, error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      data: reviews,
    });
  } catch (error: any) {
    console.error('Error fetching reviews:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch reviews' },
      { status: 500 }
    );
  }
}

async function updateEquipmentRating(equipmentId: string) {
  try {
    // Get all approved reviews for this equipment
    const { data: reviews } = await supabase
      .from('reviews')
      .select('overall_rating')
      .eq('equipment_id', equipmentId)
      .eq('status', 'APPROVED');

    if (reviews && reviews.length > 0) {
      const avgRating = reviews.reduce((sum, r) => sum + r.overall_rating, 0) / reviews.length;
      const reviewCount = reviews.length;

      // Update equipment with new rating
      await supabase
        .from('equipment')
        .update({
          average_rating: avgRating,
          review_count: reviewCount,
        })
        .eq('id', equipmentId);
    }
  } catch (error) {
    console.error('Error updating equipment rating:', error);
  }
}

async function updateMerchantRating(merchantId: string) {
  try {
    // Get all approved reviews for this merchant
    const { data: reviews } = await supabase
      .from('reviews')
      .select('overall_rating, merchant_service_rating')
      .eq('merchant_id', merchantId)
      .eq('status', 'APPROVED');

    if (reviews && reviews.length > 0) {
      const avgRating = reviews.reduce((sum, r) => sum + r.overall_rating, 0) / reviews.length;
      const avgServiceRating = reviews.reduce((sum, r) => sum + r.merchant_service_rating, 0) / reviews.length;
      const reviewCount = reviews.length;

      // Update merchant profile with new rating
      await supabase
        .from('merchant_profiles')
        .update({
          average_rating: avgRating,
          average_service_rating: avgServiceRating,
          review_count: reviewCount,
        })
        .eq('id', merchantId);
    }
  } catch (error) {
    console.error('Error updating merchant rating:', error);
  }
}
