"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { supabase } from "@/lib/supabase/client";
import { CheescoLogo, CheescoWordmark } from "@/components/brand";

type Step = "verifying" | "form" | "success" | "invalid";

export function ResetPasswordClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [step, setStep] = useState<Step>("verifying");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [formData, setFormData] = useState({ password: "", confirm: "" });

  // ── Step 1: Exchange the one-time token from the URL for a live session ──
  useEffect(() => {
    async function bootstrapSession() {
      // 0. Intercept signup confirmation links:
      // If the incoming link is an account confirmation / signup verification (e.g. from an old or misconfigured default redirect),
      // do NOT display the password reset form! Complete verification and route immediately to login.
      const hash = typeof window !== "undefined" ? window.location.hash : "";
      const hashParams = new URLSearchParams(hash.replace(/^#/, ""));
      const incomingType = searchParams.get("type") || hashParams.get("type");

      if (incomingType === "signup" || incomingType === "email_confirmation" || hash.includes("type=signup")) {
        const code = searchParams.get("code");
        if (code) {
          try {
            await supabase.auth.exchangeCodeForSession(code);
          } catch (e) {
            console.warn("PKCE exchange notice:", e);
          }
        } else {
          const accessToken = hashParams.get("access_token");
          const refreshToken = hashParams.get("refresh_token");
          if (accessToken && refreshToken) {
            try {
              await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
            } catch (e) {
              console.warn("Set session notice:", e);
            }
          }
        }
        toast.success("Email verified successfully! You can now log in.");
        router.replace("/login?verified=true");
        return;
      }

      // Strategy A: PKCE flow — Supabase sends ?code= in the URL
      const code = searchParams.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          console.error("PKCE exchange failed:", error.message);
          setStep("invalid");
        } else {
          setStep("form");
        }
        return;
      }

      // Strategy B: Implicit/legacy flow — token is in the URL hash
      // e.g. #access_token=xxx&refresh_token=yyy&type=recovery
      if (hash.includes("type=recovery") || (hash.includes("access_token") && !hash.includes("type=signup"))) {
        // Let Supabase process the hash fragment automatically
        const { data, error } = await supabase.auth.getSession();
        if (error || !data.session) {
          // Parse manually and set session
          const params = new URLSearchParams(hash.replace("#", ""));
          const accessToken = params.get("access_token");
          const refreshToken = params.get("refresh_token");
          if (accessToken && refreshToken) {
            const { error: setErr } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (setErr) {
              console.error("Session set failed:", setErr.message);
              setStep("invalid");
            } else {
              setStep("form");
            }
          } else {
            setStep("invalid");
          }
        } else {
          setStep("form");
        }
        return;
      }

      // Strategy C: onAuthStateChange — fires PASSWORD_RECOVERY when Supabase
      // has already processed the hash before this component mounted
      const { data: existing } = await supabase.auth.getSession();
      if (existing.session) {
        setStep("form");
        return;
      }

      // No token found in URL — link is invalid or already used
      setStep("invalid");
    }

    bootstrapSession();
  }, [searchParams]);

  // ── Step 2: Submit the new password ────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    if (formData.password !== formData.confirm) {
      toast.error("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: formData.password,
      });

      if (error) throw error;

      // Sign out so the user logs in fresh with the new password
      await supabase.auth.signOut();

      setStep("success");
      toast.success("Password updated successfully!");
      setTimeout(() => router.push("/login"), 2500);
    } catch (err: any) {
      console.error("Reset password error:", err);
      if (
        err.message?.toLowerCase().includes("session") ||
        err.message?.toLowerCase().includes("expired") ||
        err.message?.toLowerCase().includes("invalid")
      ) {
        setStep("invalid");
      } else {
        toast.error(err.message || "Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Password strength helper ───────────────────────────────────────────────
  const passwordStrength = (
    pw: string
  ): { label: string; color: string; width: string } => {
    if (pw.length === 0) return { label: "", color: "bg-line", width: "w-0" };
    if (pw.length < 6)
      return { label: "Weak", color: "bg-red-500", width: "w-1/4" };
    if (pw.length < 10)
      return { label: "Fair", color: "bg-amber-400", width: "w-2/4" };
    if (!/[A-Z]/.test(pw) || !/[0-9]/.test(pw))
      return { label: "Good", color: "bg-blue-500", width: "w-3/4" };
    return { label: "Strong", color: "bg-green-500", width: "w-full" };
  };

  const strength = passwordStrength(formData.password);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16 bg-canvas">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <CheescoLogo size={38} />
          <CheescoWordmark />
        </div>

        <div className="card-surface rounded-2xl p-6 sm:p-8 shadow-xl border border-line-soft">
          {/* ── Verifying: spinner while token is exchanged ── */}
          {step === "verifying" && (
            <div className="flex flex-col items-center justify-center gap-4 py-8">
              <svg
                className="h-10 w-10 animate-spin text-cheesco-yellow"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8H4z"
                />
              </svg>
              <p className="text-xs text-ink-muted">
                Verifying your reset link…
              </p>
            </div>
          )}

          {/* ── Form: enter new password ── */}
          {step === "form" && (
            <>
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
                      d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z"
                    />
                  </svg>
                </div>
                <h1 className="text-2xl font-black text-ink tracking-tight">
                  Set New Password
                </h1>
                <p className="mt-1.5 text-xs text-ink-muted leading-relaxed max-w-xs mx-auto">
                  Create a strong new password. You'll use it to log in going
                  forward.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* New password */}
                <div>
                  <label className="block text-xs font-bold text-ink mb-1">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Min. 8 characters"
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      className="h-10 w-full rounded-xl bg-canvas-deep px-3 pr-10 text-xs text-ink outline-none ring-1 ring-line-soft focus:ring-cheesco-yellow transition-all"
                      required
                      minLength={8}
                      disabled={loading}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink"
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                        </svg>
                      ) : (
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  {/* Strength bar */}
                  {formData.password.length > 0 && (
                    <div className="mt-1.5">
                      <div className="h-1 w-full rounded-full bg-canvas-deep overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${strength.color} ${strength.width}`}
                        />
                      </div>
                      <p
                        className={`mt-0.5 text-[10px] font-semibold ${strength.color.replace(
                          "bg-",
                          "text-"
                        )}`}
                      >
                        {strength.label}
                      </p>
                    </div>
                  )}
                </div>

                {/* Confirm password */}
                <div>
                  <label className="block text-xs font-bold text-ink mb-1">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirm ? "text" : "password"}
                      placeholder="Re-enter new password"
                      value={formData.confirm}
                      onChange={(e) =>
                        setFormData({ ...formData, confirm: e.target.value })
                      }
                      className={`h-10 w-full rounded-xl bg-canvas-deep px-3 pr-10 text-xs text-ink outline-none ring-1 transition-all ${
                        formData.confirm.length > 0 &&
                        formData.confirm !== formData.password
                          ? "ring-red-400 focus:ring-red-400"
                          : "ring-line-soft focus:ring-cheesco-yellow"
                      }`}
                      required
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink"
                      tabIndex={-1}
                    >
                      {showConfirm ? (
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                        </svg>
                      ) : (
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  {formData.confirm.length > 0 &&
                    formData.confirm !== formData.password && (
                      <p className="mt-1 text-[10px] text-red-500">
                        Passwords do not match.
                      </p>
                    )}
                </div>

                <div className="pt-1">
                  <button
                    type="submit"
                    disabled={
                      loading ||
                      !formData.password ||
                      formData.password !== formData.confirm
                    }
                    className="h-11 w-full rounded-xl bg-cheesco-yellow font-black text-xs text-[#0A0D14] shadow-md transition-all hover:bg-cheesco-yellow-bright hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg
                          className="h-4 w-4 animate-spin"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8v8H4z"
                          />
                        </svg>
                        Updating password…
                      </span>
                    ) : (
                      "Update Password"
                    )}
                  </button>
                </div>
              </form>
            </>
          )}

          {/* ── Success state ── */}
          {step === "success" && (
            <div className="text-center py-4">
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
                    d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-black text-ink tracking-tight mb-2">
                Password Updated!
              </h2>
              <p className="text-xs text-ink-muted mb-6">
                Your password has been changed. Redirecting you to the login
                page…
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-xl bg-cheesco-yellow px-6 py-2.5 text-xs font-black text-[#0A0D14] shadow-md hover:bg-cheesco-yellow-bright transition-all"
              >
                Go to Login
              </Link>
            </div>
          )}

          {/* ── Invalid / expired link ── */}
          {step === "invalid" && (
            <div className="text-center py-4">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/20">
                <svg
                  className="h-8 w-8 text-red-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.8}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-black text-ink tracking-tight mb-2">
                Link Expired or Invalid
              </h2>
              <p className="text-xs text-ink-muted mb-6">
                This password reset link has expired or has already been used.
                Please request a fresh link.
              </p>
              <Link
                href="/forgot-password"
                className="inline-flex items-center gap-2 rounded-xl bg-cheesco-yellow px-6 py-2.5 text-xs font-black text-[#0A0D14] shadow-md hover:bg-cheesco-yellow-bright transition-all"
              >
                Request New Link
              </Link>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-ink-faint">
          Remember your password?{" "}
          <Link href="/login" className="text-cheesco-yellow hover:underline">
            Back to Login
          </Link>
        </p>
      </div>
    </div>
  );
}
