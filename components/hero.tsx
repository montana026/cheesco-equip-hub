"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { motion } from "framer-motion";
import { CATEGORY_META } from "@/lib/seed";
import type { EquipmentCategory } from "@/lib/types";

const CATEGORIES = Object.keys(CATEGORY_META) as EquipmentCategory[];

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=2400&q=80";

export function Hero() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<"" | EquipmentCategory>("");
  const [listing, setListing] = useState<"any" | "rent" | "buy">("any");
  const [state, setState] = useState("");

  const matches = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle && !category && listing === "any") return [];
    return CATEGORIES.filter((c) =>
      needle ? c.toLowerCase().includes(needle) || CATEGORY_META[c].blurb.toLowerCase().includes(needle) : true
    )
      .filter((c) => (category ? c === category : true))
      .slice(0, 6);
  }, [q, category, listing]);

  function search() {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (category) params.set("category", category);
    if (listing !== "any") params.set("listing", listing);
    if (state) params.set("state", state);
    startTransition(() => router.push(`/browse?${params.toString()}`));
  }

  return (
    <section className="relative min-h-[92vh] overflow-hidden">
      {/* Cinematic crane backdrop */}
      <div className="absolute inset-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={HERO_IMAGE}
          alt="Crane working on a major industrial construction site"
          className="h-full w-full object-cover"
        />
        {/* dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-canvas/80 via-canvas/55 to-canvas" />
        <div className="absolute inset-0 bg-gradient-to-r from-canvas/85 via-canvas/30 to-transparent" />
      </div>

      <div className="relative mx-auto flex min-h-[92vh] max-w-7xl flex-col justify-center px-4 pb-24 pt-32 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-3xl"
        >
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-cheesco-yellow/30 bg-cheesco-yellow/10 px-4 py-1.5 text-xs font-bold tracking-widest text-cheesco-yellow">
            <span className="h-1.5 w-1.5 rounded-full bg-cheesco-yellow animate-pulse-slow" />
            MANAGED RENTALS · VERIFIED SOURCING · INDUSTRIAL LOGISTICS
          </div>

          <h1 className="text-4xl font-black leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
            Heavy Equipment,
            <br />
            <span className="text-cheesco-yellow text-glow-yellow">Verified & Delivered.</span>
          </h1>

          <p className="mt-6 max-w-xl text-lg text-ink-muted">
            Cheesco is the trusted intermediary across the entire lifecycle —
            from request to quotation, agreement, payment, logistics and
            inspection. No self-service rentals. Every deal verified.
          </p>
        </motion.div>

        {/* Real-time multi-parameter search */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="mt-10 w-full max-w-4xl rounded-2xl border border-line bg-card/90 p-3 shadow-[0_24px_80px_rgba(0,0,0,0.6)] backdrop-blur-xl"
        >
          <div className="grid gap-2 sm:grid-cols-[1.4fr_1fr_1fr_auto]">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && search()}
              placeholder="Search cranes, excavators, generators…"
              className="h-12 rounded-xl bg-canvas-deep px-4 text-sm text-ink placeholder:text-ink-faint outline-none ring-1 ring-line-soft focus:ring-cheesco-yellow/60"
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as typeof category)}
              className="h-12 rounded-xl bg-canvas-deep px-3 text-sm text-ink outline-none ring-1 ring-line-soft focus:ring-cheesco-yellow/60"
            >
              <option value="">All categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <select
              value={listing}
              onChange={(e) => setListing(e.target.value as typeof listing)}
              className="h-12 rounded-xl bg-canvas-deep px-3 text-sm text-ink outline-none ring-1 ring-line-soft focus:ring-cheesco-yellow/60"
            >
              <option value="any">Buy or Rent</option>
              <option value="rent">Rent</option>
              <option value="buy">Buy</option>
            </select>
            <button
              onClick={search}
              disabled={isPending}
              className="h-12 rounded-xl bg-cheesco-yellow px-7 text-sm font-black text-canvas transition-all hover:bg-cheesco-yellow-bright hover:scale-[1.02] disabled:opacity-60"
            >
              {isPending ? "Searching…" : "Search"}
            </button>
          </div>

          {matches.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2 px-1 pb-1">
              {matches.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className="rounded-full border border-line bg-canvas-deep px-3 py-1 text-xs text-ink-muted hover:border-cheesco-yellow/50 hover:text-cheesco-yellow"
                >
                  {CATEGORY_META[c].icon} {c}
                </button>
              ))}
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55, duration: 0.8 }}
          className="mt-8 flex flex-wrap gap-x-10 gap-y-3 text-sm text-ink-muted"
        >
          {[
            ["27-state", "verified lifecycle"],
            ["100%", "deposit escrowed"],
            ["24/7", "operations desk"],
          ].map(([big, small]) => (
            <div key={small} className="flex items-baseline gap-2">
              <span className="text-xl font-black text-cheesco-yellow">{big}</span>
              <span>{small}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
