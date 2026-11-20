import { Suspense } from "react";
import type { Metadata } from "next";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { BrowseClient } from "@/components/browse-client";
import { equipmentService, normalizeEquipmentRow } from "@/lib/services/equipment.service";
import type { Equipment } from "@/lib/types";

export const metadata: Metadata = {
  title: "Browse Heavy Equipment",
  description:
    "Browse Cheesco-verified excavators, cranes, trucks, generators and more for managed rental or sale across Nigeria.",
};

// Re-render at most once every 60 seconds — public browse data doesn't change per-second.
// Individual equipment pages that go in/out of stock will be revalidated via revalidateTag().
export const revalidate = 60;

async function getInitialEquipment(): Promise<Equipment[]> {
  try {
    const data = await equipmentService.browse({}, 100);
    if (data && data.length > 0) {
      // normalizeEquipmentRow is the shared canonical normalizer from equipment.service.ts
      return data.map(normalizeEquipmentRow);
    }
  } catch (err) {
    console.warn("Server browse error:", err);
  }
  return [];
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
