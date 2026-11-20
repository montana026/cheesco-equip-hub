"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { SessionUser } from "@/lib/auth";
import { useAuthGuard } from "@/lib/hooks/use-auth-guard";
import { DashboardShell } from "@/components/dashboard-shell";
import { fmtNgnFull } from "@/lib/format";
import { apiFetch } from "@/lib/api-client";
import toast from "react-hot-toast";
import Link from "next/link";

const NAV = [
  { href: "/merchant/dashboard", label: "Overview" },
  { href: "/merchant/listings", label: "My Listings" },
  { href: "/merchant/ads", label: "Ad Campaigns" },
  { href: "/merchant/earnings", label: "Earnings & Payouts" },
  { href: "/merchant/verification", label: "Verification (KYC)" },
];

interface MerchantEquipment {
  id: string;
  slug: string;
  name: string;
  category: string;
  brand: string;
  model: string;
  year: number;
  condition: string;
  locationCity: string;
  locationState: string;
  operatingHours: number;
  description: string;
  specs: Record<string, any>;
  listingType: string;
  salePrice: number | null;
  merchantRentalRate: number;
  cheescoAdjustedRate?: number;
  isOperatorIncluded: boolean;
  isDeliveryAvailable: boolean;
  verificationStatus: "SUBMITTED" | "VERIFIED" | "NEEDS_INFO" | "REJECTED" | string;
  availabilityStatus: string;
  images: string[];
  primaryImage: string;
  createdAt: string;
  updatedAt: string;
  adminFeedback?: {
    status: string;
    notes: string;
    updatedAt: string;
  } | null;
}

export default function MerchantListingsPage() {
  const router = useRouter();
  const { user, ready } = useAuthGuard("MERCHANT");
  const [listings, setListings] = useState<MerchantEquipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"ALL" | "VERIFIED" | "SUBMITTED" | "NEEDS_ATTENTION">("ALL");
  const [editId, setEditId] = useState<string | null>(null);
  const [baseRate, setBaseRate] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [savingRate, setSavingRate] = useState(false);

  const fetchListings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/merchant/equipment");

      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setListings(json.data);
      } else {
        setListings([]);
      }
    } catch (err) {
      console.error("Failed to load merchant listings:", err);
      toast.error("Could not load equipment listings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!ready || !user) return;
    fetchListings();
  }, [ready, user, fetchListings]);

  if (!ready || !user) return <div className="min-h-screen bg-canvas" />;

  const startEdit = (eq: MerchantEquipment) => {
    setEditId(eq.id);
    setBaseRate(String(eq.merchantRentalRate || ""));
    setSalePrice(eq.salePrice ? String(eq.salePrice) : "");
  };

  const handleSaveRate = async (eqId: string) => {
    setSavingRate(true);
    try {
      const res = await apiFetch("/api/merchant/equipment", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          equipmentId: eqId,
          merchantRentalRate: baseRate ? parseFloat(baseRate) : undefined,
          salePrice: salePrice ? parseFloat(salePrice) : null,
        }),
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to update rates");

      toast.success("Pricing updated successfully!");
      setEditId(null);
      fetchListings();
    } catch (e: any) {
      toast.error(e.message || "Failed to update pricing");
    } finally {
      setSavingRate(false);
    }
  };

  // Metrics
  const totalCount = listings.length;
  const verifiedCount = listings.filter((l) => l.verificationStatus === "VERIFIED").length;
  const pendingCount = listings.filter((l) => l.verificationStatus === "SUBMITTED").length;
  const attentionCount = listings.filter(
    (l) => l.verificationStatus === "NEEDS_INFO" || l.verificationStatus === "REJECTED"
  ).length;

  // Filter tab logic
  const filteredListings = listings.filter((l) => {
    if (activeTab === "ALL") return true;
    if (activeTab === "VERIFIED") return l.verificationStatus === "VERIFIED";
    if (activeTab === "SUBMITTED") return l.verificationStatus === "SUBMITTED";
    if (activeTab === "NEEDS_ATTENTION") {
      return l.verificationStatus === "NEEDS_INFO" || l.verificationStatus === "REJECTED";
    }
    return true;
  });

  return (
    <DashboardShell user={user} nav={NAV} title="Equipment Listings">
      {/* Header and Quick Stats */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-black text-ink">My Equipment Fleet</h2>
          <p className="mt-1 text-xs text-ink-muted">
            Track verification reviews, read admin feedback, and manage daily rental and sales rates.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchListings}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-xl border border-line-soft bg-canvas-deep px-3.5 py-2 text-xs font-bold text-ink-muted transition-colors hover:border-cheesco-yellow hover:text-ink disabled:opacity-50"
          >
            <span>↻</span>
            <span>Refresh</span>
          </button>
          <Link
            href="/merchant/listings/new"
            className="flex items-center gap-1.5 rounded-xl bg-cheesco-yellow px-4 py-2 text-xs font-black text-[#0A0D14] shadow-sm transition-all hover:bg-cheesco-yellow-bright hover:shadow-md"
          >
            <span>+</span>
            <span>Add New Equipment</span>
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="card-surface rounded-2xl p-4 border border-line-soft">
          <div className="text-[11px] font-bold uppercase tracking-wider text-ink-faint">Total Units</div>
          <div className="mt-1 text-2xl font-black text-ink">{totalCount}</div>
        </div>
        <div className="card-surface rounded-2xl p-4 border border-line-soft">
          <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-500">Live on Market</div>
          <div className="mt-1 text-2xl font-black text-emerald-400">{verifiedCount}</div>
        </div>
        <div className="card-surface rounded-2xl p-4 border border-line-soft">
          <div className="text-[11px] font-bold uppercase tracking-wider text-amber-500">In Verification</div>
          <div className="mt-1 text-2xl font-black text-amber-400">{pendingCount}</div>
        </div>
        <div className="card-surface rounded-2xl p-4 border border-line-soft">
          <div className="text-[11px] font-bold uppercase tracking-wider text-rose-500">Needs Attention</div>
          <div className="mt-1 text-2xl font-black text-rose-400">{attentionCount}</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="mt-6 flex flex-wrap items-center gap-2 border-b border-line-soft pb-3">
        {[
          { key: "ALL", label: `All Equipment (${totalCount})` },
          { key: "VERIFIED", label: `Live on Marketplace (${verifiedCount})` },
          { key: "SUBMITTED", label: `Under Review (${pendingCount})` },
          { key: "NEEDS_ATTENTION", label: `Needs Attention (${attentionCount})` },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key as any)}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
              activeTab === tab.key
                ? "bg-cheesco-yellow text-[#0A0D14] shadow-sm"
                : "border border-line-soft bg-canvas-deep text-ink-muted hover:text-ink"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Listing Cards List */}
      <div className="mt-6 space-y-4">
        {loading ? (
          <div className="flex h-48 items-center justify-center rounded-2xl border border-line-soft bg-card/40">
            <div className="text-xs font-bold text-ink-muted animate-pulse">
              Loading your machinery listings...
            </div>
          </div>
        ) : filteredListings.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line-soft py-12 text-center">
            <span className="text-3xl">🚜</span>
            <h3 className="mt-3 text-sm font-bold text-ink">No equipment listings found in this tab</h3>
            <p className="mt-1 max-w-sm text-xs text-ink-muted">
              {activeTab === "SUBMITTED"
                ? "You do not have any equipment listings awaiting verification review."
                : "Submit your heavy equipment to start receiving rental requests from clients across Nigeria."}
            </p>
            <Link
              href="/merchant/listings/new"
              className="mt-4 rounded-xl bg-cheesco-yellow px-4 py-2 text-xs font-black text-[#0A0D14]"
            >
              + Add Equipment Listing
            </Link>
          </div>
        ) : (
          filteredListings.map((eq) => {
            const isVerified = eq.verificationStatus === "VERIFIED";
            const isSubmitted = eq.verificationStatus === "SUBMITTED";
            const isNeedsInfo = eq.verificationStatus === "NEEDS_INFO";
            const isRejected = eq.verificationStatus === "REJECTED";

            return (
              <div
                key={eq.id}
                className="card-surface rounded-2xl border border-line-soft p-5 transition-all hover:border-line-hover"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  {/* Machine Preview Info */}
                  <div className="flex gap-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={eq.primaryImage}
                      alt={eq.name}
                      className="h-24 w-32 shrink-0 rounded-xl object-cover bg-canvas-deep border border-line-soft"
                    />
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-black text-ink">{eq.name}</h3>
                        {/* Status Badges */}
                        {isVerified && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-black text-emerald-400 border border-emerald-500/30">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                            Live on Marketplace
                          </span>
                        )}
                        {isSubmitted && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-black text-amber-400 border border-amber-500/30 animate-pulse">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                            Awaiting Admin Review
                          </span>
                        )}
                        {isNeedsInfo && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/15 px-2.5 py-0.5 text-[11px] font-black text-orange-400 border border-orange-500/30">
                            <span className="h-1.5 w-1.5 rounded-full bg-orange-400" />
                            Action Required: Info Needed
                          </span>
                        )}
                        {isRejected && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 px-2.5 py-0.5 text-[11px] font-black text-rose-400 border border-rose-500/30">
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                            Listing Rejected
                          </span>
                        )}
                      </div>

                      <div className="mt-1 text-xs text-ink-muted">
                        {eq.category} · {eq.brand} {eq.model} · {eq.year} · {eq.condition.replace(/_/g, " ")}
                      </div>
                      <div className="mt-1 text-xs text-ink-faint">
                        📍 {eq.locationCity}, {eq.locationState} · {eq.operatingHours.toLocaleString()} Operating Hours
                      </div>

                      <div className="mt-2.5 flex flex-wrap items-center gap-2">
                        <span className="rounded-lg bg-canvas-deep px-2 py-0.5 text-[10px] font-bold text-ink-muted border border-line-soft">
                          {eq.listingType.replace(/_/g, " ")}
                        </span>
                        <span
                          className={`rounded-lg px-2 py-0.5 text-[10px] font-bold border ${
                            eq.availabilityStatus === "AVAILABLE"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : "bg-warn/10 text-warn border-warn/20"
                          }`}
                        >
                          {eq.availabilityStatus}
                        </span>
                        {eq.isOperatorIncluded && (
                          <span className="rounded-lg bg-canvas-deep px-2 py-0.5 text-[10px] font-bold text-ink-muted border border-line-soft">
                            Operator Included
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Rates Info */}
                  <div className="text-left sm:text-right shrink-0">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-ink-faint">Your Base Rate</div>
                    <div className="text-lg font-black text-ink">
                      ₦{fmtNgnFull(eq.merchantRentalRate)}
                      <span className="text-xs font-normal text-ink-muted">/day</span>
                    </div>
                    {eq.cheescoAdjustedRate && (
                      <div className="text-[11px] text-ink-faint">
                        Client rate: ₦{fmtNgnFull(eq.cheescoAdjustedRate)}/day
                      </div>
                    )}
                    {eq.salePrice && (
                      <div className="mt-1 text-xs font-bold text-cheesco-yellow">
                        Sale: ₦{fmtNgnFull(eq.salePrice)}
                      </div>
                    )}
                  </div>
                </div>

                {/* ── ADMIN FEEDBACK & VERIFICATION BANNER ── */}
                <div className="mt-4 pt-3 border-t border-line-soft">
                  {isVerified && (
                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-xs text-emerald-400">
                        <span className="text-sm">✓</span>
                        <span>
                          <strong>Admin Feedback:</strong> Verified and approved by Cheesco Operations. Live on public catalog.
                        </span>
                      </div>
                      <Link
                        href={`/equipment/${eq.slug}`}
                        target="_blank"
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-300 hover:bg-emerald-500/30 transition-colors"
                      >
                        <span>View Live Listing ↗</span>
                      </Link>
                    </div>
                  )}

                  {isSubmitted && (
                    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 flex flex-wrap items-center justify-between gap-3 text-xs text-amber-300">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">⏳</span>
                        <div>
                          <strong>In Review Queue:</strong> Your equipment listing is under active review by Cheesco operations. Verification includes machinery photo checks, ownership documentation review, and rate validation.
                        </div>
                      </div>
                      <Link
                        href={`/equipment/${eq.slug}`}
                        target="_blank"
                        className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-amber-500/20 px-3 py-1 text-xs font-bold text-amber-300 hover:bg-amber-500/30 transition-colors"
                      >
                        <span>Preview Details ↗</span>
                      </Link>
                    </div>
                  )}

                  {isNeedsInfo && (
                    <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 p-3.5">
                      <div className="flex items-start gap-2">
                        <span className="text-base text-orange-400">⚠️</span>
                        <div className="space-y-1">
                          <div className="text-xs font-bold text-orange-300 uppercase tracking-wide">
                            Admin Feedback & Instructions:
                          </div>
                          <div className="text-xs text-ink bg-canvas-deep/80 rounded-lg p-2.5 border border-orange-500/20">
                            {eq.adminFeedback?.notes ||
                              eq.specs?.notes ||
                              "Please provide clearer photos of machine serial plate and inspection certificate."}
                          </div>
                          <div className="text-[11px] text-orange-300/80">
                            Note received:{" "}
                            {eq.adminFeedback?.updatedAt
                              ? new Date(eq.adminFeedback.updatedAt).toLocaleString()
                              : "Recently"}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {isRejected && (
                    <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5">
                      <div className="flex items-start gap-2">
                        <span className="text-base text-rose-400">❌</span>
                        <div className="space-y-1">
                          <div className="text-xs font-bold text-rose-300 uppercase tracking-wide">
                            Admin Rejection Reason:
                          </div>
                          <div className="text-xs text-ink bg-canvas-deep/80 rounded-lg p-2.5 border border-rose-500/20">
                            {eq.adminFeedback?.notes ||
                              "Incomplete documentation or machinery does not meet platform safety requirements."}
                          </div>
                          <div className="text-[11px] text-rose-300/80">
                            Decision date:{" "}
                            {eq.adminFeedback?.updatedAt
                              ? new Date(eq.adminFeedback.updatedAt).toLocaleString()
                              : "Recently"}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Edit Rates or Quick Actions Row */}
                {editId === eq.id ? (
                  <div className="mt-4 flex flex-wrap items-end gap-3 rounded-xl border border-cheesco-yellow/30 bg-canvas-deep p-4">
                    <label className="block">
                      <span className="text-[11px] font-bold uppercase text-ink-faint">
                        Base Rental Rate (₦/day)
                      </span>
                      <input
                        value={baseRate}
                        onChange={(e) => setBaseRate(e.target.value.replace(/\D/g, ""))}
                        className="auth-input mt-1 !w-44"
                        inputMode="numeric"
                      />
                    </label>
                    <label className="block">
                      <span className="text-[11px] font-bold uppercase text-ink-faint">
                        Sale Price (₦, optional)
                      </span>
                      <input
                        value={salePrice}
                        onChange={(e) => setSalePrice(e.target.value.replace(/\D/g, ""))}
                        className="auth-input mt-1 !w-44"
                        inputMode="numeric"
                        placeholder="e.g. 85000000"
                      />
                    </label>
                    <button
                      type="button"
                      disabled={savingRate}
                      onClick={() => handleSaveRate(eq.id)}
                      className="rounded-xl bg-cheesco-yellow px-4 py-2.5 text-xs font-black text-[#0A0D14] hover:bg-cheesco-yellow-bright transition-all disabled:opacity-50"
                    >
                      {savingRate ? "Saving..." : "Save Rates"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditId(null)}
                      className="rounded-xl border border-line-soft px-4 py-2.5 text-xs font-bold text-ink-muted hover:text-ink transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(eq)}
                        className="rounded-xl border border-line-soft bg-canvas-deep px-3.5 py-1.5 text-xs font-bold text-ink-muted hover:border-cheesco-yellow hover:text-cheesco-yellow transition-all"
                      >
                        Edit Rates
                      </button>
                      <Link
                        href={`/merchant/listings/new`}
                        className="rounded-xl border border-line-soft bg-canvas-deep px-3.5 py-1.5 text-xs font-bold text-ink-muted hover:text-ink transition-all"
                      >
                        Duplicate / Relist
                      </Link>
                    </div>

                    <Link
                      href={`/equipment/${eq.slug}`}
                      className="text-xs font-bold text-cheesco-yellow hover:underline"
                    >
                      {isVerified ? "Open Marketplace View →" : "Preview Equipment Details →"}
                    </Link>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </DashboardShell>
  );
}
