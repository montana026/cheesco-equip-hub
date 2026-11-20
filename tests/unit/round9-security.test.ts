import { describe, it, expect } from 'vitest';
import { PAYMENT_STATUS, PAYMENT_TYPE, DEPOSIT_STATUS } from '@/lib/types';
import {
  PAYMENT_STATUS as PS_SERVICE,
  PAYMENT_TYPE as PT_SERVICE,
  DEPOSIT_STATUS as DS_SERVICE,
} from '@/lib/services/payment.service';
import { createAuthClient } from '@/lib/supabase/server';

describe('Round 9 Security & Hardening Tests', () => {
  describe('Canonical Payment Enums (Item 4)', () => {
    // Official PostgreSQL Enum Labels as defined in database schema
    const POSTGRES_PAYMENT_STATUSES = [
      'PENDING',
      'PROCESSING',
      'CONFIRMED',
      'FAILED',
      'REFUNDED',
      'PARTIALLY_REFUNDED',
    ] as const;

    const POSTGRES_PAYMENT_TYPES = [
      'RENTAL_FEE',
      'DAMAGE_DEPOSIT',
      'SALE_PAYMENT',
      'AD_CAMPAIGN_FEE',
    ] as const;

    const POSTGRES_DEPOSIT_STATUSES = [
      'HELD',
      'RELEASED',
      'PARTIALLY_DEDUCTED',
      'FULLY_DEDUCTED',
    ] as const;

    it('matches exact canonical payment_status enum labels', () => {
      const definedStatusValues = Object.values(PAYMENT_STATUS);
      expect(definedStatusValues.sort()).toEqual([...POSTGRES_PAYMENT_STATUSES].sort());

      // Ensure no legacy strings like 'paid', 'SUCCESSFUL', etc.
      expect(definedStatusValues).not.toContain('paid');
      expect(definedStatusValues).not.toContain('SUCCESSFUL');
      expect(definedStatusValues).not.toContain('successful');

      // Verify payment.service.ts exports identical values
      expect(Object.values(PS_SERVICE).sort()).toEqual([...POSTGRES_PAYMENT_STATUSES].sort());
    });

    it('matches exact canonical payment_type enum labels', () => {
      const definedTypes = Object.values(PAYMENT_TYPE);
      expect(definedTypes.sort()).toEqual([...POSTGRES_PAYMENT_TYPES].sort());
      expect(Object.values(PT_SERVICE).sort()).toEqual([...POSTGRES_PAYMENT_TYPES].sort());
    });

    it('matches exact canonical deposit_status enum labels', () => {
      const definedDeposits = Object.values(DEPOSIT_STATUS);
      expect(definedDeposits.sort()).toEqual([...POSTGRES_DEPOSIT_STATUSES].sort());
      expect(Object.values(DS_SERVICE).sort()).toEqual([...POSTGRES_DEPOSIT_STATUSES].sort());
    });
  });

  describe('createAuthClient Isolation & Session Non-Persistence (Item 15)', () => {
    it('creates distinct client instances that do not persist sessions across calls', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vmnszggrtvzspquwcrjt.supabase.co';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.mock';

      const client1 = createAuthClient();
      const client2 = createAuthClient();

      // Clients must be distinct instances
      expect(client1).not.toBe(client2);

      // Inspect auth configuration options
      const authOpts1 = (client1.auth as any).options || (client1.auth as any).storageKey;
      expect((client1.auth as any).persistSession).toBe(false);
      expect((client1.auth as any).autoRefreshToken).toBe(false);

      // Verify getSession() on a newly minted client is null
      const session1 = await client1.auth.getSession();
      const session2 = await client2.auth.getSession();

      expect(session1.data.session).toBeNull();
      expect(session2.data.session).toBeNull();
    });
  });
});
