"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/contexts/auth-context";
import { ProtectedRoute } from "@/components/protected-route";
import { DashboardShell } from "@/components/dashboard-shell";
import Link from "next/link";
import { fmtNgn } from "@/lib/format";

const NAV = [
  { href: "/dashboard/customer", label: "Overview" },
  { href: "/dashboard/customer/requests", label: "My Requests" },
  { href: "/dashboard/customer/quotations", label: "Quotations" },
  { href: "/dashboard/customer/rentals", label: "Active Rentals" },
  { href: "/dashboard/customer/saved", label: "Saved Equipment" },
  { href: "/dashboard/customer/payments", label: "Payments" },
];

interface DashboardStats {
  pendingRequests: number;
  activeRentals: number;
  pendingQuotations: number;
  savedEquipment: number;
}

export function CustomerDashboardClient() {
  const { user, profile } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    pendingRequests: 0,
    activeRentals: 0,
    pendingQuotations: 0,
    savedEquipment: 0,
  });
  const [recentRequests, setRecentRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      // Fetch rental requests
      const requestsResponse = await fetch("/api/rentals");
      const requestsData = await requestsResponse.json();

      const requests = requestsData.data || [];

      // Calculate stats
      const pending = requests.filter(
        (r: any) =>
          r.current_state === "REQUEST_SUBMITTED" ||
          r.current_state === "CHEESCO_REVIEWING"
      ).length;

      const active = requests.filter((r: any) =>
        r.current_state === "RENTAL_ACTIVE"
      ).length;

      const quotations = requests.filter((r: any) =>
        ["QUOTATION_SENT", "QUOTATION_VIEWED"].includes(r.current_state)
      ).length;

      setStats({
        pendingRequests: pending,
        activeRentals: active,
        pendingQuotations: quotations,
        savedEquipment: 0, // TODO: fetch from API
      });

      setRecentRequests(requests.slice(0, 5));
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={["CUSTOMER"]}>
      <DashboardShell user={profile} nav={NAV} title="Customer Dashboard">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-line border-t-cheesco-yellow mx-auto" />
              <p className="mt-4 text-ink-muted">Loading dashboard...</p>
            </div>
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Pending Requests"
                value={String(stats.pendingRequests)}
                accent={stats.pendingRequests > 0}
              />
              <StatCard
                label="Active Rentals"
                value={String(stats.activeRentals)}
                accent
              />
              <StatCard
                label="Pending Quotations"
                value={String(stats.pendingQuotations)}
                sub={stats.pendingQuotations > 0 ? "Requires your review" : undefined}
              />
              <StatCard
                label="Saved Equipment"
                value={String(stats.savedEquipment)}
              />
            </div>

            {/* Quick Actions */}
            <div className="mt-8">
              <h2 className="text-lg font-black">Quick Actions</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <Link
                  href="/browse"
                  className="card-surface rounded-xl p-6 hover:border-cheesco-yellow/50 transition-colors"
                >
                  <div className="text-3xl mb-2">🔍</div>
                  <h3 className="font-bold">Browse Equipment</h3>
                  <p className="text-sm text-ink-muted mt-1">
                    Find excavators, cranes, generators and more
                  </p>
                </Link>

                <Link
                  href="/dashboard/customer/requests"
                  className="card-surface rounded-xl p-6 hover:border-cheesco-yellow/50 transition-colors"
                >
                  <div className="text-3xl mb-2">📋</div>
                  <h3 className="font-bold">My Requests</h3>
                  <p className="text-sm text-ink-muted mt-1">
                    View and track your rental requests
                  </p>
                </Link>

                <Link
                  href="/dashboard/customer/saved"
                  className="card-surface rounded-xl p-6 hover:border-cheesco-yellow/50 transition-colors"
                >
                  <div className="text-3xl mb-2">⭐</div>
                  <h3 className="font-bold">Saved Equipment</h3>
                  <p className="text-sm text-ink-muted mt-1">
                    View your saved equipment
                  </p>
                </Link>
              </div>
            </div>

            {/* Recent Requests */}
            {recentRequests.length > 0 && (
              <div className="mt-8">
                <div className="flex items-end justify-between">
                  <h2 className="text-lg font-black">Recent Requests</h2>
                  <Link
                    href="/dashboard/customer/requests"
                    className="text-sm font-bold text-cheesco-yellow hover:underline"
                  >
                    View all →
                  </Link>
                </div>

                <div className="mt-4 space-y-3">
                  {recentRequests.map((request) => (
                    <Link
                      key={request.id}
                      href={`/dashboard/customer/requests/${request.id}`}
                      className="card-surface block rounded-xl p-4 hover:border-cheesco-yellow/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold">
                              {request.equipment?.name || "Equipment"}
                            </h3>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${getStatusColor(
                                request.current_state
                              )}`}
                            >
                              {formatStatus(request.current_state)}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-ink-muted">
                            {request.reference_number} • {request.duration_days} days
                            • {request.project_location}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-ink-faint">
                            {new Date(request.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {recentRequests.length === 0 && (
              <div className="mt-12 text-center">
                <div className="text-6xl mb-4">📦</div>
                <h3 className="text-xl font-black">No Rental Requests Yet</h3>
                <p className="mt-2 text-ink-muted">
                  Browse our equipment catalog to get started
                </p>
                <Link
                  href="/browse"
                  className="mt-6 inline-block rounded-lg bg-cheesco-yellow px-6 py-3 font-bold text-canvas hover:bg-cheesco-yellow-bright"
                >
                  Browse Equipment
                </Link>
              </div>
            )}
          </>
        )}
      </DashboardShell>
    </ProtectedRoute>
  );
}

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="card-surface rounded-xl p-5">
      <div className="text-[11px] font-bold uppercase tracking-wider text-ink-faint">
        {label}
      </div>
      <div
        className={`mt-1 text-2xl font-black ${
          accent ? "text-cheesco-yellow" : ""
        }`}
      >
        {value}
      </div>
      {sub && <div className="mt-1 text-xs text-ink-muted">{sub}</div>}
    </div>
  );
}

function getStatusColor(status: string) {
  if (["REQUEST_SUBMITTED", "CHEESCO_REVIEWING"].includes(status)) {
    return "bg-warn/20 text-warn";
  }
  if (["QUOTATION_SENT", "QUOTATION_VIEWED"].includes(status)) {
    return "bg-cheesco-yellow/20 text-cheesco-yellow";
  }
  if (status === "RENTAL_ACTIVE") {
    return "bg-success/20 text-success";
  }
  if (status === "COMPLETED") {
    return "bg-ink-faint/20 text-ink-faint";
  }
  return "bg-line/20 text-ink-muted";
}

function formatStatus(status: string) {
  return status.replace(/_/g, " ");
}
