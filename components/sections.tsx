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
  const cats = [
    { name: "Excavators", icon: "🚜", image: "https://images.unsplash.com/photo-1526835657244-e8a5c2c0e3c2?auto=format&fit=crop&w=400&q=75" },
    { name: "Cranes", icon: "🏗️", image: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=400&q=75" },
    { name: "Trucks", icon: "🚛", image: "https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=400&q=75" },
    { name: "Bulldozers", icon: "🚜", image: "https://images.unsplash.com/photo-1567093324170-cb5d3be35a1c?auto=format&fit=crop&w=400&q=75" },
    { name: "Loaders", icon: "🚜", image: "https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=400&q=75" },
    { name: "Generators", icon: "⚡", image: "https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&w=400&q=75" },
    { name: "Lowbeds", icon: "🚛", image: "https://images.unsplash.com/photo-1586191582056-b7f0a7f7dd55?auto=format&fit=crop&w=400&q=75" },
    { name: "Forklifts", icon: "🏗️", image: "https://images.unsplash.com/photo-1586528116311-ad8dd5c8310d?auto=format&fit=crop&w=400&q=75" },
  ];

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black tracking-tight text-ink sm:text-2xl">
          Popular Categories
        </h2>
        <Link
          href="/browse"
          className="text-xs font-bold text-cheesco-yellow hover:underline flex items-center gap-1"
        >
          <span>View All</span>
          <span>&gt;</span>
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        {cats.map((cat, i) => (
          <motion.div
            key={cat.name}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.04, duration: 0.4 }}
          >
            <Link
              href={`/browse?category=${encodeURIComponent(cat.name)}`}
              className="card-surface group flex flex-col items-center rounded-2xl p-3 text-center transition-all hover:-translate-y-1 hover:border-cheesco-yellow/50 hover:shadow-lg"
            >
              <div className="flex h-14 w-full items-center justify-center overflow-hidden rounded-xl bg-canvas-deep/80 p-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={cat.image}
                  alt={cat.name}
                  className="h-full w-full object-cover rounded-lg transition-transform duration-300 group-hover:scale-110"
                />
              </div>
              <div className="mt-2 text-xs font-bold text-ink group-hover:text-cheesco-yellow truncate w-full">
                {cat.name}
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

export function EquipmentCard({ eq }: { eq: Equipment }) {
  const [saved, setSaved] = useState(false);

  const imgSrc: string =
    typeof eq.images?.[0] === "string"
      ? (eq.images[0] as string)
      : ((eq.images?.[0] as any)?.image_url ?? "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=800&q=70");

  const isRent = eq.listingType === "FOR_RENT" || eq.listingType === "FOR_SALE_AND_RENT";
  const isSale = eq.listingType === "FOR_SALE";

  return (
    <div className="card-surface group relative flex flex-col overflow-hidden rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:border-cheesco-yellow/40 hover:shadow-[0_12px_32px_rgba(0,0,0,0.4)]">
      {/* Top Image Box */}
      <div className="relative h-44 w-full overflow-hidden bg-canvas-deep">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imgSrc}
          alt={eq.name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Listing Type Tag Badge (Yellow pill from design) */}
        <span className="absolute left-3 top-3 rounded-md bg-cheesco-yellow px-2.5 py-1 text-[11px] font-black tracking-wide text-canvas shadow-md">
          {isSale ? "For Sale" : "For Rent"}
        </span>

        {/* Heart / Favorite Button */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setSaved(!saved);
          }}
          aria-label="Save to favorites"
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-canvas/80 text-white backdrop-blur-sm transition-all hover:scale-110 hover:bg-canvas"
        >
          <svg
            className={`h-4 w-4 transition-colors ${saved ? "fill-red-500 text-red-500" : "fill-none text-white"}`}
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </button>
      </div>

      {/* Card Content */}
      <div className="flex flex-1 flex-col p-4">
        {/* Title */}
        <Link href={`/equipment/${eq.slug}`}>
          <h3 className="text-sm font-bold text-ink leading-snug line-clamp-1 group-hover:text-cheesco-yellow transition-colors">
            {eq.name}
          </h3>
        </Link>

        {/* Location */}
        <div className="mt-1 flex items-center gap-1 text-[11px] text-ink-muted">
          <span>📍</span>
          <span className="truncate">{eq.locationCity}, {eq.locationState}</span>
        </div>

        {/* Pricing */}
        <div className="mt-2.5">
          {isRent ? (
            <div className="flex items-baseline gap-1">
              <span className="text-base font-black text-ink">
                ₦{fmtNgn(eq.cheescoAdjustedRate ?? eq.merchantRentalRate)}
              </span>
              <span className="text-[11px] text-ink-muted">/ day</span>
            </div>
          ) : (
            <div className="flex items-baseline gap-1">
              <span className="text-base font-black text-ink">
                ₦{fmtNgn(eq.salePrice ?? eq.merchantRentalRate * 100)}
              </span>
            </div>
          )}
        </div>

        {/* Metadata Specs Row: Year, Hours, Rating */}
        <div className="mt-3 flex items-center justify-between border-t border-line-soft pt-2.5 text-[11px] text-ink-muted">
          <div className="flex items-center gap-3">
            <span>📅 {eq.year || 2021}</span>
            <span>⏱️ {(eq.operatingHours || 2500).toLocaleString()} hrs</span>
          </div>
          <div className="flex items-center gap-1 font-semibold text-cheesco-yellow">
            <span>★</span>
            <span className="text-ink">4.8</span>
            <span className="text-[10px] text-ink-faint">(12)</span>
          </div>
        </div>

        {/* Full-width View Details Yellow Button */}
        <div className="mt-3.5">
          <Link
            href={`/equipment/${eq.slug}`}
            className="flex h-9 w-full items-center justify-center rounded-xl bg-cheesco-yellow px-4 text-xs font-black text-canvas transition-all hover:bg-cheesco-yellow-bright hover:shadow-md"
          >
            View Details
          </Link>
        </div>
      </div>
    </div>
  );
}

export function SponsoredShowcase() {
  const [items, setItems] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState<"ALL" | "FOR_SALE" | "FOR_RENT">("ALL");

  useEffect(() => {
    fetch("/api/equipment?limit=12")
      .then((r) => r.json())
      .then((json) => {
        const raw: any[] = json.data ?? [];
        const normalized = raw.map((r) => ({
          ...r,
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
        setItems(normalized);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filteredItems = items.filter((item) => {
    if (filterTab === "FOR_SALE") return item.listingType === "FOR_SALE" || item.listingType === "FOR_SALE_AND_RENT";
    if (filterTab === "FOR_RENT") return item.listingType === "FOR_RENT" || item.listingType === "FOR_SALE_AND_RENT";
    return true;
  });

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-black tracking-tight text-ink sm:text-2xl">
          Featured Equipment
        </h2>

        {/* For Sale / For Rent Switcher Tabs from design */}
        <div className="flex items-center gap-1.5 rounded-xl bg-card p-1 ring-1 ring-line-soft">
          <button
            type="button"
            onClick={() => setFilterTab("ALL")}
            className={`rounded-lg px-4 py-1.5 text-xs font-bold transition-all ${
              filterTab === "ALL"
                ? "bg-cheesco-yellow text-canvas shadow-sm"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setFilterTab("FOR_SALE")}
            className={`rounded-lg px-4 py-1.5 text-xs font-bold transition-all ${
              filterTab === "FOR_SALE"
                ? "bg-cheesco-yellow text-canvas shadow-sm"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            For Sale
          </button>
          <button
            type="button"
            onClick={() => setFilterTab("FOR_RENT")}
            className={`rounded-lg px-4 py-1.5 text-xs font-bold transition-all ${
              filterTab === "FOR_RENT"
                ? "bg-cheesco-yellow text-canvas shadow-sm"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            For Rent
          </button>
        </div>
      </div>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card-surface animate-pulse rounded-2xl h-80" />
            ))
          : filteredItems.slice(0, 8).map((eq) => <EquipmentCard key={eq.id} eq={eq} />)}
      </div>
    </section>
  );
}

/**
 * The Rental Workflow (Managed by Cheesco)
 * 7-step connected circular flow matching exact design in reference image.
 */
export function HowItWorks() {
  const steps = [
    {
      num: 1,
      title: "1. Customer Requests",
      desc: "Tell us what you need (equipment type, location, duration).",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
    },
    {
      num: 2,
      title: "2. Cheesco Verifies",
      desc: "We confirm equipment availability, merchant details and condition.",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
    },
    {
      num: 3,
      title: "3. Quotation",
      desc: "You receive a detailed quote with all costs and terms.",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      num: 4,
      title: "4. Customer Confirms",
      desc: "You review and confirm the quotation.",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ),
    },
    {
      num: 5,
      title: "5. Payment / Deposit",
      desc: "Make payment or deposit securely through the platform.",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      ),
    },
    {
      num: 6,
      title: "6. Delivery",
      desc: "Equipment is delivered to your project location.",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      num: 7,
      title: "7. Rental",
      desc: "You start your rental. We track it until completion.",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
  ];

  return (
    <section className="border-y border-line-soft bg-canvas-deep/80 py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-2xl font-black tracking-tight text-ink sm:text-3xl">
            The Rental Workflow (Managed by Cheesco)
          </h2>
          <p className="mt-2 text-sm text-ink-muted">
            From your request to delivery, we handle the entire process.
          </p>
        </div>

        {/* Connected 7-Step Workflow Process */}
        <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7">
          {steps.map((s, idx) => (
            <motion.div
              key={s.num}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.07, duration: 0.5 }}
              className="relative flex flex-col items-center text-center"
            >
              {/* Connector line on desktop */}
              {idx < steps.length - 1 && (
                <div className="hidden lg:block absolute left-1/2 top-6 h-0.5 w-full -translate-y-1/2 border-t-2 border-dashed border-cheesco-yellow/40 z-0" />
              )}

              {/* Step Circle Node */}
              <div className="relative z-10 flex h-13 w-13 items-center justify-center rounded-full bg-cheesco-yellow text-canvas shadow-lg ring-4 ring-canvas transition-transform hover:scale-110">
                {s.icon}
              </div>

              {/* Title */}
              <h3 className="mt-4 text-xs font-black text-ink">
                {s.title}
              </h3>

              {/* Description */}
              <p className="mt-1.5 text-[11px] text-ink-muted leading-relaxed">
                {s.desc}
              </p>
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
