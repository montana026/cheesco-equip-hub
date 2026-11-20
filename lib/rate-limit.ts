/**
 * Rate limiter backed by Upstash Redis in production.
 * Falls back to an in-memory sliding-window map when Upstash is not configured
 * (always in dev, and as a no-op pass-through for local `npm start`).
 *
 * Exported function signatures are preserved so no existing callers break.
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { isRealProduction } from '@/lib/startup-check';

export interface RateLimitResponse {
  allowed: boolean;
  remaining: number;
  resetMs: number;
}

export type RateLimitResult = Promise<RateLimitResponse>;

// ── In-memory fallback (dev & local start) ────────────────────────────────────
interface RateLimitRecord {
  timestamps: number[];
}

const rateLimitMap = new Map<string, RateLimitRecord>();

// Periodic cleanup to avoid memory leaks
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimitMap.entries()) {
      record.timestamps = record.timestamps.filter((t) => now - t < 300_000);
      if (record.timestamps.length === 0) {
        rateLimitMap.delete(key);
      }
    }
  }, 300_000);
}

function checkRateLimitInMemory(
  identifier: string,
  limit: number,
  windowMs: number
): RateLimitResponse {
  const now = Date.now();
  let record = rateLimitMap.get(identifier);

  if (!record) {
    record = { timestamps: [] };
    rateLimitMap.set(identifier, record);
  }

  record.timestamps = record.timestamps.filter((t) => now - t < windowMs);

  if (record.timestamps.length >= limit) {
    const oldest = record.timestamps[0] || now;
    const resetMs = Math.max(0, windowMs - (now - oldest));
    return { allowed: false, remaining: 0, resetMs };
  }

  record.timestamps.push(now);
  return {
    allowed: true,
    remaining: limit - record.timestamps.length,
    resetMs: windowMs,
  };
}

let redisInstance: Redis | null = null;
function getRedis(): Redis {
  if (!redisInstance) {
    redisInstance = Redis.fromEnv();
  }
  return redisInstance;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Standard sliding-window rate limiter.
 * Plain async function returning Promise<RateLimitResponse>.
 *
 * Behaviour matrix:
 *   | Upstash vars? | isRealProduction? | failClosed? | Result                              |
 *   |---------------|-------------------|-------------|-------------------------------------|
 *   | no            | yes               | true        | Fail-closed (request blocked)       |
 *   | no            | yes               | false       | Fail-open (allows platform read)    |
 *   | no            | no                | any         | In-memory map (lenient, local)      |
 *   | yes           | any               | any         | Upstash Redis (authoritative)       |
 *
 * On Upstash runtime errors (network timeouts, Redis connection issues),
 * always logs with console.error and falls back to in-memory rate limiting.
 *
 * @param options.failClosed - When true AND Upstash is missing in production, fail closed.
 */
export async function checkRateLimit(
  identifier: string,
  limit: number = 30,
  windowMs: number = 60_000,
  options: { failClosed?: boolean; endpoint?: string } = {}
): Promise<RateLimitResponse> {
  const realProd = isRealProduction();
  const hasUpstash = Boolean(
    process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_TOKEN
  );

  // 1. Real deployment without Upstash
  if (realProd && !hasUpstash) {
    if (options.failClosed) {
      console.error(
        `[rate-limit] UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN not set in production. Critical route "${identifier}" failing closed.`
      );
      return { allowed: false, remaining: 0, resetMs: windowMs };
    }
    console.warn(
      `[rate-limit] Upstash not configured in production. Route "${identifier}" failing open.`
    );
    return { allowed: true, remaining: limit, resetMs: windowMs };
  }

  // 2. Upstash not configured (local dev / local npm start) → in-memory
  if (!hasUpstash) {
    return checkRateLimitInMemory(identifier, limit, windowMs);
  }

  // 3. Upstash configured → query Redis
  try {
    const redis = getRedis();
    const windowSeconds = Math.max(1, Math.ceil(windowMs / 1000));
    const ratelimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limit, `${windowSeconds} s`),
      prefix: 'cheesco_rl',
    });

    const { success, remaining, reset } = await ratelimiter.limit(identifier);
    const resetMs = Math.max(0, reset - Date.now());
    return { allowed: success, remaining, resetMs };
  } catch (err) {
    // On Upstash runtime errors, fall back to in-memory with console.error
    console.error(`[rate-limit] Upstash runtime error for "${identifier}", falling back to in-memory:`, err);
    return checkRateLimitInMemory(identifier, limit, windowMs);
  }
}

/**
 * Platform Cost Controls & Usage Quota Rules.
 * Prevents financial bleeding from third-party pay-per-use APIs (Resend, Termii, Supabase Storage).
 */
export const COST_CONTROLS = {
  // Outbound Email Quotas (Resend)
  MAX_DAILY_OUTBOUND_EMAILS_PER_RECIPIENT: 20, // Max emails sent to any single email address per 24 hours
  MAX_DAILY_OUTBOUND_EMAILS_SYSTEM: 1000,       // Global emergency circuit breaker for the entire platform per 24 hours

  // Outbound SMS Quotas (Termii / Twilio)
  MAX_DAILY_OUTBOUND_SMS_PER_PHONE: 5,         // Max SMS messages sent to any single phone number per 24 hours
  MAX_DAILY_OUTBOUND_SMS_SYSTEM: 250,          // Global daily SMS spend cap for the platform

  // Marketplace Abuse & Resource Controls
  MAX_DAILY_RENTAL_REQUESTS_PER_USER: 10,      // Max rental/purchase requests a single user can create per 24 hours
  MAX_DAILY_REVIEWS_PER_USER: 5,               // Max reviews submitted per day
  MAX_DAILY_SUPPORT_TICKETS_PER_USER: 10,      // Max support tickets created per day

  // Merchant Listing Limits (Free/Standard tier)
  MAX_UNVERIFIED_MERCHANT_LISTINGS: 3,         // Max active listings before KYC verification
  MAX_VERIFIED_MERCHANT_LISTINGS: 25,          // Standard fleet tier quota
} as const;

/**
 * 24-Hour Rolling Usage Quota Tracker.
 * Used for cost-bearing external services and business quotas.
 */
export async function checkDailyQuota(
  category: 'email' | 'sms' | 'rental_request' | 'listing_creation' | 'support_ticket' | 'review',
  identifier: string,
  dailyLimit: number
): Promise<RateLimitResponse> {
  const windowMs = 24 * 60 * 60 * 1000; // 24-hour window
  return checkRateLimit(`quota:${category}:${identifier}`, dailyLimit, windowMs);
}

/**
 * Progressive Request Throttling.
 * Calculates exponential delay (backoff) based on recent request frequency.
 * Allows graceful traffic smoothing rather than abrupt hard drops.
 *
 * @param count Number of requests in the current window
 * @param threshold Request count after which artificial delay begins (default: 5)
 * @returns Delay in milliseconds (0 if under threshold, up to maxDelayMs)
 */
export function computeThrottleDelayMs(
  count: number,
  threshold: number = 5,
  maxDelayMs: number = 3000
): number {
  if (count <= threshold) return 0;
  const excess = count - threshold;
  // Exponential backoff: 200ms, 400ms, 800ms, 1600ms, up to maxDelayMs
  const delay = Math.min(maxDelayMs, Math.round(200 * Math.pow(2, excess - 1)));
  return delay;
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return request.headers.get('x-real-ip') || '127.0.0.1';
}
