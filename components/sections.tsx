"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { CATEGORY_META } from "@/lib/seed";
import type { Equipment } from "@/lib/types";
import { fmtNgn } from "@/lib/format";

export function TrustBar() {
  const items = [
    "Cheesco-Verified Merchants",
    "Deposit Held in Escrow",
    "Pre-Delivery Inspection",
    "Post-Rental Settlement",
  ];
  return (
    <div className="border-y border-line-soft bg-canvas-deep">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-10 gap-y-2 px-4 py-3 sm:px-6">
        {items.map((t) => (
          <span key={t} className="flex items-center gap-2 text-xs font-semibold tracking-wide text-ink-muted">
            <span className="text-cheesco-yellow">✓</span> {t}
          </span>
        ))}
      </div>
    </div>
  );
}

export function CategoryCards() {
  const cats = Object.entries(CATEGORY_META);
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      <SectionHeading eyebrow="Fleet Coverage" title="Every class of heavy plant" />
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {cats.map(([name, meta], i) => (
          <motion.div
            key={name}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ delay: i * 0.05, duration: 0.5 }}
          >
            <Link
              href={`/browse?category=${encodeURIComponent(name)}`}
              className="card-surface group block rounded-xl p-4 transition-all hover:border-cheesco-yellow/40 hover:bg-card-raised"
            >
              <div className="text-2xl">{meta.icon}</div>
              <div className="mt-2 font-bold group-hover:text-cheesco-yellow">{name}</div>
              <div className="mt-1 text-xs text-ink-faint">{meta.blurb}</div>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function PromotedBadge({ tier }: { tier: Equipment["promotionTier"] }) {
  if (tier === "NONE") return null;
  return (
    <span className="absolute left-3 top-3 z-10 rounded-md bg-cheesco-yellow px-2 py-1 text-[10px] font-black tracking-wider text-canvas shadow">
      PROMOTED BY CHEESCO
    </span>
  );
}

export function EquipmentCard({ eq }: { eq: Equipment }) {
  // images can be string[] (normalized) or object[] (raw Supabase join)
  const imgSrc: string =
    typeof eq.images?.[0] === "string"
      ? (eq.images[0] as string)
      : ((eq.images?.[0] as any)?.image_url ?? "");

  return (
    <Link
      href={`/equipment/${eq.slug}`}
      className="card-surface group relative flex flex-col overflow-hidden rounded-xl transition-all hover:border-cheesco-yellow/40 hover:shadow-[0_16px_48px_rgba(0,0,0,0.5)]"
    >
      <PromotedBadge tier={eq.promotionTier} />
      <div className="relative h-44 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imgSrc}
          alt={eq.name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-canvas/70 to-transparent" />
        <span className="absolute bottom-2 left-3 rounded bg-canvas/80 px-2 py-0.5 text-[10px] font-bold tracking-wider text-cheesco-yellow">
          {eq.category.toUpperCase()}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="font-bold leading-snug group-hover:text-cheesco-yellow">{eq.name}</div>
        <div className="mt-1 text-xs text-ink-faint">
          {eq.locationCity}, {eq.locationState} · {eq.year} · {eq.operatingHours.toLocaleString()} hrs
        </div>
        <div className="mt-auto pt-3">
          {eq.listingType !== "FOR_SALE" && (
            <div className="text-sm">
              <span className="font-black text-cheesco-yellow">
                ₦{fmtNgn(eq.cheescoAdjustedRate ?? eq.merchantRentalRate)}
              </span>
              <span className="text-ink-faint"> /day · managed rental</span>
            </div>
          )}
          {eq.salePrice && (
            <div className="text-xs text-ink-muted">
              Buy: ₦{fmtNgn(eq.salePrice)}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}


export function SponsoredShowcase() {
  const [items, setItems] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/equipment?limit=8")
      .then((r) => r.json())
      .then((json) => {
        const raw: any[] = json.data ?? [];
        // Normalize and sort by promotionTier
        const PROMO_ORDER: Record<string, number> = {
          HOMEPAGE_HERO_SPOTLIGHT: 0,
          HOMEPAGE_FEATURED_GRID: 1,
          CATEGORY_TOP_BOOST: 2,
          SEARCH_FIRST_PAGE: 3,
          NONE: 9,
        };
        const normalized = raw.map((r) => ({
          ...r,
          // map snake_case fields the card needs
          locationCity: r.location_city ?? r.locationCity,
          locationState: r.location_state ?? r.locationState,
          operatingHours: r.operating_hours ?? r.operatingHours ?? 0,
          listingType: r.listing_type ?? r.listingType,
          merchantRentalRate: r.merchant_rental_rate ?? r.merchantRentalRate,
          cheescoAdjustedRate: r.cheesco_adjusted_rate ?? r.cheescoAdjustedRate,
          salePrice: r.sale_price ?? r.salePrice,
          isOperatorIncluded: r.is_operator_included ?? r.isOperatorIncluded,
          isDeliveryAvailable: r.is_delivery_available ?? r.isDeliveryAvailable,
          isFeatured: r.is_featured ?? r.isFeatured ?? false,
          promotionTier: r.promotion_tier ?? r.promotionTier ?? "NONE",
          availabilityStatus: r.availability_status ?? r.availabilityStatus,
          verificationStatus: r.verification_status ?? r.verificationStatus,
          images: r.images?.map((i: any) => i.image_url ?? i).filter(Boolean) ?? [r.images?.[0]].filter(Boolean),
        }));
        const sorted = [...normalized].sort(
          (a, b) =>
            (PROMO_ORDER[a.promotionTier] ?? 9) -
            (PROMO_ORDER[b.promotionTier] ?? 9) ||
            Number(b.isFeatured) - Number(a.isFeatured)
        );
        setItems(sorted.slice(0, 8));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      <SectionHeading
        eyebrow="Featured & Sponsored"
        title="Machines in the spotlight"
        sub="Paid placements from verified merchants — clearly labelled, performance-tracked."
      />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card-surface animate-pulse rounded-xl h-64" />
            ))
          : items.map((eq) => <EquipmentCard key={eq.id} eq={eq} />)}
      </div>
    </section>
  );
}


const LIFECYCLE = [
  ["Request", "Customer submits a verified request — no instant self-service."],
  ["Verification", "Cheesco confirms equipment, merchant & availability."],
  ["Quotation", "Operations builds a managed quote with transparent margin."],
  ["Confirmation", "Customer reviews and accepts or requests revision."],
  ["Agreement", "Digital rental agreement generated and signed."],
  ["Payment", "Rental fee paid; damage deposit held in escrow."],
  ["Logistics", "Lowbed carrier assigned, pre-delivery inspection done."],
  ["Completion", "Return, post-rental inspection, deposit settled."],
];

export function HowItWorks() {
  return (
    <section className="border-y border-line-soft bg-canvas-deep/60 py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="The Cheesco Way"
          title="How it works — the verified lifecycle"
        />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {LIFECYCLE.map(([title, desc], i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ delay: i * 0.06, duration: 0.5 }}
              className="card-surface relative rounded-xl p-5"
            >
              <div className="absolute -top-3 left-5 rounded-md bg-cheesco-yellow px-2.5 py-0.5 text-xs font-black text-canvas">
                {String(i + 1).padStart(2, "0")}
              </div>
              <div className="pt-2 font-bold">{title}</div>
              <p className="mt-2 text-sm text-ink-muted">{desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

const TESTIMONIALS = [
  {
    quote: "Cheesco sourced a 90-ton crane in 48 hours, handled the lowbed and inspection. We just signed and built.",
    name: "Engr. Adebayo O.", role: "Project Director, civil works",
  },
  {
    quote: "Our idle fleet now earns. The sponsored slot paid for itself in the first week of enquiries.",
    name: "Femi A.", role: "Fleet Owner, Port Harcourt",
  },
  {
    quote: "Deposit disputes used to kill rentals. Now the inspection record settles everything in hours.",
    name: "Chidinma E.", role: "Site Manager, Abuja",
  },
];

export function Testimonials() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      <SectionHeading eyebrow="Trusted On Site" title="What the industry says" />
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {TESTIMONIALS.map((t) => (
          <figure key={t.name} className="card-surface rounded-xl p-6">
            <div className="text-cheesco-yellow">★★★★★</div>
            <blockquote className="mt-3 text-sm leading-relaxed text-ink">
              “{t.quote}”
            </blockquote>
            <figcaption className="mt-4 text-sm">
              <div className="font-bold">{t.name}</div>
              <div className="text-ink-faint">{t.role}</div>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

export function SectorCoverage() {
  const sectors = [
    "Oil & Gas", "Construction", "Power & Energy", "Mining",
    "Logistics & Haulage", "Manufacturing", "Ports & Marine", "Agriculture",
  ];
  return (
    <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
      <SectionHeading eyebrow="Industrial Reach" title="Sectors we keep moving" />
      <div className="mt-6 flex flex-wrap gap-2">
        {sectors.map((s) => (
          <span
            key={s}
            className="rounded-full border border-line bg-card px-4 py-2 text-sm font-semibold text-ink-muted"
          >
            {s}
          </span>
        ))}
      </div>
    </section>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  sub,
}: {
  eyebrow: string;
  title: string;
  sub?: string;
}) {
  return (
    <div className="max-w-2xl">
      <div className="text-xs font-black tracking-[0.3em] text-cheesco-yellow">
        {eyebrow.toUpperCase()}
      </div>
      <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">{title}</h2>
      {sub && <p className="mt-3 text-sm text-ink-muted">{sub}</p>}
    </div>
  );
}
