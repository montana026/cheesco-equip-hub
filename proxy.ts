import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { checkRateLimit, computeThrottleDelayMs, getClientIp } from '@/lib/rate-limit';
import { isSameOrigin } from '@/lib/csrf';

interface TierRule {
  pattern: RegExp;
  tier: string;
  limit: number;
  windowMs: number;
  throttleThreshold: number;
  maxDelayMs: number;
}

// Tiered rate limit definitions for API protection
const TIER_RULES: TierRule[] = [
  // High-burst, trusted payment webhooks
  {
    pattern: /^\/api\/webhooks(\/.*)?$/,
    tier: 'webhook',
    limit: 300,
    windowMs: 60_000,
    throttleThreshold: 100,
    maxDelayMs: 500,
  },
  // Lightweight auth session hydration (/api/auth/me) has its own looser tier (120/min)
  // so rapid page navigation and tab switches do not trigger 429 rate limiting.
  {
    pattern: /^\/api\/auth\/me(\/.*)?$/,
    tier: 'auth_me',
    limit: 120,
    windowMs: 60_000,
    throttleThreshold: 60,
    maxDelayMs: 500,
  },
  // Token refresh has its own tier (60/min) so background rotation never blocks login
  {
    pattern: /^\/api\/auth\/refresh(\/.*)?$/,
    tier: 'auth_refresh',
    limit: 60,
    windowMs: 60_000,
    throttleThreshold: 30,
    maxDelayMs: 500,
  },
  // Sensitive security endpoints (login, signup, session, logout)
  {
    pattern: /^\/api\/auth(\/.*)?$/,
    tier: 'auth',
    limit: 20,
    windowMs: 60_000,
    throttleThreshold: 5,
    maxDelayMs: 1500,
  },
  {
    pattern: /^\/api\/payments\/initialize(\/.*)?$/,
    tier: 'payment_init',
    limit: 15,
    windowMs: 60_000,
    throttleThreshold: 5,
    maxDelayMs: 1500,
  },
  {
    pattern: /^\/api\/upload(\/.*)?$/,
    tier: 'upload',
    limit: 20,
    windowMs: 60_000,
    throttleThreshold: 6,
    maxDelayMs: 1500,
  },
  {
    pattern: /^\/api\/rentals(\/.*)?$/,
    tier: 'rentals',
    limit: 30,
    windowMs: 60_000,
    throttleThreshold: 10,
    maxDelayMs: 1500,
  },
  {
    pattern: /^\/api\/test(\/.*)?$/,
    tier: 'test',
    limit: 5,
    windowMs: 60_000,
    throttleThreshold: 2,
    maxDelayMs: 1000,
  },
];

// Baseline fallback for all other API endpoints
const DEFAULT_API_RULE: TierRule = {
  pattern: /^\/api\/.*/,
  tier: 'default',
  limit: 120,
  windowMs: 60_000,
  throttleThreshold: 60,
  maxDelayMs: 2000,
};

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const requestMethod = request.method;

  // 1. Immediately block test endpoints in production
  if (process.env.NODE_ENV === 'production' && pathname.startsWith('/api/test')) {
    return NextResponse.json(
      {
        success: false,
        error: 'Test endpoints are disabled in production environments.',
      },
      { status: 403 }
    );
  }

  // 2. CSRF protection for all state-changing requests.
  // Webhooks are excluded — they use HMAC signature verification instead and
  // may be called by third-party servers that never send an Origin header.
  const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
  const isWebhook = pathname.startsWith('/api/webhooks');
  if (!SAFE_METHODS.has(requestMethod) && !isWebhook && !isSameOrigin(request)) {
    return NextResponse.json(
      {
        success: false,
        error: 'Forbidden: cross-origin request rejected',
      },
      { status: 403 }
    );
  }

  // 2. Identify client IP
  const ip = getClientIp(request);

  // 3. Match appropriate rate limit tier
  const matchedRule = TIER_RULES.find((rule) => rule.pattern.test(pathname)) || DEFAULT_API_RULE;
  const identifier = `proxy:${matchedRule.tier}:${ip}`;

  const rateCheck = await checkRateLimit(identifier, matchedRule.limit, matchedRule.windowMs);

  // 4. Handle Rate Limit Exceeded (HTTP 429)
  if (!rateCheck.allowed) {
    const retryAfterSec = Math.max(1, Math.ceil(rateCheck.resetMs / 1000));
    return NextResponse.json(
      {
        success: false,
        error: 'Too many requests. Please slow down and try again later.',
        retryAfter: retryAfterSec,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfterSec),
          'X-RateLimit-Limit': String(matchedRule.limit),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(retryAfterSec),
        },
      }
    );
  }

  // 5. Progressive Request Throttling (Burst smoothing)
  const requestCount = matchedRule.limit - rateCheck.remaining;
  const delayMs = computeThrottleDelayMs(
    requestCount,
    matchedRule.throttleThreshold,
    matchedRule.maxDelayMs
  );

  // In real traffic, sleep to smooth out bursts; in automated test runner (Vitest), skip actual delay
  const isTest = process.env.VITEST === 'true';
  if (delayMs > 0 && !isTest) {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  // 6. Forward downstream with standard rate limiting & telemetry headers
  const response = NextResponse.next();
  response.headers.set('X-RateLimit-Limit', String(matchedRule.limit));
  response.headers.set('X-RateLimit-Remaining', String(rateCheck.remaining));
  response.headers.set('X-RateLimit-Reset', String(Math.ceil(rateCheck.resetMs / 1000)));
  if (delayMs > 0) {
    response.headers.set('X-Throttle-Delay', `${delayMs}ms`);
  }

  return response;
}

export const config = {
  matcher: ['/api/:path*'],
};
