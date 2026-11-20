/**
 * Next.js Instrumentation hook.
 * Runs once on server startup before handling incoming requests.
 */
import * as Sentry from '@sentry/nextjs';
import { assertProductionEnv } from '@/lib/startup-check';

export async function register() {
  assertProductionEnv();

  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

export const onRequestError = Sentry.captureRequestError;
