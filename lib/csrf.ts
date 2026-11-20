import { isRealProduction } from '@/lib/startup-check';

/**
 * CSRF origin check for state-changing API routes (POST, PATCH, DELETE, PUT).
 *
 * With cookie-based authentication, the browser automatically sends the session
 * cookie with every same-origin and cross-site request. Without an Origin check,
 * a malicious page on another domain could trigger state-changing actions on
 * behalf of a logged-in user.
 *
 * Rules:
 * 1. Allow requests with no Origin header (same-origin XMLHttpRequest/fetch in some
 *    browsers, server-to-server calls, curl).
 * 2. Allow localhost/127.0.0.1 ONLY when NOT a real production deployment.
 * 3. In real production, accept both www and non-www forms of NEXT_PUBLIC_APP_URL.
 */
export function isSameOrigin(request: Request | { headers: { get(name: string): string | null } }): boolean {
  const origin = request.headers.get('origin');

  // No Origin header → same-origin fetch or non-browser client; allow
  if (!origin) return true;

  // Localhost origins are allowed when NOT a real production deployment
  if (!isRealProduction()) {
    if (
      origin.startsWith('http://localhost') ||
      origin.startsWith('http://127.0.0.1')
    ) {
      return true;
    }
  }

  let originHost = '';
  try {
    const originUrl = new URL(origin);
    originHost = originUrl.host.replace(/^www\./i, '').toLowerCase();
  } catch {
    return false;
  }

  // 1. Direct match with request's incoming Host / X-Forwarded-Host header
  // (This handles any Vercel preview domain, staging, or production domain automatically)
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  if (host) {
    const reqHost = host.split(',')[0].trim().replace(/^www\./i, '').toLowerCase();
    if (originHost === reqHost) {
      return true;
    }
  }

  // 2. Match configured NEXT_PUBLIC_APP_URL
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/+$/, '');
  if (appUrl) {
    try {
      const targetUrl = new URL(appUrl);
      const targetHost = targetUrl.host.replace(/^www\./i, '').toLowerCase();
      if (originHost === targetHost) {
        return true;
      }
    } catch {
      // Invalid URL format
    }
  }

  // 3. Match Vercel's automatic deployment URL
  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) {
    const vercelHost = vercelUrl.replace(/^https?:\/\//, '').replace(/^www\./i, '').toLowerCase();
    if (originHost === vercelHost) {
      return true;
    }
  }

  // 4. Match official Cheesco & Vercel deployment domains
  if (
    originHost === 'cheescoequiphub.com' ||
    originHost === 'cheesco.com' ||
    originHost.endsWith('.cheescoequiphub.com') ||
    originHost.endsWith('.vercel.app')
  ) {
    return true;
  }

  return false;
}

/**
 * Returns a 403 NextResponse if the request fails the same-origin check,
 * or null if it passes.
 */
export function csrfGuard(
  request: Request | { headers: { get(name: string): string | null } }
): { status: 403; error: string } | null {
  if (!isSameOrigin(request)) {
    return { status: 403, error: 'Forbidden: cross-origin request rejected' };
  }
  return null;
}
