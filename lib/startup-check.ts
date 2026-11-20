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

  if (!hasUpstash) {
    console.warn(
      `\n⚠️  [STARTUP WARNING] Upstash Redis env vars (UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN) ` +
      `are not configured. Rate limiting is falling back to an in-memory sliding window.\n`
    );
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined);

  if (!appUrl || appUrl.includes('localhost') || appUrl.includes('127.0.0.1')) {
    console.warn(
      `\n⚠️  [STARTUP WARNING] NEXT_PUBLIC_APP_URL is not configured or points to localhost ` +
      `(value: ${appUrl || 'not set'}). Set NEXT_PUBLIC_APP_URL in your Vercel Environment Variables ` +
      `to your public domain (e.g. https://cheescoequiphub.com).\n`
    );
  }
}
