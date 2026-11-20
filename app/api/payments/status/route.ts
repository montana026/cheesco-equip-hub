import { NextRequest, NextResponse } from 'next/server';
import { paymentService, PAYMENT_STATUS } from '@/lib/services/payment.service';
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

    // Rate limit: max 30 requests per minute per user/IP
    const clientKey = auth.userId || getClientIp(request);
    const rateLimit = await checkRateLimit(`payment_status:${clientKey}`, 30, 60_000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a moment before checking payment status again.' },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(request.url);
    const ref = searchParams.get('ref');

    if (!ref) {
      return NextResponse.json({ error: 'Missing ref parameter' }, { status: 400 });
    }

    let payment = await paymentService.getByReference(ref);
    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    // 2. Ownership check — caller must be the payer OR an admin
    const isAdmin = ADMIN_ROLES.includes(auth.role as typeof ADMIN_ROLES[number]);
    if (!isAdmin && payment.payer_id !== auth.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Proactive gateway check:
    // If not yet CONFIRMED and provider is Paystack/Flutterwave, check with provider directly
    const isAlreadyConfirmed = payment.status === PAYMENT_STATUS.CONFIRMED;

    if (!isAlreadyConfirmed && (payment.provider === 'paystack' || payment.provider === 'flutterwave')) {
      try {
        await paymentService.verifyPayment(ref);
        const refreshed = await paymentService.getByReference(ref);
        if (refreshed) payment = refreshed;
      } catch {
        // Provider might not have received payment yet, continue returning current record
      }
    }

    // 3. For non-admins, strip internal admin/gateway fields (raw_response, payout_*, refund_*, needs_review)
    if (!isAdmin && payment) {
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
      } = payment as any;
      return NextResponse.json({ success: true, payment: clientSafePayment });
    }

    return NextResponse.json({ success: true, payment });
  } catch (error: any) {
    console.error('Error fetching payment status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payment status' },
      { status: 500 }
    );
  }
}
