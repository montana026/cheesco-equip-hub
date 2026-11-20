import { Metadata } from "next";
import { Suspense } from "react";
import { AuthClient } from "@/components/auth-client";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to your Cheesco Equip Hub account to manage heavy equipment rentals, listings, and quotations.",
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: "/login",
  },
};

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-canvas" />}>
      <AuthClient mode="login" />
    </Suspense>
  );
}
