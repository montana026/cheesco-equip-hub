import { Suspense } from "react";
import type { Metadata } from "next";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { BrowseClient } from "@/components/browse-client";

export const metadata: Metadata = {
  title: "Browse Heavy Equipment",
  description:
    "Browse Cheesco-verified excavators, cranes, trucks, generators and more for managed rental or sale across Nigeria.",
};

export default function BrowsePage() {
  return (
    <>
      <Navbar />
      <Suspense fallback={<div className="min-h-screen bg-canvas" />}>
        <BrowseClient />
      </Suspense>
      <Footer />
    </>
  );
}
