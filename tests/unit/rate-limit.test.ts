import { describe, it, expect } from 'vitest';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

describe('Rate Limiter Utility Suite', () => {
  it('allows requests within limit and tracks remaining quota', async () => {
    const id = `test-ip-${Date.now()}`;
    const limit = 5;
    const windowMs = 5000;

    for (let i = 1; i <= limit; i++) {
      const result = await checkRateLimit(id, limit, windowMs);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(limit - i);
    }

    // Exceed limit
    const blocked = await checkRateLimit(id, limit, windowMs);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.resetMs).toBeGreaterThan(0);
  });

  it('extracts client IP from x-forwarded-for header properly', () => {
    const req = new Request('https://cheesco.com/api/test', {
      headers: {
        'x-forwarded-for': '102.89.43.12, 192.168.1.1',
      },
    });

    const ip = getClientIp(req);
    expect(ip).toBe('102.89.43.12');
  });

  it('falls back to 127.0.0.1 when no proxy headers exist', () => {
    const req = new Request('https://cheesco.com/api/test');
    const ip = getClientIp(req);
    expect(ip).toBe('127.0.0.1');
  });
});
