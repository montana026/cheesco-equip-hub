import { Metadata } from "next";
import { CustomerDashboardClient } from "@/components/customer-dashboard-client";

export const metadata: Metadata = {
  title: "My Dashboard",
};

export default function CustomerDashboardPage() {
  return <CustomerDashboardClient />;
}
