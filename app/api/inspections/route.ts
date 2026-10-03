import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { notificationService } from '@/lib/services/notification.service';

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

    // Verify user has operations/admin role
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userData || !['OPERATIONS_ADMIN', 'SUPER_ADMIN', 'VERIFICATION_ADMIN'].includes(userData.role)) {
      return NextResponse.json(
        { error: 'Forbidden: Operations admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Create inspection record
    const { data: inspection, error: insertError } = await supabase
      .from('inspections')
      .insert({
        rental_request_id: body.rentalRequestId,
        equipment_id: body.equipmentId,
        kind: body.kind,
        inspector_name: body.inspectorName,
        inspector_id: user.id,
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
      await supabase
        .from('rental_requests')
        .update({ current_state: 'PRE_DELIVERY_INSPECTION' })
        .eq('id', body.rentalRequestId);

      // Log state change
      await supabase.from('rental_state_history').insert({
        rental_request_id: body.rentalRequestId,
        from_state: 'CARRIER_ASSIGNED',
        to_state: 'PRE_DELIVERY_INSPECTION',
        changed_by: user.id,
        notes: 'Pre-delivery inspection completed',
      });
    } else if (body.kind === 'POST_RENTAL') {
      // After post-rental inspection, move to DEPOSIT_SETTLEMENT
      await supabase
        .from('rental_requests')
        .update({ current_state: 'POST_RENTAL_INSPECTION' })
        .eq('id', body.rentalRequestId);

      // Log state change
      await supabase.from('rental_state_history').insert({
        rental_request_id: body.rentalRequestId,
        from_state: 'RETURN_IN_PROGRESS',
        to_state: 'POST_RENTAL_INSPECTION',
        changed_by: user.id,
        notes: 'Post-rental inspection completed',
      });
    }

    // Send notifications to customer and merchant
    try {
      // Get rental request with customer and merchant info
      const { data: rentalRequest } = await supabase
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
            actionUrl: `/dashboard/customer/rentals/${rentalRequest.id}`,
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
            actionUrl: `/dashboard/customer/rentals/${rentalRequest.id}`,
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
            actionUrl: `/merchant/rentals/${rentalRequest.id}`,
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
    console.error('Error creating inspection:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to submit inspection' },
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
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let query = supabase
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
    console.error('Error fetching inspections:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch inspections' },
      { status: 500 }
    );
  }
}
