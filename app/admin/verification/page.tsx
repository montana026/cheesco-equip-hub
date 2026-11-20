"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import type { SessionUser } from "@/lib/auth";
import type { UserRole } from "@/lib/types";
import { useAuthGuard } from "@/lib/hooks/use-auth-guard";
import { DashboardShell } from "@/components/dashboard-shell";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import Link from "next/link";
import { fmtNgnFull } from "@/lib/format";
import { apiFetch } from "@/lib/api-client";

const VERIFICATION_ROLES: UserRole[] = [
  "VERIFICATION_ADMIN",
  "OPERATIONS_ADMIN",
  "SUPER_ADMIN",
];

const NAV = [
  { href: "/admin/operations", label: "Operations" },
  { href: "/admin/verification", label: "Verification" },
  { href: "/admin/finance", label: "Finance" },
  { href: "/admin/support", label: "Support" },
];

interface MerchantPending {
  id: string;
  userId: string;
  businessName: string;
  businessType: string;
  registrationNumber: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  verificationStatus: string;
  verificationNotes?: string;
  documents: Array<{
    id: string;
    documentType: string;
    documentUrl: string;
    uploadedAt: string;
  }>;
  createdAt: string;
}

interface EquipmentPending {
  id: string;
  slug: string;
  merchantName: string;
  merchantEmail?: string;
  merchantPhone?: string;
  name: string;
  category: string;
  brand: string;
  model: string;
  year: number;
  condition: string;
  locationState: string;
  locationCity: string;
  listingType: string;
  merchantRentalRate: number;
  salePrice: number | null;
  verificationStatus: string;
  createdAt: string;
  images: string[];
  privateDocuments?: string[];
}

export default function VerificationDashboardPage() {
  const router = useRouter();
  const { user, ready } = useAuthGuard(VERIFICATION_ROLES);
  const [activeTab, setActiveTab] = useState<"MERCHANTS" | "EQUIPMENT">("MERCHANTS");
  const [loading, setLoading] = useState(true);
  const isFetchingRef = useRef(false);

  // Live data states
  const [merchants, setMerchants] = useState<MerchantPending[]>([]);
  const [selectedMerchant, setSelectedMerchant] = useState<MerchantPending | null>(null);

  const [equipmentList, setEquipmentList] = useState<EquipmentPending[]>([]);
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentPending | null>(null);

  const [actionLoading, setActionLoading] = useState(false);
  const [adminNote, setAdminNote] = useState("");

  useEffect(() => {
    if (!ready || !user) return;
    if (typeof window !== "undefined" && window.location.search.toLowerCase().includes("equipment")) {
      setActiveTab("EQUIPMENT");
    }
    loadAllPendingData();
  }, [ready, user?.id]);

  const loadAllPendingData = async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setLoading(true);
    try {
      const [merchantsRes, equipmentRes] = await Promise.all([
        apiFetch("/api/admin/merchants/pending"),
        apiFetch("/api/admin/equipment/pending"),
      ]);

      const merchantsJson = await merchantsRes.json();
      const equipmentJson = await equipmentRes.json();

      if (merchantsJson.data) {
        setMerchants(merchantsJson.data);
      }
      if (equipmentJson.data) {
        setEquipmentList(equipmentJson.data);
        // If there are pending equipment items, make sure equipment tab is active if no merchants
        if (equipmentJson.data.length > 0 && (!merchantsJson.data || merchantsJson.data.length === 0)) {
          setActiveTab("EQUIPMENT");
        }
      }
    } catch (error) {
      console.error("Failed to load verification queues:", error);
      toast.error("Failed to fetch pending verification data", { id: "verification-data-err" });
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  };

  /* ── Merchant Verification Handlers ── */
  const handleApproveMerchant = async (merchantId: string) => {
    setActionLoading(true);
    try {
      const res = await apiFetch(`/api/admin/merchants/${merchantId}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to approve merchant");

      toast.success("Merchant accredited and verified successfully!");
      setSelectedMerchant(null);
      loadAllPendingData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectMerchant = async (merchantId: string) => {
    if (!adminNote.trim()) {
      toast.error("Please enter a reason for rejection");
      return;
    }
    setActionLoading(true);
    try {
      const res = await apiFetch(`/api/admin/merchants/${merchantId}/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reason: adminNote }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to reject merchant");

      toast.success("Merchant verification rejected");
      setSelectedMerchant(null);
      setAdminNote("");
      loadAllPendingData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestMerchantInfo = async (merchantId: string) => {
    if (!adminNote.trim()) {
      toast.error("Please specify what information is needed");
      return;
    }
    setActionLoading(true);
    try {
      const res = await apiFetch(`/api/admin/merchants/${merchantId}/request-info`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reason: adminNote }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to request info");

      toast.success("Notification sent to merchant requesting additional documents");
      setSelectedMerchant(null);
      setAdminNote("");
      loadAllPendingData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  /* ── Equipment Verification Handlers ── */
  const handleApproveEquipment = async (equipmentId: string) => {
    setActionLoading(true);
    try {
      const res = await apiFetch(`/api/admin/equipment/${equipmentId}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to approve equipment");

      toast.success("Equipment listing approved and published live!");
      setSelectedEquipment(null);
      loadAllPendingData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectEquipment = async (equipmentId: string) => {
    if (!adminNote.trim()) {
      toast.error("Please enter a reason for rejection");
      return;
    }
    setActionLoading(true);
    try {
      const res = await apiFetch(`/api/admin/equipment/${equipmentId}/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reason: adminNote }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to reject equipment");

      toast.success("Equipment listing rejected");
      setSelectedEquipment(null);
      setAdminNote("");
      loadAllPendingData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <DashboardShell
      user={user}
      nav={NAV}
      title="Admin Verification & Compliance Desk"
      subtitle="Audit merchant CAC accreditation, director identities, and equipment asset ownership proof"
    >
      <div className="space-y-8">
        {/* Admin Navigation Pills (Desktop only, mobile uses sticky top strip) */}
        <div className="hidden lg:flex flex-wrap items-center gap-2 border-b border-line-soft pb-4">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${
                n.href === "/admin/verification"
                  ? "bg-cheesco-yellow text-[#0A0D14]"
                  : "bg-canvas-deep text-ink-muted hover:text-cheesco-yellow hover:bg-card"
              }`}
            >
              {n.label}
            </Link>
          ))}
        </div>

        {/* Verification Summary Metrics */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-line-soft bg-card p-5 shadow-sm">
            <span className="text-xs font-bold text-ink-muted">Pending Merchant KYC</span>
            <div className="mt-2 text-2xl font-black text-cheesco-yellow">
              {merchants.filter((m) => m.verificationStatus !== "VERIFIED").length}
            </div>
            <span className="mt-1 block text-[10px] text-ink-muted">Awaiting CAC & ID review</span>
          </div>

          <div className="rounded-2xl border border-line-soft bg-card p-5 shadow-sm">
            <span className="text-xs font-bold text-ink-muted">Pending Machinery Listings</span>
            <div className="mt-2 text-2xl font-black text-blue-400">
              {equipmentList.filter((e) => e.verificationStatus !== "VERIFIED").length}
            </div>
            <span className="mt-1 block text-[10px] text-ink-muted">Asset title & specs audit</span>
          </div>

          <div className="rounded-2xl border border-line-soft bg-card p-5 shadow-sm">
            <span className="text-xs font-bold text-ink-muted">Verified Merchants</span>
            <div className="mt-2 text-2xl font-black text-green-500">
              {merchants.filter((m) => m.verificationStatus === "VERIFIED").length}
            </div>
            <span className="mt-1 block text-[10px] text-green-500 font-semibold">✓ Accredited fleet partners</span>
          </div>

          <div className="rounded-2xl border border-line-soft bg-card p-5 shadow-sm">
            <span className="text-xs font-bold text-ink-muted">Total In Database</span>
            <div className="mt-2 text-2xl font-black text-ink">{merchants.length + equipmentList.length}</div>
            <span className="mt-1 block text-[10px] text-ink-muted">Live Supabase sync</span>
          </div>
        </div>

        {/* Dual Tab Switcher */}
        <div className="flex items-center gap-3 border-b border-line-soft pb-2">
          <button
            onClick={() => {
              setActiveTab("MERCHANTS");
              setSelectedEquipment(null);
            }}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black transition-all ${
              activeTab === "MERCHANTS"
                ? "bg-cheesco-yellow text-[#0A0D14] shadow-md shadow-cheesco-yellow/20"
                : "bg-card border border-line-soft text-ink-muted hover:text-ink"
            }`}
          >
            <span>🏢 Merchant KYC Verifications</span>
            <span className="rounded-full bg-black/20 px-2 py-0.2 text-[10px]">
              {merchants.length}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveTab("EQUIPMENT");
              setSelectedMerchant(null);
            }}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black transition-all ${
              activeTab === "EQUIPMENT"
                ? "bg-cheesco-yellow text-[#0A0D14] shadow-md shadow-cheesco-yellow/20"
                : "bg-card border border-line-soft text-ink-muted hover:text-ink"
            }`}
          >
            <span>🚜 Equipment Listing Approvals</span>
            <span className="rounded-full bg-black/20 px-2 py-0.2 text-[10px]">
              {equipmentList.length}
            </span>
          </button>
        </div>

        {/* Tab 1: Merchant KYC Applications */}
        {activeTab === "MERCHANTS" && (
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Merchant List */}
            <div className="lg:col-span-7 rounded-2xl border border-line-soft bg-card p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-line-soft pb-4 mb-4">
                <h2 className="text-base font-black text-ink">Merchant KYC Queue</h2>
                <button
                  onClick={loadAllPendingData}
                  className="text-xs font-bold text-cheesco-yellow hover:underline"
                >
                  ↻ Refresh
                </button>
              </div>

              {loading ? (
                <div className="py-12 text-center text-xs text-ink-muted">Loading merchant queue...</div>
              ) : merchants.length === 0 ? (
                <div className="py-12 text-center text-xs text-ink-muted">
                  No merchant verification applications submitted yet.
                </div>
              ) : (
                <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1">
                  {merchants.map((merchant) => (
                    <div
                      key={merchant.id}
                      onClick={() => setSelectedMerchant(merchant)}
                      className={`cursor-pointer rounded-xl border p-4 transition-all ${
                        selectedMerchant?.id === merchant.id
                          ? "border-cheesco-yellow bg-canvas-deep ring-1 ring-cheesco-yellow"
                          : "border-line-soft bg-canvas hover:border-cheesco-yellow/40"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <h3 className="font-bold text-xs text-ink">{merchant.businessName}</h3>
                          <p className="text-[10px] text-cheesco-yellow font-mono">RC: {merchant.registrationNumber}</p>
                        </div>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[9px] font-black ${
                            merchant.verificationStatus === "VERIFIED"
                              ? "bg-green-500/20 text-green-400"
                              : merchant.verificationStatus === "REJECTED"
                              ? "bg-red-500/20 text-red-400"
                              : "bg-cheesco-yellow/20 text-cheesco-yellow"
                          }`}
                        >
                          {merchant.verificationStatus.replace(/_/g, " ")}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] text-ink-muted mt-2 border-t border-line-soft pt-2">
                        <div>Contact: {merchant.contactName}</div>
                        <div>Phone: {merchant.phone}</div>
                        <div>Address: {merchant.address}</div>
                        <div>Docs: {merchant.documents.length} attached</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Merchant Detail & Action Panel */}
            <div className="lg:col-span-5 rounded-2xl border border-line-soft bg-card p-6 shadow-sm">
              {selectedMerchant ? (
                <div className="space-y-4">
                  <div className="border-b border-line-soft pb-3">
                    <span className="text-[10px] font-mono text-cheesco-yellow">ID: {selectedMerchant.id}</span>
                    <h3 className="text-base font-bold text-ink mt-0.5">{selectedMerchant.businessName}</h3>
                    <p className="text-xs text-ink-muted">{selectedMerchant.businessType}</p>
                  </div>

                  <div className="rounded-xl bg-canvas p-4 text-xs space-y-1.5 border border-line-soft">
                    <div className="flex justify-between">
                      <span className="text-ink-muted">CAC Reg No:</span>
                      <span className="font-mono font-bold text-ink">{selectedMerchant.registrationNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-muted">Contact Person:</span>
                      <span className="font-bold text-ink">{selectedMerchant.contactName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-muted">Phone:</span>
                      <a href={`tel:${selectedMerchant.phone}`} className="text-cheesco-yellow hover:underline">
                        {selectedMerchant.phone}
                      </a>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-muted">Email:</span>
                      <a href={`mailto:${selectedMerchant.email}`} className="text-cheesco-yellow hover:underline">
                        {selectedMerchant.email}
                      </a>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-muted">Location / Yard:</span>
                      <span className="text-ink">{selectedMerchant.address}</span>
                    </div>
                  </div>

                  {/* Attached Documents */}
                  <div>
                    <h4 className="text-xs font-bold text-ink mb-2">Uploaded Verification Documents:</h4>
                    {selectedMerchant.documents.length === 0 ? (
                      <div className="rounded-lg bg-canvas p-3 text-center text-xs text-ink-muted border border-line-soft">
                        No separate document files uploaded.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {selectedMerchant.documents.map((doc, idx) => (
                          <a
                            key={idx}
                            href={doc.documentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between p-2.5 rounded-lg bg-canvas border border-line-soft hover:border-cheesco-yellow text-xs transition-all"
                          >
                            <span className="font-medium text-ink">{doc.documentType.replace(/_/g, " ")}</span>
                            <span className="text-cheesco-yellow font-bold">View Document ↗</span>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Admin Action Note */}
                  <div>
                    <label className="block text-xs font-bold text-ink mb-1.5">Compliance Reason / Note</label>
                    <textarea
                      rows={2}
                      value={adminNote}
                      onChange={(e) => setAdminNote(e.target.value)}
                      placeholder="Enter reason if requesting info or rejecting..."
                      className="w-full rounded-xl border border-line-soft bg-canvas p-3 text-xs text-ink focus:border-cheesco-yellow focus:outline-none"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2">
                    <button
                      disabled={actionLoading}
                      onClick={() => handleApproveMerchant(selectedMerchant.id)}
                      className="flex-1 rounded-xl bg-green-500 py-2.5 text-xs font-black text-black hover:bg-green-400 transition-all disabled:opacity-50 shadow"
                    >
                      ✓ Approve KYC
                    </button>
                    <button
                      disabled={actionLoading}
                      onClick={() => handleRequestMerchantInfo(selectedMerchant.id)}
                      className="rounded-xl border border-cheesco-yellow/40 bg-cheesco-yellow/10 px-3 py-2.5 text-xs font-bold text-cheesco-yellow hover:bg-cheesco-yellow/20 disabled:opacity-50"
                    >
                      Request Info
                    </button>
                    <button
                      disabled={actionLoading}
                      onClick={() => handleRejectMerchant(selectedMerchant.id)}
                      className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2.5 text-xs font-bold text-red-400 hover:bg-red-500/20 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-24 text-center text-xs text-ink-muted">
                  <div className="text-3xl mb-2">🏢</div>
                  Select a merchant application from the queue to review CAC records, identity documents, and issue accreditation.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Equipment Listing Approvals */}
        {activeTab === "EQUIPMENT" && (
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Equipment Queue */}
            <div className="lg:col-span-7 rounded-2xl border border-line-soft bg-card p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-line-soft pb-4 mb-4">
                <h2 className="text-base font-black text-ink">Equipment Listings Queue</h2>
                <button
                  onClick={loadAllPendingData}
                  className="text-xs font-bold text-cheesco-yellow hover:underline"
                >
                  ↻ Refresh
                </button>
              </div>

              {loading ? (
                <div className="py-12 text-center text-xs text-ink-muted">Loading equipment queue...</div>
              ) : equipmentList.length === 0 ? (
                <div className="py-12 text-center text-xs text-ink-muted">
                  No equipment listings pending verification.
                </div>
              ) : (
                <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1">
                  {equipmentList.map((eq) => (
                    <div
                      key={eq.id}
                      onClick={() => setSelectedEquipment(eq)}
                      className={`cursor-pointer rounded-xl border p-4 transition-all ${
                        selectedEquipment?.id === eq.id
                          ? "border-cheesco-yellow bg-canvas-deep ring-1 ring-cheesco-yellow"
                          : "border-line-soft bg-canvas hover:border-cheesco-yellow/40"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <h3 className="font-bold text-xs text-ink">{eq.name}</h3>
                          <p className="text-[10px] text-cheesco-yellow font-semibold">
                            {eq.brand} · {eq.model} ({eq.year})
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[9px] font-black ${
                            eq.verificationStatus === "VERIFIED"
                              ? "bg-green-500/20 text-green-400"
                              : eq.verificationStatus === "REJECTED"
                              ? "bg-red-500/20 text-red-400"
                              : "bg-cheesco-yellow/20 text-cheesco-yellow"
                          }`}
                        >
                          {eq.verificationStatus.replace(/_/g, " ")}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] text-ink-muted mt-2 border-t border-line-soft pt-2">
                        <div>Owner: {eq.merchantName}</div>
                        <div>Category: {eq.category}</div>
                        <div>Location: {eq.locationCity}, {eq.locationState}</div>
                        <div className="font-bold text-ink">Rate: {fmtNgnFull(eq.merchantRentalRate)}/day</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Equipment Detail & Action Panel */}
            <div className="lg:col-span-5 rounded-2xl border border-line-soft bg-card p-6 shadow-sm">
              {selectedEquipment ? (
                <div className="space-y-4">
                  <div className="border-b border-line-soft pb-3">
                    <span className="text-[10px] font-mono text-cheesco-yellow">ID: {selectedEquipment.id}</span>
                    <h3 className="text-base font-bold text-ink mt-0.5">{selectedEquipment.name}</h3>
                    <p className="text-xs text-ink-muted">
                      {selectedEquipment.category} · {selectedEquipment.condition}
                    </p>
                  </div>

                  {/* Photos */}
                  {selectedEquipment.images.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold text-ink mb-1.5">Asset Photos:</h4>
                      <div className="grid grid-cols-3 gap-2">
                        {selectedEquipment.images.slice(0, 3).map((img, idx) => (
                          <a
                            key={idx}
                            href={img}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="aspect-video rounded-lg overflow-hidden border border-line-soft block"
                          >
                            <img src={img} alt="" className="w-full h-full object-cover" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="rounded-xl bg-canvas p-4 text-xs space-y-1.5 border border-line-soft">
                    <div className="flex justify-between">
                      <span className="text-ink-muted">Merchant Owner:</span>
                      <span className="font-bold text-ink">{selectedEquipment.merchantName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-muted">Merchant Base Rate:</span>
                      <span className="font-mono font-bold text-cheesco-yellow">
                        {fmtNgnFull(selectedEquipment.merchantRentalRate)}/day
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-muted">Location Yard:</span>
                      <span className="text-ink">
                        {selectedEquipment.locationCity}, {selectedEquipment.locationState}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-muted">Listing Type:</span>
                      <span className="font-semibold text-ink">{selectedEquipment.listingType}</span>
                    </div>
                  </div>

                  {/* Action Note */}
                  <div>
                    <label className="block text-xs font-bold text-ink mb-1.5">Rejection / Info Note</label>
                    <textarea
                      rows={2}
                      value={adminNote}
                      onChange={(e) => setAdminNote(e.target.value)}
                      placeholder="Specify reason or inspection requirements..."
                      className="w-full rounded-xl border border-line-soft bg-canvas p-3 text-xs text-ink focus:border-cheesco-yellow focus:outline-none"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2">
                    <button
                      disabled={actionLoading}
                      onClick={() => handleApproveEquipment(selectedEquipment.id)}
                      className="flex-1 rounded-xl bg-green-500 py-2.5 text-xs font-black text-black hover:bg-green-400 transition-all disabled:opacity-50 shadow"
                    >
                      ✓ Approve & Publish
                    </button>
                    <button
                      disabled={actionLoading}
                      onClick={() => handleRejectEquipment(selectedEquipment.id)}
                      className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2.5 text-xs font-bold text-red-400 hover:bg-red-500/20 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-24 text-center text-xs text-ink-muted">
                  <div className="text-3xl mb-2">🚜</div>
                  Select an equipment listing from the queue to inspect machinery photos, specs, and approve for the public marketplace.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
