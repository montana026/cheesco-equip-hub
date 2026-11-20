import { describe, it, expect } from 'vitest';
import {
  checkRateLimit,
  checkDailyQuota,
  computeThrottleDelayMs,
  COST_CONTROLS,
} from '@/lib/rate-limit';

describe('Cost Controls & Quotas Engine', () => {
  describe('COST_CONTROLS configuration', () => {
    it('defines positive thresholds for email cost limits', () => {
      expect(COST_CONTROLS.MAX_DAILY_OUTBOUND_EMAILS_PER_RECIPIENT).toBeGreaterThan(0);
      expect(COST_CONTROLS.MAX_DAILY_OUTBOUND_EMAILS_SYSTEM).toBeGreaterThan(
        COST_CONTROLS.MAX_DAILY_OUTBOUND_EMAILS_PER_RECIPIENT
      );
    });

    it('defines positive thresholds for SMS spend caps', () => {
      expect(COST_CONTROLS.MAX_DAILY_OUTBOUND_SMS_PER_PHONE).toBeGreaterThan(0);
      expect(COST_CONTROLS.MAX_DAILY_OUTBOUND_SMS_SYSTEM).toBeGreaterThan(
        COST_CONTROLS.MAX_DAILY_OUTBOUND_SMS_PER_PHONE
      );
    });

    it('defines marketplace resource abuse caps', () => {
      expect(COST_CONTROLS.MAX_DAILY_RENTAL_REQUESTS_PER_USER).toBe(10);
      expect(COST_CONTROLS.MAX_DAILY_REVIEWS_PER_USER).toBe(5);
      expect(COST_CONTROLS.MAX_UNVERIFIED_MERCHANT_LISTINGS).toBe(3);
      expect(COST_CONTROLS.MAX_VERIFIED_MERCHANT_LISTINGS).toBe(25);
    });
  });

  describe('checkDailyQuota()', () => {
    it('permits operations up to the daily quota and blocks excess', async () => {
      const email = `quota-test-${Date.now()}@example.com`;
      const dailyLimit = 3;

      for (let i = 1; i <= dailyLimit; i++) {
        const result = await checkDailyQuota('email', email, dailyLimit);
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(dailyLimit - i);
      }

      // 4th request must be blocked
      const blocked = await checkDailyQuota('email', email, dailyLimit);
      expect(blocked.allowed).toBe(false);
      expect(blocked.remaining).toBe(0);
      expect(blocked.resetMs).toBeGreaterThan(0);
    });

    it('isolates quotas across categories for the same identifier', async () => {
      const id = `user-${Date.now()}`;
      const limit = 2;

      // Exhaust rental_request quota
      await checkDailyQuota('rental_request', id, limit);
      await checkDailyQuota('rental_request', id, limit);
      const rentalBlocked = await checkDailyQuota('rental_request', id, limit);
      expect(rentalBlocked.allowed).toBe(false);

      // Support ticket quota for same user must still be available
      const supportAllowed = await checkDailyQuota('support_ticket', id, limit);
      expect(supportAllowed.allowed).toBe(true);
      expect(supportAllowed.remaining).toBe(1);
    });
  });

  describe('computeThrottleDelayMs()', () => {
    it('returns 0 delay when request count is within threshold', () => {
      expect(computeThrottleDelayMs(1, 5)).toBe(0);
      expect(computeThrottleDelayMs(3, 5)).toBe(0);
      expect(computeThrottleDelayMs(5, 5)).toBe(0);
    });

    it('returns exponential backoff delay when request count exceeds threshold', () => {
      // excess = 1 (count 6, threshold 5): 200 * 2^0 = 200ms
      expect(computeThrottleDelayMs(6, 5)).toBe(200);

      // excess = 2 (count 7, threshold 5): 200 * 2^1 = 400ms
      expect(computeThrottleDelayMs(7, 5)).toBe(400);

      // excess = 3 (count 8, threshold 5): 200 * 2^2 = 800ms
      expect(computeThrottleDelayMs(8, 5)).toBe(800);

      // excess = 4 (count 9, threshold 5): 200 * 2^3 = 1600ms
      expect(computeThrottleDelayMs(9, 5)).toBe(1600);
    });

    it('caps delay at maxDelayMs', () => {
      // Without cap, excess = 10 would be 200 * 512 = 102400ms
      const delay = computeThrottleDelayMs(15, 5, 2500);
      expect(delay).toBe(2500);
    });
  });
});
