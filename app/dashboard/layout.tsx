import { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "Customer Portal & Rental Deployments",
    template: "%s | Cheesco Customer",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
