"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Report all unhandled global errors to Sentry
    Sentry.captureException(error);
    console.error("[Global Error]", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen flex items-center justify-center bg-[#070A0F] text-white p-4 font-sans">
        <div className="w-full max-w-md text-center bg-[#0B0F19] border border-zinc-800 rounded-2xl p-8 shadow-2xl">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-2xl font-black">
            ⚠️
          </div>
          <h1 className="text-xl font-black text-white">Application Error</h1>
          <p className="mt-2 text-xs text-zinc-400">
            A critical interface error occurred. Please reload the workspace.
          </p>
          {error.digest && (
            <p className="mt-2 text-[10px] font-mono text-zinc-500">Ref: {error.digest}</p>
          )}
          <button
            type="button"
            onClick={() => reset()}
            className="mt-6 inline-flex items-center justify-center rounded-xl bg-amber-400 px-6 py-2.5 text-xs font-bold text-black hover:bg-amber-300 transition-colors cursor-pointer"
          >
            Reload Page
          </button>
        </div>
      </body>
    </html>
  );
}
