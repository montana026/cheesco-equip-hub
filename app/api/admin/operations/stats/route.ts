import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { supabaseServer } from "@/lib/supabase/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { RENTAL_STATES } from "@/lib/types";

/** Roles that may read operations statistics. */
const ALLOWED_ROLES = [
  "SUPER_ADMIN",
  "OPERATIONS_ADMIN",
  "FINANCE_ADMIN",
  "VERIFICATION_ADMIN",
  "SUPPORT_ADMIN",
] as const;

/** Active rental states for counting activeRentals. */
const ACTIVE_RENTAL_STATES: readonly string[] = [
  "PAYMENT_CONFIRMED",
  "LOGISTICS_PENDING",
  "CARRIER_ASSIGNED",
  "IN_TRANSIT",
  "PRE_DELIVERY_INSPECTION",
  "DELIVERED",
  "RENTAL_ACTIVE",
  "RETURN_SCHEDULED",
  "RETURN_IN_PROGRESS",
  "POST_RENTAL_INSPECTION",
];

export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate and authorise — explicit role allowlist
    const auth = await verifyAdminAuth(request, [...ALLOWED_ROLES]);
    if (!auth.authorized) {
      return NextResponse.json(
        { error: auth.error || "Unauthorized" },
        { status: auth.status || 401 }
      );
    }

    // 2. Rate limit: 60 reads per minute per authenticated user
    const rl = await checkRateLimit(`ops_stats:${auth.userId}`, 60, 60_000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please slow down." },
        { status: 429 }
      );
    }

    const [usersRes, merchantsRes, equipmentRes, rentalsRes] = await Promise.all([
      supabaseServer.from("users").select("*", { count: "exact", head: true }),
      // Only count VERIFIED merchants
      supabaseServer
        .from("merchant_profiles")
        .select("*", { count: "exact", head: true })
        .eq("verification_status", "VERIFIED"),
      // Only count VERIFIED listings
      supabaseServer
        .from("equipment")
        .select("*", { count: "exact", head: true })
        .eq("verification_status", "VERIFIED"),
      // Only count actively in-progress rentals
      supabaseServer
        .from("rental_requests")
        .select("*", { count: "exact", head: true })
        .in("current_state", ACTIVE_RENTAL_STATES),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        totalUsers: usersRes.count ?? 0,
        verifiedMerchants: merchantsRes.count ?? 0,
        totalListings: equipmentRes.count ?? 0,
        activeRentals: rentalsRes.count ?? 0,
      },
    });
  } catch (err: any) {
    console.error("[/api/admin/operations/stats] Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch operations statistics" },
      { status: 500 }
    );
  }
}
