import { describe, it, expect } from 'vitest';
import crypto from 'crypto';

/**
 * Pure simulator of Paystack Webhook verification & processing rules
 * Mirrors the exact logic in lib/services/payment.service.ts
 */
export function verifyAndProcessPaystackWebhook(params: {
  rawBody: string;
  signature: string | null;
  secretKey: string;
  existingPaymentRow?: {
    id: string;
    reference: string;
    status: string;
    amount: number; // in NGN
  } | null;
}) {
  const { rawBody, signature, secretKey, existingPaymentRow } = params;

  // 1. Verify HMAC-SHA512 signature if secret configured
  if (secretKey && !secretKey.includes('your_paystack')) {
    if (!signature) {
      throw new Error('Missing Paystack webhook signature header');
    }

    const hash = crypto
      .createHmac('sha512', secretKey)
      .update(rawBody)
      .digest('hex');

    const hashBuf = Buffer.from(hash.toLowerCase(), 'utf-8');
    const sigBuf = Buffer.from(signature.toLowerCase(), 'utf-8');

    if (hashBuf.length !== sigBuf.length || !crypto.timingSafeEqual(hashBuf, sigBuf)) {
      throw new Error('Invalid Paystack webhook signature');
    }
  }

  const eventData = JSON.parse(rawBody);

  // 2. Ignore non-success events
  if (eventData.event !== 'charge.success') {
    return { ignored: true, reason: 'Event not charge.success' };
  }

  const reference = eventData.data?.reference;
  if (!reference) {
    throw new Error('No reference in Paystack webhook data');
  }

  if (!existingPaymentRow) {
    throw new Error(`Payment with reference ${reference} not found`);
  }

  // 3. Idempotency Check: Don't double-process if already marked paid
  if (
    existingPaymentRow.status === 'paid' ||
    existingPaymentRow.status === 'CONFIRMED'
  ) {
    return { idempotent: true, message: 'Payment already processed and paid' };
  }

  // 4. Verify amount matches (Paystack sends amounts in kobo: 1 NGN = 100 kobo)
  const verifiedNaira = (eventData.data?.amount ?? 0) / 100;
  const expectedNaira = existingPaymentRow.amount;

  if (Math.abs(verifiedNaira - expectedNaira) > 1) {
    return {
      failed: true,
      error: 'amount_mismatch',
      verifiedNaira,
      expectedNaira,
    };
  }

  return {
    success: true,
    reference,
    status: 'paid',
    amountPaid: verifiedNaira,
  };
}

describe('Paystack Webhook Security & Idempotency Suite', () => {
  const TEST_SECRET = 'sk_test_cheesco_secret_key_1234567890abcdef';

  function signPayload(body: string, secret = TEST_SECRET) {
    return crypto.createHmac('sha512', secret).update(body).digest('hex');
  }

  it('accepts valid HMAC-SHA512 signed payload and processes payment', () => {
    const payload = JSON.stringify({
      event: 'charge.success',
      data: {
        reference: 'PAY-EQ-1001',
        amount: 3_413_125_00, // ₦3,413,125.00 in kobo
        currency: 'NGN',
        status: 'success',
      },
    });

    const sig = signPayload(payload);

    const result = verifyAndProcessPaystackWebhook({
      rawBody: payload,
      signature: sig,
      secretKey: TEST_SECRET,
      existingPaymentRow: {
        id: 'pmt-1',
        reference: 'PAY-EQ-1001',
        status: 'pending',
        amount: 3_413_125,
      },
    });

    expect(result.success).toBe(true);
    expect(result.status).toBe('paid');
    expect(result.amountPaid).toBe(3_413_125);
  });

  it('rejects forged webhook with modified amount or invalid signature', () => {
    const genuinePayload = JSON.stringify({
      event: 'charge.success',
      data: { reference: 'PAY-EQ-1001', amount: 50_000_00 },
    });
    const genuineSig = signPayload(genuinePayload);

    // Attacker tampers body to say ₦5,000,000 paid while using genuine ₦50,000 signature
    const tamperedPayload = JSON.stringify({
      event: 'charge.success',
      data: { reference: 'PAY-EQ-1001', amount: 5_000_000_00 },
    });

    expect(() =>
      verifyAndProcessPaystackWebhook({
        rawBody: tamperedPayload,
        signature: genuineSig,
        secretKey: TEST_SECRET,
      })
    ).toThrow('Invalid Paystack webhook signature');
  });

  it('rejects webhook request if signature header is missing', () => {
    const payload = JSON.stringify({ event: 'charge.success' });

    expect(() =>
      verifyAndProcessPaystackWebhook({
        rawBody: payload,
        signature: null,
        secretKey: TEST_SECRET,
      })
    ).toThrow('Missing Paystack webhook signature header');
  });

  it('guarantees idempotency: returns idempotent=true when payment was already marked paid', () => {
    const payload = JSON.stringify({
      event: 'charge.success',
      data: {
        reference: 'PAY-EQ-1001',
        amount: 1_000_000_00,
      },
    });
    const sig = signPayload(payload);

    const result = verifyAndProcessPaystackWebhook({
      rawBody: payload,
      signature: sig,
      secretKey: TEST_SECRET,
      existingPaymentRow: {
        id: 'pmt-1',
        reference: 'PAY-EQ-1001',
        status: 'paid', // Already paid
        amount: 1_000_000,
      },
    });

    expect(result.idempotent).toBe(true);
    expect(result.message).toContain('already processed');
  });

  it('catches amount mismatch (e.g. customer paid less than quoted)', () => {
    const payload = JSON.stringify({
      event: 'charge.success',
      data: {
        reference: 'PAY-EQ-1001',
        amount: 500_000_00, // Customer paid ₦500,000 in kobo
      },
    });
    const sig = signPayload(payload);

    const result = verifyAndProcessPaystackWebhook({
      rawBody: payload,
      signature: sig,
      secretKey: TEST_SECRET,
      existingPaymentRow: {
        id: 'pmt-1',
        reference: 'PAY-EQ-1001',
        status: 'pending',
        amount: 1_500_000, // Expected ₦1,500,000
      },
    });

    expect(result.failed).toBe(true);
    expect(result.error).toBe('amount_mismatch');
  });

  it('gracefully ignores non-charge.success events', () => {
    const payload = JSON.stringify({
      event: 'charge.failed',
      data: { reference: 'PAY-EQ-1001' },
    });
    const sig = signPayload(payload);

    const result = verifyAndProcessPaystackWebhook({
      rawBody: payload,
      signature: sig,
      secretKey: TEST_SECRET,
    });

    expect(result.ignored).toBe(true);
    expect(result.reason).toBe('Event not charge.success');
  });
});
