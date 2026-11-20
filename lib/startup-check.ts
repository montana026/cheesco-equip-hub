/**
 * assertProductionEnv
 *
 * Throws at startup if NEXT_PUBLIC_APP_URL is missing or still points to
 * localhost, but ONLY during a real production deployment — not when explicitly
 * opted-out for local testing via LOCAL_PROD_TEST=true.
 *
 * Safe-by-default rule:
 * Real production = NODE_ENV === 'production' && process.env.LOCAL_PROD_TEST !== 'true'
 */
export function isRealProduction(): boolean {
  return (
    process.env.NODE_ENV === 'production' &&
    process.env.LOCAL_PROD_TEST !== 'true'
  );
}

export function assertProductionEnv(): void {
  const hasUpstash = Boolean(
    process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_TOKEN
  );

  // Loud startup warning if in NODE_ENV=production but neither Upstash nor hosting deployment env is set
  if (process.env.NODE_ENV === 'production') {
    if (!isRealProduction() && !hasUpstash) {
      console.warn(
        `\n⚠️  [STARTUP WARNING] Running in NODE_ENV=production with LOCAL_PROD_TEST=true, ` +
        `and Upstash Redis env vars (UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN) are not set. ` +
        `Rate limiting is falling back to an in-memory sliding window for this local instance.\n`
      );
    } else if (isRealProduction() && !hasUpstash) {
      console.error(
        `\n🚨 [SECURITY ALERT] Real production deployment detected (NODE_ENV=production, LOCAL_PROD_TEST!=true) ` +
        `WITHOUT Upstash Redis configured. All rate-limited routes will FAIL CLOSED to prevent abuse. ` +
        `Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN immediately.\n`
      );
    }
  }

  if (!isRealProduction()) return;

  if (!hasUpstash) {
    throw new Error(
      `[Startup Check Failed] UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN is missing ` +
      `in a real production deployment. Rate limiting requires Upstash Redis in production.`
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl || appUrl.includes('localhost') || appUrl.includes('127.0.0.1')) {
    throw new Error(
      `[Startup Check Failed] NEXT_PUBLIC_APP_URL is missing or contains 'localhost' ` +
      `in a real production deployment ` +
      `(NODE_ENV=${process.env.NODE_ENV}, LOCAL_PROD_TEST=${process.env.LOCAL_PROD_TEST}, value=${appUrl}). ` +
      `Set NEXT_PUBLIC_APP_URL to your public URL, e.g. https://cheescoequiphub.com`
    );
  }
}
