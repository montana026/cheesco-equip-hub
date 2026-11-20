import { describe, it, expect } from 'vitest';
import crypto from 'crypto';

export function verifyAndProcessFlutterwaveWebhook(params: {
  eventData: any;
  incomingHash: string | null;
  webhookSecretHash: string;
  existingPaymentRow?: {
    id: string;
    reference: string;
    status: string;
    amount: number;
  } | null;
}) {
  const { eventData, incomingHash, webhookSecretHash, existingPaymentRow } = params;

  // 1. Timing-safe verif-hash check
  if (webhookSecretHash && !webhookSecretHash.includes('your_flutterwave')) {
    if (!incomingHash) {
      throw new Error('Missing Flutterwave verif-hash header');
    }
    const secretBuf = Buffer.from(webhookSecretHash, 'utf-8');
    const incomingBuf = Buffer.from(incomingHash, 'utf-8');
    if (secretBuf.length !== incomingBuf.length || !crypto.timingSafeEqual(secretBuf, incomingBuf)) {
      throw new Error('Invalid Flutterwave verif-hash');
    }
  }

  const txRef = eventData.data?.tx_ref;
  if (!txRef) {
    return { ignored: true, reason: 'No tx_ref in payload' };
  }

  if (!existingPaymentRow) {
    throw new Error(`Payment with reference ${txRef} not found`);
  }

  // 2. Idempotency
  if (
    existingPaymentRow.status === 'paid' ||
    existingPaymentRow.status === 'CONFIRMED'
  ) {
    return { idempotent: true, message: 'Payment already marked paid' };
  }

  // 3. Amount validation
  const verifiedAmount = Number(eventData.data?.amount);
  const expectedAmount = Number(existingPaymentRow.amount);
  if (Math.abs(verifiedAmount - expectedAmount) > 1) {
    return { failed: true, error: 'amount_mismatch', verifiedAmount, expectedAmount };
  }

  return {
    success: true,
    reference: txRef,
    status: 'paid',
  };
}

describe('Flutterwave Webhook Security Suite', () => {
  const TEST_HASH = 'flw_secret_verif_hash_987654321';

  it('accepts matching verif-hash header and completes payment', () => {
    const event = {
      event: 'charge.completed',
      data: {
        tx_ref: 'FLW-TX-9901',
        amount: 850_000,
        currency: 'NGN',
        status: 'successful',
      },
    };

    const res = verifyAndProcessFlutterwaveWebhook({
      eventData: event,
      incomingHash: TEST_HASH,
      webhookSecretHash: TEST_HASH,
      existingPaymentRow: {
        id: 'pmt-flw-1',
        reference: 'FLW-TX-9901',
        status: 'pending',
        amount: 850_000,
      },
    });

    expect(res.success).toBe(true);
    expect(res.status).toBe('paid');
  });

  it('rejects missing or wrong verif-hash', () => {
    const event = { data: { tx_ref: 'FLW-TX-9901' } };

    expect(() =>
      verifyAndProcessFlutterwaveWebhook({
        eventData: event,
        incomingHash: null,
        webhookSecretHash: TEST_HASH,
      })
    ).toThrow('Missing Flutterwave verif-hash header');

    expect(() =>
      verifyAndProcessFlutterwaveWebhook({
        eventData: event,
        incomingHash: 'wrong_secret_hash',
        webhookSecretHash: TEST_HASH,
      })
    ).toThrow('Invalid Flutterwave verif-hash');
  });

  it('prevents duplicate processing on webhook replay', () => {
    const event = {
      data: {
        tx_ref: 'FLW-TX-9901',
        amount: 850_000,
      },
    };

    const res = verifyAndProcessFlutterwaveWebhook({
      eventData: event,
      incomingHash: TEST_HASH,
      webhookSecretHash: TEST_HASH,
      existingPaymentRow: {
        id: 'pmt-flw-1',
        reference: 'FLW-TX-9901',
        status: 'paid', // Already paid
        amount: 850_000,
      },
    });

    expect(res.idempotent).toBe(true);
  });
});
