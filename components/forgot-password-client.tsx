"use client";

import { useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { supabase } from "@/lib/supabase/client";
import { CheescoLogo, CheescoWordmark } from "@/components/brand";

type Step = "form" | "sent";

export function ForgotPasswordClient() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<Step>("form");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        {
          redirectTo: `${window.location.origin}/reset-password`,
        }
      );

      if (error) throw error;

      setStep("sent");
    } catch (err: any) {
      console.error("Forgot password error:", err);
      // Show generic message — avoid leaking whether email exists
      toast.error(
        err.message?.includes("rate limit")
          ? "Too many requests. Please wait a few minutes and try again."
          : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16 bg-canvas">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <CheescoLogo size={38} />
          <CheescoWordmark />
        </div>

        <div className="card-surface rounded-2xl p-6 sm:p-8 shadow-xl border border-line-soft">
          {step === "form" ? (
            <>
              {/* Header */}
              <div className="text-center mb-6">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-cheesco-yellow/10 border border-cheesco-yellow/20">
                  <svg
                    className="h-7 w-7 text-cheesco-yellow"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.8}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                    />
                  </svg>
                </div>
                <h1 className="text-2xl font-black text-ink tracking-tight">
                  Forgot Password?
                </h1>
                <p className="mt-1.5 text-xs text-ink-muted leading-relaxed max-w-xs mx-auto">
                  No worries! Enter your email address and we'll send you a link
                  to reset your password.
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-ink mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-10 w-full rounded-xl bg-canvas-deep px-3 text-xs text-ink outline-none ring-1 ring-line-soft focus:ring-1 focus:ring-cheesco-yellow transition-all"
                    required
                    autoFocus
                    disabled={loading}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="h-11 w-full rounded-xl bg-cheesco-yellow font-black text-xs text-[#0A0D14] shadow-md transition-all hover:bg-cheesco-yellow-bright hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Sending reset link...
                    </span>
                  ) : (
                    "Send Reset Link"
                  )}
                </button>
              </form>

              {/* Back to login */}
              <div className="mt-5 text-center text-xs">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-ink-muted hover:text-ink transition-colors"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                  </svg>
                  Back to Login
                </Link>
              </div>
            </>
          ) : (
            // Success / email sent state
            <>
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-green-500/10 border border-green-500/20">
                  <svg
                    className="h-8 w-8 text-green-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.8}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                    />
                  </svg>
                </div>
                <h2 className="text-xl font-black text-ink tracking-tight mb-2">
                  Check Your Email
                </h2>
                <p className="text-xs text-ink-muted leading-relaxed max-w-xs mx-auto mb-1">
                  If an account exists for{" "}
                  <span className="font-bold text-ink">{email}</span>, a
                  password reset link has been sent.
                </p>
                <p className="text-xs text-ink-faint">
                  Check your spam folder if you don't see it.
                </p>

                <div className="mt-6 space-y-3">
                  <button
                    onClick={() => {
                      setStep("form");
                      setEmail("");
                    }}
                    className="w-full rounded-xl border border-line py-2.5 text-xs font-semibold text-ink-muted hover:bg-canvas-deep transition-colors"
                  >
                    Try a different email
                  </button>
                  <Link
                    href="/login"
                    className="block w-full rounded-xl bg-cheesco-yellow py-2.5 text-center text-xs font-black text-[#0A0D14] shadow-md hover:bg-cheesco-yellow-bright transition-all"
                  >
                    Back to Login
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer note */}
        <p className="mt-6 text-center text-xs text-ink-faint">
          Need help?{" "}
          <Link href="/contact" className="text-cheesco-yellow hover:underline">
            Contact Support
          </Link>
        </p>
      </div>
    </div>
  );
}
