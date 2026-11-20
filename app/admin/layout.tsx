import { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "Admin Operations & Verification Desk",
    template: "%s | Cheesco Admin",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
