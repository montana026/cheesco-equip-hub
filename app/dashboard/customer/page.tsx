import { Metadata } from "next";
import { CustomerDashboardClientWrapper } from "@/components/customer-dashboard-client";

export const metadata: Metadata = {
  title: "My Dashboard",
};

export default function CustomerDashboardPage() {
  return <CustomerDashboardClientWrapper />;
}
