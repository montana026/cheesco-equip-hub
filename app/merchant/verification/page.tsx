"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSession, guardRoute } from "@/lib/auth";
import type { SessionUser } from "@/lib/auth";
import { DashboardShell } from "@/components/dashboard-shell";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { fmtNgnFull } from "@/lib/format";
import { storageService } from "@/lib/services/storage.service";

const NAV = [
  { href: "/merchant/dashboard", label: "Overview" },
  { href: "/merchant/listings", label: "My Listings" },
  { href: "/merchant/ads", label: "Ad Campaigns" },
  { href: "/merchant/earnings", label: "Earnings" },
  { href: "/merchant/verification", label: "Verification (KYC)" },
];

interface MerchantVerificationStatus {
  id: string;
  businessName: string;
  verificationStatus: string;
  verificationNotes: string | null;
  verifiedAt: string | null;
  verifiedBy: string | null;
  documents: Array<{
    id: string;
    documentType: string;
    documentUrl: string;
    uploadedAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

const DOCUMENT_TYPES = [
  { label: "ID Card/Passport", value: "ID_CARD" },
  { label: "Business Registration", value: "BUSINESS_REG" },
  { label: "Tax Certificate", value: "TAX_CERT" },
  { label: "Utility Bill", value: "UTILITY_BILL" },
  { label: "Bank Statement", value: "BANK_STATEMENT" },
];

export default function MerchantVerificationPage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [verification, setVerification] = useState<MerchantVerificationStatus | null>(null);
  const [documents, setDocuments] = useState<File[]>([]);
  const [documentPreviews, setDocumentPreviews] = useState<string[]>([]);
  const [selectedDocType, setSelectedDocType] = useState<string>("");
  const [submitLoading, setSubmitLoading] = useState(false);

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
      if (result.success) {
        setVerification(result.data);
      }
    } catch (error) {
      console.error("Failed to load verification status:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setDocuments(prev => [...prev, ...files]);

    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setDocumentPreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeDocument = (index: number) => {
    setDocuments(prev => prev.filter((_, i) => i !== index));
    setDocumentPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedDocType) {
      toast.error("Please select a document type");
      return;
    }

    if (documents.length === 0) {
      toast.error("Please upload at least one document");
      return;
    }

    setSubmitLoading(true);

    try {
      const token = localStorage.getItem("auth_token");
      if (!user) throw new Error("Not authenticated");

      // Upload documents to Supabase Storage
      const uploadResults = await storageService.uploadMerchantDocuments(
        documents,
        user.id // Using user.id as merchantId for now - this should come from user profile
      );
      const documentUrls = uploadResults.map((r: { url: string }) => r.url);

      const payload = {
        documentType: selectedDocType,
        documents: documentUrls,
      };

      const response = await fetch("/api/merchant/verification/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to upload documents");
      }

      toast.success("Documents uploaded successfully! Awaiting verification.");
      loadVerificationStatus();
    } catch (error: any) {
      toast.error(error.message || "Failed to upload documents");
    } finally {
      setSubmitLoading(false);
    }
  };

  if (!user) return <div className="min-h-screen bg-canvas" />;

  return (
    <DashboardShell user={user} nav={NAV} title="Verification (KYC)">
      {loading ? (
        <div className="text-center py-12 text-ink-muted">Loading verification status...</div>
      ) : verification ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto max-w-3xl"
        >
          {/* Status Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-black">Verification Status</h2>
              <div className={`px-4 py-2 rounded-full text-sm font-bold ${
                verification.verificationStatus === "VERIFIED" ? "bg-success/20 text-success" :
                verification.verificationStatus === "REJECTED" ? "bg-danger/20 text-danger" :
                verification.verificationStatus === "MORE_INFORMATION_REQUIRED" ? "bg-warn/20 text-warn" :
                "bg-line-soft"
              }`}>
                {verification.verificationStatus.replace(/_/g, " ").toUpperCase()}
              </div>
            </div>

            <div className="text-sm text-ink-muted mb-4">
              Business: {verification.businessName}
            </div>

            {/* Status Details */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="card-surface rounded-xl p-5">
                <h3 className="font-bold mb-3">Status Details</h3>
                <div className="space-y-2">
                  <div className="text-sm">
                    <span className="text-ink-faint">Submitted:</span>
                    <span className="font-medium">
                      {new Date(verification.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {verification.verifiedAt && (
                    <div className="text-sm">
                      <span className="text-ink-faint">Verified:</span>
                      <span className="font-medium">
                        {new Date(verification.verifiedAt).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  {verification.verifiedBy && (
                    <div className="text-sm">
                      <span className="text-ink-faint">Verified by:</span>
                      <span className="font-medium">{verification.verifiedBy}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="card-surface rounded-xl p-5">
                <h3 className="font-bold mb-3">Next Steps</h3>
                {verification.verificationStatus === "NOT_STARTED" && (
                  <div className="text-sm text-ink-muted">
                    <p>You haven't started the verification process yet.</p>
                    <p>Please upload your identification and business documents to begin.</p>
                  </div>
                )}
                {verification.verificationStatus === "SUBMITTED" || verification.verificationStatus === "UNDER_REVIEW" && (
                  <div className="text-sm text-ink-muted">
                    <p>Your documents have been submitted and are under review.</p>
                    <p>Verification typically takes 1-2 business days.</p>
                  </div>
                )}
                {verification.verificationStatus === "MORE_INFORMATION_REQUIRED" && (
                  <div className="text-sm text-ink-muted">
                    <p>We need more information to complete your verification.</p>
                    <p>{verification.verificationNotes}</p>
                  </div>
                )}
                {verification.verificationStatus === "VERIFIED" && (
                  <div className="text-sm text-ink-muted">
                    <p>Congratulations! Your merchant account is now verified.</p>
                    <p>You can now list equipment on the platform.</p>
                  </div>
                )}
                {verification.verificationStatus === "REJECTED" && (
                  <div className="text-sm text-ink-muted">
                    <p>Unfortunately, your verification was rejected.</p>
                    <p>{verification.verificationNotes}</p>
                    <p>You can resubmit with corrected documents.</p>
                  </div>
                )}
                {verification.verificationStatus === "SUSPENDED" && (
                  <div className="text-sm text-ink-muted">
                    <p>Your merchant account has been suspended.</p>
                    <p>Please contact support for more information.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Document Upload Section */}
            {verification.verificationStatus !== "VERIFIED" && verification.verificationStatus !== "REJECTED" && (
              <div className="mt-8">
                <h2 className="text-xl font-black mb-4">Upload Verification Documents</h2>
                <p className="text-sm text-ink-muted mb-6">
                  Please upload clear, legible copies of your identification and business documents.
                </p>

                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">
                    Document Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedDocType}
                    onChange={(e) => setSelectedDocType(e.target.value)}
                    className="auth-input"
                    required
                  >
                    <option value="">Select document type</option>
                    {DOCUMENT_TYPES.map((doc) => (
                      <option key={doc.value} value={doc.value}>
                        {doc.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">
                    Upload Documents <span className="text-red-500">*</span>
                  </label>
                  <div className="border-2 border-dashed border-line-soft rounded-lg p-6 text-center">
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      multiple
                      onChange={handleDocumentChange}
                      className="hidden"
                      id="verification-docs"
                    />
                    <label
                      htmlFor="verification-docs"
                      className="cursor-pointer inline-flex items-center gap-2 rounded-lg bg-card px-4 py-2 text-sm font-medium hover:bg-card-raised"
                    >
                      📄 Upload Documents
                    </label>
                    <p className="mt-2 text-xs text-ink-muted">
                      Upload up to 5 files (PDF, JPG, PNG). Max 10MB per file.
                    </p>
                  </div>

                  {documentPreviews.length > 0 && (
                    <div className="mt-4 grid grid-cols-3 gap-3">
                      {documentPreviews.map((preview, idx) => (
                        <div key={idx} className="relative">
                          {/* Handle different file types */}
                          {preview.endsWith('.pdf') || preview.endsWith('.PDF') ? (
                            <div className="h-24 w-full bg-card flex items-center justify-center rounded-lg">
                              <span className="text-2xl">📄</span>
                              <span className="text-sm font-medium text-ink-muted">PDF Document</span>
                            </div>
                          ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={preview}
                              alt={`Document ${idx + 1}`}
                              className="h-24 w-full rounded-lg object-cover"
                            />
                          )}
                          <button
                            type="button"
                            onClick={() => removeDocument(idx)}
                            className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs text-white"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium mb-2">
                    Additional Notes (Optional)
                  </label>
                  <textarea
                    placeholder="Any additional information that might help with verification..."
                    rows={4}
                    className="auth-input resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitLoading || !selectedDocType || documents.length === 0}
                  className="w-full rounded-lg bg-cheesco-yellow px-6 py-3 font-bold text-canvas hover:bg-cheesco-yellow-bright disabled:opacity-50"
                >
                  {submitLoading ? "Uploading..." : "Submit Documents"}
                </button>
              </div>
            )}

            {/* Existing Documents */}
            {verification.documents && verification.documents.length > 0 && (
              <div className="mt-8">
                <h2 className="text-xl font-black mb-4">Previously Uploaded Documents</h2>
                <div className="grid gap-4 sm:grid-cols-3">
                  {verification.documents.map((doc, idx) => (
                    <div key={doc.id} className="card-surface rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{doc.documentType.replace(/_/g, " ")}</span>
                        <span className={`text-xs ${
                          doc.uploadedAt > verification.updatedAt ? "text-success" : "text-ink-faint"
                        }`}>
                          {new Date(doc.uploadedAt).toLocaleDateString()}
                        </span>
                      </div>
                      {/* Handle different file types */}
                      {doc.documentUrl.endsWith('.pdf') || doc.documentUrl.endsWith('.PDF') ? (
                        <div className="h-20 w-full bg-card flex items-center justify-center rounded-lg mt-2">
                          <span className="text-2xl">📄</span>
                          <span className="text-sm font-medium text-ink-muted">PDF Document</span>
                        </div>
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={doc.documentUrl}
                          alt={`Document ${doc.documentType}`}
                          className="h-20 w-full rounded-lg object-cover mt-2"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            </div>
          </motion.div>
        ) : (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">⚠️</div>
            <div className="font-bold text-lg">Verification Data Not Found</div>
            <div className="text-sm text-ink-muted mt-1">
              Please contact support if this persists.
            </div>
          </div>
        )}
    </DashboardShell>
  );
}
