"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/contexts/auth-context";
import type { UserRole } from "@/lib/types";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  requireAuth?: boolean;
}

export function ProtectedRoute({
  children,
  allowedRoles,
  requireAuth = true,
}: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      // Not authenticated and auth required
      if (requireAuth && !user) {
        router.push("/login");
        return;
      }

      // Authenticated but role not allowed
      if (
        user &&
        profile &&
        allowedRoles &&
        !allowedRoles.includes(profile.role)
      ) {
        // Redirect to appropriate dashboard based on role
        const roleDashboards: Record<UserRole, string> = {
          CUSTOMER: "/dashboard/customer",
          MERCHANT: "/merchant/dashboard",
          OPERATIONS_ADMIN: "/admin/operations",
          VERIFICATION_ADMIN: "/admin/verification",
          FINANCE_ADMIN: "/admin/finance",
          SUPPORT_ADMIN: "/admin/support",
          SUPER_ADMIN: "/admin/operations",
        };

        router.push(roleDashboards[profile.role as UserRole]);
      }
    }
  }, [user, profile, loading, requireAuth, allowedRoles, router]);

  // Show loading state
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-line border-t-cheesco-yellow mx-auto" />
          <p className="mt-4 text-ink-muted">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (requireAuth && !user) {
    return null;
  }

  // Role not allowed
  if (user && profile && allowedRoles && !allowedRoles.includes(profile.role)) {
    return null;
  }

  return <>{children}</>;
}
