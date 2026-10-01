import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { RentalRequestClient } from "@/components/rental-request-client";
import { equipmentBySlug } from "@/lib/seed";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ kind?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const eq = equipmentBySlug(slug);
  if (!eq) return { title: "Equipment Not Found" };
  return {
    title: `Request ${eq.name} — Cheesco Equip Hub`,
    description: `Submit a rental or purchase request for ${eq.name}`,
  };
}

export default async function RequestPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { kind } = await searchParams;
  const eq = equipmentBySlug(slug);

  if (!eq) notFound();

  return (
    <>
      <Navbar />
      <RentalRequestClient eq={eq} kind={(kind as 'rent' | 'buy') || 'rent'} />
      <Footer />
    </>
  );
}
