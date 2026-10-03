import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { initiateRefund } from '@/lib/services/paystack.service';
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

    // Verify user has operations/finance admin role
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userData || !['OPERATIONS_ADMIN', 'FINANCE_ADMIN', 'SUPER_ADMIN'].includes(userData.role)) {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { depositId, rentalRequestId, action, deductionAmount, reason, inspectionReferences } = body;

    // Validate action
    if (!['RELEASE', 'PARTIAL', 'FULL'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Get deposit payment record
    const { data: depositPayment, error: depositError } = await supabase
      .from('payments')
      .select('*')
      .eq('id', depositId)
      .eq('payment_type', 'DAMAGE_DEPOSIT')
      .single();

    if (depositError || !depositPayment) {
      return NextResponse.json({ error: 'Deposit not found' }, { status: 404 });
    }

    // Calculate new deposit status
    let newDepositStatus: 'RELEASED' | 'PARTIALLY_DEDUCTED' | 'FULLY_DEDUCTED';
    let refundAmount: number;

    if (action === 'RELEASE') {
      newDepositStatus = 'RELEASED';
      refundAmount = depositPayment.amount;
    } else if (action === 'FULL') {
      newDepositStatus = 'FULLY_DEDUCTED';
      refundAmount = 0;
    } else {
      newDepositStatus = 'PARTIALLY_DEDUCTED';
      refundAmount = depositPayment.amount - deductionAmount;
    }

    // Update payment record
    const { error: updateError } = await supabase
      .from('payments')
      .update({
        deposit_status: newDepositStatus,
        deposit_deduction_amount: depositPayment.amount - refundAmount,
        deposit_released_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', depositId);

    if (updateError) {
      console.error('Error updating deposit:', updateError);
      throw new Error('Failed to update deposit status');
    }

    // Trigger actual refund via Paystack if refundAmount > 0
    if (refundAmount > 0 && depositPayment.payment_reference) {
      try {
        const refundResult = await initiateRefund(
          depositPayment.payment_reference,
          refundAmount,
          reason || 'Deposit refund after rental completion'
        );

        if (refundResult.success) {
          // Update refund record with Paystack response
          await supabase
            .from('payments')
            .update({
              status: 'REFUNDED',
              gateway_response: refundResult.data,
            })
            .eq('rental_request_id', rentalRequestId)
            .eq('payment_type', 'DAMAGE_DEPOSIT')
            .eq('status', 'PENDING');
        } else {
          console.error('Paystack refund failed:', refundResult.error);
          // Keep status as PENDING for manual follow-up
        }
      } catch (refundError) {
        console.error('Error processing Paystack refund:', refundError);
        // Keep status as PENDING for manual follow-up
      }
    } else if (refundAmount > 0) {
      // Create refund record when no payment reference exists
      const { error: refundError } = await supabase
        .from('payments')
        .insert({
          rental_request_id: rentalRequestId,
          payer_id: depositPayment.payer_id,
          amount: refundAmount,
          currency: 'NGN',
          payment_type: 'DAMAGE_DEPOSIT',
          status: 'PENDING',
          payment_gateway: 'PAYSTACK',
          gateway_response: {
            type: 'REFUND_PENDING_MANUAL',
            original_payment_id: depositId,
            refund_reason: reason,
            note: 'Missing payment reference - requires manual refund',
          },
        });

        if (refundError) {
          console.error('Error creating refund record:', refundError);
        }
    }

    // Update rental state to DEPOSIT_SETTLEMENT
    const { error: stateError } = await supabase
      .from('rental_requests')
      .update({ current_state: 'DEPOSIT_SETTLEMENT' })
      .eq('id', rentalRequestId);

    if (stateError) {
      console.error('Error updating rental state:', stateError);
    }

    // Log state change
    await supabase.from('rental_state_history').insert({
      rental_request_id: rentalRequestId,
      from_state: 'POST_RENTAL_INSPECTION',
      to_state: 'DEPOSIT_SETTLEMENT',
      changed_by: user.id,
      notes: `Deposit ${newDepositStatus.toLowerCase().replace('_', ' ')}. ${
        refundAmount > 0 ? `Refund amount: ₦${refundAmount.toLocaleString()}` : 'No refund'
      }`,
    });

    // Send notification to customer about deposit settlement
    try {
      // Get rental request with customer info
      const { data: rentalRequest } = await supabase
        .from('rental_requests')
        .select(`
          *,
          customer:users!customer_id(id, full_name, email, phone)
        `)
        .eq('id', rentalRequestId)
        .single();

      if (rentalRequest) {
        const message = refundAmount === depositPayment.amount
          ? `Your full deposit of ₦${depositPayment.amount.toLocaleString()} will be refunded within 7 business days.`
          : refundAmount === 0
          ? `Your deposit of ₦${depositPayment.amount.toLocaleString()} has been fully deducted due to equipment damage.`
          : `Your deposit has been settled. Refund amount: ₦${refundAmount.toLocaleString()} (Deduction: ₦${(depositPayment.amount - refundAmount).toLocaleString()}).`;

        await notificationService.send({
          userId: rentalRequest.customer_id,
          title: 'Deposit Settled',
          message,
          type: refundAmount === 0 ? 'WARNING' : 'INFO',
          category: 'DEPOSIT',
          referenceId: rentalRequest.reference_number,
          channels: ['IN_APP', 'EMAIL', 'WHATSAPP'],
        });
      }
    } catch (notificationError) {
      console.error('Failed to send deposit settlement notification:', notificationError);
      // Don't fail the request if notifications fail
    }

    return NextResponse.json({
      success: true,
      data: {
        depositStatus: newDepositStatus,
        deductionAmount: depositPayment.amount - refundAmount,
        refundAmount,
      },
      message: 'Deposit settled successfully',
    });
  } catch (error: any) {
    console.error('Error settling deposit:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to settle deposit' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rentalRequestId = searchParams.get('rentalRequestId');

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

    if (!rentalRequestId) {
      return NextResponse.json({ error: 'Rental request ID required' }, { status: 400 });
    }

    // Get deposit payment
    const { data: deposit, error } = await supabase
      .from('payments')
      .select('*')
      .eq('rental_request_id', rentalRequestId)
      .eq('payment_type', 'DAMAGE_DEPOSIT')
      .single();

    if (error) {
      return NextResponse.json({ error: 'Deposit not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: deposit,
    });
  } catch (error: any) {
    console.error('Error fetching deposit:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch deposit' },
      { status: 500 }
    );
  }
}
