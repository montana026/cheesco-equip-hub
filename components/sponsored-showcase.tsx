"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import type { Equipment } from "@/lib/types";
import { fmtNgn } from "@/lib/format";

export function EquipmentCard({ eq }: { eq: Equipment }) {
  const [saved, setSaved] = useState(false);

  const imgSrc: string =
    typeof eq.images?.[0] === "string"
      ? (eq.images[0] as string)
      : ((eq.images?.[0] as any)?.image_url ?? "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=800&q=70");

  const isSale = eq.listingType === "FOR_SALE";
  const isRent = eq.listingType === "FOR_RENT" || (!isSale && !eq.salePrice);

  return (
    <div className="card-surface group relative flex flex-col overflow-hidden rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:border-cheesco-yellow/40 hover:shadow-[0_12px_32px_rgba(0,0,0,0.4)]">
      <div className="relative h-44 w-full overflow-hidden bg-canvas-deep">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imgSrc}
          alt={eq.name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <span className={`absolute left-3 top-3 rounded-md px-2.5 py-1 text-[11px] font-black tracking-wide shadow-md ${
          isSale ? "bg-emerald-500 text-black" : "bg-cheesco-yellow text-[#0A0D14]"
        }`}>
          {isSale ? "For Sale" : "For Rent"}
        </span>
        {eq.promotionTier && eq.promotionTier !== "NONE" && (
          <span className="absolute left-3 top-11 rounded-md bg-amber-400 text-black px-2 py-0.5 text-[10px] font-black tracking-wider uppercase shadow-md flex items-center gap-1">
            <span>★</span> Sponsored
          </span>
        )}
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSaved(!saved); }}
          aria-label="Save to favorites"
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm transition-all hover:scale-110 hover:bg-black/80"
        >
          <svg
            className={`h-4 w-4 transition-colors ${saved ? "fill-red-500 text-red-500" : "fill-none text-white"}`}
            viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </button>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <Link href={`/equipment/${eq.slug}`}>
          <h3 className="text-sm font-bold text-ink leading-snug line-clamp-1 group-hover:text-cheesco-yellow transition-colors">
            {eq.name}
          </h3>
        </Link>
        <div className="mt-1 flex items-center gap-1 text-[11px] text-ink-muted">
          <span>📍</span>
          <span className="truncate">{eq.locationCity}, {eq.locationState}</span>
        </div>
        <div className="mt-2.5">
          {isRent ? (
            <div className="flex items-baseline gap-1">
              <span className="text-base font-black text-ink">
                ₦{fmtNgn(eq.cheescoAdjustedRate ?? 0)}
              </span>
              <span className="text-[11px] text-ink-muted">/ day</span>
            </div>
          ) : (
            <div className="flex items-baseline gap-1">
              <span className="text-base font-black text-ink">
                ₦{fmtNgn(eq.salePrice ?? 0)}
              </span>
              <span className="text-[11px] text-ink-muted">sale price</span>
            </div>
          )}
        </div>
        <div className="mt-3.5">
          <Link
            href={`/equipment/${eq.slug}`}
            className="flex h-9 w-full items-center justify-center rounded-xl bg-cheesco-yellow px-4 text-xs font-black text-[#0A0D14] transition-all hover:bg-cheesco-yellow-bright hover:shadow-md"
          >
            View Details
          </Link>
        </div>
      </div>
    </div>
  );
}

interface Props {
  /** Equipment pre-fetched on the server, passed in as props */
  initialItems: Equipment[];
}

export function SponsoredShowcase({ initialItems }: Props) {
  const [items, setItems] = useState<Equipment[]>(initialItems);
  const [filterTab, setFilterTab] = useState<"ALL" | "FOR_SALE" | "FOR_RENT">("ALL");

  // Only re-fetch if server passed no data (fallback)
  useEffect(() => {
    if (initialItems.length > 0) return;
    fetch("/api/equipment?limit=12")
      .then((r) => r.json())
      .then((json) => {
        const raw: any[] = json.data ?? [];
        setItems(raw.map((r) => ({
          ...r,
          locationCity: r.location_city ?? r.locationCity,
          locationState: r.location_state ?? r.locationState,
          operatingHours: r.operating_hours ?? r.operatingHours ?? 0,
          listingType: r.listing_type ?? r.listingType,
          cheescoAdjustedRate: r.cheesco_adjusted_rate ?? r.cheescoAdjustedRate,
          salePrice: r.sale_price ?? r.salePrice,
          isOperatorIncluded: r.is_operator_included ?? r.isOperatorIncluded,
          isDeliveryAvailable: r.is_delivery_available ?? r.isDeliveryAvailable,
          isFeatured: r.is_featured ?? r.isFeatured ?? false,
          promotionTier: r.promotion_tier ?? r.promotionTier ?? "NONE",
          availabilityStatus: r.availability_status ?? r.availabilityStatus,
          verificationStatus: r.verification_status ?? r.verificationStatus,
          images: r.images?.map((i: any) => i.image_url ?? i).filter(Boolean) ?? [],
        })));
      })
      .catch(() => {});
  }, [initialItems]);

  const filteredItems = items.filter((item) => {
    // Exclude equipment that is on lease or undergoing maintenance from the homepage showcase
    if (item.availabilityStatus === "RENTED" || item.availabilityStatus === "MAINTENANCE") {
      return false;
    }
    if (filterTab === "FOR_SALE") return item.listingType === "FOR_SALE";
    if (filterTab === "FOR_RENT") return item.listingType === "FOR_RENT";
    return true;
  });

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-black tracking-tight text-ink sm:text-2xl">
          Featured Equipment
        </h2>
        <div className="flex items-center gap-1.5 rounded-xl bg-card p-1 ring-1 ring-line-soft">
          {(["ALL", "FOR_SALE", "FOR_RENT"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setFilterTab(tab)}
              className={`rounded-lg px-4 py-1.5 text-xs font-bold transition-all ${
                filterTab === tab
                  ? "bg-cheesco-yellow text-[#0A0D14] shadow-sm"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              {tab === "ALL" ? "All" : tab === "FOR_SALE" ? "For Sale" : "For Rent"}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {filteredItems.length === 0
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card-surface animate-pulse rounded-2xl h-80" />
            ))
          : filteredItems.slice(0, 8).map((eq) => <EquipmentCard key={eq.id} eq={eq} />)}
      </div>
    </section>
  );
}
