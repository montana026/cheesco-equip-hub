import { NextResponse } from 'next/server';

/**
 * Temporary diagnostic route to test Sentry exception capture.
 * Visiting GET /api/sentry-test throws an unhandled error.
 * Remove this file / directory after confirming error delivery in Sentry dashboard.
 */
export async function GET() {
  throw new Error('Sentry test error: Verifying exception capture in Cheesco Equip Hub');
}
