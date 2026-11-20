import { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "Merchant Portal & Fleet Manager",
    template: "%s | Cheesco Merchant",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function MerchantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
