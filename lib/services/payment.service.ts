import { supabaseServer as supabase } from '@/lib/supabase/server';
import { notifyAdmins, notifyUser } from '@/lib/notifications';
import crypto from 'crypto';
import {
  RENTAL_PAYMENT_ALLOWED_STATES,
  RENTAL_POST_PAYMENT_STATES,
  QUOTATION_PAYMENT_ALLOWED_STATUSES,
} from '@/lib/types';

export class WebhookSignatureError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WebhookSignatureError';
  }
}

export type PaymentProvider = 'paystack' | 'flutterwave' | 'bank_transfer';

// ── Canonical DB enum labels ─────────────────────────────────────────────────
// These are the ONLY valid values stored in the payments table.
// Never compare against 'paid', 'SUCCESSFUL', or any lowercase variant.
export const PAYMENT_STATUS = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  CONFIRMED: 'CONFIRMED',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
  PARTIALLY_REFUNDED: 'PARTIALLY_REFUNDED',
} as const;
export type PaymentStatusEnum = (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];

export const PAYMENT_TYPE = {
  RENTAL_FEE: 'RENTAL_FEE',
  DAMAGE_DEPOSIT: 'DAMAGE_DEPOSIT',
  SALE_PAYMENT: 'SALE_PAYMENT',
  AD_CAMPAIGN_FEE: 'AD_CAMPAIGN_FEE',
} as const;
export type PaymentTypeEnum = (typeof PAYMENT_TYPE)[keyof typeof PAYMENT_TYPE];

export const DEPOSIT_STATUS = {
  HELD: 'HELD',
  RELEASED: 'RELEASED',
  PARTIALLY_DEDUCTED: 'PARTIALLY_DEDUCTED',
  FULLY_DEDUCTED: 'FULLY_DEDUCTED',
} as const;
export type DepositStatusEnum = (typeof DEPOSIT_STATUS)[keyof typeof DEPOSIT_STATUS];

/** Legacy compat alias — do NOT use 'paid', use PAYMENT_STATUS.CONFIRMED */
export type PaymentStatus = 'pending' | 'awaiting_confirmation' | 'paid' | 'failed';

export interface InitializePaymentInput {
  quotationId: string;
  provider: PaymentProvider;
  payerId?: string;
  email?: string;
  customerName?: string;
}

export interface InitializePaymentResult {
  checkout_url: string | null;
  reference: string;
  amount: number;
  currency: string;
  provider: PaymentProvider;
  bank_details?: {
    bank_name: string;
    account_name: string;
    account_number: string;
    narration: string;
  };
}

function normalizePaymentRow(row: any) {
  if (!row) return null;
  return {
    ...row,
    reference: row.reference || row.payment_reference,
    payment_reference: row.payment_reference || row.reference,
    provider: row.provider || (row.payment_gateway ? String(row.payment_gateway).toLowerCase() : 'bank_transfer'),
    payment_gateway: row.payment_gateway || (row.provider ? String(row.provider).toUpperCase() : 'BANK_TRANSFER'),
    // Always use canonical DB status (CONFIRMED, PENDING, etc.) — never expose 'paid' internally
    status: row.status || PAYMENT_STATUS.PENDING,
    raw_response: row.raw_response || row.gateway_response || {},
  };
}

async function findPaymentRow(reference: string, selectCols = '*') {
  // Try querying by 'reference'
  const { data: byRef, error: errRef } = await supabase
    .from('payments')
    .select(selectCols)
    .eq('reference', reference)
    .maybeSingle();

  if (!errRef && byRef) {
    return normalizePaymentRow(byRef);
  }

  // If reference query errored (e.g. column doesn't exist) or returned null, try payment_reference
  const { data: byLegacyRef, error: errLegacy } = await supabase
    .from('payments')
    .select(selectCols)
    .eq('payment_reference', reference)
    .maybeSingle();

  if (byLegacyRef) {
    return normalizePaymentRow(byLegacyRef);
  }

  return null;
}

/**
 * Atomic, one-path payment confirmation.
 *
 * UPDATE payments SET status='CONFIRMED', paid_at=…, raw_response=…
 * WHERE id=$1 AND status IN ('PENDING','PROCESSING','FAILED')
 * RETURNING id
 *
 * Returns 'confirmed' if this call confirmed the row for the first time.
 * Returns 'already_confirmed' if the row was already CONFIRMED (idempotent).
 * Throws if 0 rows matched but status is not CONFIRMED (data integrity error).
 *
 * Never moves a payment out of CONFIRMED, REFUNDED, or PARTIALLY_REFUNDED.
 */
async function confirmPaymentRow(
  id: string,
  paidAt: string,
  rawResponse: any
): Promise<'confirmed' | 'already_confirmed'> {
  const nowIso = new Date().toISOString();

  // Trim raw_response to safe fields only — no PII, no auth tokens
  const safeRaw = rawResponse
    ? {
        id: rawResponse.id,
        status: rawResponse.status,
        amount: rawResponse.amount,
        currency: rawResponse.currency,
        paid_at: rawResponse.paid_at || rawResponse.paidAt || paidAt,
        channel: rawResponse.channel,
        reference: rawResponse.reference || rawResponse.tx_ref,
      }
    : {};

  const { data: updatedRows, error } = await supabase
    .from('payments')
    .update({
      status: PAYMENT_STATUS.CONFIRMED,
      paid_at: paidAt,
      raw_response: safeRaw,
      updated_at: nowIso,
    })
    .eq('id', id)
    .in('status', [PAYMENT_STATUS.PENDING, PAYMENT_STATUS.PROCESSING, PAYMENT_STATUS.FAILED])
    .select('id');

  if (error) {
    console.error('[confirmPaymentRow] DB update error:', error);
    throw error;
  }

  if (updatedRows && updatedRows.length > 0) {
    return 'confirmed';
  }

  // 0 rows updated — check if the row is already CONFIRMED (idempotent)
  const { data: existing, error: fetchErr } = await supabase
    .from('payments')
    .select('id, status')
    .eq('id', id)
    .single();

  if (fetchErr) throw fetchErr;

  if (existing?.status === PAYMENT_STATUS.CONFIRMED) {
    return 'already_confirmed';
  }

  // 0 rows matched and status is not CONFIRMED → something is wrong
  throw new Error(
    `[confirmPaymentRow] Could not confirm payment ${id}: status is '${existing?.status}', expected one of PENDING/PROCESSING/FAILED`
  );
}

/**
 * Mark a payment as FAILED and optionally set needs_review.
 */
async function failPaymentRow(
  id: string,
  rawResponse: any,
  opts: { needsReview?: boolean; reviewNote?: string } = {}
): Promise<void> {
  const update: any = {
    status: PAYMENT_STATUS.FAILED,
    raw_response: rawResponse,
    updated_at: new Date().toISOString(),
  };
  if (opts.needsReview) {
    update.needs_review = true;
    update.review_note = opts.reviewNote || null;
  }
  await supabase.from('payments').update(update).eq('id', id);
}

export const paymentService = {
  /**
   * 1. Initialize Payment
   * - Load the amount from the quotations table (never accept amount from frontend).
   * - Create a unique reference and insert a "pending" payment row.
   * - Paystack: POST /transaction/initialize. Flutterwave: POST /v3/payments.
   *   Set the redirect URL to /payment-status?ref=REFERENCE.
   * - Return the checkout URL.
   */
  async initializePayment(input: InitializePaymentInput): Promise<InitializePaymentResult> {
    const { quotationId, provider } = input;

    // Load quotation from database directly to get authoritative amount
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(quotationId);
    let qQuery = supabase
      .from('quotations')
      .select('id, total_amount, reference_number, rental_request_id, status, rental_requests(id, customer_id)');

    if (isUuid) {
      qQuery = qQuery.eq('id', quotationId);
    } else {
      qQuery = qQuery.eq('reference_number', quotationId);
    }

    const { data: quotation, error: qErr } = await qQuery.maybeSingle();

    if (qErr || !quotation) {
      console.error('Quotation not found in paymentService.initializePayment:', qErr, { quotationId });
      throw new Error('Quotation not found');
    }

    const amount = Number(quotation.total_amount);
    if (!amount || amount <= 0) {
      throw new Error('Invalid quotation amount');
    }

    // Generate unique reference
    const timestamp = Date.now();
    const randomHex = Math.random().toString(36).substring(2, 7).toUpperCase();
    const prefix = provider === 'paystack' ? 'PAY' : provider === 'flutterwave' ? 'FLW' : 'BNK';
    const reference = `CHE-${prefix}-${timestamp}-${randomHex}`;

    const rentalReq = Array.isArray(quotation.rental_requests)
      ? quotation.rental_requests[0]
      : quotation.rental_requests;

    const payerId = input.payerId || rentalReq?.customer_id;

    // Fetch user details for payer
    let customerEmail = input.email || '';
    let customerName = input.customerName || '';
    let customerPhone = '';

    if (payerId && (!customerEmail || !customerName)) {
      const { data: userProfile } = await supabase
        .from('users')
        .select('email, full_name, phone')
        .eq('id', payerId)
        .maybeSingle();

      if (userProfile) {
        customerEmail = customerEmail || userProfile.email || 'customer@cheesco.ng';
        customerName = customerName || userProfile.full_name || 'Valued Customer';
        customerPhone = userProfile.phone || '';
      }
    }

    customerEmail = customerEmail || 'customer@cheesco.ng';
    customerName = customerName || 'Valued Customer';

    const resolvedPayerId = payerId || rentalReq?.customer_id;

    // Insert pending payment row — use canonical PENDING enum
    const paymentPayload: any = {
      quotation_id: quotation.id,
      rental_request_id: quotation.rental_request_id,
      payer_id: resolvedPayerId,
      provider: provider,
      payment_gateway: provider.toUpperCase(),
      reference: reference,
      payment_reference: reference,
      amount: amount,
      currency: 'NGN',
      payment_type: PAYMENT_TYPE.RENTAL_FEE,
      status: PAYMENT_STATUS.PENDING,
      raw_response: { initiated_at: new Date().toISOString() },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error: pErr } = await supabase.from('payments').insert(paymentPayload);
    if (pErr) {
      console.error('Failed to insert payment record:', pErr);
      throw new Error(`Failed to create payment record: ${pErr.message}`);
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const redirectUrl = `${appUrl}/payment-status?ref=${encodeURIComponent(reference)}`;

    // PAYSTACK
    if (provider === 'paystack') {
      const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
      const isPlaceholderKey =
        !paystackSecretKey ||
        paystackSecretKey.includes('your_paystack') ||
        !paystackSecretKey.startsWith('sk_');

      if (isPlaceholderKey) {
        return {
          checkout_url: `${redirectUrl}&simulate=paystack`,
          reference,
          amount,
          currency: 'NGN',
          provider: 'paystack',
        };
      }

      const response = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${paystackSecretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: customerEmail,
          amount: Math.round(amount * 100), // convert to kobo
          reference,
          callback_url: redirectUrl,
          metadata: {
            quotation_id: quotation.id,
            quotation_reference: quotation.reference_number,
            rental_request_id: quotation.rental_request_id,
          },
        }),
      });

      const result = await response.json();
      if (!result.status || !result.data?.authorization_url) {
        throw new Error(result.message || 'Failed to initialize Paystack checkout');
      }

      return {
        checkout_url: result.data.authorization_url,
        reference,
        amount,
        currency: 'NGN',
        provider: 'paystack',
      };
    }

    // FLUTTERWAVE
    if (provider === 'flutterwave') {
      const flwSecretKey = process.env.FLUTTERWAVE_SECRET_KEY;
      const isPlaceholderKey =
        !flwSecretKey ||
        flwSecretKey.includes('your_flutterwave') ||
        !flwSecretKey.startsWith('FLWSECK');

      if (isPlaceholderKey) {
        return {
          checkout_url: `${redirectUrl}&simulate=flutterwave`,
          reference,
          amount,
          currency: 'NGN',
          provider: 'flutterwave',
        };
      }

      const flwController = new AbortController();
      const flwTimeout = setTimeout(() => flwController.abort(), 15000);

      const response = await fetch('https://api.flutterwave.com/v3/payments', {
        method: 'POST',
        signal: flwController.signal,
        headers: {
          Authorization: `Bearer ${flwSecretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tx_ref: reference,
          amount: amount,
          currency: 'NGN',
          redirect_url: redirectUrl,
          customer: {
            email: customerEmail,
            name: customerName,
            phonenumber: customerPhone,
          },
          customizations: {
            title: 'Cheesco Equip Hub',
            description: `Payment for Quotation ${quotation.reference_number}`,
            logo: `${appUrl}/cheesco-logo.png`,
          },
          meta: {
            quotation_id: quotation.id,
            rental_request_id: quotation.rental_request_id,
          },
        }),
      });

      const result = await response.json();
      clearTimeout(flwTimeout);
      if (result.status !== 'success' || !result.data?.link) {
        throw new Error(result.message || 'Failed to initialize Flutterwave payment');
      }

      return {
        checkout_url: result.data.link,
        reference,
        amount,
        currency: 'NGN',
        provider: 'flutterwave',
      };
    }

    // BANK TRANSFER
    if (provider === 'bank_transfer') {
      return {
        checkout_url: null,
        reference,
        amount,
        currency: 'NGN',
        provider: 'bank_transfer',
        bank_details: {
          bank_name: 'Zenith Bank Plc',
          account_name: 'Cheesco Global Concept Ltd',
          account_number: '1224890331',
          narration: reference,
        },
      };
    }

    throw new Error(`Unsupported provider: ${provider}`);
  },

  /**
   * 2. Paystack Webhook Handler
   * - Verifies HMAC SHA512 signature header (x-paystack-signature)
   * - Calls Paystack verify API
   * - If amount and currency match, set status to 'paid' and quotation to 'accepted'
   * - Idempotent: ignore if payment is already 'paid'
   */
  async handlePaystackWebhook(rawBody: string, signature: string | null) {
    const paystackSecret = process.env.PAYSTACK_SECRET_KEY || '';
    const isProd = process.env.NODE_ENV === 'production';
    const isPlaceholder = !paystackSecret || paystackSecret.includes('your_paystack') || !paystackSecret.startsWith('sk_');

    // In production, signature verification fails closed if key is missing or placeholder
    if (isProd && isPlaceholder) {
      throw new WebhookSignatureError('Paystack secret key is missing or invalid in production; webhook signature verification failed closed');
    }

    // Verify HMAC signature
    if (!isPlaceholder) {
      if (!signature) {
        throw new WebhookSignatureError('Missing Paystack webhook signature header');
      }

      const hash = crypto
        .createHmac('sha512', paystackSecret)
        .update(rawBody)
        .digest('hex');

      const hashBuf = Buffer.from(hash.toLowerCase(), 'utf-8');
      const sigBuf = Buffer.from(signature.toLowerCase(), 'utf-8');

      if (hashBuf.length !== sigBuf.length || !crypto.timingSafeEqual(hashBuf, sigBuf)) {
        throw new WebhookSignatureError('Invalid Paystack webhook signature');
      }
    }

    const eventData = JSON.parse(rawBody);
    if (eventData.event !== 'charge.success') {
      return { ignored: true, reason: 'Event not charge.success' };
    }

    const reference = eventData.data?.reference;
    if (!reference) {
      throw new Error('No reference in Paystack webhook data');
    }

    // Fetch payment row from DB
    const payment = await findPaymentRow(
      reference,
      '*, quotation:quotations(id, status, rental_request_id)'
    );

    if (!payment) {
      throw new Error(`Payment with reference ${reference} not found`);
    }

    // IDEMPOTENCY: Ignore if already CONFIRMED at DB level
    if (payment.status === PAYMENT_STATUS.CONFIRMED) {
      return { idempotent: true, message: 'Payment already processed and confirmed' };
    }

    // Verify with Paystack API
    let verifiedData = eventData.data;
    if (!isPlaceholder) {
      const verifyRes = await fetch(
        `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
        { headers: { Authorization: `Bearer ${paystackSecret}` } }
      );
      const verifyJson = await verifyRes.json();
      if (!verifyJson.status || verifyJson.data?.status !== 'success') {
        throw new Error('Paystack verification failed');
      }
      verifiedData = verifyJson.data;
    } else if (isProd) {
      throw new Error('Paystack API verification failed closed in production');
    }

    // Verify amount (Paystack returns kobo), currency, and reference match
    const verifiedNaira = verifiedData.amount / 100;
    const expectedNaira = Number(payment.amount);
    const verifiedCurrency = (verifiedData.currency || 'NGN').toUpperCase();
    const expectedCurrency = (payment.currency || 'NGN').toUpperCase();

    if (Math.abs(verifiedNaira - expectedNaira) > 1 || verifiedCurrency !== expectedCurrency) {
      await failPaymentRow(payment.id, { ...eventData, error: 'amount_or_currency_mismatch' }, {
        needsReview: true,
        reviewNote: `Amount mismatch: expected ${expectedNaira} ${expectedCurrency}, got ${verifiedNaira} ${verifiedCurrency}`,
      });
      // Report to Sentry if available
      try {
        const { captureException } = await import('@sentry/nextjs');
        captureException(new Error('Paystack amount/currency mismatch'), { extra: { paymentId: payment.id, verifiedNaira, expectedNaira } });
      } catch {}
      throw new Error(`Amount or currency mismatch: expected ${expectedNaira} ${expectedCurrency}, got ${verifiedNaira} ${verifiedCurrency}`);
    }

    // Atomically confirm the payment (shared one-path function)
    const paidAt = new Date().toISOString();
    const confirmResult = await confirmPaymentRow(payment.id, paidAt, verifiedData);

    if (confirmResult === 'already_confirmed') {
      return { idempotent: true, message: 'Payment already processed and confirmed' };
    }

    // Post-confirmation side-effects — wrapped so a failure does not lose the confirmation
    const rentalRequestId = payment.rental_request_id || payment.quotation?.rental_request_id;
    const quotationId = payment.quotation_id || payment.quotation?.id;

    try {
      // Mark quotation as ACCEPTED only from SENT or VIEWED (prevent duplicate side-effects)
      if (quotationId) {
        await supabase
          .from('quotations')
          .update({ status: 'ACCEPTED', accepted_at: paidAt })
          .eq('id', quotationId)
          .in('status', [...QUOTATION_PAYMENT_ALLOWED_STATUSES]);
      }

      // Mark rental request as PAYMENT_CONFIRMED only from pre-payment states
      if (rentalRequestId) {
        const { data: updatedRentals } = await supabase
          .from('rental_requests')
          .update({ current_state: 'PAYMENT_CONFIRMED' })
          .eq('id', rentalRequestId)
          .in('current_state', [...RENTAL_PAYMENT_ALLOWED_STATES])
          .select('id');

        if (updatedRentals && updatedRentals.length > 0) {
          await this.notifyPaymentConfirmed(rentalRequestId, expectedNaira, 'Paystack');
        } else {
          // 0 rows updated — check if already past payment or needs review
          const { data: rentalCheck } = await supabase
            .from('rental_requests')
            .select('id, current_state')
            .eq('id', rentalRequestId)
            .single();
          const isAlreadyPast = rentalCheck?.current_state &&
            (RENTAL_POST_PAYMENT_STATES as readonly string[]).includes(rentalCheck.current_state);
          if (!isAlreadyPast) {
            // Unexpected state — flag for manual review
            await supabase.from('payments').update({
              needs_review: true,
              review_note: `Paystack webhook: rental state '${rentalCheck?.current_state}' was not in allowed pre-payment states.`,
              updated_at: new Date().toISOString(),
            }).eq('id', payment.id);
            try {
              const { captureException } = await import('@sentry/nextjs');
              captureException(new Error('Paystack webhook: rental not in pre-payment state'), {
                extra: { paymentId: payment.id, rentalRequestId, currentState: rentalCheck?.current_state },
              });
            } catch {}
          }
        }
      }

      // Activate ad campaign if payment is for an equipment promotion
      if (reference.startsWith('AD-') || payment.payment_type === PAYMENT_TYPE.AD_CAMPAIGN_FEE) {
        try {
          const { adCampaignService } = await import('@/lib/services/ad-campaign.service');
          await adCampaignService.activateCampaign(reference);
        } catch (adErr) {
          console.error('Error auto-activating ad campaign via Paystack webhook:', adErr);
        }
      }
    } catch (sideEffectErr: any) {
      console.error('[handlePaystackWebhook] Post-confirmation side effect failed:', sideEffectErr);
      // Mark for manual review — payment IS confirmed, side-effects need retry
      await supabase.from('payments').update({
        needs_review: true,
        review_note: `Post-confirm side-effect failed: ${sideEffectErr?.message || sideEffectErr}`,
        updated_at: new Date().toISOString(),
      }).eq('id', payment.id);
      try {
        const { captureException } = await import('@sentry/nextjs');
        captureException(sideEffectErr, { extra: { paymentId: payment.id, context: 'paystack_webhook_post_confirm' } });
      } catch {}
    }

    return { success: true, reference, status: PAYMENT_STATUS.CONFIRMED };
  },

  /**
   * 3. Flutterwave Webhook Handler
   * - Verifies verif-hash header
   * - Calls Flutterwave verify API
   * - Sets status to 'paid', quotation to 'accepted'
   * - Idempotent
   */
  async handleFlutterwaveWebhook(eventData: any, incomingHash: string | null) {
    const webhookHash = process.env.FLUTTERWAVE_WEBHOOK_HASH || '';
    const flwSecret = process.env.FLUTTERWAVE_SECRET_KEY || '';
    const isProd = process.env.NODE_ENV === 'production';
    const isPlaceholderHash = !webhookHash || webhookHash.includes('your_flutterwave');
    const isPlaceholderSecret = !flwSecret || flwSecret.includes('your_flutterwave') || !flwSecret.startsWith('FLWSECK');

    // In production, signature verification fails closed if webhook hash is missing or placeholder
    if (isProd && isPlaceholderHash) {
      throw new WebhookSignatureError('Flutterwave webhook hash is missing or invalid in production; webhook signature verification failed closed');
    }

    if (!isPlaceholderHash) {
      if (!incomingHash) {
        throw new WebhookSignatureError('Missing Flutterwave verif-hash header');
      }
      const secretBuf = Buffer.from(webhookHash, 'utf-8');
      const incomingBuf = Buffer.from(incomingHash, 'utf-8');
      if (secretBuf.length !== incomingBuf.length || !crypto.timingSafeEqual(secretBuf, incomingBuf)) {
        throw new WebhookSignatureError('Invalid Flutterwave verif-hash');
      }
    }

    const txRef = eventData.data?.tx_ref;
    const transactionId = eventData.data?.id;

    if (!txRef) {
      return { ignored: true, reason: 'No tx_ref in payload' };
    }

    const payment = await findPaymentRow(
      txRef,
      '*, quotation:quotations(id, status, rental_request_id)'
    );

    if (!payment) {
      throw new Error(`Payment with reference ${txRef} not found`);
    }

    // IDEMPOTENCY: Ignore if already CONFIRMED at DB level
    if (payment.status === PAYMENT_STATUS.CONFIRMED) {
      return { idempotent: true, message: 'Payment already marked confirmed' };
    }

    let verifiedData = eventData.data;
    if (!isPlaceholderSecret && transactionId) {
      const verifyRes = await fetch(
        `https://api.flutterwave.com/v3/transactions/${transactionId}/verify`,
        { headers: { Authorization: `Bearer ${flwSecret}` } }
      );
      const verifyJson = await verifyRes.json();
      if (!verifyJson.status || verifyJson.data?.status !== 'successful') {
        throw new Error('Flutterwave verification failed');
      }
      verifiedData = verifyJson.data;
    } else if (isProd) {
      throw new Error('Flutterwave API verification failed closed in production');
    }

    // Verify amount, currency, and reference match
    const verifiedAmount = Number(verifiedData.amount);
    const expectedAmount = Number(payment.amount);
    const verifiedCurrency = (verifiedData.currency || 'NGN').toUpperCase();
    const expectedCurrency = (payment.currency || 'NGN').toUpperCase();

    if (Math.abs(verifiedAmount - expectedAmount) > 1 || verifiedCurrency !== expectedCurrency) {
      await failPaymentRow(payment.id, { ...eventData, error: 'amount_or_currency_mismatch' }, {
        needsReview: true,
        reviewNote: `Amount mismatch: expected ${expectedAmount} ${expectedCurrency}, got ${verifiedAmount} ${verifiedCurrency}`,
      });
      try {
        const { captureException } = await import('@sentry/nextjs');
        captureException(new Error('Flutterwave amount/currency mismatch'), { extra: { paymentId: payment.id, verifiedAmount, expectedAmount } });
      } catch {}
      throw new Error(`Amount or currency mismatch: expected ${expectedAmount} ${expectedCurrency}, got ${verifiedAmount} ${verifiedCurrency}`);
    }

    // Atomically confirm (shared one-path function)
    const paidAt = new Date().toISOString();
    const confirmResult = await confirmPaymentRow(payment.id, paidAt, verifiedData);

    if (confirmResult === 'already_confirmed') {
      return { idempotent: true, message: 'Payment already marked confirmed' };
    }

    // Post-confirmation side-effects
    const rentalRequestId = payment.rental_request_id || payment.quotation?.rental_request_id;
    const quotationId = payment.quotation_id || payment.quotation?.id;

    try {
      if (quotationId) {
        await supabase
          .from('quotations')
          .update({ status: 'ACCEPTED', accepted_at: paidAt })
          .eq('id', quotationId)
          .in('status', [...QUOTATION_PAYMENT_ALLOWED_STATUSES]);
      }

      if (rentalRequestId) {
        const { data: updatedRentals } = await supabase
          .from('rental_requests')
          .update({ current_state: 'PAYMENT_CONFIRMED' })
          .eq('id', rentalRequestId)
          .in('current_state', [...RENTAL_PAYMENT_ALLOWED_STATES])
          .select('id');

        if (updatedRentals && updatedRentals.length > 0) {
          await this.notifyPaymentConfirmed(rentalRequestId, expectedAmount, 'Flutterwave');
        } else {
          const { data: rentalCheck } = await supabase
            .from('rental_requests')
            .select('id, current_state')
            .eq('id', rentalRequestId)
            .single();
          const isAlreadyPast = rentalCheck?.current_state &&
            (RENTAL_POST_PAYMENT_STATES as readonly string[]).includes(rentalCheck.current_state);
          if (!isAlreadyPast) {
            await supabase.from('payments').update({
              needs_review: true,
              review_note: `Flutterwave webhook: rental state '${rentalCheck?.current_state}' was not in allowed pre-payment states.`,
              updated_at: new Date().toISOString(),
            }).eq('id', payment.id);
            try {
              const { captureException } = await import('@sentry/nextjs');
              captureException(new Error('Flutterwave webhook: rental not in pre-payment state'), {
                extra: { paymentId: payment.id, rentalRequestId, currentState: rentalCheck?.current_state },
              });
            } catch {}
          }
        }
      }

      if (txRef.startsWith('AD-') || payment.payment_type === PAYMENT_TYPE.AD_CAMPAIGN_FEE) {
        try {
          const { adCampaignService } = await import('@/lib/services/ad-campaign.service');
          await adCampaignService.activateCampaign(txRef);
        } catch (adErr) {
          console.error('Error auto-activating ad campaign via Flutterwave webhook:', adErr);
        }
      }
    } catch (sideEffectErr: any) {
      console.error('[handleFlutterwaveWebhook] Post-confirmation side effect failed:', sideEffectErr);
      await supabase.from('payments').update({
        needs_review: true,
        review_note: `Post-confirm side-effect failed: ${sideEffectErr?.message || sideEffectErr}`,
        updated_at: new Date().toISOString(),
      }).eq('id', payment.id);
      try {
        const { captureException } = await import('@sentry/nextjs');
        captureException(sideEffectErr, { extra: { paymentId: payment.id, context: 'flutterwave_webhook_post_confirm' } });
      } catch {}
    }

    return { success: true, reference: txRef, status: PAYMENT_STATUS.CONFIRMED };
  },

  /**
   * 4. Customer clicks "I've made the transfer"
   * Sets status to "awaiting_confirmation" and notifies admin.
   */
  async notifyBankTransferMade(reference: string) {
    const payment = await findPaymentRow(
      reference,
      '*, quotation:quotations(id, reference_number, rental_request_id)'
    );

    if (!payment) {
      throw new Error('Payment not found');
    }

    // Update status to PROCESSING (awaiting manual confirmation)
    await supabase.from('payments').update({
      status: PAYMENT_STATUS.PROCESSING,
      updated_at: new Date().toISOString(),
    }).eq('id', payment.id).not('status', 'eq', PAYMENT_STATUS.CONFIRMED);

    // Notify admins
    const quotationRef = payment.quotation?.reference_number || payment.reference;
    await notifyAdmins(['OPERATIONS_ADMIN', 'FINANCE_ADMIN', 'SUPER_ADMIN'], {
      title: '🏦 Bank Transfer Payment Reported',
      message: `Customer reported bank transfer of ₦${Number(payment.amount).toLocaleString()} for ${quotationRef}. Narration: ${reference}. Please verify account and confirm.`,
      link: `/admin/operations?requestId=${payment.rental_request_id}`,
      type: 'PAYMENT',
    });

    return { success: true, reference, status: PAYMENT_STATUS.PROCESSING };
  },

  /**
   * 5. confirm-bank-transfer (admin only)
   * Marks a bank transfer payment as CONFIRMED and the quotation as ACCEPTED.
   */
  async confirmBankTransfer(reference: string, adminUserId: string) {
    const payment = await findPaymentRow(
      reference,
      '*, quotation:quotations(id, reference_number, rental_request_id)'
    );

    if (!payment) {
      throw new Error('Payment record not found');
    }

    const nowIso = new Date().toISOString();

    // Atomic confirm via shared one-path function
    const confirmResult = await confirmPaymentRow(payment.id, nowIso, {
      confirmed_by: adminUserId,
      confirmed_at: nowIso,
      method: 'manual_bank_transfer_confirmation',
    });

    if (confirmResult === 'already_confirmed') {
      return { success: true, reference, status: PAYMENT_STATUS.CONFIRMED };
    }

    // Post-confirmation side-effects
    const quotationId = payment.quotation_id || payment.quotation?.id;
    const rentalRequestId = payment.rental_request_id || payment.quotation?.rental_request_id;

    try {
      if (quotationId) {
        await supabase
          .from('quotations')
          .update({ status: 'ACCEPTED', accepted_at: nowIso })
          .eq('id', quotationId)
          .in('status', [...QUOTATION_PAYMENT_ALLOWED_STATUSES]);
      }

      if (rentalRequestId) {
        const { data: updatedRentals } = await supabase
          .from('rental_requests')
          .update({ current_state: 'PAYMENT_CONFIRMED' })
          .eq('id', rentalRequestId)
          .in('current_state', [...RENTAL_PAYMENT_ALLOWED_STATES])
          .select('id');

        if (updatedRentals && updatedRentals.length > 0) {
          const { data: rental } = await supabase
            .from('rental_requests')
            .select('customer_id, reference_number')
            .eq('id', rentalRequestId)
            .single();

          if (rental?.customer_id) {
            await notifyUser(rental.customer_id, {
              title: '✅ Bank Transfer Payment Verified',
              message: `Your payment of ₦${Number(payment.amount).toLocaleString()} for ${rental.reference_number} has been verified! Logistics mobilization is in progress.`,
              link: `/dashboard/customer?tab=rentals`,
              type: 'PAYMENT',
            });
          }

          await notifyAdmins(['OPERATIONS_ADMIN', 'FINANCE_ADMIN', 'SUPER_ADMIN'], {
            title: '✅ Bank Transfer Verified (Confirmed)',
            message: `Bank transfer of ₦${Number(payment.amount).toLocaleString()} for ${rental?.reference_number || 'booking'} verified. Logistics mobilization in progress.`,
            link: `/admin/operations?requestId=${rentalRequestId}`,
            type: 'PAYMENT',
          });
        } else {
          // 0 rows updated — check if already past payment or needs review
          const { data: rentalCheck } = await supabase
            .from('rental_requests')
            .select('id, current_state')
            .eq('id', rentalRequestId)
            .single();
          const isAlreadyPast = rentalCheck?.current_state &&
            (RENTAL_POST_PAYMENT_STATES as readonly string[]).includes(rentalCheck.current_state);
          if (!isAlreadyPast) {
            await supabase.from('payments').update({
              needs_review: true,
              review_note: `confirmBankTransfer: rental state '${rentalCheck?.current_state}' was not in allowed pre-payment states.`,
              updated_at: new Date().toISOString(),
            }).eq('id', payment.id);
            try {
              const { captureException } = await import('@sentry/nextjs');
              captureException(new Error('confirmBankTransfer: rental not in pre-payment state'), {
                extra: { paymentId: payment.id, rentalRequestId, currentState: rentalCheck?.current_state },
              });
            } catch {}
          }
        }
      }
    } catch (sideEffectErr: any) {
      console.error('[confirmBankTransfer] Post-confirmation side effect failed:', sideEffectErr);
      await supabase.from('payments').update({
        needs_review: true,
        review_note: `Post-confirm side-effect failed: ${sideEffectErr?.message || sideEffectErr}`,
        updated_at: new Date().toISOString(),
      }).eq('id', payment.id);
      try {
        const { captureException } = await import('@sentry/nextjs');
        captureException(sideEffectErr, { extra: { paymentId: payment.id, context: 'bank_transfer_post_confirm' } });
      } catch {}
    }

    return { success: true, reference, status: PAYMENT_STATUS.CONFIRMED };
  },

  /**
   * Get payment by reference
   */
  async getByReference(reference: string) {
    const payment = await findPaymentRow(
      reference,
      '*, quotation:quotations(id, reference_number, total_amount, terms, rental_requests(id, customer_id, equipment_id, equipment:equipment(name)))'
    );
    return payment;
  },

  /**
   * Verify payment against provider API (Paystack / Flutterwave).
   * Shares the same confirmPaymentRow path as webhooks.
   */
  async verifyPayment(reference: string) {
    const payment = await this.getByReference(reference);
    if (!payment) {
      throw new Error(`Payment with reference ${reference} not found`);
    }

    // Idempotency: if already CONFIRMED, return immediately
    if (payment.status === PAYMENT_STATUS.CONFIRMED) {
      return { status: PAYMENT_STATUS.CONFIRMED, reference, payment };
    }

    const provider = payment.provider || 'paystack';
    const paystackSecret = process.env.PAYSTACK_SECRET_KEY || '';
    const flwSecret = process.env.FLUTTERWAVE_SECRET_KEY || '';
    const nowIso = new Date().toISOString();

    let verifiedData: any = null;

    // PAYSTACK
    if (provider === 'paystack') {
      const isPlaceholder = !paystackSecret || paystackSecret.includes('your_paystack') || !paystackSecret.startsWith('sk_');
      if (isPlaceholder) {
        verifiedData = { simulated: true, status: 'success' };
      } else {
        const verifyRes = await fetch(
          `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
          { headers: { Authorization: `Bearer ${paystackSecret}` } }
        );
        const verifyJson = await verifyRes.json();
        if (!verifyJson.status || verifyJson.data?.status !== 'success') {
          throw new Error(verifyJson.message || 'Payment not yet confirmed by Paystack');
        }
        verifiedData = verifyJson.data;
      }
    } else if (provider === 'flutterwave') {
      const isPlaceholder = !flwSecret || flwSecret.includes('your_flutterwave') || !flwSecret.startsWith('FLWSECK');
      if (isPlaceholder) {
        verifiedData = { simulated: true, status: 'successful' };
      } else {
        const verifyRes = await fetch(
          `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(reference)}`,
          { headers: { Authorization: `Bearer ${flwSecret}` } }
        );
        const verifyJson = await verifyRes.json();
        if (verifyJson.status !== 'success' || verifyJson.data?.status !== 'successful') {
          throw new Error(verifyJson.message || 'Payment not yet confirmed by Flutterwave');
        }
        verifiedData = verifyJson.data;
      }
    } else {
      return { status: payment.status, reference, payment };
    }

    // Verify amount, currency, and reference match before confirming
    const expectedNaira = Number(payment.amount);
    const expectedCurrency = (payment.currency || 'NGN').toUpperCase();
    const verifiedNaira = provider === 'paystack'
      ? (verifiedData.amount ? verifiedData.amount / 100 : expectedNaira)
      : Number(verifiedData.amount ?? expectedNaira);
    const verifiedCurrency = (verifiedData.currency || expectedCurrency).toUpperCase();

    if (Math.abs(verifiedNaira - expectedNaira) > 1 || verifiedCurrency !== expectedCurrency) {
      await failPaymentRow(payment.id, verifiedData, {
        needsReview: true,
        reviewNote: `Amount/currency mismatch in verifyPayment: expected ${expectedNaira} ${expectedCurrency}, got ${verifiedNaira} ${verifiedCurrency}`,
      });
      try {
        const { captureException } = await import('@sentry/nextjs');
        captureException(new Error('Gateway verify amount/currency mismatch'), {
          extra: { paymentId: payment.id, verifiedNaira, expectedNaira, verifiedCurrency, expectedCurrency },
        });
      } catch {}
      throw new Error(`Amount or currency mismatch: expected ${expectedNaira} ${expectedCurrency}, got ${verifiedNaira} ${verifiedCurrency}`);
    }

    // Atomic confirm via shared one-path function
    const confirmResult = await confirmPaymentRow(payment.id, nowIso, verifiedData);
    if (confirmResult === 'already_confirmed') {
      return { status: PAYMENT_STATUS.CONFIRMED, reference, payment };
    }

    // Post-confirmation side-effects
    const quotationId = payment.quotation_id || payment.quotation?.id;
    const rentalRequestId = payment.rental_request_id || payment.quotation?.rental_request_id;

    try {
      if (quotationId) {
        await supabase
          .from('quotations')
          .update({ status: 'ACCEPTED', accepted_at: nowIso })
          .eq('id', quotationId)
          .in('status', [...QUOTATION_PAYMENT_ALLOWED_STATUSES]);
      }

      if (rentalRequestId) {
        const { data: updatedRentals } = await supabase
          .from('rental_requests')
          .update({ current_state: 'PAYMENT_CONFIRMED' })
          .eq('id', rentalRequestId)
          .in('current_state', [...RENTAL_PAYMENT_ALLOWED_STATES])
          .select('id');

        if (updatedRentals && updatedRentals.length > 0) {
          await this.notifyPaymentConfirmed(
            rentalRequestId,
            Number(payment.amount),
            provider === 'paystack' ? 'Paystack' : 'Flutterwave'
          );
        } else {
          const { data: rentalCheck } = await supabase
            .from('rental_requests')
            .select('id, current_state')
            .eq('id', rentalRequestId)
            .single();
          const isAlreadyPast = rentalCheck?.current_state &&
            (RENTAL_POST_PAYMENT_STATES as readonly string[]).includes(rentalCheck.current_state);
          if (!isAlreadyPast) {
            await supabase.from('payments').update({
              needs_review: true,
              review_note: `verifyPayment: rental state '${rentalCheck?.current_state}' was not in allowed pre-payment states.`,
              updated_at: new Date().toISOString(),
            }).eq('id', payment.id);
            try {
              const { captureException } = await import('@sentry/nextjs');
              captureException(new Error('verifyPayment: rental not in pre-payment state'), {
                extra: { paymentId: payment.id, rentalRequestId, currentState: rentalCheck?.current_state },
              });
            } catch {}
          }
        }
      }
    } catch (sideEffectErr: any) {
      console.error('[verifyPayment] Post-confirmation side effect failed:', sideEffectErr);
      await supabase.from('payments').update({
        needs_review: true,
        review_note: `Post-confirm side-effect failed: ${sideEffectErr?.message || sideEffectErr}`,
        updated_at: new Date().toISOString(),
      }).eq('id', payment.id);
      try {
        const { captureException } = await import('@sentry/nextjs');
        captureException(sideEffectErr, { extra: { paymentId: payment.id, context: 'verify_payment_post_confirm' } });
      } catch {}
    }

    return { status: PAYMENT_STATUS.CONFIRMED, reference, data: verifiedData };
  },

  /**
   * Helper: Notify admin team of confirmed payment
   */
  async notifyPaymentConfirmed(rentalRequestId: string, amount: number, providerName: string) {
    const { data: rental } = await supabase
      .from('rental_requests')
      .select('reference_number, customer_id')
      .eq('id', rentalRequestId)
      .single();

    const refNum = rental?.reference_number || 'booking';

    await notifyAdmins(['OPERATIONS_ADMIN', 'FINANCE_ADMIN', 'SUPER_ADMIN'], {
      title: `💳 Payment Confirmed (${providerName})`,
      message: `Payment of ₦${amount.toLocaleString()} received via ${providerName} for ${refNum}. Schedule logistics dispatch.`,
      link: `/admin/operations?requestId=${rentalRequestId}`,
      type: 'PAYMENT',
    });

    if (rental?.customer_id) {
      await notifyUser(rental.customer_id, {
        title: `💳 Payment Received (${providerName})`,
        message: `Your payment of ₦${amount.toLocaleString()} for ${refNum} was confirmed via ${providerName}! Logistics mobilization is in progress.`,
        link: `/dashboard/customer?tab=rentals`,
        type: 'PAYMENT',
      });
    }
  },
};
