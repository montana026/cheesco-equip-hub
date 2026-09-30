"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";
import type { Equipment } from "@/lib/types";
import { fmtNgnFull } from "@/lib/format";

/* ── 90-day availability strip (mock calendar; real engine lands in Phase 5) ── */
function AvailabilityStrip({ eq }: { eq: Equipment }) {
  const days = Array.from({ length: 90 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    // deterministic pseudo-blackouts so the strip looks alive
    const blocked = (i * 7 + eq.id.charCodeAt(eq.id.length - 1)) % 23 === 0;
    return { d, blocked };
  });
  const months: Record<string, boolean[]> = {};
  days.forEach(({ d, blocked }) => {
    const key = d.toLocaleString("en-NG", { month: "short", year: "numeric" });
    (months[key] ??= []).push(!blocked);
  });

  return (
    <div className="card-surface rounded-xl p-4">
      <div className="text-xs font-black tracking-[0.25em] text-cheesco-yellow">
        NEXT 90 DAYS
      </div>
      <div className="mt-3 space-y-2">
        {Object.entries(months).map(([month, free]) => (
          <div key={month} className="flex items-center gap-2">
            <span className="w-16 shrink-0 text-[11px] font-bold text-ink-muted">{month}</span>
            <div className="flex flex-1 gap-[2px]">
              {free.map((isFree, i) => (
                <div
                  key={i}
                  className={`h-3 flex-1 rounded-[2px] ${
                    isFree ? "bg-cheesco-yellow/70" : "bg-danger/70"
                  }`}
                  title={isFree ? "Available" : "Booked / maintenance"}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-4 text-[11px] text-ink-faint">
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-cheesco-yellow/70" /> Available</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-danger/70" /> Booked / blocked</span>
      </div>
    </div>
  );
}

export function EquipmentDetailClient({ eq }: { eq: Equipment }) {
  const router = useRouter();
  const [imgIdx, setImgIdx] = useState(0);
  const [days, setDays] = useState(7);

  const rate = eq.cheescoAdjustedRate ?? eq.merchantRentalRate;
  const estRental = rate * days;

  function goRequest(kind: "rent" | "buy") {
    router.push(`/request/${eq.slug}?kind=${kind}`);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 pb-20 pt-28 sm:px-6">
      {/* breadcrumbs */}
      <nav className="mb-4 flex items-center gap-2 text-xs text-ink-faint">
        <Link href="/browse" className="hover:text-cheesco-yellow">Browse</Link>
        <span>/</span>
        <Link href={`/browse?category=${eq.category}`} className="hover:text-cheesco-yellow">
          {eq.category}
        </Link>
        <span>/</span>
        <span className="text-ink-muted">{eq.name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
        {/* ── Gallery & description ── */}
        <div>
          <div className="relative overflow-hidden rounded-2xl border border-line-soft">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={eq.images[imgIdx]} alt={eq.name} className="aspect-[16/9] w-full object-cover" />
            {eq.promotionTier !== "NONE" && (
              <span className="absolute left-4 top-4 rounded-md bg-cheesco-yellow px-3 py-1 text-xs font-black text-canvas">
                PROMOTED BY CHEESCO
              </span>
            )}
          </div>
          <div className="mt-3 flex gap-3">
            {eq.images.map((src, i) => (
              <button
                key={i}
                onClick={() => setImgIdx(i)}
                className={`h-16 w-24 overflow-hidden rounded-lg border-2 transition-colors ${
                  i === imgIdx ? "border-cheesco-yellow" : "border-transparent opacity-60 hover:opacity-100"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>

          <h1 className="mt-6 text-3xl font-black tracking-tight">{eq.name}</h1>
          <p className="mt-3 leading-relaxed text-ink-muted">{eq.description}</p>

          {/* specs table */}
          <div className="card-surface mt-8 overflow-hidden rounded-xl">
            <div className="border-b border-line-soft px-5 py-3 text-xs font-black tracking-[0.25em] text-cheesco-yellow">
              TECHNICAL SPECS
            </div>
            <dl className="grid grid-cols-1 sm:grid-cols-2">
              {[
                ["Brand", eq.brand], ["Model", eq.model], ["Year", String(eq.year)],
                ["Condition", eq.condition.replace("_", " ")],
                ["Operating Hours", `${eq.operatingHours.toLocaleString()} hrs`],
                ["Location", `${eq.locationCity}, ${eq.locationState}`],
                ...Object.entries(eq.specs).filter(([, v]) => v).map(([k, v]) => [
                  k.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase()), v!,
                ] as [string, string]),
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between border-b border-line-soft px-5 py-3 text-sm">
                  <dt className="text-ink-faint">{k}</dt>
                  <dd className="font-semibold">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        {/* ── Booking / action rail ── */}
        <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="card-surface rounded-xl p-5"
          >
            {eq.listingType !== "FOR_SALE" && (
              <>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-cheesco-yellow">
                    ₦{fmtNgnFull(rate)}
                  </span>
                  <span className="text-sm text-ink-faint">/ day</span>
                </div>
                <div className="mt-1 text-xs text-ink-faint">
                  Cheesco-managed rate · merchant base ₦{fmtNgnFull(eq.merchantRentalRate)}
                </div>

                <div className="mt-4">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-ink-faint">
                    Estimated duration
                  </label>
                  <div className="mt-1.5 flex items-center gap-2">
                    <input
                      type="number" min={1} value={days}
                      onChange={(e) => setDays(Math.max(1, Number(e.target.value)))}
                      className="h-10 w-20 rounded-lg bg-canvas-deep px-3 text-sm outline-none ring-1 ring-line-soft focus:ring-cheesco-yellow/60"
                    />
                    <span className="text-sm text-ink-muted">days ≈ ₦{fmtNgnFull(estRental)}</span>
                  </div>
                  <p className="mt-1 text-[11px] text-ink-faint">
                    Estimate only — Cheesco operations issues the binding quotation.
                  </p>
                </div>
              </>
            )}

            {eq.salePrice && (
              <div className={eq.listingType === "FOR_SALE" ? "" : "mt-4 border-t border-line-soft pt-4"}>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-ink">₦{fmtNgnFull(eq.salePrice)}</span>
                  <span className="text-xs text-ink-faint">sale price</span>
                </div>
              </div>
            )}

            <div className="mt-5 space-y-2.5">
              {eq.listingType !== "FOR_SALE" && (
                <button
                  onClick={() => goRequest("rent")}
                  className="w-full rounded-xl bg-cheesco-yellow py-3 text-sm font-black text-canvas transition-transform hover:scale-[1.02] hover:bg-cheesco-yellow-bright"
                >
                  Request to Rent
                </button>
              )}
              {eq.salePrice && (
                <button
                  onClick={() => goRequest("buy")}
                  className="w-full rounded-xl border border-cheesco-yellow/50 py-3 text-sm font-black text-cheesco-yellow transition-colors hover:bg-cheesco-yellow/10"
                >
                  Request to Buy
                </button>
              )}
              <p className="pt-1 text-center text-[11px] text-ink-faint">
                No instant checkout — every request goes through Cheesco verification.
              </p>
            </div>
          </motion.div>

          <AvailabilityStrip eq={eq} />

          <div className="card-surface rounded-xl p-5 text-sm">
            <div className="text-xs font-black tracking-[0.25em] text-cheesco-yellow">
              SERVICE INCLUDES
            </div>
            <ul className="mt-3 space-y-2 text-ink-muted">
              {[
                [eq.isOperatorIncluded, "Certified operator available"],
                [eq.isDeliveryAvailable, "Lowbed delivery & recovery"],
                [true, "Pre & post-rental inspection"],
                [true, "Deposit held in Cheesco escrow"],
              ].map(([ok, label]) => (
                <li key={label as string} className="flex items-center gap-2">
                  <span className={ok ? "text-success" : "text-ink-faint"}>
                    {ok ? "✓" : "—"}
                  </span>
                  <span className={ok ? "" : "opacity-50"}>{label as string}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
