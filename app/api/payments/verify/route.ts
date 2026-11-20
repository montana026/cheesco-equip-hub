import { NextRequest, NextResponse } from 'next/server';
import { paymentService } from '@/lib/services/payment.service';
import { verifyCustomerAuth } from '@/lib/admin-auth';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

const ADMIN_ROLES = ['SUPER_ADMIN', 'FINANCE_ADMIN', 'OPERATIONS_ADMIN'] as const;

export async function GET(request: NextRequest) {
  try {
    // 1. Require authentication
    const auth = await verifyCustomerAuth(request);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: auth.status || 401 });
    }

    // Rate limit: max 10 verification attempts per minute per user/IP
    const clientKey = auth.userId || getClientIp(request);
    const rateLimit = await checkRateLimit(`payment_verify:${clientKey}`, 10, 60_000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many verification attempts. Please wait a moment before trying again.' },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(request.url);
    const reference = searchParams.get('reference');

    if (!reference) {
      return NextResponse.json({ error: 'reference required' }, { status: 400 });
    }

    // 2. Ownership check — look up payment before triggering provider verification
    const payment = await paymentService.getByReference(reference);
    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    const isAdmin = ADMIN_ROLES.includes(auth.role as typeof ADMIN_ROLES[number]);
    if (!isAdmin && payment.payer_id !== auth.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const result = await paymentService.verifyPayment(reference);

    // Strip internal admin/gateway fields for non-admins
    if (!isAdmin && result && (result as any).payment) {
      const {
        raw_response,
        needs_review,
        review_note,
        payout_amount,
        payout_disbursed_at,
        payout_disbursed_by,
        payout_reference,
        refund_amount,
        refund_reason,
        deposit_refunded_by,
        ...clientSafePayment
      } = (result as any).payment;
      return NextResponse.json({
        success: true,
        data: {
          ...result,
          payment: clientSafePayment,
        },
      });
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Error verifying payment:', error);
    return NextResponse.json(
      { error: 'Failed to verify payment' },
      { status: 500 }
    );
  }
}
