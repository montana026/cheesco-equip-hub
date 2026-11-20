import { Suspense } from "react";
import { ForgotPasswordClient } from "@/components/forgot-password-client";

export const metadata = {
  title: "Forgot Password",
  description: "Reset your Cheesco Equip Hub password.",
};

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-canvas" />}>
      <ForgotPasswordClient />
    </Suspense>
  );
}
