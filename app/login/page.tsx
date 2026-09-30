import { Suspense } from "react";
import { AuthClient } from "@/components/auth-client";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-canvas" />}>
      <AuthClient mode="login" />
    </Suspense>
  );
}
