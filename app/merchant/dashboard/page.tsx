"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSession, guardRoute } from "@/lib/auth";
import type { SessionUser } from "@/lib/auth";
import { DashboardShell } from "@/components/dashboard-shell";
import { EQUIPMENT } from "@/lib/seed";
import { fmtNgn, fmtNgnFull } from "@/lib/format";
import Link from "next/link";

const NAV = [
  { href: "/merchant/dashboard", label: "Overview" },
  { href: "/merchant/listings", label: "My Listings" },
  { href: "/merchant/ads", label: "Ad Campaigns" },
  { href: "/merchant/earnings", label: "Earnings" },
  { href: "/merchant/verification", label: "Verification (KYC)" },
];

export default function MerchantDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [verification, setVerification] = useState<{
    verificationStatus: string;
    businessName: string;
  } | null>(null);

  useEffect(() => {
    const s = getSession();
    const redirect = guardRoute("MERCHANT", s);
    if (redirect) { router.replace(redirect); return; }
    setUser(s);
    fetchVerificationStatus();
  }, [router]);

  const fetchVerificationStatus = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch("/api/merchant/verification", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const result = await response.json();
      if (result.success) {
        setVerification({
          verificationStatus: result.data.verificationStatus,
          businessName: result.data.businessName,
        });
      }
    } catch (error) {
      console.error("Failed to fetch verification status:", error);
      // Set a default value to prevent UI breaking
      setVerification({
        verificationStatus: "NOT_STARTED",
        businessName: "",
      });
    }
  };

  if (!user) return <div className="min-h-screen bg-canvas" />;

  const myListings = EQUIPMENT.filter((e) => e.merchantId === "mrc-1");
  const activeAds = myListings.filter((e) => e.promotionTier !== "NONE");
  const totalImpressions = activeAds.reduce((s, e) => s + (e.adsMetrics?.impressions ?? 0), 0);
  const totalClicks = activeAds.reduce((s, e) => s + (e.adsMetrics?.clicks ?? 0), 0);
  const totalEnquiries = activeAds.reduce((s, e) => s + (e.adsMetrics?.enquiries ?? 0), 0);
  const estimatedEarnings = myListings.reduce(
    (s, e) => s + (e.cheescoAdjustedRate ?? e.merchantRentalRate) * 0.85 * 3,
    0
  );

  return (
    <DashboardShell user={user} nav={NAV} title="Merchant Dashboard">
      {/* KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active Listings" value={String(myListings.length)} accent />
        <StatCard label="Rental Requests" value="7" sub="3 awaiting your review" />
        <StatCard label="Sales Enquiries" value="2" />
        <StatCard label="Verification Status"
          value={verification?.verificationStatus?.replace(/_/g, " ") || "NOT_STARTED"}
          accent={verification?.verificationStatus === "VERIFIED"}
        />
      </div>

      {/* Ad performance */}
      <div className="mt-8">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-xs font-black tracking-[0.25em] text-cheesco-yellow">AD PERFORMANCE</div>
            <h2 className="mt-1 text-lg font-black">Sponsored Campaigns</h2>
          </div>
          <Link
            href="/merchant/ads"
            className="rounded-lg bg-cheesco-yellow px-4 py-2 text-xs font-black text-canvas hover:bg-cheesco-yellow-bright"
          >
            + New Campaign
          </Link>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <StatCard label="Total Impressions" value={totalImpressions.toLocaleString()} />
          <StatCard label="Total Clicks" value={totalClicks.toLocaleString()} />
          <StatCard label="Enquiries Generated" value={totalEnquiries.toLocaleString()} accent />
        </div>
      </div>

      {/* Active listings table */}
      <div className="mt-8">
        <div className="flex items-end justify-between">
          <h2 className="text-lg font-black">Active Listings</h2>
          <Link
            href="/merchant/listings"
            className="text-sm font-bold text-cheesco-yellow hover:underline"
          >
            Manage all →
          </Link>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-line-soft text-left text-xs font-bold uppercase tracking-wider text-ink-faint">
                <th className="pb-3 pr-4">Equipment</th>
                <th className="pb-3 pr-4">Category</th>
                <th className="pb-3 pr-4">Status</th>
                <th className="pb-3 pr-4">Base Rate</th>
                <th className="pb-3 pr-4">Promotion</th>
              </tr>
            </thead>
            <tbody>
              {myListings.map((eq) => (
                <tr key={eq.id} className="border-b border-line-soft">
                  <td className="py-3 pr-4 font-semibold">{eq.name}</td>
                  <td className="py-3 pr-4 text-ink-muted">{eq.category}</td>
                  <td className="py-3 pr-4">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      eq.availabilityStatus === "AVAILABLE"
                        ? "bg-success/20 text-success"
                        : "bg-warn/20 text-warn"
                    }`}>
                      {eq.availabilityStatus}
                    </span>
                  </td>
                  <td className="py-3 pr-4">₦{fmtNgnFull(eq.merchantRentalRate)}/day</td>
                  <td className="py-3 pr-4">
                    {eq.promotionTier !== "NONE" ? (
                      <span className="rounded bg-cheesco-yellow/20 px-2 py-0.5 text-[10px] font-bold text-cheesco-yellow">
                        {eq.promotionTier.replace(/_/g, " ")}
                      </span>
                    ) : (
                      <span className="text-ink-faint">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardShell>
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
      <div className="text-[11px] font-bold uppercase tracking-wider text-ink-faint">{label}</div>
      <div className={`mt-1 text-2xl font-black ${accent ? "text-cheesco-yellow" : ""}`}>
        {value}
      </div>
      {sub && <div className="mt-1 text-xs text-ink-muted">{sub}</div>}
    </div>
  );
}
