"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { clearAllAuthStorage } from "@/lib/auth";
import type { User } from "@supabase/supabase-js";

interface MeResult {
  user: User | null;
  profile: any | null;
  error: string | null;
  status: number;
}

let sharedMePromise: Promise<MeResult> | null = null;
/** One shared in-flight token refresh; prevents duplicate /api/auth/refresh calls. */
let sharedRefreshPromise: Promise<boolean> | null = null;

/**
 * Attempt one token refresh via POST /api/auth/refresh.
 * Returns true if the new session was set successfully.
 * Concurrent callers share the same in-flight promise.
 */
async function attemptTokenRefresh(): Promise<boolean> {
  if (sharedRefreshPromise) return sharedRefreshPromise;

  sharedRefreshPromise = (async (): Promise<boolean> => {
    try {
      const res = await fetch("/api/auth/refresh", {
        method: "POST",
        credentials: "same-origin",
      });
      return res.ok;
    } catch {
      return false;
    } finally {
      // Clear so the next 401 can trigger a fresh attempt
      sharedRefreshPromise = null;
    }
  })();

  return sharedRefreshPromise;
}

/**
 * Shared, deduplicated fetch for /api/auth/me.
 * On a 401, attempts one token refresh then retries /api/auth/me once.
 * Retries on 429 and 5xx (up to 3 attempts total for transient errors).
 * Guarantees that only ONE /api/auth/me request runs per page load across
 * AuthProvider and useAuthGuard.
 */
export async function fetchAuthMeShared(forceRefresh = false): Promise<MeResult> {
  // If in browser and cheesco.auth.status cookie is absent, user is unauthenticated.
  // Short-circuit immediately without calling /api/auth/me.
  if (!forceRefresh && typeof document !== "undefined") {
    const hasAuthCookie = document.cookie
      .split(";")
      .some((c) => c.trim().startsWith("cheesco.auth.status="));
    if (!hasAuthCookie) {
      return { user: null, profile: null, error: null, status: 200 };
    }
  }

  if (sharedMePromise && !forceRefresh) {
    return sharedMePromise;
  }

  sharedMePromise = (async (): Promise<MeResult> => {
    try {
      let lastError: string | null = null;
      let lastStatus = 0;

      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          if (attempt > 0) {
            // Short exponential backoff: 300ms, then 600ms
            await new Promise((resolve) => setTimeout(resolve, attempt * 300));
          }

          const res = await fetch("/api/auth/me", {
            method: "GET",
            credentials: "same-origin",
          });

          lastStatus = res.status;

          // 401 Unauthorized — try one token refresh, then retry /api/auth/me once
          if (res.status === 401) {
            // Only attempt refresh on the first 401 (attempt === 0)
            if (attempt === 0) {
              const refreshed = await attemptTokenRefresh();
              if (refreshed) {
                // Retry /api/auth/me immediately (loop continues at attempt 1)
                continue;
              }
            }
            // Refresh failed or second 401: confirmed unauthenticated
            return { user: null, profile: null, error: null, status: 401 };
          }

          // 200 OK: Valid authenticated session
          if (res.ok) {
            const json = await res.json();
            const data = json?.data;
            if (data && data.id) {
              return {
                user: { id: data.id, email: data.email } as User,
                profile: data,
                error: null,
                status: 200,
              };
            }
            return { user: null, profile: null, error: null, status: 200 };
          }

          // 429 or 5xx: Transient error, retry up to 2 times
          if (res.status === 429 || res.status >= 500) {
            lastError =
              res.status === 429
                ? "Too many requests. Please slow down and try again."
                : `Authentication service temporarily unavailable (${res.status}).`;
            console.warn(`[fetchAuthMe] Attempt ${attempt + 1}/3 returned HTTP ${res.status}. Retrying...`);
            continue;
          }

          // Other 4xx client errors: do not retry
          return {
            user: null,
            profile: null,
            error: `Authentication check failed (${res.status})`,
            status: res.status,
          };
        } catch (err: any) {
          lastError = err?.message || "Network error communicating with authentication service.";
          console.warn(`[fetchAuthMe] Network error on attempt ${attempt + 1}/3:`, err);
        }
      }

      return {
        user: null,
        profile: null,
        error: lastError || "Failed to communicate with authentication service.",
        status: lastStatus || 500,
      };
    } finally {
      // Clear shared in-flight promise when done so next caller gets fresh invocation
      sharedMePromise = null;
    }
  })();

  return sharedMePromise;
}

/** Routes that require authentication. The error card is only shown on these paths. */
const PROTECTED_PREFIXES = ["/admin", "/merchant", "/dashboard", "/finance"];

function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

interface AuthContextType {
  user: User | null;
  profile: any | null;
  loading: boolean;
  error: string | null;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  const hydrateUser = useCallback(async (force = false) => {
    setLoading(true);
    try {
      const result = await fetchAuthMeShared(force);
      setUser(result.user);
      setProfile(result.profile);
      setError(result.error);
    } catch (err: any) {
      console.warn("[AuthProvider] Error hydrating user:", err);
      setUser(null);
      setProfile(null);
      setError(err?.message || "Failed to load authentication state");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial hydration from HttpOnly cookie session
    hydrateUser(false);

    // Listen for auth events (e.g. from password resets)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        hydrateUser(true);
      } else if (event === "SIGNED_OUT") {
        setUser(null);
        setProfile(null);
        setError(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [hydrateUser]);

  const refreshUser = async () => {
    await hydrateUser(true);
  };

  const signOut = async () => {
    sharedMePromise = null;
    clearAllAuthStorage();
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("[AuthProvider] Supabase signOut error:", err);
    }
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}
    setUser(null);
    setProfile(null);
    setError(null);
    window.location.href = "/";
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, error, signOut, refreshUser }}>
      {error && !loading && isProtectedRoute(pathname ?? "") ? (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-zinc-950 p-4">
          <div className="max-w-md w-full bg-white dark:bg-zinc-900 border border-red-500/30 rounded-xl p-6 text-center shadow-lg">
            <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 mx-auto flex items-center justify-center mb-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Authentication Temporarily Unavailable
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              {error}
            </p>
            <button
              onClick={() => refreshUser()}
              className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 rounded-lg transition-colors cursor-pointer"
            >
              Retry
            </button>
          </div>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
