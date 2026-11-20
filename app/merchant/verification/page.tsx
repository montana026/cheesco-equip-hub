"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { SessionUser } from "@/lib/auth";
import { useAuthGuard } from "@/lib/hooks/use-auth-guard";
import { DashboardShell } from "@/components/dashboard-shell";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import Link from "next/link";
import { apiFetch } from "@/lib/api-client";

const NAV = [
  { href: "/merchant/dashboard", label: "Overview" },
  { href: "/merchant/listings", label: "My Listings" },
  { href: "/merchant/ads", label: "Ad Campaigns" },
  { href: "/merchant/earnings", label: "Earnings & Payouts" },
  { href: "/merchant/verification", label: "Verification (KYC)" },
];

export default function MerchantVerificationPage() {
  const router = useRouter();
  const { user, ready } = useAuthGuard("MERCHANT");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<"FORM" | "SUBMITTED" | "VERIFIED" | "MORE_INFO" | "REJECTED">("FORM");
  const [verificationNotes, setVerificationNotes] = useState("");

  const [form, setForm] = useState({
    businessName: "",
    cacNumber: "",
    businessType: "Equipment Supplier / Fleet Operator",
    contactName: "",
    phone: "",
    address: "",
    cacDocUrl: "",
    idDocUrl: "",
    addressDocUrl: "",
  });

  useEffect(() => {
    if (!ready || !user) return;
    loadVerificationStatus();
  }, [ready, user]);

  const loadVerificationStatus = async () => {
    setLoading(true);
    try {
      const response = await apiFetch("/api/merchant/verification");
      const result = await response.json();

      if (result.success && result.data) {
        const vStatus = result.data.verificationStatus;
        if (vStatus === "VERIFIED") {
          setStatus("VERIFIED");
        } else if (vStatus === "SUBMITTED" || vStatus === "UNDER_REVIEW") {
          setStatus("SUBMITTED");
        } else if (vStatus === "MORE_INFORMATION_REQUIRED") {
          setStatus("MORE_INFO");
          setVerificationNotes(result.data.verificationNotes || "");
        } else if (vStatus === "REJECTED") {
          setStatus("REJECTED");
          setVerificationNotes(result.data.verificationNotes || "");
        }

        if (result.data.businessName) {
          setForm((prev) => ({
            ...prev,
            businessName: result.data.businessName || prev.businessName,
          }));
        }
      }
    } catch (e) {
      console.error("Failed to load verification status:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (field: "cacDocUrl" | "idDocUrl" | "addressDocUrl", file: File) => {
    // Documents must be uploaded via /api/upload before submission.
    // This handler simulates the upload on the client by routing to the upload API.
    const formData = new FormData();
    formData.append("file", file);
    formData.append("bucket", "merchant-documents");
    apiFetch("/api/upload", { method: "POST", body: formData })
      .then((res: any) => {
        const url = res?.url || res?.data?.url;
        if (url) {
          setForm((prev) => ({ ...prev, [field]: url }));
          toast.success(`${file.name} uploaded successfully!`);
        } else {
          toast.error("Upload failed — no URL returned.");
        }
      })
      .catch(() => toast.error("Upload failed. Please try again."));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.businessName || !form.cacNumber || !form.phone) {
      toast.error("Please fill in all required business details.");
      return;
    }

    setSubmitting(true);
    try {
      const docs = [
        form.cacDocUrl,
        form.idDocUrl,
      ].filter(Boolean) as string[];

      const response = await apiFetch("/api/merchant/verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          documentType: "BUSINESS_REGISTRATION",
          documents: docs,
          businessName: form.businessName,
          cacNumber: form.cacNumber,
          businessType: form.businessType,
          contactName: form.contactName,
          phone: form.phone,
          address: form.address,
        }),
      });

      const result = await response.json();
      if (result.success) {
        toast.success("Verification documents submitted! Your application is now in the admin review queue.");
        setStatus("SUBMITTED");
      } else {
        throw new Error(result.error || "Failed to submit verification");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to submit verification.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardShell
      user={user}
      nav={NAV}
      title="Merchant Verification (KYC)"
      subtitle="Complete your business accreditation to activate listings and receive payout disbursements"
    >
      <div className="max-w-2xl mx-auto py-4">
        {loading ? (
          <div className="text-center py-20 text-xs text-ink-muted">Loading verification records...</div>
        ) : status === "VERIFIED" ? (
          <div className="rounded-2xl border border-green-500/30 bg-card p-8 text-center shadow-lg">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20 text-green-400 text-3xl font-black mb-4">
              ✓
            </div>
            <div className="inline-block rounded-full bg-green-500/10 px-3 py-1 text-xs font-bold text-green-400 mb-2">
              Accredited Equipment Merchant
            </div>
            <h2 className="text-2xl font-black text-ink">Your Business is Fully Verified!</h2>
            <p className="mt-2 text-xs text-ink-muted max-w-md mx-auto">
              You are authorized to publish equipment listings, accept contractor rental bookings, and access guaranteed escrow disbursements.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Link
                href="/merchant/listings/new"
                className="rounded-xl bg-cheesco-yellow px-5 py-2.5 text-xs font-black text-[#0A0D14] hover:bg-cheesco-yellow-bright transition-all"
              >
                + Add Equipment Listing
              </Link>
              <Link
                href="/merchant/dashboard"
                className="rounded-xl border border-line-soft bg-canvas px-5 py-2.5 text-xs font-bold text-ink hover:border-cheesco-yellow transition-all"
              >
                View Dashboard
              </Link>
            </div>
          </div>
        ) : status === "SUBMITTED" ? (
          <div className="rounded-2xl border border-cheesco-yellow/40 bg-card p-8 text-center shadow-lg">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-cheesco-yellow/20 text-cheesco-yellow text-3xl font-black mb-4">
              ⏳
            </div>
            <div className="inline-block rounded-full bg-cheesco-yellow/10 px-3 py-1 text-xs font-bold text-cheesco-yellow mb-2">
              Application Under Review
            </div>
            <h2 className="text-2xl font-black text-ink">Verification Application Submitted</h2>
            <p className="mt-2 text-xs text-ink-muted max-w-md mx-auto">
              Our compliance & verification desk is reviewing your CAC certificate, government ID, and fleet documentation. Verification typically takes 24 to 48 hours.
            </p>
            <div className="mt-6 rounded-xl bg-canvas p-4 text-xs text-ink-muted border border-line-soft max-w-md mx-auto text-left">
              <div className="font-bold text-ink mb-1">What happens next?</div>
              <ul className="space-y-1 list-disc list-inside text-[11px]">
                <li>Compliance team checks CAC corporate status with CAC registry</li>
                <li>Physical equipment yard verification may be scheduled if required</li>
                <li>You will receive an email & SMS alert once approved</li>
              </ul>
            </div>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-line-soft bg-card p-6 sm:p-8 shadow-sm"
          >
            {status === "MORE_INFO" && (
              <div className="mb-6 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-xs">
                <div className="font-bold text-amber-400">Action Required: Compliance Officer Note</div>
                <div className="mt-1 text-ink">{verificationNotes || "Please provide updated corporate documents."}</div>
              </div>
            )}

            <div className="border-b border-line-soft pb-4 mb-6">
              <span className="text-[10px] font-black uppercase tracking-widest text-cheesco-yellow">
                Accreditation Process
              </span>
              <h1 className="text-2xl font-black text-ink mt-1">Merchant KYC & Verification</h1>
              <p className="text-xs text-ink-muted mt-1">
                Upload your CAC company registration, director identity, and equipment yard address to list heavy machinery.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-ink mb-1.5">
                    Registered Business Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.businessName}
                    onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                    placeholder="e.g. Niger Delta Rigging Ltd"
                    className="w-full rounded-lg border border-line-soft bg-canvas px-3.5 py-2.5 text-xs text-ink placeholder-zinc-500 focus:border-cheesco-yellow focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink mb-1.5">
                    CAC Registration (RC / BN Number) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.cacNumber}
                    onChange={(e) => setForm({ ...form, cacNumber: e.target.value })}
                    placeholder="e.g. RC-1849204"
                    className="w-full rounded-lg border border-line-soft bg-canvas px-3.5 py-2.5 text-xs text-ink placeholder-zinc-500 focus:border-cheesco-yellow focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-ink mb-1.5">Primary Contact Person</label>
                  <input
                    type="text"
                    value={form.contactName}
                    onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                    placeholder="Director / Fleet Manager Name"
                    className="w-full rounded-lg border border-line-soft bg-canvas px-3.5 py-2.5 text-xs text-ink placeholder-zinc-500 focus:border-cheesco-yellow focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink mb-1.5">
                    Direct Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+234 800 000 0000"
                    className="w-full rounded-lg border border-line-soft bg-canvas px-3.5 py-2.5 text-xs text-ink placeholder-zinc-500 focus:border-cheesco-yellow focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-ink mb-1.5">
                  Machinery Yard / Registered Office Address
                </label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="Plot number, industrial layout, city, state"
                  className="w-full rounded-lg border border-line-soft bg-canvas px-3.5 py-2.5 text-xs text-ink placeholder-zinc-500 focus:border-cheesco-yellow focus:outline-none"
                />
              </div>

              {/* 3 Document Upload Slots */}
              <div className="border-t border-line-soft pt-4 space-y-3">
                <div className="text-xs font-bold text-ink mb-2">Required Verification Documents (PDF / PNG / JPG)</div>

                {/* 1. CAC Certificate */}
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-line-soft bg-canvas">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400 text-lg">
                      🏢
                    </div>
                    <div>
                      <div className="text-xs font-bold text-ink">CAC Certificate of Incorporation</div>
                      <div className="text-[10px] text-ink-muted">
                        {form.cacDocUrl ? "✓ Document attached" : "Upload official registration certificate"}
                      </div>
                    </div>
                  </div>
                  <label className="cursor-pointer rounded-lg bg-card border border-line-soft px-3 py-1.5 text-xs font-bold text-ink hover:text-cheesco-yellow hover:border-cheesco-yellow transition-all">
                    <span>{form.cacDocUrl ? "Replace" : "Upload"}</span>
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={(e) => e.target.files?.[0] && handleFileUpload("cacDocUrl", e.target.files[0])}
                    />
                  </label>
                </div>

                {/* 2. Director ID */}
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-line-soft bg-canvas">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/15 text-blue-400 text-lg">
                      🪪
                    </div>
                    <div>
                      <div className="text-xs font-bold text-ink">Director Valid Government ID</div>
                      <div className="text-[10px] text-ink-muted">
                        {form.idDocUrl ? "✓ Document attached" : "National ID, International Passport, or Driver's License"}
                      </div>
                    </div>
                  </div>
                  <label className="cursor-pointer rounded-lg bg-card border border-line-soft px-3 py-1.5 text-xs font-bold text-ink hover:text-cheesco-yellow hover:border-cheesco-yellow transition-all">
                    <span>{form.idDocUrl ? "Replace" : "Upload"}</span>
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={(e) => e.target.files?.[0] && handleFileUpload("idDocUrl", e.target.files[0])}
                    />
                  </label>
                </div>

                {/* 3. Proof of Address / Yard */}
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-line-soft bg-canvas">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-500/15 text-purple-400 text-lg">
                      📍
                    </div>
                    <div>
                      <div className="text-xs font-bold text-ink">Equipment Yard Proof of Address</div>
                      <div className="text-[10px] text-ink-muted">
                        {form.addressDocUrl ? "✓ Document attached" : "Utility bill or yard lease agreement"}
                      </div>
                    </div>
                  </div>
                  <label className="cursor-pointer rounded-lg bg-card border border-line-soft px-3 py-1.5 text-xs font-bold text-ink hover:text-cheesco-yellow hover:border-cheesco-yellow transition-all">
                    <span>{form.addressDocUrl ? "Replace" : "Upload"}</span>
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={(e) => e.target.files?.[0] && handleFileUpload("addressDocUrl", e.target.files[0])}
                    />
                  </label>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-cheesco-yellow py-3.5 text-xs font-black text-[#0A0D14] hover:bg-cheesco-yellow-bright transition-all disabled:opacity-50 shadow-md shadow-cheesco-yellow/20"
              >
                {submitting ? "Submitting for Verification..." : "Submit Verification Application"}
              </button>
            </form>
          </motion.div>
        )}
      </div>
    </DashboardShell>
  );
}
