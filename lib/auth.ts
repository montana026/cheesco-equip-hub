import type { UserRole } from "./types";

/* ── Mock auth service — localStorage-backed session, JWT-style claims ──
   Production swap: replace with real JWT issuance + httpOnly cookies.   */

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

export interface SeedAccount extends SessionUser {
  password: string;
  description: string;
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

export const SEED_ACCOUNTS: SeedAccount[] = [
  {
    id: "u-cust-1", name: "Obinna Works Ltd", email: "customer@cheesco.ng",
    role: "CUSTOMER", password: "cheesco123",
    description: "Customer — submits rental & purchase requests",
  },
  {
    id: "u-mrch-1", name: "Delta Plant Rentals", email: "merchant@cheesco.ng",
    role: "MERCHANT", password: "cheesco123",
    description: "Merchant — lists equipment, buys ad campaigns",
  },
  {
    id: "u-ops-1", name: "Cheesco Operations", email: "ops@cheesco.ng",
    role: "OPERATIONS_ADMIN", password: "cheesco123",
    description: "Operations Admin — quotations & lifecycle management",
  },
  {
    id: "u-vrf-1", name: "Cheesco Verification", email: "verify@cheesco.ng",
    role: "VERIFICATION_ADMIN", password: "cheesco123",
    description: "Verification Admin — merchant KYC & equipment checks",
  },
  {
    id: "u-fin-1", name: "Cheesco Finance", email: "finance@cheesco.ng",
    role: "FINANCE_ADMIN", password: "cheesco123",
    description: "Finance Admin — commissions, escrow, payouts",
  },
  {
    id: "u-sup-1", name: "Cheesco Support", email: "support@cheesco.ng",
    role: "SUPPORT_ADMIN", password: "cheesco123",
    description: "Support Admin — disputes & customer care",
  },
  {
    id: "u-supr-1", name: "Cheesco Founder", email: "super@cheesco.ng",
    role: "SUPER_ADMIN", password: "cheesco123",
    description: "Super Admin — full access",
  },
];

const SESSION_KEY = "cheesco.session.v1";

export function fakeJwt(user: SessionUser): string {
  const payload = {
    sub: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    iat: Date.now(),
    exp: Date.now() + 7 * 86400_000,
  };
  return `hdr.${btoa(JSON.stringify(payload))}.sig`;
}

export function setLocalSession(user: SessionUser): void {
  try {
    localStorage.setItem(SESSION_KEY, fakeJwt(user));
  } catch {
    /* noop */
  }
}

export function login(email: string, password: string): SessionUser {
  const acct = SEED_ACCOUNTS.find(
    (a) => a.email.toLowerCase() === email.trim().toLowerCase()
  );
  if (!acct || acct.password !== password) {
    throw new Error("Invalid credentials. Try a seeded evaluation account.");
  }
  const session: SessionUser = {
    id: acct.id, name: acct.name, email: acct.email, role: acct.role,
  };
  setLocalSession(session);
  return session;
}

export function getSession(): SessionUser | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const payload = JSON.parse(atob(raw.split(".")[1]));
    if (payload.exp < Date.now()) return null;
    return {
      id: payload.sub, name: payload.name, email: payload.email, role: payload.role,
    };
  } catch {
    return null;
  }
}

export function logout(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem("auth_token");
  } catch {
    /* noop */
  }
}

/* Route guard helper — returns the redirect target or null when allowed */
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
