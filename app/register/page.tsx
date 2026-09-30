import { Suspense } from "react";
import { AuthClient } from "@/components/auth-client";

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-canvas" />}>
      <AuthClient mode="register" />
    </Suspense>
  );
}
