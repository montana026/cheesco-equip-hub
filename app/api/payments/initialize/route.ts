import { NextRequest, NextResponse } from 'next/server';
import { paymentService, PaymentProvider } from '@/lib/services/payment.service';
import { verifyCustomerAuth } from '@/lib/admin-auth';
import { supabaseServer } from '@/lib/supabase/server';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const quotationId = body.quotation_id || body.quotationId;
    const provider: PaymentProvider = body.provider || 'paystack';
    const email = body.email;
    const name = body.name;

    if (!quotationId) {
      return NextResponse.json({ error: 'Missing quotation_id' }, { status: 400 });
    }

    if (!['paystack', 'flutterwave', 'bank_transfer'].includes(provider)) {
      return NextResponse.json(
        { error: 'Invalid provider. Must be paystack, flutterwave, or bank_transfer' },
        { status: 400 }
      );
    }

    // Authenticate user
    const auth = await verifyCustomerAuth(request);
    if (!auth.authorized) {
      return NextResponse.json(
        { error: auth.error || 'Unauthorized' },
        { status: auth.status || 401 }
      );
    }

    // Rate limiting (max 15 checkout initializations per minute per user/IP; fail closed on Redis errors)
    const clientKey = `pay_init:${auth.userId || getClientIp(request)}`;
    const rateLimit = await checkRateLimit(clientKey, 15, 60_000, { failClosed: true });
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many payment requests. Please wait a minute before retrying.' },
        { status: 429 }
      );
    }

    // Fetch quotation to verify ownership
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(quotationId);
    let quotationQuery = supabaseServer
      .from('quotations')
      .select('*, rental_requests(id, customer_id)');

    if (isUuid) {
      quotationQuery = quotationQuery.eq('id', quotationId);
    } else {
      quotationQuery = quotationQuery.eq('reference_number', quotationId);
    }

    const { data: quotation, error: quotationError } = await quotationQuery.maybeSingle();

    if (quotationError || !quotation) {
      console.error('Quotation not found in /api/payments/initialize:', quotationError, { quotationId });
      return NextResponse.json({ error: 'Quotation not found' }, { status: 404 });
    }

    const reqObj = Array.isArray(quotation.rental_requests)
      ? quotation.rental_requests[0]
      : quotation.rental_requests;
    const requestCustomerId = reqObj?.customer_id;

    // Fetch user details for customer
    let customerFullName = '';
    let customerUserEmail = '';
    if (requestCustomerId) {
      const { data: userProfile } = await supabaseServer
        .from('users')
        .select('full_name, email, phone')
        .eq('id', requestCustomerId)
        .maybeSingle();
      if (userProfile) {
        customerFullName = userProfile.full_name || '';
        customerUserEmail = userProfile.email || '';
      }
    }

    const isOwner = !requestCustomerId || requestCustomerId === auth.userId || (customerUserEmail && auth.email === customerUserEmail);
    const isAdmin = ['SUPER_ADMIN', 'OPERATIONS_ADMIN', 'FINANCE_ADMIN', 'ADMIN'].includes(auth.role || '');
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden: Not your quotation' }, { status: 403 });
    }

    // Call payment service (which securely loads amount from DB, creates reference and pending payment)
    const result = await paymentService.initializePayment({
      quotationId: quotation.id,
      provider,
      payerId: auth.userId || requestCustomerId,
      email: email || auth.email || customerUserEmail,
      customerName: name || customerFullName,
    });

    // Update rental state to PAYMENT_PENDING
    if (quotation.rental_request_id) {
      await supabaseServer
        .from('rental_requests')
        .update({ current_state: 'PAYMENT_PENDING' })
        .eq('id', quotation.rental_request_id);
    }

    return NextResponse.json({
      success: true,
      data: result,
      checkout_url: result.checkout_url,
      reference: result.reference,
    });
  } catch (error: any) {
    console.error('[/api/payments/initialize] Error initializing payment:', error);
    const isTimeout = error?.name === 'AbortError' || error?.message?.includes('aborted');
    return NextResponse.json(
      { error: isTimeout
          ? 'Flutterwave is taking too long to respond. Please try again or use Paystack / Bank Transfer.'
          : 'An internal error occurred. Please try again.'
      },
      { status: isTimeout ? 504 : 500 }
    );
  }
}
