"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Link from "next/link";

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
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/signup";

      const payload = mode === "login"
        ? { email: formData.email, password: formData.password }
        : { ...formData, role };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Authentication failed");
      }

      toast.success(mode === "login" ? "Welcome back!" : "Account created successfully!");

      // Redirect based on role
      if (mode === "login") {
        // Get user info to determine redirect
        const userResponse = await fetch("/api/auth/me");
        const userData = await userResponse.json();

        if (userData.data.role === "MERCHANT") {
          router.push("/merchant/dashboard");
        } else if (userData.data.role === "CUSTOMER") {
          router.push("/dashboard/customer");
        } else {
          router.push("/admin/operations");
        }
      } else {
        router.push(role === "MERCHANT" ? "/merchant/dashboard" : "/dashboard/customer");
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black">
            {mode === "login" ? "Welcome Back" : "Create Account"}
          </h1>
          <p className="mt-2 text-ink-muted">
            {mode === "login"
              ? "Sign in to manage your equipment transactions"
              : "Join Cheesco's managed equipment marketplace"}
          </p>
        </div>

        {mode === "register" && (
          <div className="mb-6 flex gap-3">
            <button
              type="button"
              onClick={() => setRole("CUSTOMER")}
              className={`flex-1 rounded-lg border py-3 text-sm font-bold transition-all ${
                role === "CUSTOMER"
                  ? "border-cheesco-yellow bg-cheesco-yellow/10 text-cheesco-yellow"
                  : "border-line bg-card text-ink-muted hover:border-line-soft"
              }`}
            >
              I want to rent/buy
            </button>
            <button
              type="button"
              onClick={() => setRole("MERCHANT")}
              className={`flex-1 rounded-lg border py-3 text-sm font-bold transition-all ${
                role === "MERCHANT"
                  ? "border-cheesco-yellow bg-cheesco-yellow/10 text-cheesco-yellow"
                  : "border-line bg-card text-ink-muted hover:border-line-soft"
              }`}
            >
              I own equipment
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "register" && (
            <>
              <div>
                <label className="block text-sm font-semibold mb-1">
                  Full Name {role === "MERCHANT" && "(or Business Owner Name)"}
                </label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) =>
                    setFormData({ ...formData, fullName: e.target.value })
                  }
                  className="auth-input"
                  required
                />
              </div>

              {role === "MERCHANT" && (
                <div>
                  <label className="block text-sm font-semibold mb-1">
                    Business Name
                  </label>
                  <input
                    type="text"
                    value={formData.businessName}
                    onChange={(e) =>
                      setFormData({ ...formData, businessName: e.target.value })
                    }
                    className="auth-input"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder="+234"
                  className="auth-input"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-semibold mb-1">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              className="auth-input"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Password</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              className="auth-input"
              required
              minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-cheesco-yellow py-3 font-black text-canvas hover:bg-cheesco-yellow-bright disabled:opacity-50"
          >
            {loading
              ? mode === "login"
                ? "Signing in..."
                : "Creating account..."
              : mode === "login"
              ? "Sign In"
              : "Create Account"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm">
          {mode === "login" ? (
            <p className="text-ink-muted">
              Don't have an account?{" "}
              <Link href="/register" className="font-bold text-cheesco-yellow hover:underline">
                Sign up
              </Link>
            </p>
          ) : (
            <p className="text-ink-muted">
              Already have an account?{" "}
              <Link href="/login" className="font-bold text-cheesco-yellow hover:underline">
                Sign in
              </Link>
            </p>
          )}
        </div>

        {mode === "register" && role === "MERCHANT" && (
          <div className="mt-6 rounded-lg border border-cheesco-yellow/30 bg-cheesco-yellow/10 p-4 text-sm">
            <p className="font-bold text-cheesco-yellow">Merchant Verification Required</p>
            <p className="mt-2 text-ink-muted">
              After registration, you'll need to complete merchant verification before you can publish equipment listings.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
