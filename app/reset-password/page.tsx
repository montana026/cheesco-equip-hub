import { Suspense } from "react";
import { ResetPasswordClient } from "@/components/reset-password-client";

export const metadata = {
  title: "Reset Password",
  description: "Set a new password for your Cheesco Equip Hub account.",
};

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-canvas" />}>
      <ResetPasswordClient />
    </Suspense>
  );
}
