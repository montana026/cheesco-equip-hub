import { Metadata } from "next";
import { PaymentStatusClient } from "@/components/payment-status-client";

export const metadata: Metadata = {
  title: "Payment Verification",
  description: "Verify Paystack and Flutterwave escrow transaction status for Cheesco equipment rentals.",
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: "/payment-status",
  },
};

export default function PaymentStatusPage() {
  return <PaymentStatusClient />;
}
