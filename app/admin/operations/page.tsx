"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import Link from "next/link";
import QuotationBuilder from "@/components/QuotationBuilder";
import { DashboardShell } from "@/components/dashboard-shell";
import type { SessionUser } from "@/lib/auth";
import type { UserRole } from "@/lib/types";
import { useAuthGuard } from "@/lib/hooks/use-auth-guard";

import { fmtNgn } from "@/lib/format";
import { apiFetch } from "@/lib/api-client";

const ADMIN_ROLES: UserRole[] = [
  "OPERATIONS_ADMIN",
  "VERIFICATION_ADMIN",
  "SUPER_ADMIN",
  "SUPPORT_ADMIN",
  "FINANCE_ADMIN",
];

const NAV = [
  { href: "/admin/operations", label: "Operations" },
  { href: "/admin/verification", label: "Verification" },
  { href: "/admin/finance", label: "Finance" },
  { href: "/admin/support", label: "Support" },
];

interface RentalRequest {
  id: string;
  referenceNumber: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  equipmentId: string;
  equipmentName: string;
  merchantName: string;
  startDate: string;
  endDate?: string;
  durationDays: number;
  projectLocation: string;
  projectType: string;
  operatorRequired: boolean;
  deliveryRequired: boolean;
  additionalRequirements?: string;
  currentState: string;
  createdAt: string;
  merchantBaseRate: number;
  isPurchase?: boolean;
}

function OperationsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, ready } = useAuthGuard(ADMIN_ROLES);
  const [loading, setLoading] = useState(true);
  const isFetchingRef = useRef(false);
  const [requests, setRequests] = useState<RentalRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<RentalRequest | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "quoted" | "active" | "payment" | "completed">("all");
  const [inquiryType, setInquiryType] = useState<"all" | "rental" | "purchase">("all");
  const [reissueQuotationId, setReissueQuotationId] = useState<string | null>(null);
  const [pendingEquipment, setPendingEquipment] = useState<any[]>([]);
  const [selectedEquipment, setSelectedEquipment] = useState<any | null>(null);
  const [activeView, setActiveView] = useState<"REQUESTS" | "EQUIPMENT">("REQUESTS");
  const [actionLoading, setActionLoading] = useState(false);

  const [stats, setStats] = useState({
    totalUsers: 0,
    verifiedMerchants: 0,
    totalListings: 0,
    activeRentals: 0,
  });

  useEffect(() => {
    if (!ready || !user) return;
    const reqId = searchParams?.get("requestId") || searchParams?.get("id");
    fetchRequests(reqId);
    fetchPendingEquipment();
    fetchStats();
  }, [ready, user?.id, filter, searchParams]);

  const fetchPendingEquipment = async () => {
    try {
      const res = await apiFetch("/api/admin/equipment/pending");
      const json = await res.json();
      if (json.data) {
        setPendingEquipment(json.data);
      }
    } catch (e) {
      console.error("Failed to fetch pending equipment:", e);
    }
  };

  const handleApproveEquipment = async (id: string) => {
    setActionLoading(true);
    try {
      const res = await apiFetch(`/api/admin/equipment/${id}/approve`, {
        method: "POST",
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Approval failed");
      toast.success("Equipment listing approved and published live!");
      setSelectedEquipment(null);
      fetchPendingEquipment();
      fetchStats();
    } catch (e: any) {
      toast.error(e.message || "Failed to approve equipment");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectEquipment = async (id: string) => {
    const reason = window.prompt("Reason for rejecting this listing (optional):", "Incomplete documentation or specifications");
    if (reason === null) return;
    setActionLoading(true);
    try {
      const res = await apiFetch(`/api/admin/equipment/${id}/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reason }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Rejection failed");
      toast.success("Equipment listing rejected.");
      setSelectedEquipment(null);
      fetchPendingEquipment();
      fetchStats();
    } catch (e: any) {
      toast.error(e.message || "Failed to reject equipment");
    } finally {
      setActionLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await apiFetch("/api/admin/operations/stats");
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          setStats(json.data);
        }
      }
    } catch (e) {
      console.error("Failed to load stats:", e);
    }
  };

  const fetchRequests = async (targetRequestId?: string | null) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setLoading(true);
    try {
      const reqIdToFind = targetRequestId || searchParams?.get("requestId") || searchParams?.get("id");
      const activeFilter = reqIdToFind ? "all" : filter;

      const response = await apiFetch(`/api/admin/rental-requests?filter=${activeFilter}`);

      if (!response.ok) {
        if (response.status === 429) {
          toast.error("Slow down: rate limit reached. Retrying...", { id: "rental-requests-err" });
          return;
        }
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      if (result.success && Array.isArray(result.data)) {
        setRequests(result.data);
        if (reqIdToFind) {
          const match = result.data.find(
            (r: RentalRequest) => r && (r.id === reqIdToFind || r.referenceNumber === reqIdToFind)
          );
          if (match) {
            setSelectedRequest(match);
            setActiveView("REQUESTS");
          }
        }
      }
    } catch (error: any) {
      console.error("Failed to fetch rental requests:", error);
      toast.error(error?.message || "Failed to fetch rental requests", { id: "rental-requests-err" });
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  };

  const handleUpdateRentalState = async (id: string, newState: string) => {
    setActionLoading(true);
    try {
      const res = await apiFetch("/api/admin/rental-requests", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id, currentState: newState }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to update request state");
      }
      toast.success(`Request status updated to ${newState.replace(/_/g, " ")}`);
      if (selectedRequest && selectedRequest.id === id) {
        setSelectedRequest({ ...selectedRequest, currentState: newState });
      }
      fetchRequests();
    } catch (err: any) {
      toast.error(err.message || "Failed to update status");
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmBankTransfer = async (requestId: string) => {
    setActionLoading(true);
    try {
      const res = await apiFetch("/api/payments/confirm-bank-transfer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reference: selectedRequest?.referenceNumber }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        await handleUpdateRentalState(requestId, "PAYMENT_CONFIRMED");
      } else {
        toast.success("Bank transfer confirmed as paid, quotation accepted!");
        if (selectedRequest) {
          setSelectedRequest({ ...selectedRequest, currentState: "PAYMENT_CONFIRMED" });
        }
        fetchRequests();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to confirm bank transfer");
    } finally {
      setActionLoading(false);
    }
  };

  const getStateBadgeColor = (state?: string | null) => {
    if (!state) return "bg-zinc-700 text-zinc-300";
    const s = String(state).toUpperCase();
    if (s.includes("SUBMITTED") || s.includes("REVIEWING")) return "bg-blue-500/20 text-blue-400";
    if (s.includes("QUOTATION")) return "bg-purple-500/20 text-purple-400";
    if (s.includes("PAYMENT")) return "bg-yellow-500/20 text-yellow-400";
    if (s.includes("ACTIVE")) return "bg-green-500/20 text-green-400";
    return "bg-zinc-700 text-zinc-300";
  };

  return (
    <DashboardShell
      user={user}
      nav={NAV}
      title="Admin Operations Desk"
      subtitle="Rental inquiries, custom quotation engine, and fleet logistics tracking"
    >
      <div className="space-y-8">
        {/* Admin Navigation Pills (Desktop only) */}
        <div className="hidden lg:flex flex-wrap items-center gap-2 border-b border-line-soft pb-4">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${
                n.href === "/admin/operations"
                  ? "bg-cheesco-yellow text-[#0A0D14]"
                  : "bg-canvas-deep text-ink-muted hover:text-cheesco-yellow hover:bg-card"
              }`}
            >
              {n.label}
            </Link>
          ))}
        </div>

        {/* 4 Stats Cards (Dynamic from Supabase) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-line-soft bg-card p-5 shadow-sm"
          >
            <div className="text-xs font-bold text-ink-muted">Total Users</div>
            <div className="text-3xl font-black text-ink mt-2">{stats.totalUsers}</div>
            <span className="mt-1 block text-[10px] text-green-500 font-semibold">● Registered platform accounts</span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-2xl border border-line-soft bg-card p-5 shadow-sm"
          >
            <div className="text-xs font-bold text-ink-muted">Verified Merchants</div>
            <div className="text-3xl font-black text-ink mt-2">{stats.verifiedMerchants}</div>
            <span className="mt-1 block text-[10px] text-cheesco-yellow font-semibold">● KYC vetted equipment owners</span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl border border-line-soft bg-card p-5 shadow-sm"
          >
            <div className="text-xs font-bold text-ink-muted">Total Listings</div>
            <div className="text-3xl font-black text-ink mt-2">{stats.totalListings}</div>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-[10px] text-blue-400 font-semibold">● Heavy machinery fleet</span>
              {pendingEquipment.length > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveView("EQUIPMENT")}
                  className="rounded-md bg-cheesco-yellow/20 px-2 py-0.5 text-[9px] font-black text-cheesco-yellow hover:bg-cheesco-yellow hover:text-black transition-colors"
                >
                  {pendingEquipment.length} Pending Approval →
                </button>
              )}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="rounded-2xl border border-line-soft bg-card p-5 shadow-sm"
          >
            <div className="text-xs font-bold text-ink-muted">Rental Requests</div>
            <div className="text-3xl font-black text-ink mt-2">{stats.activeRentals}</div>
            <span className="mt-1 block text-[10px] text-purple-400 font-semibold">● Total bookings logged</span>
          </motion.div>
        </div>

        {/* Module Switcher: Rental Requests vs Equipment Approvals */}
        <div className="flex items-center gap-3 border-b border-line-soft pb-2">
          <button
            type="button"
            onClick={() => {
              setActiveView("REQUESTS");
              setSelectedEquipment(null);
            }}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black transition-all ${
              activeView === "REQUESTS"
                ? "bg-cheesco-yellow text-[#0A0D14] shadow-md shadow-cheesco-yellow/20"
                : "bg-card border border-line-soft text-ink-muted hover:text-ink"
            }`}
          >
            <span>📋 Rental Inquiries & Quotations</span>
            <span className="rounded-full bg-black/20 px-2 py-0.2 text-[10px]">
              {requests.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveView("EQUIPMENT");
              setSelectedRequest(null);
            }}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black transition-all ${
              activeView === "EQUIPMENT"
                ? "bg-cheesco-yellow text-[#0A0D14] shadow-md shadow-cheesco-yellow/20"
                : "bg-card border border-line-soft text-ink-muted hover:text-ink"
            }`}
          >
            <span>🚜 Equipment Listings Queue</span>
            {pendingEquipment.length > 0 ? (
              <span className="rounded-full bg-red-500 text-white font-black px-2 py-0.2 text-[10px] animate-pulse">
                {pendingEquipment.length}
              </span>
            ) : (
              <span className="rounded-full bg-black/20 px-2 py-0.2 text-[10px]">
                0
              </span>
            )}
          </button>
        </div>

        {/* Tab 1: Rental Requests Grid */}
        {activeView === "REQUESTS" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Requests List (Left Column) */}
            <div className="lg:col-span-5 rounded-2xl border border-line-soft bg-card p-6 shadow-sm">
              {/* Header row: title + status filter */}
              <div className="flex justify-between items-center mb-3 border-b border-line-soft pb-3">
                <h2 className="text-base font-black text-ink">
                  {inquiryType === "rental" ? "🚜 Rental Inquiries" : inquiryType === "purchase" ? "🛒 Purchase Inquiries" : "📋 All Inquiries"}
                </h2>
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as any)}
                  className="h-8 rounded-lg bg-canvas px-3 text-xs font-bold text-ink outline-none ring-1 ring-line-soft"
                >
                  <option value="all">All Inquiries</option>
                  <option value="pending">Pending Review</option>
                  <option value="quoted">Quoted</option>
                  <option value="payment">Payment Stage</option>
                  <option value="active">Active Rentals</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              {/* Rental vs Purchase sub-tabs */}
              {(() => {
                const rentalCount = requests.filter((r) => !r.isPurchase).length;
                const purchaseCount = requests.filter((r) => !!r.isPurchase).length;
                return (
                  <div className="flex items-center gap-1.5 mb-4 p-1 rounded-xl bg-canvas-deep border border-line-soft">
                    {(
                      [
                        { key: "all", label: `All (${requests.length})` },
                        { key: "rental", label: `🚜 Rental (${rentalCount})` },
                        { key: "purchase", label: `🛒 Purchase (${purchaseCount})` },
                      ] as const
                    ).map(({ key, label }) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          setInquiryType(key);
                          setSelectedRequest(null);
                          setReissueQuotationId(null);
                        }}
                        className={`flex-1 rounded-lg py-1.5 text-[11px] font-black transition-all ${
                          inquiryType === key
                            ? key === "rental"
                              ? "bg-emerald-500 text-black shadow"
                              : key === "purchase"
                              ? "bg-blue-500 text-white shadow"
                              : "bg-cheesco-yellow text-[#0A0D14] shadow"
                            : "text-ink-muted hover:text-ink"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                );
              })()}

              {/* Inquiry list filtered by inquiryType */}
              {(() => {
                const displayedRequests = requests.filter((r) => {
                  if (inquiryType === "rental") return !r.isPurchase;
                  if (inquiryType === "purchase") return !!r.isPurchase;
                  return true;
                });

                if (loading) {
                  return (
                    <div className="text-center py-10 text-xs text-ink-muted">
                      Loading inquiries from database...
                    </div>
                  );
                }

                if (displayedRequests.length === 0) {
                  return (
                    <div className="rounded-xl bg-canvas-deep p-8 text-center text-xs text-ink-muted">
                      <div className="text-2xl mb-1">
                        {inquiryType === "rental" ? "🚜" : inquiryType === "purchase" ? "🛒" : "📋"}
                      </div>
                      {inquiryType === "rental"
                        ? "No rental inquiries found for this filter"
                        : inquiryType === "purchase"
                        ? "No purchase inquiries found for this filter"
                        : "No requests found for this filter"}
                    </div>
                  );
                }

                return (
                  <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                    {displayedRequests.map((request) => (
                      <motion.div
                        key={request.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        onClick={() => setSelectedRequest(request)}
                        className={`rounded-xl p-4 bg-canvas border cursor-pointer transition ${
                          selectedRequest?.id === request.id
                            ? "border-cheesco-yellow ring-1 ring-cheesco-yellow bg-canvas-deep"
                            : "border-line-soft hover:border-cheesco-yellow/40"
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-bold text-xs text-ink">{request.equipmentName}</h3>
                            <p className="text-[10px] font-mono flex items-center gap-1.5">
                              <span className={`font-black ${request.isPurchase ? "text-blue-400" : "text-emerald-400"}`}>
                                {request.isPurchase ? "🛒" : "🚜"}
                              </span>
                              <span className="text-cheesco-yellow">{request.referenceNumber}</span>
                            </p>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${getStateBadgeColor(request.currentState)}`}>
                            {String(request.currentState || "REQUEST_SUBMITTED").replace(/_/g, " ")}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[11px] text-ink-muted">
                          <div>Client: <span className="font-semibold text-ink">{request.customerName}</span></div>
                          <div>Duration: <span className="font-semibold text-ink">{request.durationDays} days</span></div>
                          <div>Site: <span className="font-semibold text-ink">{request.projectLocation}</span></div>
                          <div>Merchant: <span className="font-semibold text-ink">{request.merchantName}</span></div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Selected Rental Inquiry Dossier & Quotation Engine (Right Column) */}
            <div className="lg:col-span-7 space-y-6">
              {selectedRequest ? (
                (() => {
                  const isPurchase =
                    selectedRequest.referenceNumber?.startsWith("PUR") ||
                    selectedRequest.additionalRequirements?.includes("[PURCHASE") ||
                    selectedRequest.projectType?.includes("Purchase");

                  return (
                    <>
                      {/* Detailed Renter/Buyer Inquiry Dossier */}
                      <div className="rounded-2xl border border-line-soft bg-card p-6 shadow-sm">
                        <div className="flex items-start justify-between gap-4 border-b border-line-soft pb-4 mb-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-mono text-cheesco-yellow font-bold uppercase tracking-wider">
                                Ref: {selectedRequest.referenceNumber}
                              </span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                isPurchase ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              }`}>
                                {isPurchase ? "🤝 PURCHASE REQUEST" : "🚜 RENTAL REQUEST"}
                              </span>
                              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${getStateBadgeColor(selectedRequest.currentState)}`}>
                                {String(selectedRequest.currentState || "REQUEST_SUBMITTED").replace(/_/g, " ")}
                              </span>
                            </div>
                            <h2 className="text-lg font-black text-ink mt-1">
                              {selectedRequest.equipmentName}
                            </h2>
                            <p className="text-xs text-ink-muted">
                              Submitted on {selectedRequest.createdAt ? new Date(selectedRequest.createdAt).toLocaleDateString([], { dateStyle: "long" }) : "Recently"}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <Link
                              href={`/equipment/${selectedRequest.equipmentId}`}
                              target="_blank"
                              className="rounded-xl border border-line-soft bg-canvas px-3 py-1.5 text-xs font-bold text-ink-muted hover:text-cheesco-yellow hover:border-cheesco-yellow transition-colors"
                            >
                              View Machine ↗
                            </Link>
                          </div>
                        </div>

                        {/* Renter/Buyer Contact & Project Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                          {/* Customer / Client Details */}
                          <div className="p-3.5 rounded-xl bg-canvas border border-line-soft space-y-1.5">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-cheesco-yellow">
                              {isPurchase ? "👤 Buyer / Purchaser Details" : "👤 Renter Details"}
                            </div>
                            <div className="font-bold text-ink text-sm">
                              {selectedRequest.customerName}
                            </div>
                            <div className="text-ink-muted flex items-center gap-1.5">
                              <span>✉️</span>
                              <a href={`mailto:${selectedRequest.customerEmail}`} className="hover:underline text-ink">
                                {selectedRequest.customerEmail || "N/A"}
                              </a>
                            </div>
                            <div className="text-ink-muted flex items-center gap-1.5">
                              <span>📞</span>
                              <a href={`tel:${selectedRequest.customerPhone || ""}`} className="hover:underline text-ink">
                                {selectedRequest.customerPhone || "Not specified"}
                              </a>
                            </div>
                          </div>

                          {/* Equipment Owner / Merchant */}
                          <div className="p-3.5 rounded-xl bg-canvas border border-line-soft space-y-1.5">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-blue-400">
                              🚜 Machinery & Merchant
                            </div>
                            <div className="font-bold text-ink text-sm">
                              {selectedRequest.merchantName}
                            </div>
                            <div className="text-ink-muted flex items-center justify-between">
                              <span>{isPurchase ? "Listed Rate:" : "Daily Base Rate:"}</span>
                              <span className="font-bold text-cheesco-yellow">
                                ₦{fmtNgn(selectedRequest.merchantBaseRate || 0)} {isPurchase ? "sale price" : "/ day"}
                              </span>
                            </div>
                            {!isPurchase && (
                              <div className="text-ink-muted flex items-center justify-between">
                                <span>Total Est. Base:</span>
                                <span className="font-bold text-ink">
                                  ₦{fmtNgn((selectedRequest.merchantBaseRate || 0) * (selectedRequest.durationDays || 1))}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Deployment / Job Site or Yard */}
                          <div className="p-3.5 rounded-xl bg-canvas border border-line-soft space-y-1.5">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                              {isPurchase ? "📍 Delivery Destination / Yard Address" : "📍 Site & Project Location"}
                            </div>
                            <div className="font-bold text-ink">
                              {selectedRequest.projectLocation}
                            </div>
                            <div className="text-ink-muted flex items-center justify-between">
                              <span>{isPurchase ? "Operating Sector:" : "Scope of Work / Job Nature:"}</span>
                              <span className="font-semibold text-ink">{selectedRequest.projectType || "General Construction"}</span>
                            </div>
                          </div>

                          {/* Duration & Scheduling */}
                          <div className="p-3.5 rounded-xl bg-canvas border border-line-soft space-y-1.5">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-purple-400">
                              {isPurchase ? "⏱️ Handover Schedule" : "⏱️ Schedule & Duration"}
                            </div>
                            <div className="font-bold text-ink">
                              {isPurchase ? "Outright Asset Acquisition" : `${selectedRequest.durationDays} Day${selectedRequest.durationDays === 1 ? "" : "s"} Duration`}
                            </div>
                            <div className="text-ink-muted flex items-center justify-between">
                              <span>{isPurchase ? "Target Handover:" : "Start Date:"}</span>
                              <span className="font-semibold text-ink">{selectedRequest.startDate || "Immediate"}</span>
                            </div>
                            {!isPurchase && selectedRequest.endDate && (
                              <div className="text-ink-muted flex items-center justify-between">
                                <span>End Date:</span>
                                <span className="font-semibold text-ink">{selectedRequest.endDate}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Requirements Flags */}
                        <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                          <div className={`p-3 rounded-xl border flex items-center gap-2.5 ${
                            isPurchase
                              ? "bg-canvas border-line-soft text-ink-muted"
                              : selectedRequest.operatorRequired 
                              ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                              : "bg-canvas border-line-soft text-ink-muted"
                          }`}>
                            <span className="text-base">{isPurchase ? "🤝" : selectedRequest.operatorRequired ? "👷" : "🚫"}</span>
                            <div>
                              <div className="font-bold text-ink">
                                {isPurchase ? "Operator Not Applicable" : "Operator Assigned"}
                              </div>
                              <div className="text-[10px]">
                                {isPurchase
                                  ? "Buyer takes full ownership of machinery"
                                  : selectedRequest.operatorRequired
                                  ? "Certified operator requested (feeding/accommodation client's responsibility)"
                                  : "Customer self-operating"}
                              </div>
                            </div>
                          </div>

                          <div className={`p-3 rounded-xl border flex items-center gap-2.5 ${
                            selectedRequest.deliveryRequired 
                              ? "bg-blue-500/10 border-blue-500/30 text-blue-300"
                              : "bg-canvas border-line-soft text-ink-muted"
                          }`}>
                            <span className="text-base">{selectedRequest.deliveryRequired ? "🚚" : "🏬"}</span>
                            <div>
                              <div className="font-bold text-ink">Cheesco Delivery Haulage</div>
                              <div className="text-[10px]">{selectedRequest.deliveryRequired ? "Yes (Cheesco low-bed haulage required)" : "No (Self pickup)"}</div>
                            </div>
                          </div>
                        </div>

                        {/* Additional Notes / Requirements */}
                        {selectedRequest.additionalRequirements && (
                          <div className="mt-4 p-3.5 rounded-xl bg-canvas border border-line-soft text-xs">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-cheesco-yellow mb-1">
                              {isPurchase ? "📋 Purchase Specifications, Inspection Preference & Company RC Details:" : "📝 Scope of Work, Max Tonnage & Customer Specifications:"}
                            </div>
                            <p className="text-ink leading-relaxed font-mono text-[11px] bg-canvas-deep p-2.5 rounded-lg border border-line-soft/60">
                              {selectedRequest.additionalRequirements}
                            </p>
                          </div>
                        )}

                        {/* Operations Pipeline — contextual actions per lifecycle stage */}
                    <div className="mt-4 pt-4 border-t border-line-soft space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-ink-muted">
                          Operations Status:{" "}
                          <span className="font-bold text-ink">
                            {String(selectedRequest.currentState).replace(/_/g, " ")}
                          </span>
                        </div>
                      </div>

                      {/* Stage 1 — Pre-quotation review */}
                      {selectedRequest.currentState === "REQUEST_SUBMITTED" && (
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={actionLoading}
                            onClick={() => handleUpdateRentalState(selectedRequest.id, "CHEESCO_REVIEWING")}
                            className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-xs font-bold text-blue-400 hover:bg-blue-500/20 transition-all disabled:opacity-50"
                          >
                            🔍 Mark Reviewing
                          </button>
                          <button
                            type="button"
                            disabled={actionLoading}
                            onClick={() => handleUpdateRentalState(selectedRequest.id, "AVAILABILITY_CONFIRMED")}
                            className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-400 hover:bg-emerald-500/20 transition-all disabled:opacity-50"
                          >
                            ✓ Confirm Availability
                          </button>
                        </div>
                      )}

                      {selectedRequest.currentState === "CHEESCO_REVIEWING" && (
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={actionLoading}
                            onClick={() => handleUpdateRentalState(selectedRequest.id, "AVAILABILITY_CONFIRMED")}
                            className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-400 hover:bg-emerald-500/20 transition-all disabled:opacity-50"
                          >
                            ✓ Confirm Availability
                          </button>
                        </div>
                      )}

                      {/* Stage 2 — After customer accepts quotation, verify payment */}
                      {["QUOTATION_ACCEPTED", "PAYMENT_PENDING"].includes(selectedRequest.currentState) && (
                        <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-3 space-y-2">
                          <div className="text-[11px] font-bold text-yellow-400 uppercase tracking-wider">
                            💳 Step 1 — Confirm Customer Payment
                          </div>
                          <p className="text-[11px] text-ink-muted">
                            Verify that the Paystack payment has been received in the Finance dashboard, then confirm here to proceed to logistics.
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              disabled={actionLoading}
                              onClick={() => handleUpdateRentalState(selectedRequest.id, "PAYMENT_CONFIRMED")}
                              className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-400 hover:bg-emerald-500/20 transition-all disabled:opacity-50"
                            >
                              ✅ Confirm Gateway Payment Received
                            </button>
                            <button
                              type="button"
                              disabled={actionLoading}
                              onClick={() => handleConfirmBankTransfer(selectedRequest.id)}
                              className="rounded-xl border border-purple-500/30 bg-purple-500/10 px-3 py-1.5 text-xs font-bold text-purple-400 hover:bg-purple-500/20 transition-all disabled:opacity-50"
                            >
                              🏦 Confirm Bank Transfer (Mark Paid)
                            </button>
                            <button
                              type="button"
                              disabled={actionLoading}
                              onClick={() => handleUpdateRentalState(selectedRequest.id, "PAYMENT_FAILED")}
                              className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-400 hover:bg-red-500/20 transition-all disabled:opacity-50"
                            >
                              ✗ Mark Payment Failed
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Stage 3 — Payment confirmed → Sign agreement & verify equipment */}
                      {selectedRequest.currentState === "PAYMENT_CONFIRMED" && (
                        <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="text-[11px] font-bold text-purple-400 uppercase tracking-wider">
                              📄 Step 2 — Agreement & Equipment Prep
                            </div>
                            {selectedRequest.referenceNumber && (
                              <a
                                href={`/invoice/${selectedRequest.referenceNumber}`}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-black text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                              >
                                View Invoice
                              </a>
                            )}
                          </div>
                          <p className="text-[11px] text-ink-muted">
                            Send the rental agreement to the customer for e-signature, then verify the equipment is ready for dispatch.
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              disabled={actionLoading}
                              onClick={() => handleUpdateRentalState(selectedRequest.id, "AGREEMENT_SIGNED")}
                              className="rounded-xl border border-purple-500/30 bg-purple-500/10 px-3 py-1.5 text-xs font-bold text-purple-400 hover:bg-purple-500/20 transition-all disabled:opacity-50"
                            >
                              ✍️ Mark Agreement Signed
                            </button>
                            <button
                              type="button"
                              disabled={actionLoading}
                              onClick={() => handleUpdateRentalState(selectedRequest.id, "EQUIPMENT_VERIFICATION_COMPLETE")}
                              className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-xs font-bold text-blue-400 hover:bg-blue-500/20 transition-all disabled:opacity-50"
                            >
                              🔧 Equipment Verified & Ready
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Stage 4 — Agreement signed → Arrange logistics */}
                      {["AGREEMENT_SIGNED", "EQUIPMENT_VERIFICATION_COMPLETE"].includes(selectedRequest.currentState) && (
                        <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-3 space-y-2">
                          <div className="text-[11px] font-bold text-blue-400 uppercase tracking-wider">
                            🚛 Step 3 — Arrange Logistics & Dispatch
                          </div>
                          <p className="text-[11px] text-ink-muted">
                            Coordinate low-bed haulage and confirm carrier assignment. Once the truck is en route, mark as dispatched.
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              disabled={actionLoading}
                              onClick={() => handleUpdateRentalState(selectedRequest.id, "LOGISTICS_ARRANGED")}
                              className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-xs font-bold text-blue-400 hover:bg-blue-500/20 transition-all disabled:opacity-50"
                            >
                              📦 Logistics Arranged
                            </button>
                            <button
                              type="button"
                              disabled={actionLoading}
                              onClick={() => handleUpdateRentalState(selectedRequest.id, "CARRIER_DISPATCHED")}
                              className="rounded-xl border border-orange-500/30 bg-orange-500/10 px-3 py-1.5 text-xs font-bold text-orange-400 hover:bg-orange-500/20 transition-all disabled:opacity-50"
                            >
                              🚛 Carrier Dispatched
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Stage 5 — In transit */}
                      {["LOGISTICS_ARRANGED", "CARRIER_DISPATCHED"].includes(selectedRequest.currentState) && (
                        <div className="rounded-xl border border-orange-500/30 bg-orange-500/5 p-3 space-y-2">
                          <div className="text-[11px] font-bold text-orange-400 uppercase tracking-wider">
                            🛣️ Step 4 — Track Transit
                          </div>
                          <p className="text-[11px] text-ink-muted">
                            Confirm the machine is in transit to the customer&apos;s site. Update to Delivered once the machine arrives.
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              disabled={actionLoading}
                              onClick={() => handleUpdateRentalState(selectedRequest.id, "IN_TRANSIT")}
                              className="rounded-xl border border-orange-500/30 bg-orange-500/10 px-3 py-1.5 text-xs font-bold text-orange-400 hover:bg-orange-500/20 transition-all disabled:opacity-50"
                            >
                              🛣️ Mark In Transit
                            </button>
                            <button
                              type="button"
                              disabled={actionLoading}
                              onClick={() => handleUpdateRentalState(selectedRequest.id, "DELIVERED")}
                              className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-400 hover:bg-emerald-500/20 transition-all disabled:opacity-50"
                            >
                              📍 Mark Delivered to Site
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Stage 6 — Delivered → Active on site */}
                      {["IN_TRANSIT", "DELIVERED"].includes(selectedRequest.currentState) && (
                        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 space-y-2">
                          <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                            🚜 Step 5 — Confirm Active Deployment
                          </div>
                          <p className="text-[11px] text-ink-muted">
                            Confirm the machine is operational on the customer&apos;s site and the rental period has begun.
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              disabled={actionLoading}
                              onClick={() => handleUpdateRentalState(selectedRequest.id, "ACTIVE_ON_SITE")}
                              className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-400 hover:bg-emerald-500/20 transition-all disabled:opacity-50"
                            >
                              🚜 Machine Active on Site
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Stage 7 — Active → Initiate return */}
                      {selectedRequest.currentState === "ACTIVE_ON_SITE" && (
                        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 space-y-2">
                          <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                            🚜 Active — Machine On Site
                          </div>
                          <p className="text-[11px] text-ink-muted">
                            The machine is deployed and the rental period is running. When the rental period ends, initiate the return process.
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              disabled={actionLoading}
                              onClick={() => handleUpdateRentalState(selectedRequest.id, "RETURN_INITIATED")}
                              className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-400 hover:bg-amber-500/20 transition-all disabled:opacity-50"
                            >
                              ↩️ Initiate Return
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Stage 8 — Return & inspection */}
                      {["RETURN_INITIATED", "RETURNED"].includes(selectedRequest.currentState) && (
                        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 space-y-2">
                          <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                            🔍 Step 6 — Return & Post-Rental Inspection
                          </div>
                          <p className="text-[11px] text-ink-muted">
                            Confirm the machine has been returned and conduct the post-rental condition inspection before releasing the deposit.
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              disabled={actionLoading}
                              onClick={() => handleUpdateRentalState(selectedRequest.id, "RETURNED")}
                              className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-400 hover:bg-amber-500/20 transition-all disabled:opacity-50"
                            >
                              📦 Confirm Machine Returned
                            </button>
                            <button
                              type="button"
                              disabled={actionLoading}
                              onClick={() => handleUpdateRentalState(selectedRequest.id, "POST_RENTAL_INSPECTION")}
                              className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-xs font-bold text-blue-400 hover:bg-blue-500/20 transition-all disabled:opacity-50"
                            >
                              🔍 Inspection Complete
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Stage 9 — Inspection done → Settle deposit & complete */}
                      {["POST_RENTAL_INSPECTION", "DEPOSIT_HELD"].includes(selectedRequest.currentState) && (
                        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 space-y-2">
                          <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                            💰 Step 7 — Settle Deposit & Close
                          </div>
                          <p className="text-[11px] text-ink-muted">
                            Release or deduct the caution deposit based on inspection results, then mark the rental as fully completed.
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              disabled={actionLoading}
                              onClick={() => handleUpdateRentalState(selectedRequest.id, "DEPOSIT_SETTLED")}
                              className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-400 hover:bg-emerald-500/20 transition-all disabled:opacity-50"
                            >
                              💰 Deposit Settled
                            </button>
                            <button
                              type="button"
                              disabled={actionLoading}
                              onClick={() => handleUpdateRentalState(selectedRequest.id, "COMPLETED")}
                              className="rounded-xl border border-zinc-500/30 bg-zinc-500/10 px-3 py-1.5 text-xs font-bold text-zinc-300 hover:bg-zinc-500/20 transition-all disabled:opacity-50"
                            >
                              ✅ Mark Completed
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Final states */}
                      {["DEPOSIT_SETTLED", "COMPLETED"].includes(selectedRequest.currentState) && (
                        <div className="rounded-xl border border-zinc-700 bg-zinc-800/30 p-3 text-center">
                          <div className="text-xl mb-1">🏁</div>
                          <div className="text-[11px] font-bold text-zinc-400">
                            Rental Completed — No Further Actions Required
                          </div>
                        </div>
                      )}

                      {["CANCELLED", "DECLINED", "EXPIRED", "PAYMENT_FAILED"].includes(selectedRequest.currentState) && (
                        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-center">
                          <div className="text-xl mb-1">🚫</div>
                          <div className="text-[11px] font-bold text-red-400">
                            Request {selectedRequest.currentState.replace(/_/g, " ")} — Archived
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Quotation Generator (Approve & Quote) — hidden once quotation is sent */}
                  {(() => {
                    const s = String(selectedRequest.currentState || "").toUpperCase();
                    const quotationAlreadySent = [
                      "QUOTATION_SENT",
                      "QUOTATION_VIEWED",
                      "QUOTATION_ACCEPTED",
                      "QUOTATION_DECLINED",
                      "PAYMENT_PENDING",
                      "PAYMENT_CONFIRMED",
                      "PAYMENT_FAILED",
                      "AGREEMENT_SIGNED",
                      "EQUIPMENT_VERIFICATION_COMPLETE",
                      "LOGISTICS_ARRANGED",
                      "CARRIER_DISPATCHED",
                      "IN_TRANSIT",
                      "DELIVERED",
                      "ACTIVE_ON_SITE",
                      "ACTIVE",
                      "RETURN_INITIATED",
                      "RETURNED",
                      "POST_RENTAL_INSPECTION",
                      "DEPOSIT_HELD",
                      "DEPOSIT_SETTLED",
                      "COMPLETED",
                      "CANCELLED",
                      "DECLINED",
                      "EXPIRED",
                    ].some((state) => s.includes(state));

                    if (quotationAlreadySent) {
                      return (
                        <div className="space-y-4">
                          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6 shadow-sm text-center">
                            <div className="text-3xl mb-2">✅</div>
                            <h3 className="text-sm font-black text-emerald-400 mb-1">
                              Quotation Sent to Client
                            </h3>
                            <p className="text-[11px] text-ink-muted max-w-xs mx-auto mb-3">
                              The official Cheesco quotation has been dispatched to the customer&apos;s email and dashboard. The client will <strong className="text-ink">not</strong> be re-notified unless you explicitly re-send.
                            </p>
                            <div className="flex flex-wrap items-center justify-center gap-2">
                              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[10px] font-bold text-emerald-400 tracking-wider uppercase">
                                Current Status: {String(selectedRequest.currentState).replace(/_/g, " ")}
                              </span>
                              <button
                                type="button"
                                onClick={() => setReissueQuotationId(reissueQuotationId === selectedRequest.id ? null : selectedRequest.id)}
                                className="rounded-full border border-cheesco-yellow/40 bg-cheesco-yellow/10 px-3 py-1 text-[10px] font-bold text-cheesco-yellow hover:bg-cheesco-yellow hover:text-[#0A0D14] transition-colors"
                              >
                                {reissueQuotationId === selectedRequest.id ? "✕ Hide Editor" : "✏️ Revise Quotation"}
                              </button>
                            </div>
                          </div>

                          {reissueQuotationId === selectedRequest.id && (
                            <>
                              {/* Warning banner */}
                              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-[11px] text-amber-400 font-semibold flex items-start gap-2">
                                <span className="text-base leading-none mt-0.5">⚠️</span>
                                <span>
                                  You are revising an already-sent quotation. Save as draft to update the figures —
                                  the client will <strong>not</strong> receive a new email automatically.
                                  Only click <em>"Re-send Revised Quotation"</em> below if you want to notify them again.
                                </span>
                              </div>

                              <QuotationBuilder
                                key={selectedRequest.id}
                                draftOnlyMode={true}
                                rentalRequest={{
                                  id: selectedRequest.id,
                                  referenceNumber: selectedRequest.referenceNumber,
                                  equipmentName: selectedRequest.equipmentName,
                                  durationDays: selectedRequest.durationDays,
                                  merchantBaseRate: selectedRequest.merchantBaseRate,
                                  customerName: selectedRequest.customerName,
                                  customerEmail: selectedRequest.customerEmail,
                                  customerPhone: selectedRequest.customerPhone,
                                  projectLocation: selectedRequest.projectLocation,
                                  projectType: selectedRequest.projectType,
                                  startDate: selectedRequest.startDate,
                                  endDate: selectedRequest.endDate,
                                  operatorRequired: selectedRequest.operatorRequired,
                                  deliveryRequired: selectedRequest.deliveryRequired,
                                  additionalRequirements: selectedRequest.additionalRequirements,
                                  merchantName: selectedRequest.merchantName,
                                  isPurchase,
                                  currentState: selectedRequest.currentState,
                                }}
                                onSuccess={async () => {
                                  // After saving draft, offer to re-send with explicit confirmation
                                  const confirmed = window.confirm(
                                    `Quotation revised and saved.\n\nDo you want to re-send the updated quotation to ${selectedRequest.customerName || "the client"} now?\n\nThey will receive a new email notification.`
                                  );
                                  if (confirmed) {
                                    try {
                                      // Fetch the quotation ID for this rental request
                                      const qRes = await apiFetch(
                                        `/api/quotations?rentalRequestId=${selectedRequest.id}`
                                      );
                                      const qData = await qRes.json();
                                      const quotationId = qData?.data?.id;
                                      if (!quotationId) throw new Error("Could not find quotation to re-send");

                                      const sendRes = await apiFetch(`/api/quotations/${quotationId}/send`, {
                                        method: "POST",
                                      });
                                      const sendData = await sendRes.json();
                                      if (!sendData.success) throw new Error(sendData.error || "Failed to re-send");

                                      toast.success("Revised quotation re-sent to client successfully!");
                                      setSelectedRequest({ ...selectedRequest, currentState: "QUOTATION_SENT" });
                                    } catch (err: any) {
                                      toast.error(err.message || "Failed to re-send quotation");
                                    }
                                  } else {
                                    toast.success("Quotation revised and saved as draft. Client not re-notified.");
                                  }
                                  setReissueQuotationId(null);
                                  fetchRequests();
                                }}
                              />
                            </>
                          )}
                        </div>
                      );
                    }

                    return (
                      <QuotationBuilder
                        key={selectedRequest.id}
                        rentalRequest={{
                          id: selectedRequest.id,
                          referenceNumber: selectedRequest.referenceNumber,
                          equipmentName: selectedRequest.equipmentName,
                          durationDays: selectedRequest.durationDays,
                          merchantBaseRate: selectedRequest.merchantBaseRate,
                          customerName: selectedRequest.customerName,
                          customerEmail: selectedRequest.customerEmail,
                          customerPhone: selectedRequest.customerPhone,
                          projectLocation: selectedRequest.projectLocation,
                          projectType: selectedRequest.projectType,
                          startDate: selectedRequest.startDate,
                          endDate: selectedRequest.endDate,
                          operatorRequired: selectedRequest.operatorRequired,
                          deliveryRequired: selectedRequest.deliveryRequired,
                          additionalRequirements: selectedRequest.additionalRequirements,
                          merchantName: selectedRequest.merchantName,
                          isPurchase,
                          currentState: selectedRequest.currentState,
                        }}
                        onSuccess={() => {
                          toast.success("Quotation created and sent successfully!");
                          setSelectedRequest({
                            ...selectedRequest,
                            currentState: "QUOTATION_SENT",
                          });
                          fetchRequests();
                        }}
                      />
                    );
                  })()}
                </>
              );
            })()
          ) : (
                <div className="rounded-2xl border border-line-soft bg-card p-12 text-center text-xs text-ink-muted">
                  <div className="text-4xl mb-3">📋</div>
                  <h3 className="text-sm font-black text-ink mb-1">No Rental Request Selected</h3>
                  <p className="max-w-xs mx-auto">
                    Select a rental inquiry from the list on the left to review the renter&apos;s full site specifications and generate an official quotation.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Equipment Listings Queue */}
        {activeView === "EQUIPMENT" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7 rounded-2xl border border-line-soft bg-card p-6 shadow-sm">
              <div className="flex justify-between items-center mb-4 border-b border-line-soft pb-4">
                <div>
                  <h2 className="text-base font-black text-ink">Equipment Listings Queue</h2>
                  <p className="text-[11px] text-ink-muted">Review newly submitted merchant equipment before publishing to browse</p>
                </div>
                <button
                  type="button"
                  onClick={fetchPendingEquipment}
                  className="text-xs font-bold text-cheesco-yellow hover:underline"
                >
                  ↻ Refresh
                </button>
              </div>

              {pendingEquipment.length === 0 ? (
                <div className="rounded-xl bg-canvas-deep p-12 text-center text-xs text-ink-muted">
                  <div className="text-3xl mb-2">🚜</div>
                  No equipment listings pending verification right now. All listings are up to date.
                </div>
              ) : (
                <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1">
                  {pendingEquipment.map((eq) => (
                    <div
                      key={eq.id}
                      onClick={() => setSelectedEquipment(eq)}
                      className={`rounded-xl p-4 bg-canvas border cursor-pointer transition ${
                        selectedEquipment?.id === eq.id
                          ? "border-cheesco-yellow ring-1 ring-cheesco-yellow bg-canvas-deep"
                          : "border-line-soft hover:border-cheesco-yellow/40"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-bold text-sm text-ink">{eq.name}</h3>
                          <p className="text-[11px] text-cheesco-yellow font-semibold">
                            {eq.brand} {eq.model} ({eq.year}) · {eq.category}
                          </p>
                        </div>
                        <span className="rounded-full px-2.5 py-0.5 text-[10px] font-black bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          {eq.verificationStatus || "SUBMITTED"}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px] text-ink-muted mt-2 pt-2 border-t border-line-soft/60">
                        <div>Merchant: <span className="text-ink font-semibold">{eq.merchantName}</span></div>
                        <div>Rate: <span className="text-cheesco-yellow font-bold">₦{fmtNgn(eq.merchantRentalRate || 0)}/day</span></div>
                        <div>Location: <span className="text-ink font-semibold">{eq.locationCity}, {eq.locationState}</span></div>
                        <div>Condition: <span className="text-ink font-semibold">{eq.condition}</span></div>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApproveEquipment(eq.id);
                          }}
                          className="flex-1 rounded-lg bg-green-500 py-1.5 text-xs font-black text-black hover:bg-green-400 transition-colors shadow disabled:opacity-50"
                        >
                          ✓ Approve Listing
                        </button>
                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRejectEquipment(eq.id);
                          }}
                          className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-400 hover:bg-red-500/20 disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Equipment Inspector Panel */}
            <div className="lg:col-span-5 rounded-2xl border border-line-soft bg-card p-6 shadow-sm">
              {selectedEquipment ? (
                <div className="space-y-4">
                  <div className="border-b border-line-soft pb-4">
                    <span className="rounded-md bg-cheesco-yellow/20 px-2 py-0.5 text-[10px] font-black text-cheesco-yellow">
                      {selectedEquipment.category}
                    </span>
                    <h3 className="mt-2 text-lg font-black text-ink">{selectedEquipment.name}</h3>
                    <p className="text-xs text-ink-muted">
                      Submitted by <strong className="text-ink">{selectedEquipment.merchantName}</strong> ({selectedEquipment.merchantEmail || 'No email'})
                    </p>
                  </div>

                  <div className="rounded-xl bg-canvas p-3 border border-line-soft space-y-2 text-xs">
                    <div className="flex justify-between"><span className="text-ink-muted">Daily Rate:</span><span className="font-bold text-cheesco-yellow">₦{fmtNgn(selectedEquipment.merchantRentalRate || 0)}</span></div>
                    {selectedEquipment.salePrice && (
                      <div className="flex justify-between"><span className="text-ink-muted">Sale Price:</span><span className="font-bold text-ink">₦{fmtNgn(selectedEquipment.salePrice)}</span></div>
                    )}
                    <div className="flex justify-between"><span className="text-ink-muted">Location:</span><span className="font-semibold text-ink">{selectedEquipment.locationCity}, {selectedEquipment.locationState}</span></div>
                    <div className="flex justify-between"><span className="text-ink-muted">Year / Condition:</span><span className="font-semibold text-ink">{selectedEquipment.year} · {selectedEquipment.condition}</span></div>
                    <div className="flex justify-between"><span className="text-ink-muted">Operator Included:</span><span className="font-semibold text-ink">{selectedEquipment.is_operator_included ? 'Yes' : 'No'}</span></div>
                    <div className="flex justify-between"><span className="text-ink-muted">Delivery Available:</span><span className="font-semibold text-ink">{selectedEquipment.is_delivery_available ? 'Yes' : 'No'}</span></div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => handleApproveEquipment(selectedEquipment.id)}
                      className="flex-1 rounded-xl bg-green-500 py-3 text-xs font-black text-black hover:bg-green-400 transition-all shadow disabled:opacity-50"
                    >
                      ✓ Approve & Publish Live
                    </button>
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => handleRejectEquipment(selectedEquipment.id)}
                      className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-xs font-bold text-red-400 hover:bg-red-500/20 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>

                  <div className="text-center pt-2">
                    <Link
                      href="/admin/verification?tab=equipment"
                      className="text-xs text-cheesco-yellow hover:underline font-semibold"
                    >
                      Audit Full KYC & Documents in Verification Desk →
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="py-24 text-center text-xs text-ink-muted">
                  <div className="text-3xl mb-2">🚜</div>
                  Select an equipment listing from the queue to view full specifications and approve it.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}

export default function OperationsDashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-canvas" />}>
      <OperationsContent />
    </Suspense>
  );
}
