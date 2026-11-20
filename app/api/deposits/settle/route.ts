import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { initiateRefund } from '@/lib/services/paystack.service';
import { notificationService } from '@/lib/services/notification.service';
import { verifyAdminAuth, verifyCustomerAuth } from '@/lib/admin-auth';
import { PAYMENT_STATUS, DEPOSIT_STATUS, type DepositStatus } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAdminAuth(request, ['OPERATIONS_ADMIN', 'FINANCE_ADMIN', 'SUPER_ADMIN']);
    if (!auth.authorized) {
      return NextResponse.json(
        { error: auth.error || 'Forbidden: Admin access required' },
        { status: auth.status || 403 }
      );
    }

    const body = await request.json();
    const { depositId, rentalRequestId, action, deductionAmount, reason, inspectionReferences } = body;

    // Validate action
    if (!['RELEASE', 'PARTIAL', 'FULL'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Get deposit payment record
    const { data: depositPayment, error: depositError } = await supabaseServer
      .from('payments')
      .select('*')
      .eq('id', depositId)
      .eq('payment_type', 'DAMAGE_DEPOSIT')
      .single();

    if (depositError || !depositPayment) {
      return NextResponse.json({ error: 'Deposit not found' }, { status: 404 });
    }

    // Calculate new deposit status
    let newDepositStatus: DepositStatus;
    let refundAmount: number;

    if (action === 'RELEASE') {
      newDepositStatus = DEPOSIT_STATUS.RELEASED;
      refundAmount = depositPayment.amount;
    } else if (action === 'FULL') {
      newDepositStatus = DEPOSIT_STATUS.FULLY_DEDUCTED;
      refundAmount = 0;
    } else {
      newDepositStatus = DEPOSIT_STATUS.PARTIALLY_DEDUCTED;
      refundAmount = depositPayment.amount - deductionAmount;
    }

    // Update payment record atomically only if currently HELD
    const { data: updatedPaymentRows, error: updateError } = await supabaseServer
      .from('payments')
      .update({
        deposit_status: newDepositStatus,
        deposit_deduction_amount: depositPayment.amount - refundAmount,
        deposit_released_at: new Date().toISOString(),
        refund_amount: refundAmount,
        deposit_refunded_by: auth.userId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', depositId)
      .eq('deposit_status', DEPOSIT_STATUS.HELD)
      .select('id');

    if (updateError) {
      console.error('Error updating deposit:', updateError);
      throw new Error('Failed to update deposit status');
    }

    if (!updatedPaymentRows || updatedPaymentRows.length === 0) {
      return NextResponse.json({
        error: `Deposit cannot be settled: current status is '${depositPayment.deposit_status}', expected 'HELD'`,
      }, { status: 409 });
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
          await supabaseServer
            .from('payments')
            .update({
              status: PAYMENT_STATUS.REFUNDED,
              gateway_response: refundResult.data,
            })
            .eq('rental_request_id', rentalRequestId)
            .eq('payment_type', 'DAMAGE_DEPOSIT')
            .eq('status', PAYMENT_STATUS.PENDING);
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
      const { error: refundError } = await supabaseServer
        .from('payments')
        .insert({
          rental_request_id: rentalRequestId,
          payer_id: depositPayment.payer_id,
          amount: refundAmount,
          currency: 'NGN',
          payment_type: 'DAMAGE_DEPOSIT',
          status: PAYMENT_STATUS.PENDING,
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
    const { error: stateError } = await supabaseServer
      .from('rental_requests')
      .update({ current_state: 'DEPOSIT_SETTLEMENT' })
      .eq('id', rentalRequestId);

    if (stateError) {
      console.error('Error updating rental state:', stateError);
    }

    // Log state change
    await supabaseServer.from('rental_state_history').insert({
      rental_request_id: rentalRequestId,
      from_state: 'POST_RENTAL_INSPECTION',
      to_state: 'DEPOSIT_SETTLEMENT',
      changed_by: auth.userId || null,
      notes: `Deposit ${newDepositStatus.toLowerCase().replace('_', ' ')}. ${
        refundAmount > 0 ? `Refund amount: ₦${refundAmount.toLocaleString()}` : 'No refund'
      }`,
    });

    // Send notification to customer about deposit settlement
    try {
      // Get rental request with customer info
      const { data: rentalRequest } = await supabaseServer
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
    console.error('[/api/deposits/settle] Error settling deposit:', error);
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

    // Verify authentication
    const auth = await verifyCustomerAuth(request);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: auth.status || 401 });
    }

    if (!rentalRequestId) {
      return NextResponse.json({ error: 'Rental request ID required' }, { status: 400 });
    }

    const isAdmin = ['OPERATIONS_ADMIN', 'FINANCE_ADMIN', 'SUPER_ADMIN'].includes(auth.role);
    if (!isAdmin) {
      const { data: rental } = await supabaseServer
        .from('rental_requests')
        .select('customer_id, merchant_id')
        .eq('id', rentalRequestId)
        .maybeSingle();

      if (!rental) {
        return NextResponse.json({ error: 'Rental request not found' }, { status: 404 });
      }

      let isMerchant = false;
      if (rental.merchant_id) {
        const { data: merchantProfile } = await supabaseServer
          .from('merchant_profiles')
          .select('id')
          .eq('user_id', auth.userId)
          .maybeSingle();

        if (merchantProfile && merchantProfile.id === rental.merchant_id) {
          isMerchant = true;
        }
      }

      const isCustomer = rental.customer_id === auth.userId;
      if (!isCustomer && !isMerchant) {
        return NextResponse.json(
          { error: 'Forbidden: You do not have access to this deposit' },
          { status: 403 }
        );
      }
    }

    // Get deposit payment
    const { data: deposit, error } = await supabaseServer
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
    console.error('[/api/deposits/settle] Error fetching deposit:', error);
    return NextResponse.json(
      { error: 'An internal error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
