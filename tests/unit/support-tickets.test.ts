import { describe, it, expect } from 'vitest';
import { TICKET_CATEGORY, TICKET_PRIORITY, TICKET_STATUS } from '@/lib/types';

describe('Support Ticket Enums & Mappings', () => {
  it('contains all valid PostgreSQL ticket_category enum labels', () => {
    const validCategories = [
      'RENTAL',
      'PAYMENT',
      'EQUIPMENT',
      'DELIVERY',
      'MERCHANT',
      'DISPUTE',
      'ACCOUNT',
      'OTHER',
    ];
    expect(Object.values(TICKET_CATEGORY).sort()).toEqual(validCategories.sort());
  });

  it('contains all valid PostgreSQL ticket_priority enum labels', () => {
    const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
    expect(Object.values(TICKET_PRIORITY).sort()).toEqual(validPriorities.sort());
  });

  it('maps legacy and form category names to valid DB enum values', () => {
    const CATEGORY_MAP: Record<string, string> = {
      RENTAL_ISSUE: 'RENTAL',
      QUOTATION_BILLING: 'PAYMENT',
      LOGISTICS_DELIVERY: 'DELIVERY',
      MERCHANT_VERIFICATION: 'MERCHANT',
      REFUND_DEPOSIT: 'PAYMENT',
      GENERAL_INQUIRY: 'OTHER',
      RENTAL: 'RENTAL',
      PAYMENT: 'PAYMENT',
      EQUIPMENT: 'EQUIPMENT',
      DELIVERY: 'DELIVERY',
      MERCHANT: 'MERCHANT',
      DISPUTE: 'DISPUTE',
      ACCOUNT: 'ACCOUNT',
      OTHER: 'OTHER',
    };

    const validCategorySet = new Set(Object.values(TICKET_CATEGORY));

    for (const [input, mapped] of Object.entries(CATEGORY_MAP)) {
      expect(validCategorySet.has(mapped as any)).toBe(true);
    }
  });

  it('maps legacy priority names to valid DB enum values', () => {
    const PRIORITY_MAP: Record<string, string> = {
      NORMAL: 'MEDIUM',
      CRITICAL: 'URGENT',
      LOW: 'LOW',
      MEDIUM: 'MEDIUM',
      HIGH: 'HIGH',
      URGENT: 'URGENT',
    };

    const validPrioritySet = new Set(Object.values(TICKET_PRIORITY));

    for (const [input, mapped] of Object.entries(PRIORITY_MAP)) {
      expect(validPrioritySet.has(mapped as any)).toBe(true);
    }
  });
});
