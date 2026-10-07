"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import { CATEGORY_META, NIGERIAN_STATES } from "@/lib/seed";
import type { EquipmentCategory } from "@/lib/types";

const CATEGORIES = Object.keys(CATEGORY_META) as EquipmentCategory[];

// High-impact Mobile Crane Hero image
const HERO_IMAGE =
  "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=2400&q=85";

const PRICE_RANGES = [
  { label: "Price Range", value: "" },
  { label: "Under ₦200,000", value: "0-200000" },
  { label: "₦200,000 - ₦500,000", value: "200000-500000" },
  { label: "₦500,000 - ₦1,000,000", value: "500000-1000000" },
  { label: "₦1,000,000+", value: "1000000-999999999" },
];

export function Hero() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [q, setQ] = useState("");
  const [listing, setListing] = useState<"buy" | "rent">("rent");
  const [state, setState] = useState("");
  const [category, setCategory] = useState<"" | EquipmentCategory>("");
  const [priceRange, setPriceRange] = useState("");

  function search() {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (category) params.set("category", category);
    if (listing) params.set("listing", listing);
    if (state) params.set("state", state);
    if (priceRange) {
      const parts = priceRange.split("-");
      if (parts[1]) params.set("maxPrice", parts[1]);
    }
    startTransition(() => router.push(`/browse?${params.toString()}`));
  }

  return (
    <section className="relative min-h-[96vh] overflow-hidden bg-canvas">
      {/* High-Impact Mobile Crane Hero Background */}
      <div className="absolute inset-0 z-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={HERO_IMAGE}
          alt="Heavy Mobile Crane on industrial project site"
          className="h-full w-full object-cover object-center scale-[1.02] transform transition-transform duration-1000"
        />
        {/* Cinematic gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-r from-canvas/95 via-canvas/75 to-canvas/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-canvas via-canvas/30 to-transparent" />
        <div className="absolute inset-0 bg-black/35" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-[96vh] max-w-7xl flex-col justify-center px-4 pb-16 pt-28 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          {/* Main Headline from design */}
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
            className="text-4xl font-black leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-6xl"
          >
            Buy or Rent Verified <br />
            <span className="text-cheesco-yellow">Heavy Equipment</span> <br />
            for Your Next Project
          </motion.h1>

          {/* Subheading from design */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="mt-5 max-w-2xl text-base text-zinc-300 sm:text-lg font-medium leading-relaxed"
          >
            Connect with trusted equipment owners and merchants. Get the right equipment, at the right time, with full support from Cheesco.
          </motion.p>
        </div>

        {/* Master Search & Multi-Filter Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="mt-8 w-full max-w-4xl rounded-2xl border border-white/10 bg-card/95 p-4 shadow-[0_24px_64px_rgba(0,0,0,0.6)] backdrop-blur-2xl"
        >
          {/* Top Search Input Row with Yellow Button */}
          <div className="relative flex items-center">
            <span className="pointer-events-none absolute left-4 text-ink-muted">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && search()}
              placeholder="Search for excavators, cranes, trucks..."
              className="h-13 w-full rounded-xl bg-canvas-deep pl-12 pr-32 text-sm text-ink placeholder:text-ink-faint outline-none ring-1 ring-line-soft transition-all focus:ring-2 focus:ring-cheesco-yellow"
            />
            <button
              onClick={search}
              disabled={isPending}
              className="absolute right-1.5 flex h-10 items-center gap-2 rounded-lg bg-cheesco-yellow px-5 text-sm font-bold text-canvas transition-all hover:bg-cheesco-yellow-bright hover:shadow-lg disabled:opacity-60"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span>{isPending ? "Searching…" : "Search"}</span>
            </button>
          </div>

          {/* Filter Row: Buy/Rent Tabs + Dropdowns */}
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-5">
            {/* Buy / Rent Switcher */}
            <div className="col-span-2 flex h-11 items-center rounded-xl bg-canvas-deep p-1 ring-1 ring-line-soft sm:col-span-1">
              <button
                type="button"
                onClick={() => setListing("buy")}
                className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition-all ${
                  listing === "buy"
                    ? "bg-cheesco-yellow text-canvas shadow-sm"
                    : "text-ink-muted hover:text-ink"
                }`}
              >
                Buy
              </button>
              <button
                type="button"
                onClick={() => setListing("rent")}
                className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition-all ${
                  listing === "rent"
                    ? "bg-cheesco-yellow text-canvas shadow-sm"
                    : "text-ink-muted hover:text-ink"
                }`}
              >
                Rent
              </button>
            </div>

            {/* Location Select */}
            <div className="relative">
              <select
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="h-11 w-full appearance-none rounded-xl bg-canvas-deep px-3 pr-8 text-xs font-semibold text-ink outline-none ring-1 ring-line-soft transition-all focus:ring-1 focus:ring-cheesco-yellow"
              >
                <option value="">Location</option>
                {NIGERIAN_STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-3 top-3.5 text-xs text-ink-muted">▼</span>
            </div>

            {/* Equipment Type Select */}
            <div className="relative">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as typeof category)}
                className="h-11 w-full appearance-none rounded-xl bg-canvas-deep px-3 pr-8 text-xs font-semibold text-ink outline-none ring-1 ring-line-soft transition-all focus:ring-1 focus:ring-cheesco-yellow"
              >
                <option value="">Equipment Type</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-3 top-3.5 text-xs text-ink-muted">▼</span>
            </div>

            {/* Price Range Select */}
            <div className="relative col-span-2 sm:col-span-1 lg:col-span-2">
              <select
                value={priceRange}
                onChange={(e) => setPriceRange(e.target.value)}
                className="h-11 w-full appearance-none rounded-xl bg-canvas-deep px-3 pr-8 text-xs font-semibold text-ink outline-none ring-1 ring-line-soft transition-all focus:ring-1 focus:ring-cheesco-yellow"
              >
                {PRICE_RANGES.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-3 top-3.5 text-xs text-ink-muted">▼</span>
            </div>
          </div>
        </motion.div>

        {/* 4 Feature / Trust Badges Strip (matching UI in image) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.4 }}
          className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4 max-w-4xl"
        >
          {/* 1. Verified Merchants */}
          <div className="flex items-start gap-3 rounded-xl border border-white/5 bg-card/60 p-3 backdrop-blur-md">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cheesco-yellow/15 text-cheesco-yellow">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <div className="text-xs font-bold text-white">Verified Merchants</div>
              <div className="text-[11px] text-zinc-400">100% inspected & verified sellers</div>
            </div>
          </div>

          {/* 2. Secure Payments */}
          <div className="flex items-start gap-3 rounded-xl border border-white/5 bg-card/60 p-3 backdrop-blur-md">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cheesco-yellow/15 text-cheesco-yellow">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <div>
              <div className="text-xs font-bold text-white">Secure Payments</div>
              <div className="text-[11px] text-zinc-400">Multiple payment options</div>
            </div>
          </div>

          {/* 3. Logistics Support */}
          <div className="flex items-start gap-3 rounded-xl border border-white/5 bg-card/60 p-3 backdrop-blur-md">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cheesco-yellow/15 text-cheesco-yellow">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-2m-4-1v8m0 0l3-3m-3 3L9 8m-5 5h2.586a1 1 0 01.707.293l2.414 2.414a1 1 0 00.707.293h3.172a1 1 0 00.707-.293l2.414-2.414a1 1 0 01.707-.293H20" />
              </svg>
            </div>
            <div>
              <div className="text-xs font-bold text-white">Logistics Support</div>
              <div className="text-[11px] text-zinc-400">We move your equipment</div>
            </div>
          </div>

          {/* 4. Dedicated Support */}
          <div className="flex items-start gap-3 rounded-xl border border-white/5 bg-card/60 p-3 backdrop-blur-md">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cheesco-yellow/15 text-cheesco-yellow">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div>
              <div className="text-xs font-bold text-white">Dedicated Support</div>
              <div className="text-[11px] text-zinc-400">We're with you always</div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

