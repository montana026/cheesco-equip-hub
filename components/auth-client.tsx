"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import Link from "next/link";
import { ROLE_HOME } from "@/lib/auth";
import { useAuth } from "@/lib/contexts/auth-context";

const isSafePath = (p: string | null): p is string =>
  !!p && p.startsWith("/") && !p.startsWith("//") && !p.startsWith("/\\");

export function AuthClient({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect");
  const { refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<"CUSTOMER" | "MERCHANT">("CUSTOMER");
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: "",
    phone: "",
    businessName: "",
  });

  useEffect(() => {
    if (searchParams.get("verified") === "true") {
      toast.success("Email verified successfully! Please sign in with your credentials.", {
        id: "email-verified-success",
      });
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === "login") {
        // All login is server-side: /api/auth/login handles Supabase auth,
        // sets HttpOnly cookies, and returns role + name for redirect.
        // No direct Supabase client call; no localStorage token storage.
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: formData.email.trim(),
            password: formData.password,
          }),
        });

        if (res.status === 429) {
          toast.error("Too many login attempts. Please wait a minute and try again.");
          setLoading(false);
          return;
        }

        if (!res.ok) {
          // Keep wrong-credentials messages generic to avoid user enumeration
          toast.error("Invalid email or password.");
          setLoading(false);
          return;
        }

        const json = await res.json();
        const userRole: string = json.data?.user?.role || "CUSTOMER";

        toast.success("Welcome back!");

        // Full document navigation ensures all cookies are cleanly sent with
        // the initial request, eliminating SPA auth-guard bounce-backs.
        // If redirectUrl points to the customer dashboard area but the user is not a CUSTOMER,
        // prioritize their authoritative role dashboard instead of forcing them to /dashboard/customer.
        const targetUrl =
          isSafePath(redirectUrl) && (userRole === "CUSTOMER" || !redirectUrl.startsWith("/dashboard/customer"))
            ? redirectUrl
            : ROLE_HOME[userRole as keyof typeof ROLE_HOME] || "/dashboard/customer";

        window.location.assign(targetUrl);
        return;
      } else {
        // ── Register mode ────────────────────────────────────────────────────
        // Step 1: create account server-side (validates, creates profile via service role)
        const response = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...formData, role }),
        });

        const result = await response.json();

        if (response.status === 409) {
          throw new Error("An account with this email already exists.");
        }
        if (!response.ok) {
          throw new Error(result.error || "Registration failed. Please try again.");
        }

        // Step 2: auto-sign-in through the server (/api/auth/login)
        // This validates credentials, sets HttpOnly cookies, and returns the profile.
        // No browser Supabase client is called; no session is written to localStorage.
        const loginRes = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: formData.email.trim(),
            password: formData.password,
          }),
        });

        if (loginRes.ok) {
          const loginData = await loginRes.json();
          const userRole: string = loginData.data?.user?.role || role;
          toast.success("Account created successfully!");

          const targetUrl =
            isSafePath(redirectUrl) && (userRole === "CUSTOMER" || !redirectUrl.startsWith("/dashboard/customer"))
              ? redirectUrl
              : ROLE_HOME[userRole as keyof typeof ROLE_HOME] ||
                (role === "MERCHANT" ? "/merchant/dashboard" : "/dashboard/customer");

          window.location.assign(targetUrl);
          return;
        } else {
          toast.success(
            result.message ||
              "Account created! Please check your email to verify your account or sign in."
          );
          setLoading(false);
          router.push(
            isSafePath(redirectUrl)
              ? `/login?redirect=${encodeURIComponent(redirectUrl)}`
              : "/login"
          );
          return;
        }
      }
    } catch (error: any) {
      console.error("Auth error:", error);
      toast.error(error.message || "Something went wrong");
      setLoading(false);
    }
  };

  const [agreeTerms, setAgreeTerms] = useState(true);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16 bg-canvas">
      <div className="w-full max-w-md card-surface rounded-2xl p-6 sm:p-8 shadow-xl border border-line-soft">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-black text-ink tracking-tight">
            {mode === "login" ? "Welcome Back" : "Create Your Account"}
          </h1>
          <p className="mt-1.5 text-xs text-ink-muted">
            {mode === "login"
              ? "Sign in to access your equipment hub"
              : "Join Cheesco and start listing your equipment."}
          </p>
        </div>

        {redirectUrl && (
          <div className="mb-5 flex items-center gap-2.5 rounded-xl border border-cheesco-yellow/30 bg-cheesco-yellow/10 p-3 text-xs text-ink">
            <span className="text-sm">🔒</span>
            <span>
              Please <strong>{mode === "login" ? "sign in" : "create an account"}</strong> to continue with your equipment request. You will be redirected right back!
            </span>
          </div>
        )}

        {mode === "register" && (
          <div className="mb-6 flex rounded-xl bg-canvas-deep p-1 ring-1 ring-line-soft">
            <button
              type="button"
              onClick={() => setRole("CUSTOMER")}
              className={`flex-1 rounded-lg py-2 text-xs font-bold transition-all ${
                role === "CUSTOMER"
                  ? "bg-cheesco-yellow text-[#0A0D14] shadow-sm"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              I'm a Customer
            </button>
            <button
              type="button"
              onClick={() => setRole("MERCHANT")}
              className={`flex-1 rounded-lg py-2 text-xs font-bold transition-all ${
                role === "MERCHANT"
                  ? "bg-cheesco-yellow text-[#0A0D14] shadow-sm"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              I'm a Merchant
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === "register" && (
            <>
              <div>
                <label className="block text-xs font-bold text-ink mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder="John Doe"
                  value={formData.fullName}
                  onChange={(e) =>
                    setFormData({ ...formData, fullName: e.target.value })
                  }
                  className="h-10 w-full rounded-xl bg-canvas-deep px-3 text-xs text-ink outline-none ring-1 ring-line-soft focus:ring-1 focus:ring-cheesco-yellow"
                  required
                />
              </div>

              {role === "MERCHANT" && (
                <div>
                  <label className="block text-xs font-bold text-ink mb-1">
                    Business Name
                  </label>
                  <input
                    type="text"
                    placeholder="ABC Equipment Ltd"
                    value={formData.businessName}
                    onChange={(e) =>
                      setFormData({ ...formData, businessName: e.target.value })
                    }
                    className="h-10 w-full rounded-xl bg-canvas-deep px-3 text-xs text-ink outline-none ring-1 ring-line-soft focus:ring-1 focus:ring-cheesco-yellow"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-ink mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="you@company.com"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="h-10 w-full rounded-xl bg-canvas-deep px-3 text-xs text-ink outline-none ring-1 ring-line-soft focus:ring-1 focus:ring-cheesco-yellow"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink mb-1">
                  Phone Number
                </label>
                <div className="flex gap-2">
                  <span className="flex h-10 items-center justify-center rounded-xl bg-canvas-deep px-3 text-xs font-bold text-ink ring-1 ring-line-soft">
                    🇳🇬 +234
                  </span>
                  <input
                    type="tel"
                    placeholder="801 234 5678"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    className="h-10 flex-1 rounded-xl bg-canvas-deep px-3 text-xs text-ink outline-none ring-1 ring-line-soft focus:ring-1 focus:ring-cheesco-yellow"
                  />
                </div>
              </div>
            </>
          )}

          {mode === "login" && (
            <div>
              <label className="block text-xs font-bold text-ink mb-1">Email Address</label>
              <input
                type="email"
                placeholder="you@company.com"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className="h-10 w-full rounded-xl bg-canvas-deep px-3 text-xs text-ink outline-none ring-1 ring-line-soft focus:ring-1 focus:ring-cheesco-yellow"
                required
              />
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-ink">Password</label>
              {mode === "login" && (
                <Link
                  href="/forgot-password"
                  className="text-[11px] font-semibold text-cheesco-yellow hover:underline"
                  tabIndex={-1}
                >
                  Forgot password?
                </Link>
              )}
            </div>
            <div className="relative flex items-center">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••••••"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                className="h-10 w-full rounded-xl bg-canvas-deep pl-3 pr-10 text-xs text-ink outline-none ring-1 ring-line-soft focus:ring-1 focus:ring-cheesco-yellow"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 flex items-center justify-center text-ink-muted hover:text-cheesco-yellow transition-colors"
                title={showPassword ? "Hide password" : "Show password"}
                aria-label={showPassword ? "Hide password" : "Show password"}
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
          </div>

          {mode === "register" && (
            <label className="flex items-center gap-2 pt-1 text-xs text-ink-muted cursor-pointer">
              <input
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="h-4 w-4 rounded accent-cheesco-yellow"
                required
              />
              <span>I agree to the <Link href="/terms" className="text-cheesco-yellow hover:underline">Terms and Conditions</Link></span>
            </label>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || (mode === "register" && !agreeTerms)}
              className="h-11 w-full rounded-xl bg-cheesco-yellow font-black text-xs text-[#0A0D14] shadow-md transition-all hover:bg-cheesco-yellow-bright hover:shadow-lg disabled:opacity-50"
            >
              {loading
                ? mode === "login"
                  ? "Signing in..."
                  : "Creating account..."
                : mode === "login"
                ? "Sign In"
                : "Create Account"}
            </button>
          </div>
        </form>

        <div className="mt-5 text-center text-xs">
          {mode === "login" ? (
            <p className="text-ink-muted">
              Don't have an account?{" "}
              <Link
                href={
                  redirectUrl
                    ? `/register?redirect=${encodeURIComponent(redirectUrl)}`
                    : "/register"
                }
                className="font-bold text-cheesco-yellow hover:underline"
              >
                Sign Up
              </Link>
            </p>
          ) : (
            <p className="text-ink-muted">
              Already have an account?{" "}
              <Link
                href={
                  redirectUrl
                    ? `/login?redirect=${encodeURIComponent(redirectUrl)}`
                    : "/login"
                }
                className="font-bold text-cheesco-yellow hover:underline"
              >
                Login
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
