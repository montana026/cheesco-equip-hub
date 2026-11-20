import { Metadata } from "next";
import { FinanceClient } from "@/components/finance-client";

export const metadata: Metadata = {
  title: "Equipment Financing & Lease-to-Own",
  description:
    "Flexible heavy equipment lease-to-own facilities, milestone-backed repayments, and project capital solutions for Nigerian civil contractors.",
  alternates: {
    canonical: "/finance",
  },
  openGraph: {
    title: "Heavy Equipment Financing & Lease-to-Own | Cheesco Equip Hub",
    description:
      "Structured equipment financing and lease-to-own solutions designed for infrastructure contractors in Nigeria.",
    url: "https://cheescoequiphub.com/finance",
    images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "Cheesco Equipment Financing" }],
  },
};

export default function FinancePage() {
  return <FinanceClient />;
}
