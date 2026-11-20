import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { EquipmentDetailClient } from "@/components/equipment-detail";
import { equipmentService } from "@/lib/services/equipment.service";

interface Props {
  params: Promise<{ slug: string }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const eq = await equipmentService.getEquipmentBySlug(slug);
  if (!eq) return { title: "Equipment Not Found | Cheesco Equip Hub" };
  return {
    title: `${eq.brand} ${eq.model} — ${eq.category} | Cheesco Equip Hub`,
    description: `${eq.name} in ${eq.locationCity}, ${eq.locationState}. ${eq.description || ""}`,
  };
}

export default async function EquipmentPage({ params }: Props) {
  const { slug } = await params;
  const eq = await equipmentService.getEquipmentBySlug(slug);
  if (!eq) notFound();

  // Track ad impression if equipment has an active promotion campaign
  if (eq.id && eq.promotionTier && eq.promotionTier !== "NONE") {
    import("@/lib/services/ad-campaign.service")
      .then(({ adCampaignService }) => adCampaignService.recordMetric(eq.id, "impression"))
      .catch(() => {});
  }

  return (
    <>
      <Navbar />
      <EquipmentDetailClient eq={eq} />
      <Footer />
    </>
  );
}
