"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { login, setLocalSession } from "@/lib/auth";

export function AuthClient({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<"CUSTOMER" | "MERCHANT">("CUSTOMER");

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: "",
    phone: "",
    businessName: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === "login") {
        let authUser: any = null;
        let sessionToken: string | null = null;
        let userRole: string = "CUSTOMER";

        // 1. Sign in via client-side Supabase so browser session and tokens are established
        const { data: signInData, error: signInError } =
          await supabase.auth.signInWithPassword({
            email: formData.email.trim(),
            password: formData.password,
          });

        if (!signInError && signInData.user) {
          authUser = signInData.user;
          sessionToken = signInData.session?.access_token || null;

          // Fetch user profile from Supabase to get role and name
          const { data: profileData } = await supabase
            .from("users")
            .select(
              "*, merchant_profile:merchant_profiles!merchant_profiles_user_id_fkey(*)"
            )
            .eq("id", authUser.id)
            .maybeSingle();

          if (profileData) {
            userRole = profileData.role;
            setLocalSession({
              id: authUser.id,
              name: profileData.full_name || authUser.email,
              email: authUser.email,
              role: profileData.role,
            });
          } else {
            setLocalSession({
              id: authUser.id,
              name: authUser.email,
              email: authUser.email,
              role: "CUSTOMER",
            });
          }
        } else {
          // 2. Check if this is an evaluation / seed account from lib/auth
          try {
            const seedUser = login(formData.email, formData.password);
            authUser = seedUser;
            userRole = seedUser.role;
            sessionToken = "seed-token";
          } catch {
            throw new Error(signInError?.message || "Invalid email or password");
          }
        }

        if (sessionToken) {
          localStorage.setItem("auth_token", sessionToken);
        }

        toast.success("Welcome back!");

        // Redirect based on role
        if (userRole === "MERCHANT") {
          router.push("/merchant/dashboard");
        } else if (userRole === "CUSTOMER") {
          router.push("/dashboard/customer");
        } else {
          router.push("/admin/operations");
        }
      } else {
        // Register mode: call /api/auth/signup (uses service role to bypass RLS)
        const response = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...formData, role }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Authentication failed");
        }

        // Try to automatically sign in right after signup
        const { data: autoSignInData } =
          await supabase.auth.signInWithPassword({
            email: formData.email.trim(),
            password: formData.password,
          });

        if (autoSignInData?.user && autoSignInData.session) {
          localStorage.setItem("auth_token", autoSignInData.session.access_token);
          setLocalSession({
            id: autoSignInData.user.id,
            name: formData.fullName || formData.email,
            email: formData.email,
            role,
          });
          toast.success("Account created successfully!");
          router.push(
            role === "MERCHANT" ? "/merchant/dashboard" : "/dashboard/customer"
          );
        } else {
          toast.success(
            result.message ||
              "Account created! Please check your email to verify your account."
          );
          router.push("/login");
        }
      }
    } catch (error: any) {
      console.error("Auth error:", error);
      toast.error(error.message || "Something went wrong");
    } finally {
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

        {mode === "register" && (
          <div className="mb-6 flex rounded-xl bg-canvas-deep p-1 ring-1 ring-line-soft">
            <button
              type="button"
              onClick={() => setRole("CUSTOMER")}
              className={`flex-1 rounded-lg py-2 text-xs font-bold transition-all ${
                role === "CUSTOMER"
                  ? "bg-cheesco-yellow text-canvas shadow-sm"
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
                  ? "bg-cheesco-yellow text-canvas shadow-sm"
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
            <label className="block text-xs font-bold text-ink mb-1">Password</label>
            <input
              type="password"
              placeholder="••••••••••••"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              className="h-10 w-full rounded-xl bg-canvas-deep px-3 text-xs text-ink outline-none ring-1 ring-line-soft focus:ring-1 focus:ring-cheesco-yellow"
              required
              minLength={6}
            />
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
              className="h-11 w-full rounded-xl bg-cheesco-yellow font-black text-xs text-canvas shadow-md transition-all hover:bg-cheesco-yellow-bright hover:shadow-lg disabled:opacity-50"
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
              <Link href="/register" className="font-bold text-cheesco-yellow hover:underline">
                Sign Up
              </Link>
            </p>
          ) : (
            <p className="text-ink-muted">
              Already have an account?{" "}
              <Link href="/login" className="font-bold text-cheesco-yellow hover:underline">
                Login
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
