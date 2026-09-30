import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { EquipmentDetailClient } from "@/components/equipment-detail";
import { EQUIPMENT, equipmentBySlug } from "@/lib/seed";

interface Props {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return EQUIPMENT.map((eq) => ({ slug: eq.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const eq = equipmentBySlug(slug);
  if (!eq) return { title: "Equipment Not Found" };
  return {
    title: `${eq.brand} ${eq.model} — ${eq.category}`,
    description: `${eq.name} in ${eq.locationCity}, ${eq.locationState}. ${eq.description}`,
  };
}

export default async function EquipmentPage({ params }: Props) {
  const { slug } = await params;
  const eq = equipmentBySlug(slug);
  if (!eq) notFound();

  return (
    <>
      <Navbar />
      <EquipmentDetailClient eq={eq} />
      <Footer />
    </>
  );
}
