"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSession, guardRoute } from "@/lib/auth";
import type { SessionUser } from "@/lib/auth";
import { DashboardShell } from "@/components/dashboard-shell";
import { EQUIPMENT } from "@/lib/seed";
import { fmtNgnFull } from "@/lib/format";
import type { Equipment } from "@/lib/types";

const NAV = [
  { href: "/merchant/dashboard", label: "Overview" },
  { href: "/merchant/listings", label: "My Listings" },
  { href: "/merchant/ads", label: "Ad Campaigns" },
  { href: "/merchant/earnings", label: "Earnings" },
  { href: "/merchant/verification", label: "Verification (KYC)" },
];

export default function MerchantListingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [baseRate, setBaseRate] = useState("");
  const [salePrice, setSalePrice] = useState("");

  useEffect(() => {
    const s = getSession();
    const redirect = guardRoute("MERCHANT", s);
    if (redirect) { router.replace(redirect); return; }
    setUser(s);
  }, [router]);

  if (!user) return <div className="min-h-screen bg-canvas" />;

  const myListings = EQUIPMENT.filter((e) => e.merchantId === "mrc-1");

  function startEdit(eq: Equipment) {
    setEditId(eq.id);
    setBaseRate(String(eq.merchantRentalRate));
    setSalePrice(eq.salePrice ? String(eq.salePrice) : "");
  }

  return (
    <DashboardShell user={user} nav={NAV} title="Equipment Listings">
      <div className="flex items-end justify-between">
        <p className="text-sm text-ink-muted">
          {myListings.length} units listed · set your base rates, Cheesco applies the managed margin.
        </p>
        <button className="rounded-lg bg-cheesco-yellow px-4 py-2 text-xs font-black text-canvas hover:bg-cheesco-yellow-bright">
          + Add Equipment
        </button>
      </div>

      <div className="mt-6 space-y-4">
        {myListings.map((eq) => (
          <div key={eq.id} className="card-surface rounded-xl p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={eq.images[0]}
                  alt={eq.name}
                  className="h-20 w-28 shrink-0 rounded-lg object-cover"
                />
                <div>
                  <div className="font-bold">{eq.name}</div>
                  <div className="mt-0.5 text-xs text-ink-faint">
                    {eq.category} · {eq.brand} {eq.model} · {eq.year}
                  </div>
                  <div className="mt-1 text-xs text-ink-muted">
                    {eq.locationCity}, {eq.locationState} · {eq.operatingHours.toLocaleString()} hrs
                  </div>
                  <div className="mt-2 flex gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      eq.availabilityStatus === "AVAILABLE"
                        ? "bg-success/20 text-success"
                        : "bg-warn/20 text-warn"
                    }`}>
                      {eq.availabilityStatus}
                    </span>
                    <span className="rounded-full bg-card-raised px-2 py-0.5 text-[10px] font-bold text-ink-muted">
                      {eq.listingType.replace(/_/g, " ")}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      eq.verificationStatus === "VERIFIED"
                        ? "bg-success/20 text-success"
                        : "bg-warn/20 text-warn"
                    }`}>
                      {eq.verificationStatus}
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-ink-faint">Your base rate</div>
                <div className="font-black">₦{fmtNgnFull(eq.merchantRentalRate)}/day</div>
                <div className="text-xs text-ink-faint">
                  Cheesco rate: ₦{fmtNgnFull(eq.cheescoAdjustedRate ?? eq.merchantRentalRate)}/day
                </div>
                {eq.salePrice && (
                  <div className="mt-1 text-xs text-ink-muted">
                    Sale: ₦{fmtNgnFull(eq.salePrice)}
                  </div>
                )}
              </div>
            </div>

            {editId === eq.id ? (
              <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-line-soft pt-4">
                <label className="block">
                  <span className="text-[11px] font-bold uppercase text-ink-faint">Base Rental Rate (₦/day)</span>
                  <input
                    value={baseRate} onChange={(e) => setBaseRate(e.target.value.replace(/\D/g, ""))}
                    className="auth-input mt-1 !w-40" inputMode="numeric"
                  />
                </label>
                <label className="block">
                  <span className="text-[11px] font-bold uppercase text-ink-faint">Sale Price (₦, optional)</span>
                  <input
                    value={salePrice} onChange={(e) => setSalePrice(e.target.value.replace(/\D/g, ""))}
                    className="auth-input mt-1 !w-40" inputMode="numeric"
                  />
                </label>
                <button
                  onClick={() => setEditId(null)}
                  className="rounded-lg bg-cheesco-yellow px-4 py-2.5 text-xs font-black text-canvas"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditId(null)}
                  className="rounded-lg border border-line-soft px-4 py-2.5 text-xs font-bold text-ink-muted"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => startEdit(eq)}
                  className="rounded-lg border border-line-soft px-3 py-1.5 text-xs font-bold text-ink-muted hover:text-cheesco-yellow"
                >
                  Edit Rates
                </button>
                <button className="rounded-lg border border-line-soft px-3 py-1.5 text-xs font-bold text-ink-muted hover:text-cheesco-yellow">
                  Upload Docs
                </button>
                <button className="rounded-lg border border-line-soft px-3 py-1.5 text-xs font-bold text-ink-muted hover:text-cheesco-yellow">
                  Availability
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </DashboardShell>
  );
}
