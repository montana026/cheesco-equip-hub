import type { UserRole } from "./types";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  CUSTOMER: "Customer",
  MERCHANT: "Merchant",
  OPERATIONS_ADMIN: "Operations Admin",
  VERIFICATION_ADMIN: "Verification Admin",
  FINANCE_ADMIN: "Finance Admin",
  SUPPORT_ADMIN: "Support Admin",
  SUPER_ADMIN: "Super Admin",
};

export const ROLE_HOME: Record<UserRole, string> = {
  CUSTOMER: "/dashboard/customer",
  MERCHANT: "/merchant/dashboard",
  OPERATIONS_ADMIN: "/admin/operations",
  VERIFICATION_ADMIN: "/admin/verification",
  FINANCE_ADMIN: "/admin/finance",
  SUPPORT_ADMIN: "/admin/support",
  SUPER_ADMIN: "/admin/operations",
};

/**
 * Clears all local authentication storage and client-accessible cookies.
 */
export function clearAllAuthStorage(): void {
  try {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("cheesco.session.v1");
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith("sb-") && key.endsWith("-auth-token")) {
        localStorage.removeItem(key);
      }
    });
  } catch {
    /* noop */
  }

  try {
    document.cookie = "auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
    document.cookie = "sb-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
    document.cookie = "sb-refresh-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
    document.cookie = "cheesco.session.v1=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
    document.cookie = "cheesco.auth.status=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
  } catch {
    /* noop */
  }
}

/**
 * Signs out the user by clearing storage, signing out from Supabase client,
 * and triggering server cookie clearing via /api/auth/logout.
 */
export async function logout(): Promise<void> {
  clearAllAuthStorage();
  try {
    const { supabase } = await import("./supabase/client");
    await supabase.auth.signOut();
  } catch {
    /* noop */
  }
  clearAllAuthStorage();
  try {
    await fetch("/api/auth/logout", { method: "POST" });
  } catch {
    /* noop */
  }
}

/**
 * Route guard helper — returns the redirect target or null when allowed.
 */
export function guardRoute(
  pathRole: UserRole | UserRole[],
  session: SessionUser | null
): string | null {
  if (!session) return "/login";
  const allowed = Array.isArray(pathRole) ? pathRole : [pathRole];
  if (session.role === "SUPER_ADMIN") return null;
  if (!allowed.includes(session.role)) return ROLE_HOME[session.role];
  return null;
}
