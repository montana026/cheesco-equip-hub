"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSession, guardRoute } from "@/lib/auth";
import type { SessionUser } from "@/lib/auth";
import { DashboardShell } from "@/components/dashboard-shell";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import Link from "next/link";

const NAV = [
  { href: "/merchant/dashboard", label: "Overview" },
  { href: "/merchant/listings", label: "My Listings" },
  { href: "/merchant/ads", label: "Ad Campaigns" },
  { href: "/merchant/earnings", label: "Earnings" },
  { href: "/merchant/verification", label: "Verification (KYC)" },
];

export default function MerchantVerificationPage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<"FORM" | "PENDING" | "VERIFIED">("FORM");
  const [cacUploaded, setCacUploaded] = useState(false);
  const [idUploaded, setIdUploaded] = useState(false);
  const [addressProvided, setAddressProvided] = useState(false);
  const [docsUploaded, setDocsUploaded] = useState(false);

  useEffect(() => {
    const s = getSession();
    const redirect = guardRoute("MERCHANT", s);
    if (redirect) {
      router.replace(redirect);
      return;
    }
    setUser(s);
    loadVerificationStatus();
  }, [router]);

  const loadVerificationStatus = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch("/api/merchant/verification", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      if (result.success && result.data?.verificationStatus === "VERIFIED") {
        setStatus("VERIFIED");
      } else if (result.success && result.data?.verificationStatus === "UNDER_REVIEW") {
        setStatus("PENDING");
      }
    } catch {
      // default to FORM
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    toast.success("Verification documents submitted!");
    setStatus("PENDING");
  };

  if (!user) return <div className="min-h-screen bg-canvas" />;

  return (
    <DashboardShell user={user} nav={NAV} title="Merchant Verification">
      <div className="max-w-xl mx-auto py-6">
        {status === "FORM" && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="card-surface rounded-2xl p-6 sm:p-8 border border-line-soft shadow-xl"
          >
            {/* Header */}
            <div>
              <div className="text-xs font-bold text-cheesco-yellow uppercase tracking-widest">
                Verification
              </div>
              <h1 className="text-2xl font-black text-ink tracking-tight mt-1">
                Verify Your Business
              </h1>
              <p className="mt-1.5 text-xs text-ink-muted leading-relaxed">
                We need to verify your business and equipment details before you can start listing.
              </p>
            </div>

            {/* 4 Verification Checkpoints (Matching Screen 2) */}
            <div className="mt-6 space-y-3.5">
              {/* 1. Business Registration */}
              <div
                onClick={() => setCacUploaded(!cacUploaded)}
                className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                  cacUploaded ? "border-emerald-500/50 bg-emerald-500/5" : "border-line-soft bg-canvas-deep hover:border-line"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
                    🏢
                  </div>
                  <div>
                    <div className="text-xs font-bold text-ink">Business Registration</div>
                    <div className="text-[11px] text-ink-muted">Upload your CAC certificate</div>
                  </div>
                </div>
                <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                  cacUploaded ? "bg-emerald-500 text-white" : "border border-line-soft text-ink-faint"
                }`}>
                  {cacUploaded ? "✓" : "+"}
                </div>
              </div>

              {/* 2. ID Verification */}
              <div
                onClick={() => setIdUploaded(!idUploaded)}
                className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                  idUploaded ? "border-emerald-500/50 bg-emerald-500/5" : "border-line-soft bg-canvas-deep hover:border-line"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
                    🪪
                  </div>
                  <div>
                    <div className="text-xs font-bold text-ink">ID Verification</div>
                    <div className="text-[11px] text-ink-muted">Upload valid ID (NIN, DL, Voter's, Int'l Passport)</div>
                  </div>
                </div>
                <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                  idUploaded ? "bg-emerald-500 text-white" : "border border-line-soft text-ink-faint"
                }`}>
                  {idUploaded ? "✓" : "+"}
                </div>
              </div>

              {/* 3. Business Address */}
              <div
                onClick={() => setAddressProvided(!addressProvided)}
                className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                  addressProvided ? "border-emerald-500/50 bg-emerald-500/5" : "border-line-soft bg-canvas-deep hover:border-line"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
                    📍
                  </div>
                  <div>
                    <div className="text-xs font-bold text-ink">Business Address</div>
                    <div className="text-[11px] text-ink-muted">Provide your business/yard address</div>
                  </div>
                </div>
                <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                  addressProvided ? "bg-emerald-500 text-white" : "border border-line-soft text-ink-faint"
                }`}>
                  {addressProvided ? "✓" : "+"}
                </div>
              </div>

              {/* 4. Equipment Documentation */}
              <div
                onClick={() => setDocsUploaded(!docsUploaded)}
                className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                  docsUploaded ? "border-emerald-500/50 bg-emerald-500/5" : "border-line-soft bg-canvas-deep hover:border-line"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
                    📄
                  </div>
                  <div>
                    <div className="text-xs font-bold text-ink">Equipment Documentation</div>
                    <div className="text-[11px] text-ink-muted">Upload ownership or authorization documents</div>
                  </div>
                </div>
                <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                  docsUploaded ? "bg-emerald-500 text-white" : "border border-line-soft text-ink-faint"
                }`}>
                  {docsUploaded ? "✓" : "+"}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 space-y-3">
              <button
                type="button"
                onClick={handleContinue}
                className="h-11 w-full rounded-xl bg-cheesco-yellow font-black text-xs text-canvas shadow-md transition-all hover:bg-cheesco-yellow-bright hover:shadow-lg"
              >
                Continue
              </button>
              <div className="text-center">
                <Link
                  href="/merchant/dashboard"
                  className="text-xs font-semibold text-ink-muted hover:text-ink hover:underline"
                >
                  I'll do this later
                </Link>
              </div>
            </div>
          </motion.div>
        )}

        {status === "PENDING" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card-surface rounded-2xl p-6 sm:p-8 border border-line-soft shadow-xl text-center"
          >
            {/* Big Yellow Clock Illustration */}
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-cheesco-yellow/15 text-cheesco-yellow text-4xl mb-4">
              ⏳
            </div>

            <div className="text-xs font-bold text-cheesco-yellow uppercase tracking-widest">
              Verification Pending
            </div>
            <h2 className="text-xl font-black text-ink tracking-tight mt-1">
              Your account is under review
            </h2>
            <p className="mt-2 text-xs text-ink-muted max-w-sm mx-auto leading-relaxed">
              We've received your details and our team will review your information within 1-2 business days.
            </p>

            {/* Timeline checklist from Screen 2 */}
            <div className="mt-6 rounded-xl bg-canvas-deep p-4 text-left border border-line-soft space-y-3">
              <div className="flex items-center gap-2.5 text-xs font-semibold text-ink">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white text-[10px] font-bold">✓</span>
                <span>Business details submitted</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs font-semibold text-ink">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white text-[10px] font-bold">✓</span>
                <span>Documents uploaded</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs font-semibold text-cheesco-yellow">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-cheesco-yellow/20 text-cheesco-yellow text-[10px] font-bold">⏳</span>
                <span>Under review</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs font-semibold text-ink-faint">
                <span className="flex h-5 w-5 items-center justify-center rounded-full border border-line-soft text-[10px]">◯</span>
                <span>Approval notification</span>
              </div>
            </div>

            <div className="mt-6">
              <Link
                href="/merchant/dashboard"
                className="flex h-11 w-full items-center justify-center rounded-xl bg-cheesco-yellow font-black text-xs text-canvas shadow-md transition-all hover:bg-cheesco-yellow-bright hover:shadow-lg"
              >
                Back to Dashboard
              </Link>
            </div>
          </motion.div>
        )}

        {status === "VERIFIED" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card-surface rounded-2xl p-6 sm:p-8 border border-emerald-500/30 shadow-xl text-center"
          >
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400 text-3xl mb-4">
              ✓
            </div>
            <h2 className="text-xl font-black text-ink">Merchant Verified!</h2>
            <p className="mt-2 text-xs text-ink-muted max-w-sm mx-auto">
              Your business is approved. You have full access to list and promote equipment on Cheesco Equip Hub.
            </p>
            <div className="mt-6">
              <Link
                href="/merchant/listings/new"
                className="flex h-11 w-full items-center justify-center rounded-xl bg-cheesco-yellow font-black text-xs text-canvas shadow transition hover:bg-cheesco-yellow-bright"
              >
                + List Equipment Now
              </Link>
            </div>
          </motion.div>
        )}
      </div>
    </DashboardShell>
  );
}
