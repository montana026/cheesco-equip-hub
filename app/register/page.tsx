import { Metadata } from "next";
import { Suspense } from "react";
import { AuthClient } from "@/components/auth-client";

export const metadata: Metadata = {
  title: "Create Account",
  description: "Create an account on Cheesco Equip Hub to hire verified heavy machinery or list fleet equipment across Nigeria.",
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: "/register",
  },
};

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-canvas" />}>
      <AuthClient mode="register" />
    </Suspense>
  );
}
