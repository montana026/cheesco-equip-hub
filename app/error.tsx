"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Client-side telemetry / logging if needed
    console.error("[Application Error]", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas px-4 py-16">
      <div className="w-full max-w-lg text-center card-surface rounded-2xl p-8 border border-line-soft shadow-xl">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-cheesco-yellow/15 border border-cheesco-yellow/30 text-cheesco-yellow text-2xl font-black">
          ⚠️
        </div>

        <h1 className="text-2xl font-black text-ink tracking-tight">
          System Temporarily Unavailable
        </h1>

        <p className="mt-2 text-xs text-ink-muted leading-relaxed">
          We encountered an unexpected condition processing this request. Our operations monitoring team has received telemetry for this event.
        </p>

        {error.digest && (
          <div className="mt-4 inline-block rounded-lg bg-canvas-deep border border-line-soft px-3 py-1 text-[11px] font-mono text-ink-muted">
            Incident Reference: <span className="font-bold text-ink">{error.digest}</span>
          </div>
        )}

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl bg-cheesco-yellow px-6 py-2.5 text-xs font-bold text-[#0A0D14] shadow transition-all hover:bg-cheesco-yellow-bright cursor-pointer"
          >
            ↻ Try Again
          </button>
          <Link
            href="/browse"
            className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl border border-line-soft bg-canvas-deep px-5 py-2.5 text-xs font-bold text-ink hover:border-cheesco-yellow/50 transition-all"
          >
            Browse Equipment Fleet
          </Link>
          <Link
            href="/support"
            className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl border border-line-soft px-5 py-2.5 text-xs font-bold text-ink-muted hover:text-ink transition-all"
          >
            Contact Support Desk
          </Link>
        </div>

        <div className="mt-8 pt-6 border-t border-line-soft text-[11px] text-ink-muted">
          Need immediate dispatch assistance? Call our desk at{" "}
          <a href="tel:+2348002433726" className="text-cheesco-yellow font-bold hover:underline">
            +234 800 243 3726
          </a>
        </div>
      </div>
    </div>
  );
}
