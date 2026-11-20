import type {
  AdPackage,
  AdPackageType,
  Equipment,
  EquipmentCategory,
} from "./types";

/* ── UI constants re-exported from canonical source (seed-ui.ts) ── */
export {
  NIGERIAN_STATES,
  CATEGORY_META,
  AD_PACKAGES,
  adPackageByType,
} from "./seed-ui";

/* ── Seed catalog fallback layer ── */

const img = (seed: string) =>
  `https://images.unsplash.com/${seed}?auto=format&fit=crop&w=1200&q=70`;

interface SeedInput {
  id: string;
  name: string;
  category: EquipmentCategory;
  brand: string;
  model: string;
  year: number;
  condition: Equipment["condition"];
  state: string;
  city: string;
  hours: number;
  salePrice?: number;
  rent: number;
  listing: Equipment["listingType"];
  operator: boolean;
  delivery: boolean;
  promo: Equipment["promotionTier"];
  featured?: boolean;
  specs: Equipment["specs"];
  image: string;
  blurb: string;
}

const seeds: SeedInput[] = [
  {
    id: "eq-001", name: "Liebherr LTM 1090-4.2 Mobile Crane", category: "Cranes",
    brand: "Liebherr", model: "LTM 1090-4.2", year: 2021, condition: "USED_EXCELLENT",
    state: "Lagos", city: "Ikeja", hours: 4200, salePrice: 1450000000, rent: 850000,
    listing: "FOR_SALE_AND_RENT", operator: true, delivery: true,
    promo: "HOMEPAGE_HERO_SPOTLIGHT", featured: true,
    specs: { maxLiftCapacity: "90 t @ 3 m", boomReach: "52 m telescopic", enginePower: "360 kW", operatingWeight: "48 t" },
    image: img("photo-1541888946425-d81bb19240f5"),
    blurb: "90-tonner with full luffing jib — site-proven on high-rise and refinery lifts.",
  },
  {
    id: "eq-002", name: "CAT 336 GC Hydraulic Excavator", category: "Excavators",
    brand: "Caterpillar", model: "336 GC", year: 2022, condition: "USED_EXCELLENT",
    state: "Rivers", city: "Port Harcourt", hours: 3100, rent: 320000,
    listing: "FOR_RENT", operator: true, delivery: true,
    promo: "HOMEPAGE_FEATURED_GRID", featured: true,
    specs: { operatingWeight: "36 t", enginePower: "238 kW", boomReach: "6.5 m", fuelType: "Diesel" },
    image: img("photo-1526835657244-e8a5c2c0e3c2"),
    blurb: "Fuel-efficient GC hydraulics — the workhorse for mass excavation.",
  },
  {
    id: "eq-003", name: "Manitowoc MLC100-1 Crawler Crane", category: "Cranes",
    brand: "Manitowoc", model: "MLC100-1", year: 2019, condition: "USED_GOOD",
    state: "Abuja (FCT)", city: "Gwarinpa", hours: 6800, rent: 1100000,
    listing: "FOR_RENT", operator: true, delivery: true,
    promo: "NONE",
    specs: { maxLiftCapacity: "110 t", boomReach: "72 m lattice", operatingWeight: "130 t" },
    image: img("photo-1504307651254-356bf0ba29aa"),
    blurb: "Lattice-boom crawler for heavy process-module lifts.",
  },
  {
    id: "eq-004", name: "Sinotruk Howo 371 Tipper Truck", category: "Trucks",
    brand: "Sinotruk", model: "Howo 371", year: 2021, condition: "USED_GOOD",
    state: "Ogun", city: "Sagamu", hours: 12500, salePrice: 38000000, rent: 85000,
    listing: "FOR_SALE_AND_RENT", operator: true, delivery: true,
    promo: "CATEGORY_TOP_BOOST",
    specs: { enginePower: "271 kW", fuelType: "Diesel" },
    image: img("photo-1601584115197-04ecc0da31d7"),
    blurb: "10-cube tipper, fleet-maintained, ready for quarry runs.",
  },
  {
    id: "eq-005", name: "CAT D8T Bulldozer", category: "Bulldozers",
    brand: "Caterpillar", model: "D8T", year: 2020, condition: "USED_GOOD",
    state: "Kaduna", city: "Kaduna South", hours: 5400, rent: 450000,
    listing: "FOR_RENT", operator: true, delivery: true,
    promo: "NONE",
    specs: { operatingWeight: "39 t", enginePower: "266 kW", fuelType: "Diesel" },
    image: img("photo-1567093324170-cb5d3be35a1c"),
    blurb: "Ripper-equipped dozer for clearing and bulk push.",
  },
  {
    id: "eq-006", name: "Perkins 1250 kVA Generator Set", category: "Generators",
    brand: "Perkins", model: "4000 Series", year: 2022, condition: "NEW",
    state: "Lagos", city: "Lekki", hours: 120, salePrice: 95000000, rent: 260000,
    listing: "FOR_SALE_AND_RENT", operator: false, delivery: true,
    promo: "SEARCH_FIRST_PAGE", featured: true,
    specs: { enginePower: "1250 kVA standby", fuelType: "Diesel" },
    image: img("photo-1581092160562-40aa08e78837"),
    blurb: "Containerized 1250 kVA genset with sync panel — event & plant power.",
  },
  {
    id: "eq-007", name: "Volvo L120H Wheel Loader", category: "Loaders",
    brand: "Volvo CE", model: "L120H", year: 2021, condition: "USED_EXCELLENT",
    state: "Oyo", city: "Ibadan", hours: 2900, rent: 210000,
    listing: "FOR_RENT", operator: true, delivery: true,
    promo: "NONE",
    specs: { operatingWeight: "22 t", enginePower: "180 kW" },
    image: img("photo-1581094794329-c8112a89af12"),
    blurb: "High-lift loader with quick coupler and bucket options.",
  },
  {
    id: "eq-008", name: "Goldhofer 60-Ton Lowbed Trailer", category: "Lowbeds",
    brand: "Goldhofer", model: "STZ-TL4", year: 2018, condition: "USED_GOOD",
    state: "Delta", city: "Warri", hours: 0, rent: 180000,
    listing: "FOR_RENT", operator: true, delivery: true,
    promo: "NONE",
    specs: { maxLiftCapacity: "60 t deck load", operatingWeight: "24 t (trailer)" },
    image: img("photo-1586191582056-b7f0a7f7dd55"),
    blurb: "4-axle hydraulic lowbed with ramps for plant haulage.",
  },
  {
    id: "eq-009", name: "Toyota 8FD30 Rough-Terrain Forklift", category: "Forklifts",
    brand: "Toyota", model: "8FD30", year: 2020, condition: "USED_GOOD",
    state: "Enugu", city: "Emene", hours: 4100, rent: 95000,
    listing: "FOR_RENT", operator: false, delivery: true,
    promo: "NONE",
    specs: { maxLiftCapacity: "3 t @ 500 mm" },
    image: img("photo-1586528116311-ad8dd5c8310d"),
    blurb: "3-ton pneumatic forklift for yards and laydown areas.",
  },
  {
    id: "eq-010", name: "Bomag BW 213 D-5 Vibratory Roller", category: "Compactors",
    brand: "Bomag", model: "BW 213 D-5", year: 2021, condition: "USED_EXCELLENT",
    state: "Kano", city: "Nassarawa GRA", hours: 2200, rent: 130000,
    listing: "FOR_RENT", operator: true, delivery: true,
    promo: "NONE",
    specs: { operatingWeight: "13 t", enginePower: "112 kW" },
    image: img("photo-1503387762-592deb58ef4e"),
    blurb: "13-ton smooth-drum roller for subgrade and asphalt.",
  },
  {
    id: "eq-011", name: "Komatsu PC490LC-11 Excavator", category: "Excavators",
    brand: "Komatsu", model: "PC490LC-11", year: 2023, condition: "USED_EXCELLENT",
    state: "Akwa Ibom", city: "Uyo", hours: 1500, salePrice: 620000000, rent: 480000,
    listing: "FOR_SALE_AND_RENT", operator: true, delivery: true,
    promo: "NONE",
    specs: { operatingWeight: "49 t", enginePower: "270 kW", boomReach: "7.1 m" },
    image: img("photo-1590494165264-1ebe3602eb80"),
    blurb: "Late-model 49-tonner with Grade Control ready hydraulics.",
  },
  {
    id: "eq-012", name: "XCMG XCA220 All-Terrain Crane", category: "Cranes",
    brand: "XCMG", model: "XCA220", year: 2022, condition: "NEW",
    state: "Abuja (FCT)", city: "Central Area", hours: 350, salePrice: 2100000000, rent: 1500000,
    listing: "FOR_SALE_AND_RENT", operator: true, delivery: true,
    promo: "NONE", featured: true,
    specs: { maxLiftCapacity: "220 t", boomReach: "68 m", enginePower: "440 kW" },
    image: img("photo-1547650272-1ea2b48a2f11"),
    blurb: "220-ton all-terrain crane — wind-farm and tower-build spec.",
  },
];

function buildEquipment(s: SeedInput): Equipment {
  const hasPromo = s.promo !== "NONE";
  return {
    id: s.id,
    slug: s.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    merchantId: `mrc-${s.id.slice(-1)}`,
    merchantName: "Cheesco Verified Merchant",
    name: s.name,
    category: s.category,
    brand: s.brand,
    model: s.model,
    year: s.year,
    condition: s.condition,
    locationState: s.state,
    locationCity: s.city,
    operatingHours: s.hours,
    description: s.blurb,
    specs: s.specs,
    listingType: s.listing,
    salePrice: s.salePrice,
    merchantRentalRate: s.rent,
    cheescoAdjustedRate: Math.round(s.rent * 1.15),
    isOperatorIncluded: s.operator,
    isDeliveryAvailable: s.delivery,
    images: [s.image, img("photo-1541888946425-d81bb19240f5")],
    privateDocuments: [],
    verificationStatus: "VERIFIED",
    availabilityStatus: "AVAILABLE",
    isFeatured: !!s.featured,
    promotionTier: s.promo,
    promotionExpiresAt: hasPromo
      ? new Date(Date.now() + 7 * 86400000).toISOString()
      : undefined,
    adsMetrics: hasPromo
      ? {
          impressions: Math.round(1200 + Math.random() * 4000),
          clicks: Math.round(80 + Math.random() * 400),
          enquiries: Math.round(4 + Math.random() * 30),
        }
      : undefined,
  };
}

export const EQUIPMENT: Equipment[] = seeds.map(buildEquipment);

export const equipmentBySlug = (slug: string) =>
  EQUIPMENT.find((e) => e.slug === slug);

/* Sponsored ranking: paid tiers first (in package price order), then featured, then rest */
const PROMO_ORDER: Record<string, number> = {
  HOMEPAGE_HERO_SPOTLIGHT: 0,
  HOMEPAGE_FEATURED_GRID: 1,
  CATEGORY_TOP_BOOST: 2,
  SEARCH_FIRST_PAGE: 3,
  NONE: 9,
};

export function sponsoredRank(list: Equipment[]): Equipment[] {
  return [...list].sort(
    (a, b) =>
      PROMO_ORDER[a.promotionTier] - PROMO_ORDER[b.promotionTier] ||
      Number(b.isFeatured) - Number(a.isFeatured) ||
      (b.merchantRentalRate ?? 0) - (a.merchantRentalRate ?? 0)
  );
}
