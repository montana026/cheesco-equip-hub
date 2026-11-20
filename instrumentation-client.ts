/**
 * Next.js client-side instrumentation hook.
 * Loaded once in the browser before any page renders.
 * Required for Sentry client-side error capture and session replay.
 */
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Capture 10 % of transactions for performance monitoring in production.
  // Set to 1.0 (100 %) locally while debugging, then reduce before deploying.
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Session Replay settings: sample 10% of normal sessions, but 100% of sessions with an error
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Strip PII from breadcrumbs and events
  beforeSend(event) {
    // Remove any URL query parameters that may contain tokens or sensitive data
    if (event.request?.url) {
      try {
        const url = new URL(event.request.url);
        url.searchParams.delete("ref");
        url.searchParams.delete("token");
        url.searchParams.delete("code");
        event.request.url = url.toString();
      } catch {
        // ignore
      }
    }
    return event;
  },

  debug: false,
});
