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

  // Localhost origins are strictly forbidden in real production deployments
  if (!isRealProduction()) {
    if (
      origin.startsWith('http://localhost') ||
      origin.startsWith('http://127.0.0.1')
    ) {
      return true;
    }
  }

  // Determine the app's canonical origin and compare both www and non-www forms
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/+$/, '');
  if (appUrl) {
    if (origin === appUrl) return true;

    try {
      const originUrl = new URL(origin);
      const targetUrl = new URL(appUrl);
      const originHost = originUrl.host.replace(/^www\./i, '').toLowerCase();
      const targetHost = targetUrl.host.replace(/^www\./i, '').toLowerCase();

      if (
        originUrl.protocol === targetUrl.protocol &&
        originHost === targetHost &&
        originUrl.port === targetUrl.port
      ) {
        return true;
      }
    } catch {
      // Invalid URL format
    }
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
