import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { notificationService } from '@/lib/services/notification.service';
import { verifyCustomerAuth } from '@/lib/admin-auth';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { z } from 'zod';

const ADMIN_ROLES = ['OPERATIONS_ADMIN', 'SUPER_ADMIN', 'VERIFICATION_ADMIN', 'FINANCE_ADMIN', 'SUPPORT_ADMIN'];

const createInspectionSchema = z.object({
  rentalRequestId: z.string().uuid({ message: 'Invalid rentalRequestId UUID' }),
  equipmentId: z.string().uuid({ message: 'Invalid equipmentId UUID' }),
  kind: z.enum(['PRE_DELIVERY', 'POST_RENTAL'], {
    message: 'kind must be either PRE_DELIVERY or POST_RENTAL',
  }),
  inspectorName: z.string().min(1, 'inspectorName is required').max(200),
  hourMeterReading: z.number({ message: 'hourMeterReading is required' }).min(0, 'hourMeterReading must be greater than or equal to 0'),
  checklist: z.any().optional().default({}),
  conditionPhotos: z.array(z.string()).optional().default([]),
  inspectionNotes: z.string().max(2000, 'inspectionNotes cannot exceed 2000 characters').optional().default(''),
  depositDeductionRecommendation: z.number().min(0).optional().default(0),
});

export async function POST(request: NextRequest) {
  try {
    // Verify authentication via verifyCustomerAuth
    const auth = await verifyCustomerAuth(request);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: auth.status || 401 });
    }

    // Verify user has operations/admin role
    if (!['OPERATIONS_ADMIN', 'SUPER_ADMIN', 'VERIFICATION_ADMIN'].includes(auth.role)) {
      return NextResponse.json(
        { error: 'Forbidden: Operations admin access required' },
        { status: 403 }
      );
    }

    const rawBody = await request.json().catch(() => null);
    if (!rawBody) {
      return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 });
    }

    const parseResult = createInspectionSchema.safeParse(rawBody);
    if (!parseResult.success) {
      const errorMessage = parseResult.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
      return NextResponse.json({ error: `Validation failed: ${errorMessage}` }, { status: 400 });
    }
    const body = parseResult.data;

    // Create inspection record
    const { data: inspection, error: insertError } = await supabaseServer
      .from('inspections')
      .insert({
        rental_request_id: body.rentalRequestId,
        equipment_id: body.equipmentId,
        kind: body.kind,
        inspector_name: body.inspectorName,
        inspector_id: auth.userId,
        hour_meter_reading: body.hourMeterReading,
        checklist: body.checklist,
        condition_photos: body.conditionPhotos,
        inspection_notes: body.inspectionNotes,
        deposit_deduction_recommendation: body.depositDeductionRecommendation,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Inspection insert error:', insertError);
      throw new Error('Failed to create inspection record');
    }

    // Update rental state based on inspection kind
    if (body.kind === 'PRE_DELIVERY') {
      // After pre-delivery inspection, move to READY_FOR_DISPATCH or IN_TRANSIT
      await supabaseServer
        .from('rental_requests')
        .update({ current_state: 'PRE_DELIVERY_INSPECTION' })
        .eq('id', body.rentalRequestId);

      // Log state change
      await supabaseServer.from('rental_state_history').insert({
        rental_request_id: body.rentalRequestId,
        from_state: 'CARRIER_ASSIGNED',
        to_state: 'PRE_DELIVERY_INSPECTION',
        changed_by: auth.userId,
        notes: 'Pre-delivery inspection completed',
      });
    } else if (body.kind === 'POST_RENTAL') {
      // After post-rental inspection, move to DEPOSIT_SETTLEMENT
      await supabaseServer
        .from('rental_requests')
        .update({ current_state: 'POST_RENTAL_INSPECTION' })
        .eq('id', body.rentalRequestId);

      // Log state change
      await supabaseServer.from('rental_state_history').insert({
        rental_request_id: body.rentalRequestId,
        from_state: 'RETURN_IN_PROGRESS',
        to_state: 'POST_RENTAL_INSPECTION',
        changed_by: auth.userId,
        notes: 'Post-rental inspection completed',
      });
    }

    // Send notifications to customer and merchant
    try {
      // Get rental request with customer and merchant info
      const { data: rentalRequest } = await supabaseServer
        .from('rental_requests')
        .select(`
          *,
          customer:users!customer_id(id, full_name),
          merchant:merchant_profiles!merchant_id(id, business_name)
        `)
        .eq('id', body.rentalRequestId)
        .single();

      if (rentalRequest) {
        const equipmentName = body.equipmentId; // We'll fetch this if needed

        if (body.kind === 'PRE_DELIVERY') {
          // Notify customer that pre-delivery inspection is complete
          await notificationService.send({
            userId: rentalRequest.customer_id,
            title: 'Pre-Delivery Inspection Complete',
            message: `The pre-delivery inspection for your rental ${rentalRequest.reference_number} has been completed. Equipment is being prepared for dispatch.`,
            type: 'SUCCESS',
            category: 'INSPECTION',
            referenceId: rentalRequest.reference_number,
            actionUrl: `/dashboard/customer?requestId=${rentalRequest.id}`,
            channels: ['IN_APP', 'EMAIL', 'WHATSAPP'],
          });
        } else if (body.kind === 'POST_RENTAL') {
          // Notify customer that post-rental inspection is complete
          await notificationService.send({
            userId: rentalRequest.customer_id,
            title: 'Post-Rental Inspection Complete',
            message: `The post-rental inspection for ${rentalRequest.reference_number} has been completed. Deposit settlement will begin shortly.`,
            type: 'INFO',
            category: 'INSPECTION',
            referenceId: rentalRequest.reference_number,
            actionUrl: `/dashboard/customer?requestId=${rentalRequest.id}`,
            channels: ['IN_APP', 'EMAIL', 'WHATSAPP'],
          });

          // Notify merchant about post-rental inspection
          await notificationService.send({
            userId: rentalRequest.merchant_id,
            title: 'Post-Rental Inspection Complete',
            message: `Post-rental inspection for rental ${rentalRequest.reference_number} has been completed. Your equipment has been returned.`,
            type: 'SUCCESS',
            category: 'INSPECTION',
            referenceId: rentalRequest.reference_number,
            actionUrl: '/merchant/dashboard',
            channels: ['IN_APP', 'EMAIL'],
          });
        }
      }
    } catch (notificationError) {
      console.error('Failed to send inspection notifications:', notificationError);
      // Don't fail the request if notifications fail
    }

    return NextResponse.json({
      success: true,
      data: inspection,
      message: 'Inspection submitted successfully',
    });
  } catch (error: any) {
    console.error('[/api/inspections] Error creating inspection:', error);
    return NextResponse.json(
      { error: 'An internal error occurred. Please try again.' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rentalRequestId = searchParams.get('rentalRequestId');
    const equipmentId = searchParams.get('equipmentId');

    // Verify authentication
    const auth = await verifyCustomerAuth(request);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: auth.status || 401 });
    }

    const clientKey = auth.userId || getClientIp(request);
    const rateLimit = await checkRateLimit(`inspections_get:${clientKey}`, 30, 60_000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a moment before trying again.' },
        { status: 429 }
      );
    }

    const isAdmin = ADMIN_ROLES.includes(auth.role);
    if (!isAdmin) {
      // Non-admins cannot dump all inspections
      if (!rentalRequestId && !equipmentId) {
        return NextResponse.json(
          { error: 'Forbidden: Insufficient permissions to list all inspections' },
          { status: 403 }
        );
      }

      // Check caller's merchant profile if applicable
      let callerMerchantProfileId: string | null = null;
      const { data: callerProfile } = await supabaseServer
        .from('merchant_profiles')
        .select('id')
        .eq('user_id', auth.userId)
        .maybeSingle();

      if (callerProfile) {
        callerMerchantProfileId = callerProfile.id;
      }

      if (rentalRequestId) {
        const { data: rental } = await supabaseServer
          .from('rental_requests')
          .select('customer_id, merchant_id')
          .eq('id', rentalRequestId)
          .maybeSingle();

        if (!rental) {
          return NextResponse.json({ error: 'Rental request not found' }, { status: 404 });
        }

        const isCustomer = rental.customer_id === auth.userId;
        const isMerchant = Boolean(callerMerchantProfileId && rental.merchant_id === callerMerchantProfileId);

        if (!isCustomer && !isMerchant) {
          return NextResponse.json(
            { error: 'Forbidden: You do not have access to this rental inspection' },
            { status: 403 }
          );
        }
      }

      if (equipmentId) {
        const { data: equip } = await supabaseServer
          .from('equipment')
          .select('merchant_id')
          .eq('id', equipmentId)
          .maybeSingle();

        if (!equip) {
          return NextResponse.json({ error: 'Equipment not found' }, { status: 404 });
        }

        const isMerchantOwner = Boolean(callerMerchantProfileId && equip.merchant_id === callerMerchantProfileId);
        if (!isMerchantOwner) {
          return NextResponse.json(
            { error: 'Forbidden: You do not own this equipment' },
            { status: 403 }
          );
        }
      }
    }

    let query = supabaseServer
      .from('inspections')
      .select('*')
      .order('inspected_at', { ascending: false });

    if (rentalRequestId) {
      query = query.eq('rental_request_id', rentalRequestId);
    }

    if (equipmentId) {
      query = query.eq('equipment_id', equipmentId);
    }

    const { data: inspections, error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      data: inspections,
    });
  } catch (error: any) {
    console.error('[/api/inspections] Error fetching inspections:', error);
    return NextResponse.json(
      { error: 'An internal error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
