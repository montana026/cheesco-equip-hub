import type { Metadata } from "next";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Hero } from "@/components/hero";
import {
  TrustBar,
  CategoryCards,
  HowItWorks,
  Testimonials,
  SectorCoverage,
} from "@/components/sections";
import { SponsoredShowcase } from "@/components/sponsored-showcase";
import { supabaseServer } from "@/lib/supabase/server";
import { normalizeEquipmentRow } from "@/lib/services/equipment.service";
import type { Equipment } from "@/lib/types";

export const metadata: Metadata = {
  title: "Heavy Equipment Marketplace & Managed Rentals in Nigeria",
  description:
    "Nigeria's verified intermediary for heavy machinery sales, managed rentals, certified operators, and industrial logistics. Caterpillar, Komatsu, JCB, and more.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Cheesco Equip Hub — Heavy Equipment Marketplace & Managed Rentals",
    description:
      "Verified heavy machinery sales, managed rentals, certified operators, and industrial haulage across Nigeria.",
    url: "https://cheescoequiphub.com",
    images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "Cheesco Equip Hub Fleet" }],
  },
};

// Public homepage — cache the server render, revalidate at most once per 60s.
// No user-specific data is rendered at this level.
export const revalidate = 60;

/** Fetch featured equipment on the server so the homepage renders fully on first paint, taking leased machines off the homepage */
async function getFeaturedEquipment(): Promise<Equipment[]> {
  try {
    const todayStr = new Date().toISOString().split("T")[0];

    // ✅ Run availability checks and equipment fetch all in parallel — was 3 sequential awaits
    const [leasesRes, blocksRes, equipRes] = await Promise.all([
      supabaseServer
        .from("rental_requests")
        .select("equipment_id")
        .in("current_state", [
          "PAYMENT_CONFIRMED",
          "IN_TRANSIT",
          "DELIVERED",
          "RENTAL_ACTIVE",
          "DEPOSIT_HELD",
          "POST_RENTAL_INSPECTION",
        ])
        .gte("end_date", todayStr),
      supabaseServer
        .from("equipment_availability")
        .select("equipment_id")
        .lte("blocked_from", todayStr)
        .gte("blocked_to", todayStr),
      supabaseServer
        .from("equipment")
        .select(`
          id, slug, name, category, brand, model, year, condition,
          location_city, location_state, listing_type,
          cheesco_adjusted_rate, sale_price,
          operating_hours, is_operator_included, is_delivery_available,
          is_featured, promotion_tier, availability_status, verification_status,
          images:equipment_images(image_url, is_primary, display_order)
        `)
        .eq("verification_status", "VERIFIED")
        .neq("availability_status", "RENTED")
        .neq("availability_status", "MAINTENANCE")
        .order("is_featured", { ascending: false })
        .limit(20),
    ]);

    const leasedEquipmentIds = new Set<string>();
    (leasesRes.data || []).forEach((r) => { if (r.equipment_id) leasedEquipmentIds.add(r.equipment_id); });
    (blocksRes.data || []).forEach((b) => { if (b.equipment_id) leasedEquipmentIds.add(b.equipment_id); });

    if (!equipRes.data) return [];

    return equipRes.data
      .filter((r: any) => {
        // Strictly exclude any leased or reserved equipment from homepage
        if (r.availability_status === "RENTED" || r.availability_status === "MAINTENANCE") return false;
        if (leasedEquipmentIds.has(r.id) || (r.slug && leasedEquipmentIds.has(r.slug))) return false;
        return true;
      })
      .slice(0, 12)
      .map(normalizeEquipmentRow);
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const featuredEquipment = await getFeaturedEquipment();

  return (
    <>
      <Navbar />
      <main className="flex-1">
        <Hero />
        <TrustBar />
        <CategoryCards />
        {/* Equipment showcase — data pre-fetched on server, no client loading flash */}
        <SponsoredShowcase initialItems={featuredEquipment} />
        <HowItWorks />
        <Testimonials />
        <SectorCoverage />
      </main>
      <Footer />
    </>
  );
}
