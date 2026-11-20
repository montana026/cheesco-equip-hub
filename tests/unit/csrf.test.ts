import { describe, it, expect } from 'vitest';
import { isSameOrigin } from '@/lib/csrf';

describe('CSRF Origin Guard', () => {
  it('allows requests with no Origin header', () => {
    const req = new Request('https://cheescoequiphub.com/api/login');
    expect(isSameOrigin(req)).toBe(true);
  });

  it('allows requests when Origin matches Host', () => {
    const req = new Request('https://cheesco-equip-hub.vercel.app/api/login', {
      headers: {
        origin: 'https://cheesco-equip-hub.vercel.app',
        host: 'cheesco-equip-hub.vercel.app',
      },
    });
    expect(isSameOrigin(req)).toBe(true);
  });

  it('allows requests when Origin matches X-Forwarded-Host', () => {
    const req = new Request('https://cheesco-equip-hub.vercel.app/api/login', {
      headers: {
        origin: 'https://cheesco-equip-hub.vercel.app',
        'x-forwarded-host': 'cheesco-equip-hub.vercel.app',
      },
    });
    expect(isSameOrigin(req)).toBe(true);
  });

  it('allows legitimate vercel.app preview domains', () => {
    const req = new Request('https://cheesco-equip-hub-git-main-montana026.vercel.app/api/login', {
      headers: {
        origin: 'https://cheesco-equip-hub-git-main-montana026.vercel.app',
      },
    });
    expect(isSameOrigin(req)).toBe(true);
  });

  it('allows official cheesco domains', () => {
    const req = new Request('https://cheescoequiphub.com/api/login', {
      headers: {
        origin: 'https://cheescoequiphub.com',
      },
    });
    expect(isSameOrigin(req)).toBe(true);
  });

  it('rejects cross-origin requests from foreign domains', () => {
    const req = new Request('https://cheescoequiphub.com/api/login', {
      headers: {
        origin: 'https://malicious-attacker.com',
        host: 'cheescoequiphub.com',
      },
    });
    expect(isSameOrigin(req)).toBe(false);
  });
});
