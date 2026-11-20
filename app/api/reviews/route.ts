import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { checkRateLimit, checkDailyQuota, COST_CONTROLS } from '@/lib/rate-limit';
import { verifyCustomerAuth } from '@/lib/admin-auth';
import { z } from 'zod';

const createReviewSchema = z.object({
  rentalRequestId: z.string().uuid({ message: 'Invalid rentalRequestId UUID' }),
  equipmentId: z.string().uuid({ message: 'Invalid equipmentId UUID' }),
  merchantId: z.string().uuid({ message: 'Invalid merchantId UUID' }),
  overallRating: z.number().min(1, 'Rating must be at least 1').max(5, 'Rating cannot exceed 5'),
  ratings: z.object({
    equipment_condition: z.number().min(1, 'Equipment condition rating must be between 1 and 5').max(5),
    merchant_service: z.number().min(1, 'Merchant service rating must be between 1 and 5').max(5),
    delivery_experience: z.number().min(1, 'Delivery experience rating must be between 1 and 5').max(5),
    value_for_money: z.number().min(1, 'Value for money rating must be between 1 and 5').max(5),
  }),
  reviewText: z.string().max(2000, 'Review text cannot exceed 2000 characters').optional().default(''),
  wouldRecommend: z.boolean().optional().default(true),
  images: z.array(z.string()).optional().default([]),
});

export async function POST(request: NextRequest) {
  try {
    // Verify authentication via verifyCustomerAuth
    const auth = await verifyCustomerAuth(request);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: auth.status || 401 });
    }

    // Rate limiting & Abuse protection
    const rateLimit = await checkRateLimit(`review_submit:${auth.userId}`, 5, 60_000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many reviews submitted. Please wait a minute before submitting again.' },
        { status: 429 }
      );
    }

    const quota = await checkDailyQuota('review', auth.userId, COST_CONTROLS.MAX_DAILY_REVIEWS_PER_USER);
    if (!quota.allowed) {
      return NextResponse.json(
        { error: `Daily review quota reached (${COST_CONTROLS.MAX_DAILY_REVIEWS_PER_USER} reviews/day). Thank you for your feedback!` },
        { status: 429 }
      );
    }

    const rawBody = await request.json().catch(() => null);
    if (!rawBody) {
      return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 });
    }

    const parseResult = createReviewSchema.safeParse(rawBody);
    if (!parseResult.success) {
      const errorMessage = parseResult.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
      return NextResponse.json({ error: `Validation failed: ${errorMessage}` }, { status: 400 });
    }
    const body = parseResult.data;

    // Verify rental belongs to this customer and is completed
    const { data: rental, error: rentalError } = await supabaseServer
      .from('rental_requests')
      .select('*, customer:users!customer_id(full_name)')
      .eq('id', body.rentalRequestId)
      .eq('customer_id', auth.userId)
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
    const { data: existingReview } = await supabaseServer
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
    const { data: review, error: reviewError } = await supabaseServer
      .from('reviews')
      .insert({
        rental_request_id: body.rentalRequestId,
        equipment_id: body.equipmentId,
        merchant_id: body.merchantId,
        customer_id: auth.userId,
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
    console.error('[/api/reviews] POST Error:', error);
    return NextResponse.json(
      { error: 'An internal error occurred. Please try again.' },
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

    let query = supabaseServer
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
    console.error('[/api/reviews] GET Error:', error);
    return NextResponse.json(
      { error: 'An internal error occurred. Please try again.' },
      { status: 500 }
    );
  }
}

async function updateEquipmentRating(equipmentId: string) {
  try {
    // Get all approved reviews for this equipment
    const { data: reviews } = await supabaseServer
      .from('reviews')
      .select('overall_rating')
      .eq('equipment_id', equipmentId)
      .eq('status', 'APPROVED');

    if (reviews && reviews.length > 0) {
      const avgRating = reviews.reduce((sum, r) => sum + r.overall_rating, 0) / reviews.length;
      const reviewCount = reviews.length;

      // Update equipment with new rating
      await supabaseServer
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
    const { data: reviews } = await supabaseServer
      .from('reviews')
      .select('overall_rating, merchant_service_rating')
      .eq('merchant_id', merchantId)
      .eq('status', 'APPROVED');

    if (reviews && reviews.length > 0) {
      const avgRating = reviews.reduce((sum, r) => sum + r.overall_rating, 0) / reviews.length;
      const avgServiceRating = reviews.reduce((sum, r) => sum + r.merchant_service_rating, 0) / reviews.length;
      const reviewCount = reviews.length;

      // Update merchant profile with new rating
      await supabaseServer
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
