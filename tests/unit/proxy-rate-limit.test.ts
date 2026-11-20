import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { proxy } from '@/proxy';

describe('Next.js 16 Proxy Edge Rate Limiter & Security Filter', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('attaches rate limit headers to allowed requests', async () => {
    const req = new NextRequest('http://localhost:3000/api/equipment', {
      headers: { 'x-forwarded-for': '198.51.100.1' },
    });

    const res = await proxy(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('X-RateLimit-Limit')).toBe('120');
    expect(res.headers.get('X-RateLimit-Remaining')).toBeDefined();
    expect(res.headers.get('X-RateLimit-Reset')).toBeDefined();
  });

  it('enforces sensitive tier limits on auth endpoints and returns 429 when exceeded', async () => {
    const testIp = `203.0.113.${Math.floor(Math.random() * 200 + 10)}`;
    const authLimit = 20;

    // Dispatch up to the limit
    for (let i = 0; i < authLimit; i++) {
      const req = new NextRequest('http://localhost:3000/api/auth/login', {
        headers: { 'x-forwarded-for': testIp },
      });
      const res = await proxy(req);
      expect(res.status).toBe(200);
    }

    // Next request must be rejected with 429
    const blockedReq = new NextRequest('http://localhost:3000/api/auth/login', {
      headers: { 'x-forwarded-for': testIp },
    });
    const blockedRes = await proxy(blockedReq);
    expect(blockedRes.status).toBe(429);

    const body = await blockedRes.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain('Too many requests');
    expect(blockedRes.headers.get('Retry-After')).toBeDefined();
    expect(blockedRes.headers.get('X-RateLimit-Remaining')).toBe('0');
  });

  it('attaches throttle header when request count exceeds throttle threshold', async () => {
    const throttleIp = `198.51.100.${Math.floor(Math.random() * 200 + 10)}`;
    // Auth threshold is 5; requests 1 to 5 have no delay
    for (let i = 1; i <= 5; i++) {
      const req = new NextRequest('http://localhost:3000/api/auth/session', {
        headers: { 'x-forwarded-for': throttleIp },
      });
      const res = await proxy(req);
      expect(res.headers.get('X-Throttle-Delay')).toBeNull();
    }

    // 6th request is above threshold (excess = 1 -> 200ms)
    const throttleReq = new NextRequest('http://localhost:3000/api/auth/session', {
      headers: { 'x-forwarded-for': throttleIp },
    });
    const throttleRes = await proxy(throttleReq);
    expect(throttleRes.headers.get('X-Throttle-Delay')).toBe('200ms');
  });

  it('blocks test endpoints when NODE_ENV is production with 403', async () => {
    const originalEnv = process.env.NODE_ENV;
    try {
      // @ts-expect-error - simulating production environment
      process.env.NODE_ENV = 'production';

      const req = new NextRequest('http://localhost:3000/api/test/email', {
        headers: { 'x-forwarded-for': '198.51.100.99' },
      });

      const res = await proxy(req);
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain('disabled in production');
    } finally {
      // @ts-expect-error - restore original environment
      process.env.NODE_ENV = originalEnv;
    }
  });

  it('allows high burst rates for payment webhooks', async () => {
    const webhookIp = `197.210.${Math.floor(Math.random() * 200 + 10)}.5`;
    const req = new NextRequest('http://localhost:3000/api/webhooks/paystack', {
      headers: { 'x-forwarded-for': webhookIp },
    });

    const res = await proxy(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('X-RateLimit-Limit')).toBe('300');
  });
});
