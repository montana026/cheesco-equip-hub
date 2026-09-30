"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSession, guardRoute } from "@/lib/auth";
import type { SessionUser } from "@/lib/auth";
import { DashboardShell } from "@/components/dashboard-shell";
import { AD_PACKAGES, EQUIPMENT } from "@/lib/seed";
import { fmtNgnFull } from "@/lib/format";
import type { AdPackageType } from "@/lib/types";

const NAV = [
  { href: "/merchant/dashboard", label: "Overview" },
  { href: "/merchant/listings", label: "My Listings" },
  { href: "/merchant/ads", label: "Ad Campaigns" },
  { href: "/merchant/earnings", label: "Earnings" },
  { href: "/merchant/verification", label: "Verification (KYC)" },
];

type Step = "select-equipment" | "select-package" | "confirm" | "done";

export default function MerchantAdsPage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [step, setStep] = useState<Step>("select-equipment");
  const [eqId, setEqId] = useState("");
  const [pkg, setPkg] = useState<AdPackageType | "">("");

  useEffect(() => {
    const s = getSession();
    const redirect = guardRoute("MERCHANT", s);
    if (redirect) { router.replace(redirect); return; }
    setUser(s);
  }, [router]);

  if (!user) return <div className="min-h-screen bg-canvas" />;

  const myListings = EQUIPMENT.filter((e) => e.merchantId === "mrc-1");
  const activeAds = myListings.filter((e) => e.promotionTier !== "NONE");
  const selectedEq = myListings.find((e) => e.id === eqId);
  const selectedPkg = AD_PACKAGES.find((p) => p.type === pkg);

  function handleConfirm() {
    setStep("done");
  }

  return (
    <DashboardShell user={user} nav={NAV} title="Ad Campaign Manager">
      {/* Existing campaigns */}
      <div className="mb-8">
        <h2 className="text-lg font-black">Active Campaigns</h2>
        {activeAds.length === 0 ? (
          <p className="mt-2 text-sm text-ink-muted">No active campaigns yet.</p>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {activeAds.map((eq) => (
              <div key={eq.id} className="card-surface rounded-xl p-5">
                <div className="font-bold">{eq.name}</div>
                <span className="mt-1 inline-block rounded bg-cheesco-yellow/20 px-2 py-0.5 text-[10px] font-bold text-cheesco-yellow">
                  {eq.promotionTier.replace(/_/g, " ")}
                </span>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-lg font-black">{eq.adsMetrics?.impressions.toLocaleString()}</div>
                    <div className="text-[10px] text-ink-faint">Impressions</div>
                  </div>
                  <div>
                    <div className="text-lg font-black">{eq.adsMetrics?.clicks.toLocaleString()}</div>
                    <div className="text-[10px] text-ink-faint">Clicks</div>
                  </div>
                  <div>
                    <div className="text-lg font-black text-cheesco-yellow">{eq.adsMetrics?.enquiries}</div>
                    <div className="text-[10px] text-ink-faint">Enquiries</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="hazard-bar h-1 w-full rounded-full" />

      {/* New campaign wizard */}
      <div className="mt-8">
        <h2 className="text-lg font-black">Launch New Campaign</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Choose equipment → Select a promotional package → Pay → Go live.
        </p>

        {step === "done" ? (
          <div className="card-surface mt-6 rounded-xl p-8 text-center">
            <div className="text-4xl">🚀</div>
            <div className="mt-3 text-xl font-black text-cheesco-yellow">Campaign Activated!</div>
            <p className="mt-2 text-sm text-ink-muted">
              Your {selectedPkg?.label} for <strong>{selectedEq?.name}</strong> is now live.
              Performance tracking starts immediately.
            </p>
            <button
              onClick={() => { setStep("select-equipment"); setEqId(""); setPkg(""); }}
              className="mt-6 rounded-xl bg-cheesco-yellow px-6 py-3 text-sm font-black text-canvas"
            >
              Launch Another Campaign
            </button>
          </div>
        ) : (
          <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
            {/* Step 1: Equipment */}
            <div className="card-surface rounded-xl p-5">
              <StepBadge n={1} active={step === "select-equipment"} done={!!eqId} />
              <div className="mt-2 font-bold">Select Equipment</div>
              <div className="mt-3 space-y-2">
                {myListings.map((eq) => (
                  <button
                    key={eq.id}
                    onClick={() => { setEqId(eq.id); setStep("select-package"); }}
                    className={`flex w-full items-center justify-between rounded-lg px-4 py-3 text-left text-sm transition-all ${
                      eqId === eq.id
                        ? "border border-cheesco-yellow bg-cheesco-yellow/10 font-bold text-cheesco-yellow"
                        : "bg-canvas-deep text-ink-muted hover:bg-card-raised"
                    }`}
                  >
                    <span>{eq.name}</span>
                    <span className="text-xs text-ink-faint">{eq.category}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: Package */}
            <div>
              <div className="card-surface rounded-xl p-5">
                <StepBadge n={2} active={step === "select-package"} done={!!pkg} />
                <div className="mt-2 font-bold">Select Package</div>
                <div className="mt-3 space-y-3">
                  {AD_PACKAGES.map((p) => (
                    <button
                      key={p.type}
                      disabled={!eqId}
                      onClick={() => { setPkg(p.type); setStep("confirm"); }}
                      className={`w-full rounded-lg border p-4 text-left transition-all ${
                        pkg === p.type
                          ? "border-cheesco-yellow bg-cheesco-yellow/10"
                          : "border-line-soft bg-canvas-deep hover:border-cheesco-yellow/30"
                      } disabled:opacity-40`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold">{p.label}</span>
                        <span className="text-sm font-black text-cheesco-yellow">
                          ₦{fmtNgnFull(p.priceNgn)}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-ink-muted">{p.description}</div>
                      <div className="mt-1 text-[10px] text-ink-faint">Duration: {p.durationDays} days</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 3: Confirm */}
              {step === "confirm" && selectedEq && selectedPkg && (
                <div className="card-surface mt-4 rounded-xl p-5">
                  <StepBadge n={3} active />
                  <div className="mt-2 font-bold">Confirm & Pay</div>
                  <div className="mt-3 space-y-2 text-sm text-ink-muted">
                    <div className="flex justify-between">
                      <span>Equipment</span>
                      <span className="font-semibold text-ink">{selectedEq.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Package</span>
                      <span className="font-semibold text-ink">{selectedPkg.label}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Duration</span>
                      <span className="font-semibold text-ink">{selectedPkg.durationDays} days</span>
                    </div>
                    <div className="flex justify-between border-t border-line-soft pt-2">
                      <span className="font-bold text-ink">Total</span>
                      <span className="text-lg font-black text-cheesco-yellow">
                        ₦{fmtNgnFull(selectedPkg.priceNgn)}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={handleConfirm}
                    className="mt-5 w-full rounded-xl bg-cheesco-yellow py-3 text-sm font-black text-canvas transition-transform hover:scale-[1.01]"
                  >
                    Pay & Activate Campaign
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}

function StepBadge({ n, active, done }: { n: number; active?: boolean; done?: boolean }) {
  return (
    <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-black ${
      done
        ? "bg-success/20 text-success"
        : active
        ? "bg-cheesco-yellow text-canvas"
        : "bg-canvas-deep text-ink-faint ring-1 ring-line-soft"
    }`}>
      {done ? "✓" : n}
    </span>
  );
}
