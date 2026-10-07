"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CATEGORY_META, NIGERIAN_STATES } from "@/lib/seed";
import type { Equipment, EquipmentCategory, ListingType } from "@/lib/types";
import { EquipmentCard } from "./sections";


const CATEGORIES = Object.keys(CATEGORY_META) as EquipmentCategory[];
const CONDITIONS = ["NEW", "USED_EXCELLENT", "USED_GOOD", "USED_FAIR"] as const;

function listingLabel(t: ListingType) {
  switch (t) {
    case "FOR_SALE": return "For Sale";
    case "FOR_RENT": return "For Rent";
    case "FOR_SALE_AND_RENT": return "Sale & Rent";
  }
}

interface BrowseClientProps {
  initialEquipment: Equipment[];
}

export function BrowseClient({ initialEquipment }: BrowseClientProps) {
  const router = useRouter();
  const sp = useSearchParams();

  const [q, setQ] = useState(sp.get("q") ?? "");
  const [category, setCategory] = useState(sp.get("category") ?? "");
  const [listing, setListing] = useState(sp.get("listing") ?? "any");
  const [state, setState] = useState(sp.get("state") ?? "");
  const [condition, setCondition] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [operatorOnly, setOperatorOnly] = useState(false);
  const [availableOnly, setAvailableOnly] = useState(true);

  const [equipment, setEquipment] = useState<Equipment[]>(initialEquipment);
  const [loading, setLoading] = useState(false);

  // Fetch from the API whenever server-side-filterable params change
  const fetchEquipment = useCallback(async (params: {
    q?: string; category?: string; listing?: string; state?: string;
  }) => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (params.q)        qs.set("q", params.q);
      if (params.category) qs.set("category", params.category);
      if (params.listing && params.listing !== "any") qs.set("listing", params.listing);
      if (params.state)    qs.set("state", params.state);
      qs.set("limit", "100");

      const res = await fetch(`/api/equipment?${qs.toString()}`);
      if (!res.ok) throw new Error("fetch failed");
      const json = await res.json();
      setEquipment(json.data ?? []);
    } catch {
      // silently keep current results on network error
    } finally {
      setLoading(false);
    }
  }, []);

  // Apply client-side-only filters (condition, maxPrice, operatorOnly, availableOnly)
  const results = equipment.filter((eq) => {
    if (condition && eq.condition !== condition) return false;
    if (maxPrice) {
      const rate = eq.cheescoAdjustedRate ?? eq.merchantRentalRate ?? 0;
      if (rate > Number(maxPrice)) return false;
    }
    if (operatorOnly && !eq.isOperatorIncluded) return false;
    if (availableOnly && eq.availabilityStatus !== "AVAILABLE") return false;
    return true;
  });

  function apply(next: Partial<Record<string, string>>) {
    const params = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v) params.set(k, v); else params.delete(k);
    }
    router.replace(`/browse?${params.toString()}`, { scroll: false });
  }

  const hasFilters =
    q || category || listing !== "any" || state || condition || maxPrice || operatorOnly;

  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-4 pb-20 pt-28 sm:px-6 lg:grid-cols-[260px_1fr]">
      {/* ── Facet sidebar ── */}
      <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
        <div className="card-surface rounded-xl p-4">
          <div className="text-xs font-black tracking-[0.25em] text-cheesco-yellow">FILTERS</div>
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              apply({ q: e.target.value });
              fetchEquipment({ q: e.target.value, category, listing, state });
            }}
            placeholder="Search machines…"
            className="mt-3 h-10 w-full rounded-lg bg-canvas-deep px-3 text-sm outline-none ring-1 ring-line-soft focus:ring-cheesco-yellow/60"
          />

          <FilterGroup label="Category">
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                apply({ category: e.target.value });
                fetchEquipment({ q, category: e.target.value, listing, state });
              }}
              className="h-9 w-full rounded-lg bg-canvas-deep px-2 text-sm outline-none ring-1 ring-line-soft"
            >
              <option value="">All</option>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </FilterGroup>

          <FilterGroup label="Transaction">
            <div className="flex gap-1.5">
              {[["any", "Any"], ["rent", "Rent"], ["buy", "Buy"]].map(([v, label]) => (
                <button
                  key={v}
                  onClick={() => {
                    setListing(v);
                    apply({ listing: v === "any" ? "" : v });
                    fetchEquipment({ q, category, listing: v, state });
                  }}
                  className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-bold transition-colors ${
                    listing === v ? "bg-cheesco-yellow text-canvas" : "bg-canvas-deep text-ink-muted ring-1 ring-line-soft"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </FilterGroup>

          <FilterGroup label="State">
            <select
              value={state}
              onChange={(e) => {
                setState(e.target.value);
                apply({ state: e.target.value });
                fetchEquipment({ q, category, listing, state: e.target.value });
              }}
              className="h-9 w-full rounded-lg bg-canvas-deep px-2 text-sm outline-none ring-1 ring-line-soft"
            >
              <option value="">All Nigeria</option>
              {NIGERIAN_STATES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </FilterGroup>

          <FilterGroup label="Condition">
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              className="h-9 w-full rounded-lg bg-canvas-deep px-2 text-sm outline-none ring-1 ring-line-soft"
            >
              <option value="">Any condition</option>
              {CONDITIONS.map((c) => (
                <option key={c} value={c}>{c.replace("_", " ")}</option>
              ))}
            </select>
          </FilterGroup>

          <FilterGroup label="Max daily rate (₦)">
            <input
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value.replace(/\D/g, ""))}
              placeholder="e.g. 500000"
              inputMode="numeric"
              className="h-9 w-full rounded-lg bg-canvas-deep px-3 text-sm outline-none ring-1 ring-line-soft"
            />
          </FilterGroup>

          <label className="mt-3 flex items-center gap-2 text-sm text-ink-muted">
            <input type="checkbox" checked={operatorOnly}
              onChange={(e) => setOperatorOnly(e.target.checked)}
              className="accent-cheesco-yellow" />
            Operator included
          </label>
          <label className="mt-2 flex items-center gap-2 text-sm text-ink-muted">
            <input type="checkbox" checked={availableOnly}
              onChange={(e) => setAvailableOnly(e.target.checked)}
              className="accent-cheesco-yellow" />
            Available now
          </label>

          {hasFilters && (
            <button
              onClick={() => {
                setQ(""); setCategory(""); setListing("any"); setState("");
                setCondition(""); setMaxPrice(""); setOperatorOnly(false);
                router.replace("/browse");
                fetchEquipment({});
              }}
              className="mt-4 w-full rounded-lg border border-line py-2 text-xs font-bold text-ink-muted hover:text-cheesco-yellow"
            >
              Clear all filters
            </button>
          )}
        </div>
      </aside>

      {/* ── Results ── */}
      <main>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
              {category || "Equipment Catalog"}
            </h1>
            <p className="mt-1 text-sm text-ink-muted">
              {loading ? "Loading…" : `${results.length} verified ${results.length === 1 ? "unit" : "units"}`}
              {" "}· all rentals managed by Cheesco
            </p>
          </div>
        </div>

        {loading ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card-surface animate-pulse rounded-xl h-72" />
            ))}
          </div>
        ) : results.length === 0 ? (
          <div className="card-surface mt-8 rounded-xl p-12 text-center">
            <div className="text-4xl">🔍</div>
            <div className="mt-3 font-bold">No machines match your filters</div>
            <p className="mt-1 text-sm text-ink-muted">
              Widen the search or clear filters — or let Cheesco source it for you.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {results.map((eq) => <EquipmentCard key={eq.id} eq={eq} />)}
          </div>
        )}
      </main>
    </div>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-4">
      <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-ink-faint">
        {label}
      </div>
      {children}
    </div>
  );
}

