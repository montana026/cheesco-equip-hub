"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { SessionUser } from "@/lib/auth";
import { useAuthGuard } from "@/lib/hooks/use-auth-guard";
import { DashboardShell } from "@/components/dashboard-shell";
import { AD_PACKAGES } from "@/lib/seed";
import { fmtNgnFull } from "@/lib/format";
import { apiFetch } from "@/lib/api-client";
import type { AdPackageType } from "@/lib/types";
import toast from "react-hot-toast";
import Link from "next/link";

const NAV = [
  { href: "/merchant/dashboard", label: "Overview" },
  { href: "/merchant/listings", label: "My Listings" },
  { href: "/merchant/ads", label: "Ad Campaigns" },
  { href: "/merchant/earnings", label: "Earnings & Payouts" },
  { href: "/merchant/verification", label: "Verification (KYC)" },
];

interface MerchantEquipmentOption {
  id: string;
  name: string;
  slug: string;
  category: string;
  brand: string;
  model: string;
  locationCity: string;
  locationState: string;
  verificationStatus: string;
  availabilityStatus: string;
  promotionTier: string;
  promotionExpiresAt?: string;
  primaryImage: string;
}

interface AdCampaignItem {
  id: string;
  merchant_id: string;
  equipment_id: string;
  package_type: AdPackageType;
  amount_paid: number;
  duration_days: number;
  start_date: string;
  end_date: string;
  status: "ACTIVE" | "PENDING_APPROVAL" | "EXPIRED" | "PAUSED" | "CANCELLED";
  impressions_count: number;
  clicks_count: number;
  enquiries_count: number;
  payment_reference: string;
  created_at: string;
  equipment?: {
    id: string;
    name: string;
    slug: string;
    category: string;
    location_city: string;
    location_state: string;
    images?: Array<{ image_url: string; is_primary: boolean }>;
  };
}

type Step = "select-equipment" | "select-package" | "confirm" | "done";
type PaymentProvider = "paystack" | "flutterwave" | "demo";

function MerchantAdsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { user, ready } = useAuthGuard("MERCHANT");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Data loaded from API
  const [campaigns, setCampaigns] = useState<AdCampaignItem[]>([]);
  const [equipmentList, setEquipmentList] = useState<MerchantEquipmentOption[]>([]);

  // Wizard state
  const [step, setStep] = useState<Step>("select-equipment");
  const [eqId, setEqId] = useState("");
  const [pkg, setPkg] = useState<AdPackageType | "">("");
  const [provider, setProvider] = useState<PaymentProvider>("paystack");
  const [justActivated, setJustActivated] = useState<string | null>(null);

  // Auth check — handled by useAuthGuard; load data once ready

  // Fetch campaigns and real equipment
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/merchant/ads");
      const json = await res.json();
      if (json.success && json.data) {
        setCampaigns(json.data.campaigns || []);
        setEquipmentList(json.data.equipment || []);
      }
    } catch (err) {
      console.error("Failed to load merchant ads data:", err);
      toast.error("Could not fetch ad campaigns. Please refresh.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle returning from Paystack / Flutterwave callback
  useEffect(() => {
    const isActivated = searchParams.get("activated");
    const ref = searchParams.get("ref") || searchParams.get("reference");

    if (isActivated === "true" && ref) {
      const activateOnReturn = async () => {
        try {
          const res = await apiFetch("/api/merchant/ads/activate", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ reference: ref }),
          });
          const json = await res.json();
          if (json.success) {
            toast.success("🎉 Ad campaign activated! Your equipment is now boosted on the marketplace.");
            setJustActivated(ref);
            loadData();
          }
        } catch (e) {
          console.warn("Auto-activation error on return:", e);
        }
      };
      activateOnReturn();
    }
  }, [searchParams, loadData]);

  useEffect(() => {
    if (ready && user) {
      loadData();
    }
  }, [ready, user, loadData]);

  if (!ready || !user) return <div className="min-h-screen bg-canvas" />;

  const selectedEq = equipmentList.find((e) => e.id === eqId);
  const selectedPkg = AD_PACKAGES.find((p) => p.type === pkg);
  const activeCampaigns = campaigns.filter((c) => c.status === "ACTIVE");
  const pastCampaigns = campaigns.filter((c) => c.status !== "ACTIVE");

  async function handleLaunchCampaign() {
    if (!eqId || !pkg) {
      toast.error("Please select an equipment listing and promotional package");
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiFetch("/api/merchant/ads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          equipmentId: eqId,
          packageType: pkg,
          provider,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to initialize campaign");
      }

      // If demo or instant redirect
      if (json.data?.isDemo || provider === "demo") {
        toast.success("🚀 Campaign activated in demo mode!");
        setStep("done");
        loadData();
        return;
      }

      if (json.data?.checkoutUrl) {
        if (json.data.checkoutUrl.startsWith("http")) {
          toast.loading("Redirecting to secure payment checkout...");
          window.location.href = json.data.checkoutUrl;
        } else {
          // Local verification redirect
          router.push(json.data.checkoutUrl);
        }
      } else {
        setStep("done");
        loadData();
      }
    } catch (err: any) {
      console.error("Campaign launch error:", err);
      toast.error(err.message || "Failed to start campaign");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DashboardShell user={user} nav={NAV} title="Ad Campaign Manager">
      {/* ── Active Campaigns ────────────────────────────────────────── */}
      <div className="mb-10">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-ink">Active Promotional Campaigns</h2>
            <p className="mt-1 text-xs text-ink-muted">
              Live marketplace promotions prioritized across search, categories, and homepage showcases.
            </p>
          </div>
          <button
            onClick={loadData}
            disabled={loading}
            className="rounded-lg border border-line-soft bg-card px-3 py-1.5 text-xs font-bold text-ink hover:text-cheesco-yellow transition-colors"
          >
            {loading ? "Refreshing..." : "↻ Refresh"}
          </button>
        </div>

        {loading ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[1, 2].map((i) => (
              <div key={i} className="card-surface h-36 animate-pulse rounded-xl p-5" />
            ))}
          </div>
        ) : activeCampaigns.length === 0 ? (
          <div className="card-surface mt-4 rounded-xl border border-line-soft p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-cheesco-yellow/10 text-cheesco-yellow text-xl">
              📢
            </div>
            <h3 className="mt-3 text-base font-bold text-ink">No Active Ad Campaigns</h3>
            <p className="mt-1 text-xs text-ink-muted max-w-md mx-auto">
              Promote your heavy equipment to get up to 5x more enquiries, top search rankings, and spotlight features on the homepage.
            </p>
            <button
              onClick={() => {
                const el = document.getElementById("launch-wizard");
                el?.scrollIntoView({ behavior: "smooth" });
              }}
              className="mt-4 rounded-xl bg-cheesco-yellow px-5 py-2.5 text-xs font-black text-[#0A0D14] hover:bg-cheesco-yellow-bright transition-all"
            >
              Launch Your First Campaign
            </button>
          </div>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {activeCampaigns.map((camp) => {
              const eq = camp.equipment;
              const pkgDef = AD_PACKAGES.find((p) => p.type === camp.package_type);
              const imgUrl =
                eq?.images?.find((i) => i.is_primary)?.image_url ||
                eq?.images?.[0]?.image_url ||
                "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=400&q=70";

              return (
                <div key={camp.id} className="card-surface flex flex-col justify-between rounded-xl border border-cheesco-yellow/30 p-5 shadow-lg">
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={imgUrl} alt={eq?.name || "Equipment"} className="h-12 w-12 rounded-lg object-cover border border-line-soft" />
                        <div>
                          <div className="font-bold text-sm text-ink line-clamp-1">{eq?.name || "Equipment Listing"}</div>
                          <div className="text-[11px] text-ink-muted">{eq?.category} • {eq?.location_state}</div>
                        </div>
                      </div>
                      <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-black uppercase text-emerald-400">
                        Active
                      </span>
                    </div>

                    <div className="mt-3 flex items-center justify-between border-t border-line-soft pt-3 text-xs">
                      <span className="inline-block rounded bg-cheesco-yellow/20 px-2 py-0.5 text-[11px] font-bold text-cheesco-yellow">
                        {pkgDef?.label || camp.package_type}
                      </span>
                      <span className="text-[11px] text-ink-faint">
                        Ends: {camp.end_date}
                      </span>
                    </div>

                    {/* Live Telemetry Metrics */}
                    <div className="mt-4 grid grid-cols-3 gap-2 rounded-lg bg-canvas-deep p-3 text-center">
                      <div>
                        <div className="text-lg font-black text-ink">{camp.impressions_count.toLocaleString()}</div>
                        <div className="text-[10px] uppercase font-bold text-ink-faint tracking-wider">Impressions</div>
                      </div>
                      <div>
                        <div className="text-lg font-black text-ink">{camp.clicks_count.toLocaleString()}</div>
                        <div className="text-[10px] uppercase font-bold text-ink-faint tracking-wider">Clicks</div>
                      </div>
                      <div>
                        <div className="text-lg font-black text-cheesco-yellow">{camp.enquiries_count.toLocaleString()}</div>
                        <div className="text-[10px] uppercase font-bold text-ink-faint tracking-wider">Enquiries</div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-line-soft flex items-center justify-between text-xs">
                    <span className="text-ink-muted text-[11px]">Paid: ₦{fmtNgnFull(camp.amount_paid)}</span>
                    {eq?.slug && (
                      <Link
                        href={`/equipment/${eq.slug}`}
                        target="_blank"
                        className="font-bold text-cheesco-yellow hover:underline flex items-center gap-1"
                      >
                        <span>View Live</span>
                        <span>↗</span>
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="hazard-bar h-1 w-full rounded-full" />

      {/* ── New Campaign Wizard ─────────────────────────────────────── */}
      <div id="launch-wizard" className="mt-10 scroll-mt-20">
        <h2 className="text-xl font-black text-ink">Launch New Ad Campaign</h2>
        <p className="mt-1 text-xs sm:text-sm text-ink-muted">
          Select machinery from your fleet → Choose promotional package → Complete payment → Instant marketplace boost.
        </p>

        {step === "done" ? (
          <div className="card-surface mt-6 rounded-2xl border border-cheesco-yellow/40 p-8 sm:p-12 text-center animate-in fade-in">
            <div className="text-5xl">🚀</div>
            <div className="mt-4 text-2xl font-black text-cheesco-yellow">Campaign Activated!</div>
            <p className="mt-2 text-sm text-ink-muted max-w-lg mx-auto">
              Your promotional package for <strong>{selectedEq?.name || "your listing"}</strong> is now active.
              Your machinery is now boosted at the top of category searches and promotional grids.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                onClick={() => {
                  setStep("select-equipment");
                  setEqId("");
                  setPkg("");
                }}
                className="rounded-xl bg-cheesco-yellow px-6 py-3 text-xs sm:text-sm font-black text-[#0A0D14] hover:bg-cheesco-yellow-bright transition-all"
              >
                Launch Another Campaign
              </button>
              {selectedEq?.slug && (
                <Link
                  href={`/equipment/${selectedEq.slug}`}
                  target="_blank"
                  className="rounded-xl border border-line-soft bg-card px-6 py-3 text-xs sm:text-sm font-bold text-ink hover:border-zinc-500 transition-all"
                >
                  View Promoted Listing
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
            {/* Step 1: Equipment Selection */}
            <div className="card-surface rounded-2xl border border-line-soft p-5 sm:p-6">
              <div className="flex items-center gap-2">
                <StepBadge n={1} active={step === "select-equipment"} done={!!eqId} />
                <h3 className="font-bold text-base text-ink">Select Equipment to Promote</h3>
              </div>
              <p className="mt-1 text-xs text-ink-muted">
                Choose an item from your verified fleet listings.
              </p>

              {equipmentList.length === 0 ? (
                <div className="mt-6 rounded-xl border border-dashed border-line-soft p-6 text-center">
                  <p className="text-xs text-ink-muted">No equipment listings found in your fleet.</p>
                  <Link
                    href="/merchant/listings/new"
                    className="mt-3 inline-block rounded-lg bg-cheesco-yellow px-4 py-2 text-xs font-bold text-[#0A0D14]"
                  >
                    + Add New Listing First
                  </Link>
                </div>
              ) : (
                <div className="mt-4 space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
                  {equipmentList.map((eq) => {
                    const isSelected = eqId === eq.id;
                    const isAlreadyPromoted = eq.promotionTier && eq.promotionTier !== "NONE";

                    return (
                      <button
                        key={eq.id}
                        type="button"
                        onClick={() => {
                          setEqId(eq.id);
                          if (step === "select-equipment") setStep("select-package");
                        }}
                        className={`flex w-full items-center justify-between gap-3 rounded-xl p-3 text-left transition-all border ${
                          isSelected
                            ? "border-cheesco-yellow bg-cheesco-yellow/10 font-bold"
                            : "border-line-soft bg-canvas-deep hover:bg-card hover:border-zinc-600"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={eq.primaryImage}
                            alt={eq.name}
                            className="h-12 w-12 shrink-0 rounded-lg object-cover border border-line-soft"
                          />
                          <div className="truncate">
                            <div className="text-sm font-bold text-ink truncate">{eq.name}</div>
                            <div className="text-[11px] text-ink-muted truncate">
                              {eq.category} • {eq.locationCity}, {eq.locationState}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {isAlreadyPromoted && (
                            <span className="rounded bg-cheesco-yellow/20 px-2 py-0.5 text-[9px] font-black uppercase text-cheesco-yellow">
                              Boosted
                            </span>
                          )}
                          <span className={`text-xs font-black ${isSelected ? "text-cheesco-yellow" : "text-ink-faint"}`}>
                            {isSelected ? "Selected ✓" : "Select"}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Step 2 & 3: Package Selection & Checkout */}
            <div className="space-y-6">
              {/* Step 2: Package */}
              <div className="card-surface rounded-2xl border border-line-soft p-5 sm:p-6">
                <div className="flex items-center gap-2">
                  <StepBadge n={2} active={step === "select-package"} done={!!pkg} />
                  <h3 className="font-bold text-base text-ink">Select Promotional Package</h3>
                </div>
                <p className="mt-1 text-xs text-ink-muted">
                  Choose your preferred placement tier and duration.
                </p>

                <div className="mt-4 space-y-3">
                  {AD_PACKAGES.map((p) => {
                    const isSelected = pkg === p.type;
                    return (
                      <button
                        key={p.type}
                        type="button"
                        disabled={!eqId}
                        onClick={() => {
                          setPkg(p.type);
                          setStep("confirm");
                        }}
                        className={`w-full rounded-xl border p-4 text-left transition-all ${
                          isSelected
                            ? "border-cheesco-yellow bg-cheesco-yellow/10 ring-1 ring-cheesco-yellow"
                            : "border-line-soft bg-canvas-deep hover:border-cheesco-yellow/40 hover:bg-card"
                        } disabled:opacity-40 disabled:cursor-not-allowed`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-bold text-sm text-ink">{p.label}</span>
                          <span className="text-base font-black text-cheesco-yellow shrink-0">
                            ₦{fmtNgnFull(p.priceNgn)}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-ink-muted leading-relaxed">{p.description}</p>
                        <div className="mt-2 flex items-center gap-3 text-[11px] font-semibold text-ink-faint">
                          <span>⏱️ {p.durationDays} Days Duration</span>
                          <span>•</span>
                          <span>Priority Placement</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 3: Confirmation & Payment */}
              {step === "confirm" && selectedEq && selectedPkg && (
                <div className="card-surface rounded-2xl border border-cheesco-yellow/50 p-5 sm:p-6 shadow-xl animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <StepBadge n={3} active done={false} />
                    <h3 className="font-bold text-base text-ink">Payment & Launch</h3>
                  </div>

                  <div className="mt-4 space-y-2.5 rounded-xl bg-canvas-deep p-4 text-xs">
                    <div className="flex justify-between">
                      <span className="text-ink-muted">Selected Equipment:</span>
                      <span className="font-bold text-ink">{selectedEq.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-muted">Promotion Package:</span>
                      <span className="font-bold text-ink">{selectedPkg.label}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-muted">Active Duration:</span>
                      <span className="font-bold text-ink">{selectedPkg.durationDays} Days</span>
                    </div>
                    <div className="border-t border-line-soft pt-2.5 flex justify-between items-baseline">
                      <span className="font-black text-sm text-ink">Total Investment:</span>
                      <span className="text-xl font-black text-cheesco-yellow">
                        ₦{fmtNgnFull(selectedPkg.priceNgn)}
                      </span>
                    </div>
                  </div>

                  {/* Payment Provider Selector */}
                  <div className="mt-4">
                    <label className="text-xs font-bold text-ink block mb-2">Select Payment Method:</label>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => setProvider("paystack")}
                        className={`rounded-xl border p-2.5 text-center font-bold transition-all ${
                          provider === "paystack"
                            ? "border-cheesco-yellow bg-cheesco-yellow/15 text-cheesco-yellow"
                            : "border-line-soft bg-canvas-deep text-ink-muted hover:bg-card"
                        }`}
                      >
                        💳 Paystack
                      </button>
                      <button
                        type="button"
                        onClick={() => setProvider("demo")}
                        className={`rounded-xl border p-2.5 text-center font-bold transition-all ${
                          provider === "demo"
                            ? "border-emerald-500 bg-emerald-500/15 text-emerald-400"
                            : "border-line-soft bg-canvas-deep text-ink-muted hover:bg-card"
                        }`}
                      >
                        ⚡ Instant Test (Demo)
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleLaunchCampaign}
                    className="mt-5 w-full rounded-xl bg-cheesco-yellow py-3.5 text-xs sm:text-sm font-black text-[#0A0D14] shadow-lg hover:bg-cheesco-yellow-bright hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50"
                  >
                    {submitting ? "Processing Payment..." : `Pay ₦${fmtNgnFull(selectedPkg.priceNgn)} & Activate Campaign`}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Campaign History ────────────────────────────────────────── */}
      {pastCampaigns.length > 0 && (
        <div className="mt-12">
          <h3 className="text-base font-bold text-ink">Past & Completed Campaigns</h3>
          <div className="mt-3 overflow-x-auto rounded-xl border border-line-soft">
            <table className="w-full text-left text-xs">
              <thead className="bg-canvas-deep text-[11px] uppercase tracking-wider text-ink-muted border-b border-line-soft">
                <tr>
                  <th className="p-3">Equipment</th>
                  <th className="p-3">Package</th>
                  <th className="p-3">Duration</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Impressions</th>
                  <th className="p-3">Clicks</th>
                  <th className="p-3">Enquiries</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-soft text-ink-muted">
                {pastCampaigns.map((c) => (
                  <tr key={c.id}>
                    <td className="p-3 font-semibold text-ink">{c.equipment?.name || "Equipment"}</td>
                    <td className="p-3">{c.package_type.replace(/_/g, " ")}</td>
                    <td className="p-3">{c.start_date} → {c.end_date}</td>
                    <td className="p-3">
                      <span className="rounded bg-zinc-800 px-2 py-0.5 text-[10px] font-bold text-zinc-400">
                        {c.status}
                      </span>
                    </td>
                    <td className="p-3">{c.impressions_count}</td>
                    <td className="p-3">{c.clicks_count}</td>
                    <td className="p-3 font-bold text-cheesco-yellow">{c.enquiries_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}

function StepBadge({ n, active, done }: { n: number; active?: boolean; done?: boolean }) {
  return (
    <span
      className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-black ${
        done
          ? "bg-emerald-500 text-black"
          : active
          ? "bg-cheesco-yellow text-[#0A0D14]"
          : "bg-canvas-deep text-ink-faint ring-1 ring-line-soft"
      }`}
    >
      {done ? "✓" : n}
    </span>
  );
}

export default function MerchantAdsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-canvas" />}>
      <MerchantAdsContent />
    </Suspense>
  );
}
