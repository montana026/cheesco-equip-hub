import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { RentalRequestClient } from "@/components/rental-request-client";
import { equipmentService } from "@/lib/services/equipment.service";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ kind?: string }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const eq = await equipmentService.getEquipmentBySlug(slug);
  if (!eq) return { title: "Equipment Not Found | Cheesco Equip Hub" };
  return {
    title: `Request ${eq.name} — Cheesco Equip Hub`,
    description: `Submit a rental or purchase request for ${eq.name}`,
  };
}

export default async function RequestPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { kind } = await searchParams;
  const eq = await equipmentService.getEquipmentBySlug(slug);

  if (!eq) notFound();

  // Strict guard: equipment for sale cannot be rented, and vice-versa
  if (eq.listingType === 'FOR_SALE' && kind !== 'buy') {
    redirect(`/request/${eq.slug}?kind=buy`);
  }
  if (eq.listingType === 'FOR_RENT' && kind !== 'rent') {
    redirect(`/request/${eq.slug}?kind=rent`);
  }

  const effectiveKind = eq.listingType === 'FOR_SALE' ? 'buy' : eq.listingType === 'FOR_RENT' ? 'rent' : ((kind as 'rent' | 'buy') || 'rent');

  return (
    <>
      <Navbar />
      <RentalRequestClient eq={eq} kind={effectiveKind} />
      <Footer />
    </>
  );
}
