import { Metadata } from "next";
import { SupportClient } from "@/components/support-client";

export const metadata: Metadata = {
  title: "Customer Support & Incident Escalation",
  description:
    "Open an official support ticket, request breakdown assistance, report delivery delays, or resolve escrow payment questions.",
  alternates: {
    canonical: "/support",
  },
  openGraph: {
    title: "Support Desk & Breakdown Assistance | Cheesco Equip Hub",
    description:
      "Rapid ticket response for active machinery rentals, technician mobilization, and billing questions in Nigeria.",
    url: "https://cheescoequiphub.com/support",
    images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "Cheesco Equip Hub Support" }],
  },
};

export default function SupportPage() {
  return <SupportClient />;
}
