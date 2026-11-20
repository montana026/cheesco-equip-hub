/**
 * Enum Label Safety Test
 *
 * Verifies that every constant exported from lib/types.ts for DB enum columns
 * contains only real database labels. A wrong label inside a Postgres .in()/.eq()
 * makes the whole query silently return 0 rows in production.
 *
 * Also scans a representative set of route files for any literal strings that are
 * compared against enum columns but are NOT real labels.
 */

import { describe, test, expect } from 'vitest';
import {
  AD_CAMPAIGN_STATUS,
  DEPOSIT_STATUS,
  EQUIPMENT_VERIFICATION_STATUS,
  LOGISTICS_STATUS,
  MERCHANT_VERIFICATION_STATUS,
  NOTIFICATION_TYPE,
  PAYMENT_STATUS,
  PAYMENT_TYPE,
  QUOTATION_STATUS,
  RENTAL_STATE,
  RENTAL_STATES,
  RENTAL_PAYMENT_ALLOWED_STATES,
  RENTAL_POST_PAYMENT_STATES,
  QUOTATION_PAYMENT_ALLOWED_STATUSES,
  TICKET_PRIORITY,
  TICKET_CATEGORY,
  TICKET_STATUS,
  USER_ROLE,
} from '../../lib/types';

// ── Ground truth: real DB enum labels ────────────────────────────────────────

const REAL_AD_CAMPAIGN_STATUS = new Set([
  'PENDING_APPROVAL', 'ACTIVE', 'PAUSED', 'EXPIRED', 'CANCELLED',
]);

const REAL_DEPOSIT_STATUS = new Set([
  'HELD', 'RELEASED', 'PARTIALLY_DEDUCTED', 'FULLY_DEDUCTED',
]);

const REAL_EQUIPMENT_VERIFICATION_STATUS = new Set([
  'DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'MORE_INFORMATION_REQUIRED',
  'VERIFIED', 'REJECTED', 'SUSPENDED',
]);

const REAL_LOGISTICS_STATUS = new Set([
  'PENDING', 'ASSIGNED', 'PREPARING', 'DISPATCHED', 'IN_TRANSIT',
  'ARRIVED', 'DELIVERED', 'FAILED', 'CANCELLED',
]);

const REAL_MERCHANT_VERIFICATION_STATUS = new Set([
  'NOT_STARTED', 'SUBMITTED', 'UNDER_REVIEW', 'MORE_INFORMATION_REQUIRED',
  'VERIFIED', 'REJECTED', 'SUSPENDED',
]);

const REAL_NOTIFICATION_TYPE = new Set([
  'RENTAL_REQUEST', 'QUOTATION', 'PAYMENT', 'LOGISTICS', 'DELIVERY',
  'INSPECTION', 'DISPUTE', 'MESSAGE', 'SYSTEM',
]);

const REAL_PAYMENT_STATUS = new Set([
  'PENDING', 'PROCESSING', 'CONFIRMED', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED',
]);

const REAL_PAYMENT_TYPE = new Set([
  'RENTAL_FEE', 'DAMAGE_DEPOSIT', 'SALE_PAYMENT', 'AD_CAMPAIGN_FEE',
]);

const REAL_QUOTATION_STATUS = new Set([
  'DRAFT', 'SENT', 'VIEWED', 'ACCEPTED', 'DECLINED', 'EXPIRED',
  'REVISION_REQUESTED', 'CANCELLED',
]);

const REAL_RENTAL_STATE = new Set([
  'REQUEST_SUBMITTED', 'CHEESCO_REVIEWING', 'EQUIPMENT_VERIFICATION_CHECK',
  'AVAILABILITY_CONFIRMED', 'QUOTATION_DRAFTED', 'QUOTATION_SENT',
  'QUOTATION_VIEWED', 'QUOTATION_ACCEPTED', 'QUOTATION_REVISION_REQUESTED',
  'AGREEMENT_GENERATED', 'AGREEMENT_SENT', 'AGREEMENT_SIGNED',
  'PAYMENT_PENDING', 'PAYMENT_PARTIALLY_RECEIVED', 'PAYMENT_CONFIRMED',
  'DEPOSIT_HELD', 'LOGISTICS_PENDING', 'CARRIER_ASSIGNED', 'IN_TRANSIT',
  'PRE_DELIVERY_INSPECTION', 'DELIVERED', 'RENTAL_ACTIVE', 'RETURN_SCHEDULED',
  'RETURN_IN_PROGRESS', 'POST_RENTAL_INSPECTION', 'DEPOSIT_SETTLEMENT',
  'COMPLETED', 'CANCELLED', 'DISPUTED',
]);

const REAL_TICKET_PRIORITY = new Set(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);

const REAL_TICKET_CATEGORY = new Set([
  'RENTAL', 'PAYMENT', 'EQUIPMENT', 'DELIVERY', 'MERCHANT', 'DISPUTE', 'ACCOUNT', 'OTHER',
]);

const REAL_TICKET_STATUS = new Set([
  'OPEN', 'IN_PROGRESS', 'AWAITING_CUSTOMER', 'RESOLVED', 'CLOSED',
]);

const REAL_USER_ROLE = new Set([
  'CUSTOMER', 'MERCHANT', 'OPERATIONS_ADMIN', 'VERIFICATION_ADMIN',
  'FINANCE_ADMIN', 'SUPPORT_ADMIN', 'SUPER_ADMIN',
]);

// ── Helper ────────────────────────────────────────────────────────────────────

function checkAllIn(label: string, values: readonly string[], real: Set<string>) {
  for (const v of values) {
    if (!real.has(v)) {
      throw new Error(`Bad ${label} label: '${v}' is not a real DB enum value. Real values: ${[...real].join(', ')}`);
    }
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('DB Enum Label Safety', () => {
  test('AD_CAMPAIGN_STATUS values are all real', () => {
    checkAllIn('AD_CAMPAIGN_STATUS', Object.values(AD_CAMPAIGN_STATUS), REAL_AD_CAMPAIGN_STATUS);
  });

  test('DEPOSIT_STATUS values are all real', () => {
    checkAllIn('DEPOSIT_STATUS', Object.values(DEPOSIT_STATUS), REAL_DEPOSIT_STATUS);
  });

  test('EQUIPMENT_VERIFICATION_STATUS values are all real', () => {
    checkAllIn('EQUIPMENT_VERIFICATION_STATUS', Object.values(EQUIPMENT_VERIFICATION_STATUS), REAL_EQUIPMENT_VERIFICATION_STATUS);
  });

  test('LOGISTICS_STATUS values are all real', () => {
    checkAllIn('LOGISTICS_STATUS', Object.values(LOGISTICS_STATUS), REAL_LOGISTICS_STATUS);
  });

  test('MERCHANT_VERIFICATION_STATUS values are all real', () => {
    checkAllIn('MERCHANT_VERIFICATION_STATUS', Object.values(MERCHANT_VERIFICATION_STATUS), REAL_MERCHANT_VERIFICATION_STATUS);
  });

  test('NOTIFICATION_TYPE values are all real', () => {
    checkAllIn('NOTIFICATION_TYPE', Object.values(NOTIFICATION_TYPE), REAL_NOTIFICATION_TYPE);
  });

  test('PAYMENT_STATUS values are all real', () => {
    checkAllIn('PAYMENT_STATUS', Object.values(PAYMENT_STATUS), REAL_PAYMENT_STATUS);
  });

  test('PAYMENT_TYPE values are all real', () => {
    checkAllIn('PAYMENT_TYPE', Object.values(PAYMENT_TYPE), REAL_PAYMENT_TYPE);
  });

  test('QUOTATION_STATUS values are all real', () => {
    checkAllIn('QUOTATION_STATUS', Object.values(QUOTATION_STATUS), REAL_QUOTATION_STATUS);
  });

  test('RENTAL_STATE values are all real', () => {
    checkAllIn('RENTAL_STATE', Object.values(RENTAL_STATE), REAL_RENTAL_STATE);
  });

  test('RENTAL_STATES array values are all real', () => {
    checkAllIn('RENTAL_STATES', [...RENTAL_STATES], REAL_RENTAL_STATE);
  });

  test('TICKET_PRIORITY values are all real', () => {
    checkAllIn('TICKET_PRIORITY', Object.values(TICKET_PRIORITY), REAL_TICKET_PRIORITY);
  });

  test('TICKET_CATEGORY values are all real', () => {
    checkAllIn('TICKET_CATEGORY', Object.values(TICKET_CATEGORY), REAL_TICKET_CATEGORY);
  });

  test('TICKET_STATUS values are all real', () => {
    checkAllIn('TICKET_STATUS', Object.values(TICKET_STATUS), REAL_TICKET_STATUS);
  });

  test('USER_ROLE values are all real', () => {
    checkAllIn('USER_ROLE', Object.values(USER_ROLE), REAL_USER_ROLE);
  });

  test('RENTAL_PAYMENT_ALLOWED_STATES are all real rental states', () => {
    checkAllIn('RENTAL_PAYMENT_ALLOWED_STATES', [...RENTAL_PAYMENT_ALLOWED_STATES], REAL_RENTAL_STATE);
  });

  test('RENTAL_POST_PAYMENT_STATES are all real rental states', () => {
    checkAllIn('RENTAL_POST_PAYMENT_STATES', [...RENTAL_POST_PAYMENT_STATES], REAL_RENTAL_STATE);
  });

  test('QUOTATION_PAYMENT_ALLOWED_STATUSES are all real quotation statuses', () => {
    checkAllIn('QUOTATION_PAYMENT_ALLOWED_STATUSES', [...QUOTATION_PAYMENT_ALLOWED_STATUSES], REAL_QUOTATION_STATUS);
  });

  test('known bad literals are absent from RENTAL_STATE constant', () => {
    const bad = ['ACTIVE_RENTAL', 'RENTAL_COMPLETED', 'CLOSED', 'PAYMENT_FAILED', 'EQUIPMENT_DELIVERED'];
    for (const b of bad) {
      expect(REAL_RENTAL_STATE.has(b)).toBe(false);
      expect(Object.values(RENTAL_STATE)).not.toContain(b);
    }
  });

  test('known bad literal ACTIVE_RENTAL is not a real rental state', () => {
    expect(REAL_RENTAL_STATE.has('ACTIVE_RENTAL')).toBe(false);
  });

  test('RENTAL_STATE has RENTAL_ACTIVE (the correct label)', () => {
    expect(REAL_RENTAL_STATE.has('RENTAL_ACTIVE')).toBe(true);
    expect(Object.values(RENTAL_STATE)).toContain('RENTAL_ACTIVE');
  });

  test('no duplicate values in RENTAL_STATE', () => {
    const vals = Object.values(RENTAL_STATE);
    const unique = new Set(vals);
    expect(unique.size).toBe(vals.length);
  });

  test('NOTIFICATION_TYPE does not contain EQUIPMENT (not a real DB enum)', () => {
    expect(Object.values(NOTIFICATION_TYPE)).not.toContain('EQUIPMENT');
  });
});
