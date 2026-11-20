import { describe, it, expect } from 'vitest';

/**
 * Cheesco Financial & Escrow Math Engine
 * Validates the core marketplace pricing, markup, VAT, and escrow split rules.
 */
export function calculateRentalQuotation(params: {
  merchantBaseRate: number;
  durationDays: number;
  cheescoMarginRate: number; // e.g. 15 for 15%
  lineItems?: Array<{ label: string; amount: number }>;
}) {
  const { merchantBaseRate, durationDays, cheescoMarginRate, lineItems = [] } = params;

  // 1. Managed rental rate including Cheesco markup
  const cheescoManagedRate = merchantBaseRate * (1 + cheescoMarginRate / 100);
  const rentalCost = cheescoManagedRate * durationDays;

  // 2. Filter out operator and VAT line items if mistakenly supplied
  const cleanLineItems = lineItems.filter(
    (item) =>
      !item.label.toLowerCase().includes('operator') &&
      !item.label.toLowerCase().includes('vat')
  );

  const lineItemsTotal = cleanLineItems.reduce((sum, item) => sum + item.amount, 0);
  const subtotal = rentalCost + lineItemsTotal;

  // 3. Statutory 7.5% Nigerian VAT
  const VAT_RATE = 0.075;
  const vatAmount = Math.round(subtotal * VAT_RATE);

  // 4. Totals
  const totalAmount = subtotal + vatAmount;
  const merchantPayout = merchantBaseRate * durationDays;
  const cheescoGrossMargin = totalAmount - merchantPayout - vatAmount;

  return {
    cheescoManagedRate,
    rentalCost,
    lineItemsTotal,
    subtotal,
    vatAmount,
    totalAmount,
    merchantPayout,
    cheescoGrossMargin,
  };
}

export function determineEscrowStatus(params: {
  isPaid: boolean;
  isDisbursed: boolean;
  rentalState: string;
}): 'PENDING_PAYMENT' | 'ESCROW_HELD' | 'PAYOUT_READY' | 'DISBURSED' {
  const { isPaid, isDisbursed, rentalState } = params;

  if (!isPaid) return 'PENDING_PAYMENT';
  if (isDisbursed) return 'DISBURSED';

  const readyStates = [
    'RENTAL_ACTIVE',
    'ACTIVE_RENTAL',
    'IN_TRANSIT',
    'DELIVERED',
    'COMPLETED',
    'EQUIPMENT_DELIVERED',
    'PAYMENT_CONFIRMED',
  ];

  if (readyStates.includes(rentalState.toUpperCase())) {
    return 'PAYOUT_READY';
  }

  return 'ESCROW_HELD';
}

describe('Financial & Escrow Math Suite', () => {
  it('correctly calculates markup, 7.5% VAT, and merchant payout for a 10-day rental', () => {
    // 20-ton Cat 320 Excavator: ₦250,000/day merchant base, 10 days, 15% Cheesco margin
    const result = calculateRentalQuotation({
      merchantBaseRate: 250_000,
      durationDays: 10,
      cheescoMarginRate: 15,
      lineItems: [
        { label: 'Mobilization (Lagos to Epe)', amount: 150_000 },
        { label: 'Demobilization (Return Haulage)', amount: 150_000 },
      ],
    });

    // Managed rate: 250,000 * 1.15 = 287,500/day
    expect(result.cheescoManagedRate).toBe(287_500);

    // Rental cost: 287,500 * 10 = 2,875,000
    expect(result.rentalCost).toBe(2_875_000);

    // Logistics: 300,000
    expect(result.lineItemsTotal).toBe(300_000);

    // Subtotal: 2,875,000 + 300,000 = 3,175,000
    expect(result.subtotal).toBe(3_175_000);

    // VAT 7.5%: 3,175,000 * 0.075 = 238,125
    expect(result.vatAmount).toBe(238_125);

    // Total Amount: 3,175,000 + 238,125 = 3,413,125
    expect(result.totalAmount).toBe(3_413_125);

    // Merchant payout (strictly base rate * days): 250,000 * 10 = 2,500,000
    expect(result.merchantPayout).toBe(2_500_000);

    // Cheesco Margin (total - merchant - VAT) = logistics markup + rental markup:
    // 3,413,125 - 2,500,000 - 238,125 = 675,000
    // (Notice: 375,000 rental margin + 300,000 logistics passed through/managed)
    expect(result.cheescoGrossMargin).toBe(675_000);
  });

  it('strips redundant operator fees from line items per contractual terms', () => {
    const result = calculateRentalQuotation({
      merchantBaseRate: 100_000,
      durationDays: 5,
      cheescoMarginRate: 10,
      lineItems: [
        { label: 'Operator Daily Allowance', amount: 50_000 }, // Should be removed
        { label: 'Lowbed Haulage', amount: 80_000 }, // Kept
      ],
    });

    // Only lowbed haulage should be in the line items
    expect(result.lineItemsTotal).toBe(80_000);
  });

  it('never produces negative Cheesco gross margin', () => {
    const result = calculateRentalQuotation({
      merchantBaseRate: 500_000,
      durationDays: 30,
      cheescoMarginRate: 15,
    });

    expect(result.cheescoGrossMargin).toBeGreaterThan(0);
    expect(result.merchantPayout).toBe(15_000_000);
    expect(result.totalAmount).toBeGreaterThan(result.merchantPayout);
  });

  describe('Escrow Status Transitions', () => {
    it('returns PENDING_PAYMENT when unconfirmed', () => {
      const status = determineEscrowStatus({
        isPaid: false,
        isDisbursed: false,
        rentalState: 'REQUESTED',
      });
      expect(status).toBe('PENDING_PAYMENT');
    });

    it('returns ESCROW_HELD when paid but before mobilization/active rental', () => {
      const status = determineEscrowStatus({
        isPaid: true,
        isDisbursed: false,
        rentalState: 'AWAITING_SCHEDULE',
      });
      expect(status).toBe('ESCROW_HELD');
    });

    it('returns PAYOUT_READY once machinery is delivered or rental is active', () => {
      const statusActive = determineEscrowStatus({
        isPaid: true,
        isDisbursed: false,
        rentalState: 'RENTAL_ACTIVE',
      });
      expect(statusActive).toBe('PAYOUT_READY');

      const statusDelivered = determineEscrowStatus({
        isPaid: true,
        isDisbursed: false,
        rentalState: 'EQUIPMENT_DELIVERED',
      });
      expect(statusDelivered).toBe('PAYOUT_READY');
    });

    it('returns DISBURSED once finance admin confirms bank transfer', () => {
      const status = determineEscrowStatus({
        isPaid: true,
        isDisbursed: true,
        rentalState: 'COMPLETED',
      });
      expect(status).toBe('DISBURSED');
    });
  });
});
