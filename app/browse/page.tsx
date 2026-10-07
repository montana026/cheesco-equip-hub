import { Suspense } from "react";
import type { Metadata } from "next";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { BrowseClient } from "@/components/browse-client";
import type { Equipment } from "@/lib/types";

export const metadata: Metadata = {
  title: "Browse Heavy Equipment",
  description:
    "Browse Cheesco-verified excavators, cranes, trucks, generators and more for managed rental or sale across Nigeria.",
};

/** Normalise a raw Supabase equipment row → Equipment interface (camelCase) */
function normalizeEquipment(raw: Record<string, any>): Equipment {
  const primaryImg =
    raw.images?.find((i: any) => i.is_primary)?.image_url ??
    raw.images?.[0]?.image_url ??
    "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=1200&q=70";

  return {
    id: raw.id,
    slug: raw.slug,
    merchantId: raw.merchant_id,
    merchantName: raw.merchant?.business_name ?? "Cheesco Verified Merchant",
    name: raw.name,
    category: raw.category,
    brand: raw.brand,
    model: raw.model,
    year: raw.year,
    condition: raw.condition,
    locationState: raw.location_state,
    locationCity: raw.location_city,
    operatingHours: raw.operating_hours ?? 0,
    description: raw.description ?? "",
    specs: raw.specs ?? {},
    listingType: raw.listing_type,
    salePrice: raw.sale_price ?? undefined,
    merchantRentalRate: raw.merchant_rental_rate,
    cheescoAdjustedRate: raw.cheesco_adjusted_rate ?? undefined,
    isOperatorIncluded: raw.is_operator_included ?? false,
    isDeliveryAvailable: raw.is_delivery_available ?? true,
    images: [primaryImg],
    privateDocuments: [],
    verificationStatus: raw.verification_status,
    availabilityStatus: raw.availability_status,
    isFeatured: raw.is_featured ?? false,
    promotionTier: raw.promotion_tier ?? "NONE",
    promotionExpiresAt: raw.promotion_expires_at ?? undefined,
    adsMetrics: undefined,
  };
}

async function getInitialEquipment(): Promise<Equipment[]> {
  try {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const res = await fetch(`${base}/api/equipment?limit=100`, {
      next: { revalidate: 60 }, // ISR: re-fetch at most every 60 s
    });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.data ?? []).map(normalizeEquipment);
  } catch {
    return [];
  }
}

export default async function BrowsePage() {
  const initialEquipment = await getInitialEquipment();

  return (
    <>
      <Navbar />
      <Suspense fallback={<div className="min-h-screen bg-canvas" />}>
        <BrowseClient initialEquipment={initialEquipment} />
      </Suspense>
      <Footer />
    </>
  );
}
