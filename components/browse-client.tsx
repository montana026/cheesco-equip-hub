"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { CATEGORY_META, NIGERIAN_STATES } from "@/lib/seed";
import type { Equipment, EquipmentCategory } from "@/lib/types";
import { EquipmentCard } from "./sections";

const CATEGORIES = Object.keys(CATEGORY_META) as EquipmentCategory[];
const BRANDS = ["Caterpillar", "Komatsu", "Liebherr", "Perkins", "Volvo CE", "Sinotruk", "Bomag", "XCMG", "Toyota", "Manitowoc", "Goldhofer"];

interface BrowseClientProps {
  initialEquipment: Equipment[];
}

export function BrowseClient({ initialEquipment }: BrowseClientProps) {
  const router = useRouter();
  const sp = useSearchParams();

  const [q, setQ] = useState(sp.get("q") ?? "");
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    sp.get("category") ? [sp.get("category")!] : []
  );
  const [listing, setListing] = useState<string>(sp.get("listing") ?? "");
  const [state, setState] = useState(sp.get("state") ?? "");
  const [brand, setBrand] = useState(sp.get("brand") ?? "");
  const [condition, setCondition] = useState<string>("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [operatorIncluded, setOperatorIncluded] = useState<boolean | null>(null);
  const [sortBy, setSortBy] = useState("newest");

  const [equipment, setEquipment] = useState<Equipment[]>(initialEquipment);
  const [loading, setLoading] = useState(false);

  const fetchEquipment = useCallback(async (params: {
    q?: string; category?: string; listing?: string; state?: string;
  }) => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (params.q) qs.set("q", params.q);
      if (params.category) qs.set("category", params.category);
      if (params.listing) qs.set("listing", params.listing);
      if (params.state) qs.set("state", params.state);
      qs.set("limit", "100");

      const res = await fetch(`/api/equipment?${qs.toString()}`);
      if (!res.ok) throw new Error("fetch failed");
      const json = await res.json();
      setEquipment(json.data ?? []);
    } catch {
      // Keep existing data on error
    } finally {
      setLoading(false);
    }
  }, []);

  const handleCategoryToggle = (cat: string) => {
    const next = selectedCategories.includes(cat)
      ? selectedCategories.filter((c) => c !== cat)
      : [...selectedCategories, cat];
    setSelectedCategories(next);
    fetchEquipment({
      q,
      category: next.length > 0 ? next[0] : undefined,
      listing,
      state,
    });
  };

  const clearAll = () => {
    setQ("");
    setSelectedCategories([]);
    setListing("");
    setState("");
    setBrand("");
    setCondition("");
    setMinPrice("");
    setMaxPrice("");
    setOperatorIncluded(null);
    router.replace("/browse");
    fetchEquipment({});
  };

  // Client-side filtering and sorting
  const filteredAndSorted = useMemo(() => {
    let list = equipment.filter((eq) => {
      // Category filter
      if (selectedCategories.length > 0 && !selectedCategories.includes(eq.category)) {
        return false;
      }
      // Brand filter
      if (brand && eq.brand.toLowerCase() !== brand.toLowerCase()) {
        return false;
      }
      // Condition filter
      if (condition) {
        if (condition === "NEW" && eq.condition !== "NEW") return false;
        if (condition === "USED" && eq.condition === "NEW") return false;
      }
      // Operator filter
      if (operatorIncluded !== null && eq.isOperatorIncluded !== operatorIncluded) {
        return false;
      }
      // Price filter
      const rate = eq.cheescoAdjustedRate ?? eq.merchantRentalRate ?? 0;
      if (minPrice && rate < Number(minPrice)) return false;
      if (maxPrice && rate > Number(maxPrice)) return false;

      return true;
    });

    // Sorting
    if (sortBy === "price_asc") {
      list.sort((a, b) => (a.cheescoAdjustedRate ?? a.merchantRentalRate) - (b.cheescoAdjustedRate ?? b.merchantRentalRate));
    } else if (sortBy === "price_desc") {
      list.sort((a, b) => (b.cheescoAdjustedRate ?? b.merchantRentalRate) - (a.cheescoAdjustedRate ?? a.merchantRentalRate));
    } else if (sortBy === "hours_asc") {
      list.sort((a, b) => (a.operatingHours || 0) - (b.operatingHours || 0));
    } else {
      // default newest / featured
      list.sort((a, b) => (Number(b.isFeatured) - Number(a.isFeatured)));
    }

    return list;
  }, [equipment, selectedCategories, brand, condition, operatorIncluded, minPrice, maxPrice, sortBy]);

  return (
    <div className="mx-auto max-w-7xl px-4 pb-20 pt-28 sm:px-6 lg:px-8">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs font-semibold text-ink-muted">
        <Link href="/" className="hover:text-cheesco-yellow">Home</Link>
        <span>&gt;</span>
        <span className="text-ink font-bold">Equipment</span>
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[280px_1fr]">
        {/* ── Filter Sidebar (Matches Screen 3) ── */}
        <aside className="space-y-6">
          <div className="card-surface rounded-2xl p-5 shadow-sm">
            {/* Header: Filters + Clear All */}
            <div className="flex items-center justify-between border-b border-line-soft pb-3">
              <h3 className="text-sm font-black tracking-wide text-ink">Filters</h3>
              <button
                type="button"
                onClick={clearAll}
                className="text-xs font-bold text-cheesco-yellow hover:underline"
              >
                Clear All
              </button>
            </div>

            {/* 1. Type (Checkboxes) */}
            <div className="mt-4 border-b border-line-soft pb-4">
              <div className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-muted">
                Type
              </div>
              <div className="space-y-2">
                {CATEGORIES.slice(0, 8).map((cat) => (
                  <label
                    key={cat}
                    className="flex items-center gap-2.5 text-xs font-medium text-ink cursor-pointer hover:text-cheesco-yellow"
                  >
                    <input
                      type="checkbox"
                      checked={selectedCategories.includes(cat)}
                      onChange={() => handleCategoryToggle(cat)}
                      className="h-4 w-4 rounded border-line-soft text-cheesco-yellow accent-cheesco-yellow"
                    />
                    <span>{cat}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* 2. Buy or Rent */}
            <div className="mt-4 border-b border-line-soft pb-4">
              <div className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-muted">
                Buy or Rent
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2.5 text-xs font-medium text-ink cursor-pointer hover:text-cheesco-yellow">
                  <input
                    type="radio"
                    name="listingType"
                    checked={listing === "buy"}
                    onChange={() => {
                      setListing("buy");
                      fetchEquipment({ q, category: selectedCategories[0], listing: "buy", state });
                    }}
                    className="accent-cheesco-yellow"
                  />
                  <span>For Sale</span>
                </label>
                <label className="flex items-center gap-2.5 text-xs font-medium text-ink cursor-pointer hover:text-cheesco-yellow">
                  <input
                    type="radio"
                    name="listingType"
                    checked={listing === "rent"}
                    onChange={() => {
                      setListing("rent");
                      fetchEquipment({ q, category: selectedCategories[0], listing: "rent", state });
                    }}
                    className="accent-cheesco-yellow"
                  />
                  <span>For Rent</span>
                </label>
              </div>
            </div>

            {/* 3. Location Select */}
            <div className="mt-4 border-b border-line-soft pb-4">
              <div className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-muted">
                Location
              </div>
              <div className="relative">
                <select
                  value={state}
                  onChange={(e) => {
                    setState(e.target.value);
                    fetchEquipment({ q, category: selectedCategories[0], listing, state: e.target.value });
                  }}
                  className="h-10 w-full appearance-none rounded-xl bg-canvas-deep px-3 pr-8 text-xs font-semibold text-ink outline-none ring-1 ring-line-soft focus:ring-1 focus:ring-cheesco-yellow"
                >
                  <option value="">Select Location</option>
                  {NIGERIAN_STATES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-3 top-3 text-xs text-ink-muted">▼</span>
              </div>
            </div>

            {/* 4. Price Range */}
            <div className="mt-4 border-b border-line-soft pb-4">
              <div className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-muted">
                Price Range (₦)
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Min"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value.replace(/\D/g, ""))}
                  className="h-9 rounded-lg bg-canvas-deep px-2.5 text-xs text-ink outline-none ring-1 ring-line-soft focus:ring-1 focus:ring-cheesco-yellow"
                />
                <input
                  type="text"
                  placeholder="Max"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value.replace(/\D/g, ""))}
                  className="h-9 rounded-lg bg-canvas-deep px-2.5 text-xs text-ink outline-none ring-1 ring-line-soft focus:ring-1 focus:ring-cheesco-yellow"
                />
              </div>
            </div>

            {/* 5. Brand Select */}
            <div className="mt-4 border-b border-line-soft pb-4">
              <div className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-muted">
                Brand
              </div>
              <div className="relative">
                <select
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className="h-10 w-full appearance-none rounded-xl bg-canvas-deep px-3 pr-8 text-xs font-semibold text-ink outline-none ring-1 ring-line-soft focus:ring-1 focus:ring-cheesco-yellow"
                >
                  <option value="">Select Brand</option>
                  {BRANDS.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-3 top-3 text-xs text-ink-muted">▼</span>
              </div>
            </div>

            {/* 6. Condition Checkboxes */}
            <div className="mt-4 border-b border-line-soft pb-4">
              <div className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-muted">
                Condition
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-xs font-medium text-ink cursor-pointer hover:text-cheesco-yellow">
                  <input
                    type="checkbox"
                    checked={condition === "NEW"}
                    onChange={() => setCondition(condition === "NEW" ? "" : "NEW")}
                    className="accent-cheesco-yellow"
                  />
                  <span>New</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-medium text-ink cursor-pointer hover:text-cheesco-yellow">
                  <input
                    type="checkbox"
                    checked={condition === "USED"}
                    onChange={() => setCondition(condition === "USED" ? "" : "USED")}
                    className="accent-cheesco-yellow"
                  />
                  <span>Used</span>
                </label>
              </div>
            </div>

            {/* 7. Operator Included Checkboxes */}
            <div className="mt-4">
              <div className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-muted">
                Operator Included
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-xs font-medium text-ink cursor-pointer hover:text-cheesco-yellow">
                  <input
                    type="checkbox"
                    checked={operatorIncluded === true}
                    onChange={() => setOperatorIncluded(operatorIncluded === true ? null : true)}
                    className="accent-cheesco-yellow"
                  />
                  <span>Yes</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-medium text-ink cursor-pointer hover:text-cheesco-yellow">
                  <input
                    type="checkbox"
                    checked={operatorIncluded === false}
                    onChange={() => setOperatorIncluded(operatorIncluded === false ? null : false)}
                    className="accent-cheesco-yellow"
                  />
                  <span>No</span>
                </label>
              </div>
            </div>
          </div>
        </aside>

        {/* ── Main Results Area (Matches Screen 3) ── */}
        <main>
          {/* Header Bar: Showing results + Sort By */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line-soft bg-card px-5 py-3 shadow-sm">
            <div className="text-sm font-black text-ink">
              Showing <span className="text-cheesco-yellow">{filteredAndSorted.length}</span> results
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-ink-muted">Sort by:</span>
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="h-9 appearance-none rounded-lg bg-canvas-deep pl-3 pr-7 text-xs font-bold text-ink outline-none ring-1 ring-line-soft focus:ring-1 focus:ring-cheesco-yellow"
                >
                  <option value="newest">Newest</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                  <option value="hours_asc">Lowest Operating Hours</option>
                </select>
                <span className="pointer-events-none absolute right-2.5 top-2.5 text-[10px] text-ink-muted">▼</span>
              </div>
            </div>
          </div>

          {/* Equipment Results Grid */}
          {loading ? (
            <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="card-surface animate-pulse rounded-2xl h-80" />
              ))}
            </div>
          ) : filteredAndSorted.length === 0 ? (
            <div className="card-surface mt-6 rounded-2xl p-16 text-center shadow-sm">
              <div className="text-4xl">🔍</div>
              <div className="mt-3 text-base font-bold text-ink">No equipment matches your filters</div>
              <p className="mt-1 text-xs text-ink-muted">
                Try widening your search or clearing selected filters.
              </p>
              <button
                type="button"
                onClick={clearAll}
                className="mt-5 rounded-xl bg-cheesco-yellow px-5 py-2 text-xs font-bold text-canvas transition-all hover:bg-cheesco-yellow-bright"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {filteredAndSorted.map((eq) => (
                <EquipmentCard key={eq.id} eq={eq} />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

