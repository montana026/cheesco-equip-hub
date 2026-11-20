"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { SessionUser } from "@/lib/auth";
import { useAuthGuard } from "@/lib/hooks/use-auth-guard";
import { DashboardShell } from "@/components/dashboard-shell";
import Link from "next/link";
import { fmtNgn } from "@/lib/format";
import { apiFetch } from "@/lib/api-client";

const NAV = [
  { href: "/merchant/dashboard", label: "Overview" },
  { href: "/merchant/listings", label: "My Listings" },
  { href: "/merchant/ads", label: "Ad Campaigns" },
  { href: "/merchant/earnings", label: "Earnings & Payouts" },
  { href: "/merchant/verification", label: "Verification (KYC)" },
];

interface MerchantEquipmentItem {
  id: string;
  name: string;
  locationCity: string;
  locationState: string;
  listingType: string;
  availabilityStatus: string;
  verificationStatus: string;
  merchantRentalRate?: number;
  salePrice?: number;
  imageUrl: string;
}

export default function MerchantDashboardPage() {
  const router = useRouter();
  const { user, ready } = useAuthGuard("MERCHANT");
  const [tab, setTab] = useState<"ALL" | "SALE" | "RENT">("ALL");
  const [equipmentList, setEquipmentList] = useState<MerchantEquipmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [verificationStatus, setVerificationStatus] = useState<string>("NOT_STARTED");

  useEffect(() => {
    if (!ready || !user) return;
    fetchMerchantData();
  }, [ready, user]);

  const fetchMerchantData = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/merchant/equipment");

      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        if (json.verificationStatus) {
          setVerificationStatus(json.verificationStatus);
        }
        const formatted = json.data.map((item: any) => ({
          id: item.id,
          name: item.name,
          locationCity: item.locationCity || "Lagos",
          locationState: item.locationState || "Lagos",
          listingType: item.listingType === "FOR_SALE" ? "Sale" : "Rent",
          availabilityStatus: item.availabilityStatus || "AVAILABLE",
          verificationStatus: item.verificationStatus || "PENDING",
          merchantRentalRate: item.merchantRentalRate,
          salePrice: item.salePrice,
          imageUrl:
            item.primaryImage ||
            item.images?.[0] ||
            "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=400&q=75",
        }));
        setEquipmentList(formatted);
      }
    } catch (err) {
      console.error("Error fetching merchant equipment:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return <div className="min-h-screen bg-canvas" />;

  const activeCount = equipmentList.filter((e) => e.availabilityStatus === 'AVAILABLE').length;
  const inRentCount = equipmentList.filter((e) => e.availabilityStatus === 'RENTED').length;
  const saleCount = equipmentList.filter((e) => e.listingType === 'Sale').length;
  const rentCount = equipmentList.filter((e) => e.listingType === 'Rent').length;

  const filteredEquipment = equipmentList.filter((item) => {
    if (tab === "SALE") return item.listingType === "Sale";
    if (tab === "RENT") return item.listingType === "Rent";
    return true;
  });

  return (
    <DashboardShell user={user} nav={NAV} title="Merchant Dashboard">
      {/* Verification Status Banner */}
      {verificationStatus === "VERIFIED" ? (
        <div className="mb-6 flex items-center justify-between gap-4 rounded-2xl border border-green-500/30 bg-green-500/10 p-4 text-xs shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/20 text-green-400 text-lg font-black">
              ✓
            </div>
            <div>
              <div className="font-bold text-green-400 text-sm">Account Accredited & Verified</div>
              <p className="text-ink-muted text-[11px] mt-0.5">
                Your business and machinery fleet documents are officially approved. All published listings are live on the marketplace.
              </p>
            </div>
          </div>
          <Link
            href="/merchant/verification"
            className="shrink-0 rounded-xl bg-green-500/20 border border-green-500/40 px-3 py-1.5 text-xs font-bold text-green-400 hover:bg-green-500/30 transition-all"
          >
            View KYC
          </Link>
        </div>
      ) : verificationStatus === "SUBMITTED" || verificationStatus === "UNDER_REVIEW" ? (
        <div className="mb-6 flex items-center justify-between gap-4 rounded-2xl border border-cheesco-yellow/40 bg-cheesco-yellow/10 p-4 text-xs shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cheesco-yellow/20 text-cheesco-yellow text-lg font-black">
              ⏳
            </div>
            <div>
              <div className="font-bold text-cheesco-yellow text-sm">KYC Application Under Review</div>
              <p className="text-ink-muted text-[11px] mt-0.5">
                Our verification desk is auditing your CAC registration and credentials. Approvals usually take 24–48 hours.
              </p>
            </div>
          </div>
          <Link
            href="/merchant/verification"
            className="shrink-0 rounded-xl bg-cheesco-yellow/20 border border-cheesco-yellow/40 px-3 py-1.5 text-xs font-bold text-cheesco-yellow hover:bg-cheesco-yellow/30 transition-all"
          >
            Check Status
          </Link>
        </div>
      ) : (
        <div className="mb-6 flex items-center justify-between gap-4 rounded-2xl border border-line-soft bg-card p-4 text-xs shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-800 text-zinc-300 text-lg font-black">
              🛡️
            </div>
            <div>
              <div className="font-bold text-ink text-sm">Verify Your Merchant Profile</div>
              <p className="text-ink-muted text-[11px] mt-0.5">
                Upload your CAC company documents and government ID to unlock verified badges and receive equipment rental disbursements.
              </p>
            </div>
          </div>
          <Link
            href="/merchant/verification"
            className="shrink-0 rounded-xl bg-cheesco-yellow px-4 py-2 text-xs font-black text-[#0A0D14] hover:bg-cheesco-yellow-bright transition-all shadow-sm"
          >
            Start KYC Verification
          </Link>
        </div>
      )}

      {/* 4 Stat Metric Cards (Dynamic from Supabase) */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total Listings" value={String(equipmentList.length)} />
        <StatCard label="Available" value={String(activeCount)} accent />
        <StatCard label="In Rent" value={String(inRentCount)} />
        <StatCard label="For Sale" value={String(saleCount)} />
      </div>

      {/* My Equipment Section */}
      <div className="mt-8 card-surface rounded-2xl p-6 border border-line-soft shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-line-soft pb-4">
          <div>
            <h2 className="text-base font-black text-ink">My Equipment</h2>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Tabs */}
            <div className="flex rounded-xl bg-canvas-deep p-1 ring-1 ring-line-soft">
              <button
                type="button"
                onClick={() => setTab("ALL")}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${
                  tab === "ALL"
                    ? "bg-cheesco-yellow text-[#0A0D14] shadow-sm"
                    : "text-ink-muted hover:text-ink"
                }`}
              >
                All ({equipmentList.length})
              </button>
              <button
                type="button"
                onClick={() => setTab("SALE")}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${
                  tab === "SALE"
                    ? "bg-cheesco-yellow text-[#0A0D14] shadow-sm"
                    : "text-ink-muted hover:text-ink"
                }`}
              >
                For Sale ({saleCount})
              </button>
              <button
                type="button"
                onClick={() => setTab("RENT")}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${
                  tab === "RENT"
                    ? "bg-cheesco-yellow text-[#0A0D14] shadow-sm"
                    : "text-ink-muted hover:text-ink"
                }`}
              >
                For Rent ({rentCount})
              </button>
            </div>

            {/* + List Equipment Button */}
            <Link
              href="/merchant/listings/new"
              className="flex items-center gap-1.5 rounded-xl bg-cheesco-yellow px-4 py-2 text-xs font-black text-[#0A0D14] shadow transition-all hover:bg-cheesco-yellow-bright hover:shadow-lg"
            >
              <span>+ List Equipment</span>
            </Link>
          </div>
        </div>

        {/* Equipment List Table */}
        <div className="mt-4 overflow-x-auto">
          {loading ? (
            <div className="py-12 text-center text-xs text-ink-muted">Loading equipment from database...</div>
          ) : filteredEquipment.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm font-bold text-ink">No equipment found</p>
              <p className="text-xs text-ink-muted mt-1">Start by adding your first equipment listing.</p>
              <Link
                href="/merchant/listings/new"
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-cheesco-yellow px-4 py-2 text-xs font-bold text-[#0A0D14] shadow"
              >
                + Add Listing
              </Link>
            </div>
          ) : (
            <table className="w-full min-w-[640px] text-xs">
              <thead>
                <tr className="border-b border-line-soft text-left font-bold uppercase tracking-wider text-ink-faint">
                  <th className="pb-3 pr-4">Equipment</th>
                  <th className="pb-3 pr-4">Location</th>
                  <th className="pb-3 pr-4">Type</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 pr-4">Rate / Price</th>
                  <th className="pb-3 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-soft">
                {filteredEquipment.map((eq) => (
                  <tr key={eq.id} className="hover:bg-card-raised/50 transition-colors">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-3">
                        <div className="h-11 w-14 shrink-0 overflow-hidden rounded-lg bg-canvas-deep">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={eq.imageUrl} alt={eq.name} className="h-full w-full object-cover" />
                        </div>
                        <span className="font-bold text-ink">{eq.name}</span>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-ink-muted">{eq.locationCity}, {eq.locationState}</td>
                    <td className="py-3 pr-4">
                      <span className="rounded-md bg-canvas-deep px-2 py-0.5 text-[10px] font-bold text-ink ring-1 ring-line-soft">
                        {eq.listingType}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${
                          eq.availabilityStatus === "AVAILABLE"
                            ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                            : "bg-red-500/15 text-red-400 border-red-500/30"
                        }`}
                      >
                        {eq.availabilityStatus}
                      </span>
                    </td>
                    <td className="py-3 pr-4 font-bold text-cheesco-yellow">
                      {eq.listingType === "Rent"
                        ? `₦${fmtNgn(eq.merchantRentalRate || 0)} / day`
                        : `₦${fmtNgn(eq.salePrice || 0)}`}
                    </td>
                    <td className="py-3 pr-4 text-right">
                      <Link
                        href="/merchant/listings"
                        className="rounded-lg bg-canvas-deep px-2.5 py-1 text-[11px] font-bold text-ink-muted hover:text-cheesco-yellow ring-1 ring-line-soft"
                      >
                        Manage
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
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
    <div className="card-surface rounded-2xl p-5 border border-line-soft shadow-sm">
      <div className="text-[11px] font-bold uppercase tracking-wider text-ink-faint">{label}</div>
      <div className={`mt-1 text-2xl font-black ${accent ? "text-cheesco-yellow" : "text-ink"}`}>
        {value}
      </div>
      {sub && <div className="mt-1 text-xs text-ink-muted">{sub}</div>}
    </div>
  );
}
