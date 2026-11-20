import { NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/types";

export interface AdminAuthSession {
  authorized: boolean;
  userId: string;
  email: string;
  role: UserRole;
  error?: string;
  status?: number;
}

const DEFAULT_ADMIN_ROLES: UserRole[] = [
  "SUPER_ADMIN",
  "OPERATIONS_ADMIN",
  "VERIFICATION_ADMIN",
  "FINANCE_ADMIN",
  "SUPPORT_ADMIN",
];

/**
 * Robust authentication and authorization helper for Admin API endpoints.
 * Extracts the bearer token from the Authorization header or HttpOnly session cookies,
 * cryptographically verifies the token via Supabase Auth, and resolves the user's role
 * strictly from the `users` table (or secure `app_metadata`).
 */
export async function verifyAdminAuth(
  request: NextRequest,
  allowedRoles: UserRole[] = DEFAULT_ADMIN_ROLES
): Promise<AdminAuthSession> {
  const authHeader = request.headers.get("authorization");
  let token = authHeader ? authHeader.replace(/^Bearer\s+/i, "").trim() : null;

  // Fallback to secure session cookies if Authorization header is absent
  if (!token) {
    const sessionCookie =
      request.cookies.get("auth_token")?.value ||
      request.cookies.get("sb-access-token")?.value;
    if (sessionCookie) {
      token = sessionCookie.trim();
    }
  }

  // Reject missing, null, or placeholder tokens
  if (!token || token === "null" || token === "undefined") {
    return {
      authorized: false,
      userId: "",
      email: "",
      role: "CUSTOMER",
      error: "Unauthorized: Missing authentication credentials",
      status: 401,
    };
  }

  // Cryptographic Supabase Auth Token verification
  try {
    const {
      data: { user },
      error: authError,
    } = await supabaseServer.auth.getUser(token);

    if (authError || !user) {
      return {
        authorized: false,
        userId: "",
        email: "",
        role: "CUSTOMER",
        error: "Unauthorized: Invalid or expired token",
        status: 401,
      };
    }

    // Role MUST come only from the users table (or secure app_metadata), NEVER user_metadata
    const { data: dbUser } = await supabaseServer
      .from("users")
      .select("id, email, role")
      .eq("id", user.id)
      .maybeSingle();

    const userRole: UserRole =
      (dbUser?.role as UserRole) ||
      (user.app_metadata?.role as UserRole) ||
      "CUSTOMER";

    const isAllowed =
      userRole === "SUPER_ADMIN" || allowedRoles.includes(userRole);

    if (!isAllowed) {
      return {
        authorized: false,
        userId: user.id,
        email: user.email || "",
        role: userRole,
        error: "Forbidden: Admin access required",
        status: 403,
      };
    }

    return {
      authorized: true,
      userId: user.id,
      email: user.email || "",
      role: userRole,
    };
  } catch (e) {
    console.warn("[verifyAdminAuth] Verification exception:", e);
    return {
      authorized: false,
      userId: "",
      email: "",
      role: "CUSTOMER",
      error: "Unauthorized: Authentication verification failed",
      status: 401,
    };
  }
}

export interface CustomerAuthSession {
  authorized: boolean;
  userId: string;
  email: string;
  role: UserRole;
  error?: string;
  status?: number;
}

/**
 * Authentication helper for customer-facing API endpoints.
 * Accepts any valid authenticated user.
 */
export async function verifyCustomerAuth(
  request: NextRequest
): Promise<CustomerAuthSession> {
  const authHeader = request.headers.get("authorization");
  let token = authHeader ? authHeader.replace(/^Bearer\s+/i, "").trim() : null;

  if (!token) {
    const sessionCookie =
      request.cookies.get("auth_token")?.value ||
      request.cookies.get("sb-access-token")?.value;
    if (sessionCookie) token = sessionCookie.trim();
  }

  if (!token || token === "null" || token === "undefined") {
    return {
      authorized: false,
      userId: "",
      email: "",
      role: "CUSTOMER",
      error: "Unauthorized: Missing authentication credentials",
      status: 401,
    };
  }

  try {
    const {
      data: { user },
      error: authError,
    } = await supabaseServer.auth.getUser(token);

    if (authError || !user) {
      return {
        authorized: false,
        userId: "",
        email: "",
        role: "CUSTOMER",
        error: "Unauthorized: Invalid or expired token",
        status: 401,
      };
    }

    // Resolve role from users table or app_metadata
    const { data: dbUser } = await supabaseServer
      .from("users")
      .select("id, email, role")
      .eq("id", user.id)
      .maybeSingle();

    const userRole: UserRole =
      (dbUser?.role as UserRole) ||
      (user.app_metadata?.role as UserRole) ||
      "CUSTOMER";

    return {
      authorized: true,
      userId: user.id,
      email: user.email || "",
      role: userRole,
    };
  } catch (e) {
    console.warn("[verifyCustomerAuth] Verification exception:", e);
    return {
      authorized: false,
      userId: "",
      email: "",
      role: "CUSTOMER",
      error: "Unauthorized: Authentication verification failed",
      status: 401,
    };
  }
}

export interface MerchantAuthSession {
  authorized: boolean;
  userId: string;
  email: string;
  role: UserRole;
  merchantProfileId: string;
  businessName: string;
  verificationStatus?: string;
  error?: string;
  status?: number;
}

/**
 * Authentication helper for merchant-facing API endpoints.
 * Verifies the caller is a merchant or admin, and validates their merchant profile.
 */
export async function verifyMerchantAuth(
  request: NextRequest
): Promise<MerchantAuthSession> {
  const authHeader = request.headers.get("authorization");
  let token = authHeader ? authHeader.replace(/^Bearer\s+/i, "").trim() : null;

  if (!token) {
    const sessionCookie =
      request.cookies.get("auth_token")?.value ||
      request.cookies.get("sb-access-token")?.value;
    if (sessionCookie) token = sessionCookie.trim();
  }

  if (!token || token === "null" || token === "undefined") {
    return {
      authorized: false,
      userId: "",
      email: "",
      role: "MERCHANT",
      merchantProfileId: "",
      businessName: "",
      error: "Unauthorized: Missing authentication credentials",
      status: 401,
    };
  }

  try {
    const {
      data: { user },
      error: authError,
    } = await supabaseServer.auth.getUser(token);

    if (authError || !user) {
      return {
        authorized: false,
        userId: "",
        email: "",
        role: "MERCHANT",
        merchantProfileId: "",
        businessName: "",
        error: "Unauthorized: Invalid or expired credentials",
        status: 401,
      };
    }

    // Look up user details in DB (role strictly from users table or app_metadata)
    const { data: userData } = await supabaseServer
      .from("users")
      .select("id, role, full_name, email")
      .eq("id", user.id)
      .maybeSingle();

    const role: UserRole =
      (userData?.role as UserRole) ||
      (user.app_metadata?.role as UserRole) ||
      "MERCHANT";

    // Look up merchant profile
    const { data: merchantProfile } = await supabaseServer
      .from("merchant_profiles")
      .select("id, verification_status, business_name")
      .eq("user_id", user.id)
      .maybeSingle();

    const isAdmin = ["SUPER_ADMIN", "OPERATIONS_ADMIN", "VERIFICATION_ADMIN"].includes(role);
    const isMerchant = role === "MERCHANT" || !!merchantProfile;

    if (!isMerchant && !isAdmin) {
      return {
        authorized: false,
        userId: user.id,
        email: userData?.email || user.email || "",
        role,
        merchantProfileId: "",
        businessName: "",
        error: "Forbidden: Merchant access required",
        status: 403,
      };
    }

    if (!merchantProfile) {
      return {
        authorized: false,
        userId: user.id,
        email: userData?.email || user.email || "",
        role,
        merchantProfileId: "",
        businessName: "",
        error: "Merchant profile not found",
        status: 401,
      };
    }

    return {
      authorized: true,
      userId: user.id,
      email: userData?.email || user.email || "",
      role,
      merchantProfileId: merchantProfile.id,
      businessName: merchantProfile.business_name || "Fleet Operator",
      verificationStatus: merchantProfile.verification_status || "SUBMITTED",
    };
  } catch (e) {
    console.warn("[verifyMerchantAuth] Verification exception:", e);
    return {
      authorized: false,
      userId: "",
      email: "",
      role: "MERCHANT",
      merchantProfileId: "",
      businessName: "",
      error: "Unauthorized: Verification failed",
      status: 401,
    };
  }
}
