/**
 * useAuthGuard — authoritative cookie-session route protection.
 *
 * Consumes the shared session state from AuthProvider (backed by GET /api/auth/me).
 * Guarantees that only ONE /api/auth/me request is executed per page load.
 *
 * Redirects to `/login` ONLY when the server confirms an unauthenticated state (401).
 * If a 429 or 5xx occurs, the retry state is handled cleanly with a Retry action
 * rather than hanging in a blank loading state.
 *
 * Usage:
 *   const { user, ready, error, retry } = useAuthGuard('MERCHANT');
 *   const { user, ready } = useAuthGuard(['FINANCE_ADMIN', 'SUPER_ADMIN']);
 *   if (!ready) return <LoadingSpinner />;
 */

"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/contexts/auth-context";
import { ROLE_HOME } from "@/lib/auth";
import type { SessionUser } from "@/lib/auth";
import type { UserRole } from "@/lib/types";

export function useAuthGuard(
  allowedRoles: UserRole | UserRole[]
): {
  user: SessionUser | null;
  ready: boolean;
  error: string | null;
  retry: () => Promise<void>;
} {
  const router = useRouter();
  const { profile, loading, error, refreshUser } = useAuth();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);

  // Normalize allowedRoles to a stable serialized key so inline array arguments
  // e.g. useAuthGuard(['ROLE_A', 'ROLE_B']) do not trigger re-render loops.
  const rolesKey = useMemo(() => {
    return Array.isArray(allowedRoles)
      ? allowedRoles.slice().sort().join(",")
      : allowedRoles;
  }, [allowedRoles]);

  useEffect(() => {
    // If still hydrating or if there is an active error, do not evaluate redirects yet
    if (loading || error) {
      setReady(false);
      setUser(null);
      return;
    }

    // Unauthenticated (401 from server) -> redirect to login
    if (!profile || !profile.id) {
      setReady(false);
      setUser(null);
      router.replace("/login");
      return;
    }

    // Resolve user credentials and role from profile (authoritative users table)
    const resolvedRole = (profile.role || "CUSTOMER") as UserRole;
    const resolvedUser: SessionUser = {
      id: profile.id,
      name: profile.full_name || profile.name || profile.email,
      email: profile.email,
      role: resolvedRole,
    };

    const rolesList = rolesKey.split(",") as UserRole[];
    const isSuperAdmin = resolvedRole === "SUPER_ADMIN";
    const isAllowed = isSuperAdmin || rolesList.includes(resolvedRole);

    if (!isAllowed) {
      setReady(false);
      setUser(null);
      const home =
        (resolvedRole && ROLE_HOME[resolvedRole as keyof typeof ROLE_HOME]) ||
        "/dashboard/customer";
      router.replace(home);
      return;
    }

    // Authorized — only update state if user properties have actually changed
    // to preserve stable object reference and eliminate downstream effect loops.
    setUser((prev) => {
      if (
        prev &&
        prev.id === resolvedUser.id &&
        prev.role === resolvedUser.role &&
        prev.email === resolvedUser.email &&
        prev.name === resolvedUser.name
      ) {
        return prev;
      }
      return resolvedUser;
    });
    setReady(true);
  }, [profile, loading, error, rolesKey, router]);

  return { user, ready, error, retry: refreshUser };
}
