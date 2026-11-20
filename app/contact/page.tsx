import { Metadata } from "next";
import { ContactClient } from "@/components/contact-client";

export const metadata: Metadata = {
  title: "Contact Us & Dispatch Desk",
  description:
    "Get in touch with Cheesco Equip Hub dispatchers, equipment sourcing specialists, and customer support. Port Harcourt, Lagos, and Abuja.",
  alternates: {
    canonical: "/contact",
  },
  openGraph: {
    title: "Contact Cheesco Equip Hub — Dispatch & Heavy Machinery Sourcing",
    description:
      "Reach our dispatch desk, merchant verification officers, or technical assistance team across Nigeria.",
    url: "https://cheescoequiphub.com/contact",
    images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "Contact Cheesco Equip Hub" }],
  },
};

export default function ContactPage() {
  return <ContactClient />;
}
