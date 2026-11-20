/**
 * UI constants safe to import in client components.
 *
 * IMPORTANT: This file is intentionally self-contained and does NOT re-export
 * from "@/lib/seed". That prevents bundlers from pulling in the large EQUIPMENT
 * array (11KB) when a client component only needs small lookup tables.
 *
 * Server-only code (services, API routes) should import directly from "@/lib/seed".
 */
import type { AdPackage, AdPackageType, EquipmentCategory } from "./types";

export const NIGERIAN_STATES = [
  "Lagos", "Abuja (FCT)", "Rivers", "Ogun", "Kano", "Delta", "Edo",
  "Kaduna", "Oyo", "Enugu", "Cross River", "Akwa Ibom",
] as const;

export const CATEGORY_META: Record<
  EquipmentCategory,
  { icon: string; blurb: string }
> = {
  Excavators: { icon: "⛏️", blurb: "20–50 ton tracked diggers for earthmoving" },
  Cranes: { icon: "🏗️", blurb: "Mobile, crawler & tower cranes for lifting" },
  Trucks: { icon: "🚚", blurb: "Tipper, flatbed & haulage trucks" },
  Bulldozers: { icon: "🚜", blurb: "Dozers for clearing, grading & push work" },
  Loaders: { icon: "🪣", blurb: "Wheel & track loaders for material handling" },
  Generators: { icon: "⚡", blurb: "Industrial gensets 100–2000 kVA" },
  Lowbeds: { icon: "🛻", blurb: "Lowbed trailers for heavy haulage" },
  Forklifts: { icon: "🏗", blurb: "Warehouse & rough-terrain forklifts" },
  Compactors: { icon: "🛞", blurb: "Vibratory rollers & soil compactors" },
  Other: { icon: "🔧", blurb: "Specialist & auxiliary plant" },
};

export const AD_PACKAGES: AdPackage[] = [
  {
    type: "HOMEPAGE_HERO_SPOTLIGHT",
    label: "Homepage Hero Spotlight",
    description: "Your unit starred in the homepage hero rotation — maximum visibility.",
    durationDays: 7,
    priceNgn: 120000,
  },
  {
    type: "HOMEPAGE_FEATURED_GRID",
    label: "Front Page Featured Showcase",
    description: "Featured card slot on the homepage showcase grid for the full duration.",
    durationDays: 14,
    priceNgn: 75000,
  },
  {
    type: "CATEGORY_TOP_BOOST",
    label: "Category Top Boost",
    description: "Pinned to the top of your equipment's category page.",
    durationDays: 14,
    priceNgn: 50000,
  },
  {
    type: "SEARCH_FIRST_PAGE",
    label: "Top-of-Search Boost",
    description: "Prioritized ranking across search results for your category & state.",
    durationDays: 7,
    priceNgn: 50000,
  },
];

export const adPackageByType = (t: AdPackageType): AdPackage =>
  AD_PACKAGES.find((p) => p.type === t)!;
