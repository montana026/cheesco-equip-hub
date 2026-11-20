/* ── Customer Dashboard — Unified DashboardShell ──────────── */
"use client";

import { useEffect, useState, Suspense } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import QuotationViewer from "./QuotationViewer";
import { DashboardShell } from "@/components/dashboard-shell";
import type { SessionUser } from "@/lib/auth";
import { ROLE_HOME } from "@/lib/auth";
import { useAuth } from "@/lib/contexts/auth-context";
import { apiFetch } from "@/lib/api-client";

const CUSTOMER_NAV = [
  { href: "/dashboard/customer", label: "My Rentals & Inquiries" },
  { href: "/browse", label: "Browse Fleet" },
  { href: "/finance", label: "Equipment Financing" },
  { href: "/support", label: "Help & Support" },
];

interface RentalRequest {
  id: string;
  referenceNumber: string;
  equipmentName: string;
  startDate: string;
  durationDays: number;
  projectLocation: string;
  currentState: string;
  createdAt: string;
  quotationId?: string;
  quotationRef?: string;
}

interface Quotation {
  id: string;
  referenceNumber: string;
  merchantBaseRate: number;
  cheescoManagedRate: number;
  lineItems: Array<{ label: string; amount: number; note?: string }>;
  subtotal: number;
  depositAmount: number;
  totalAmount: number;
  status: string;
  validUntil: string;
  terms: string;
  sentAt?: string;
}

export function CustomerDashboardClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user: authUser, profile, loading: authLoading } = useAuth();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<RentalRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<RentalRequest | null>(null);
  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [loadingQuotation, setLoadingQuotation] = useState(false);

  useEffect(() => {
    // Wait until the auth context has finished its session hydration before
    // making any redirect decision — otherwise we bounce logged-in users to /login
    // during the brief window where authUser is still loading.
    if (authLoading) return;

    if (profile) {
      // If the authenticated user is a merchant or admin, redirect them to their respective role home
      if (profile.role && profile.role !== "CUSTOMER" && ROLE_HOME[profile.role as keyof typeof ROLE_HOME]) {
        router.replace(ROLE_HOME[profile.role as keyof typeof ROLE_HOME]);
        return;
      }

      setUser({
        id: profile.id,
        name: profile.full_name || profile.name || authUser?.email || "Customer",
        email: profile.email || authUser?.email || "",
        role: profile.role || "CUSTOMER",
      });
      fetchRentalRequests();
    } else if (!authUser) {
      router.replace("/login");
    }
  }, [profile, authUser, authLoading, router]);

  // Reactive listener for deep-links via URL query or in-app notification clicks
  useEffect(() => {
    const selectTarget = (targetId: string) => {
      if (!targetId || requests.length === 0) return;
      const match = requests.find(
        (r) =>
          r.id === targetId ||
          r.referenceNumber === targetId ||
          r.quotationId === targetId ||
          r.quotationRef === targetId
      );
      if (match) {
        setSelectedRequest(match);
        setTimeout(() => {
          const el = document.getElementById("quotation-details-section");
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }, 150);
      }
    };

    const targetId = searchParams?.get("requestId") || searchParams?.get("id");
    if (targetId && requests.length > 0) {
      selectTarget(targetId);
    } else if (!selectedRequest && requests.length > 0) {
      // Auto-select first request so customer sees their quotation/status immediately
      setSelectedRequest(requests[0]);
    }

    // Listen to immediate custom events dispatched by NotificationBell
    const handleSelectEvent = (e: any) => {
      const id = e?.detail?.requestId;
      if (id) {
        selectTarget(id);
      }
    };

    window.addEventListener("cheesco:select-request", handleSelectEvent);
    return () => {
      window.removeEventListener("cheesco:select-request", handleSelectEvent);
    };
  }, [searchParams, requests, selectedRequest]);

  useEffect(() => {
    if (selectedRequest) {
      fetchQuotation(selectedRequest.id);
    } else {
      setQuotation(null);
    }
  }, [selectedRequest]);

  const fetchRentalRequests = async () => {
    setLoading(true);
    try {
      const response = await apiFetch("/api/rentals");
      if (response.status === 401) {
        router.push("/login");
        return;
      }

      const result = await response.json();
      if (result.success) {
        const rawList = Array.isArray(result.data) ? result.data : [];
        const normalized: RentalRequest[] = rawList.map((item: any) => {
          const q = Array.isArray(item.quotation) ? item.quotation[0] : item.quotation;
          return {
            id: item.id,
            referenceNumber: item.referenceNumber || item.reference_number || "REQ-PENDING",
            equipmentName: item.equipmentName || item.equipment?.name || "Equipment",
            startDate: item.startDate || item.start_date || new Date().toISOString(),
            durationDays: item.durationDays ?? item.duration_days ?? 30,
            projectLocation: item.projectLocation || item.project_location || "N/A",
            currentState: item.currentState || item.current_state || "REQUEST_SUBMITTED",
            createdAt: item.createdAt || item.created_at || new Date().toISOString(),
            quotationId: q?.id,
            quotationRef: q?.reference_number || q?.referenceNumber,
          };
        });
        setRequests(normalized);
      }
    } catch (error) {
      toast.error("Failed to fetch rental requests", { id: "customer-rentals-err" });
    } finally {
      setLoading(false);
    }
  };

  const fetchQuotation = async (rentalRequestId: string) => {
    setLoadingQuotation(true);
    try {
      const response = await apiFetch(`/api/quotations?rentalRequestId=${rentalRequestId}`);

      const result = await response.json();
      if (result.success && result.data) {
        // Supabase returns snake_case column names — normalize to camelCase
        const raw = result.data;
        setQuotation({
          id: raw.id,
          referenceNumber: raw.reference_number ?? raw.referenceNumber ?? '',
          merchantBaseRate: raw.merchant_base_rate ?? raw.merchantBaseRate ?? 0,
          cheescoManagedRate: raw.cheesco_managed_rate ?? raw.cheescoManagedRate ?? 0,
          lineItems: Array.isArray(raw.line_items)
            ? raw.line_items
            : Array.isArray(raw.lineItems)
            ? raw.lineItems
            : [],
          subtotal: raw.subtotal ?? 0,
          depositAmount: raw.deposit_amount ?? raw.depositAmount ?? 0,
          totalAmount: raw.total_amount ?? raw.totalAmount ?? 0,
          status: raw.status ?? 'DRAFT',
          validUntil: raw.valid_until ?? raw.validUntil ?? new Date().toISOString(),
          terms: raw.terms ?? '',
          sentAt: raw.sent_at ?? raw.sentAt,
        });
      } else {
        setQuotation(null);
      }
    } catch (error) {
      setQuotation(null);
    } finally {
      setLoadingQuotation(false);
    }
  };

  const [activeTab, setActiveTab] = useState<"ALL" | "ACTIVE" | "INQUIRIES" | "PAST">("ALL");

  const isPastBooking = (state: string) => {
    const s = String(state || "").toUpperCase();
    return (
      s.includes("COMPLETED") ||
      s.includes("SETTLEMENT") ||
      s.includes("POST_RENTAL") ||
      s.includes("CANCELLED") ||
      s.includes("DECLINED") ||
      s.includes("EXPIRED") ||
      s.includes("FAILED")
    );
  };

  const isInquiry = (state: string) => {
    const s = String(state || "").toUpperCase();
    if (isPastBooking(s)) return false;
    return (
      s.includes("QUOTATION") ||
      s.includes("SUBMITTED") ||
      s.includes("REVIEWING") ||
      s.includes("AVAILABILITY") ||
      s.includes("VERIFICATION") ||
      s.includes("PAYMENT_PENDING")
    );
  };

  const isActiveBooking = (state: string) => {
    const s = String(state || "").toUpperCase();
    if (isPastBooking(s) || isInquiry(s)) return false;
    return (
      s.includes("ACTIVE") ||
      s.includes("PAYMENT_CONFIRMED") ||
      s.includes("AGREEMENT") ||
      s.includes("DELIVERED") ||
      s.includes("TRANSIT") ||
      s.includes("CARRIER") ||
      s.includes("LOGISTICS") ||
      s.includes("RETURN") ||
      s.includes("DEPOSIT_HELD")
    );
  };

  const activeRentals = requests.filter((r) => isActiveBooking(r.currentState));
  const inquiryRequests = requests.filter((r) => isInquiry(r.currentState));
  const pastRentals = requests.filter((r) => isPastBooking(r.currentState));

  const filteredRequests = requests.filter((r) => {
    if (activeTab === "ACTIVE") return isActiveBooking(r.currentState);
    if (activeTab === "INQUIRIES") return isInquiry(r.currentState);
    if (activeTab === "PAST") return isPastBooking(r.currentState);
    return true;
  });

  const handleTabChange = (tab: "ALL" | "ACTIVE" | "INQUIRIES" | "PAST") => {
    setActiveTab(tab);
    const subset = requests.filter((r) => {
      if (tab === "ACTIVE") return isActiveBooking(r.currentState);
      if (tab === "INQUIRIES") return isInquiry(r.currentState);
      if (tab === "PAST") return isPastBooking(r.currentState);
      return true;
    });
    if (subset.length > 0) {
      const stillInSubset = subset.some((r) => r.id === selectedRequest?.id);
      if (!stillInSubset) {
        setSelectedRequest(subset[0]);
      }
    }
  };

  const getStateBadgeColor = (state?: string | null) => {
    if (!state) return "bg-zinc-700 text-zinc-300";
    const s = String(state).toUpperCase();
    if (isPastBooking(s)) return "bg-zinc-800 text-zinc-400 border border-zinc-700/50";
    if (isActiveBooking(s)) return "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30";
    if (s.includes("QUOTATION") || s.includes("PAYMENT")) return "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30";
    if (s.includes("SUBMITTED") || s.includes("REVIEWING")) return "bg-blue-500/20 text-blue-400 border border-blue-500/30";
    return "bg-zinc-700 text-zinc-300";
  };

  return (
    <DashboardShell
      user={user}
      nav={CUSTOMER_NAV}
      title="Customer Portal"
      subtitle="Manage your active machine deployments, review quotations, and view past completed projects"
    >
      <div className="space-y-8">
        {/* Top 4 Interactive Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => handleTabChange("ALL")}
            className={`rounded-2xl border p-5 shadow-sm cursor-pointer transition-all ${
              activeTab === "ALL"
                ? "border-cheesco-yellow ring-2 ring-cheesco-yellow/30 bg-card"
                : "border-line-soft bg-card hover:border-line"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-ink-muted">All Requests</div>
              <span className="text-xs">📂</span>
            </div>
            <div className="text-3xl font-black text-ink mt-2">{requests.length}</div>
            <span className="mt-1 block text-[10px] text-zinc-400 font-semibold">● Total logged bookings</span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            onClick={() => handleTabChange("ACTIVE")}
            className={`rounded-2xl border p-5 shadow-sm cursor-pointer transition-all ${
              activeTab === "ACTIVE"
                ? "border-cheesco-yellow ring-2 ring-cheesco-yellow/30 bg-card"
                : "border-line-soft bg-card hover:border-line"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-ink-muted">Active Bookings</div>
              <span className="text-xs">⚡</span>
            </div>
            <div className="text-3xl font-black text-cheesco-yellow mt-2">{activeRentals.length}</div>
            <span className="mt-1 block text-[10px] text-cheesco-yellow font-semibold">● Machinery deployed on site</span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            onClick={() => handleTabChange("INQUIRIES")}
            className={`rounded-2xl border p-5 shadow-sm cursor-pointer transition-all ${
              activeTab === "INQUIRIES"
                ? "border-cheesco-yellow ring-2 ring-cheesco-yellow/30 bg-card"
                : "border-line-soft bg-card hover:border-line"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-ink-muted">Inquiries & Quotes</div>
              <span className="text-xs">⏳</span>
            </div>
            <div className="text-3xl font-black text-ink mt-2">{inquiryRequests.length}</div>
            <span className="mt-1 block text-[10px] text-purple-400 font-semibold">● Verification & quotation pending</span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            onClick={() => handleTabChange("PAST")}
            className={`rounded-2xl border p-5 shadow-sm cursor-pointer transition-all ${
              activeTab === "PAST"
                ? "border-cheesco-yellow ring-2 ring-cheesco-yellow/30 bg-card"
                : "border-line-soft bg-card hover:border-line"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-ink-muted">Past Bookings</div>
              <span className="text-xs">🏁</span>
            </div>
            <div className="text-3xl font-black text-ink mt-2">{pastRentals.length}</div>
            <span className="mt-1 block text-[10px] text-blue-400 font-semibold">● Demobilized & completed</span>
          </motion.div>
        </div>

        {/* 2-Column Main Content (My Inquiries & Quick Actions / Quotations) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left 2 Cols: Rental Requests */}
          <div className="lg:col-span-2 space-y-6">
            {/* My Requests List Container */}
            <div className="rounded-2xl border border-line-soft bg-card p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 border-b border-line-soft pb-4">
                <div>
                  <h2 className="text-base font-black text-ink">
                    Equipment Bookings & Inquiries
                  </h2>
                  <p className="text-xs text-ink-muted mt-0.5">Filter by booking phase to review status and details</p>
                </div>
                <Link
                  href="/browse"
                  className="inline-flex items-center gap-1.5 self-start sm:self-auto bg-cheesco-yellow hover:bg-cheesco-yellow-bright text-[#0A0D14] px-4 py-2 rounded-xl text-xs font-bold transition shadow"
                >
                  <span>+ New Booking</span>
                </Link>
              </div>

              {/* Segmented Filter Tabs */}
              <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-4 border-b border-line-soft text-xs font-bold">
                <button
                  type="button"
                  onClick={() => handleTabChange("ALL")}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 shrink-0 ${
                    activeTab === "ALL"
                      ? "bg-cheesco-yellow text-[#0A0D14] shadow"
                      : "bg-canvas-deep text-ink-muted hover:text-ink"
                  }`}
                >
                  <span>All</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    activeTab === "ALL" ? "bg-black/20 text-black" : "bg-zinc-800 text-zinc-400"
                  }`}>
                    {requests.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleTabChange("ACTIVE")}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 shrink-0 ${
                    activeTab === "ACTIVE"
                      ? "bg-cheesco-yellow text-[#0A0D14] shadow"
                      : "bg-canvas-deep text-ink-muted hover:text-ink"
                  }`}
                >
                  <span>⚡ Active Bookings</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    activeTab === "ACTIVE" ? "bg-black/20 text-black" : "bg-emerald-950 text-emerald-400"
                  }`}>
                    {activeRentals.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleTabChange("INQUIRIES")}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 shrink-0 ${
                    activeTab === "INQUIRIES"
                      ? "bg-cheesco-yellow text-[#0A0D14] shadow"
                      : "bg-canvas-deep text-ink-muted hover:text-ink"
                  }`}
                >
                  <span>📋 Inquiries & Quotes</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    activeTab === "INQUIRIES" ? "bg-black/20 text-black" : "bg-purple-950 text-purple-400"
                  }`}>
                    {inquiryRequests.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleTabChange("PAST")}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 shrink-0 ${
                    activeTab === "PAST"
                      ? "bg-cheesco-yellow text-[#0A0D14] shadow"
                      : "bg-canvas-deep text-ink-muted hover:text-ink"
                  }`}
                >
                  <span>🏁 Past Bookings</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    activeTab === "PAST" ? "bg-black/20 text-black" : "bg-zinc-800 text-zinc-400"
                  }`}>
                    {pastRentals.length}
                  </span>
                </button>
              </div>

              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="rounded-xl p-4 bg-canvas border border-line-soft animate-pulse flex items-center justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="h-4 w-1/3 rounded bg-line-soft" />
                        <div className="h-3 w-1/4 rounded bg-line-soft" />
                      </div>
                      <div className="h-6 w-20 rounded-full bg-line-soft" />
                    </div>
                  ))}
                </div>
              ) : filteredRequests.length === 0 ? (
                <div className="rounded-xl bg-canvas p-8 text-center border border-line-soft">
                  <div className="text-3xl mb-2">
                    {activeTab === "ACTIVE" ? "⚡" : activeTab === "PAST" ? "🏁" : "🚜"}
                  </div>
                  <p className="text-xs font-bold text-ink">
                    {activeTab === "ACTIVE"
                      ? "No active equipment deployments right now"
                      : activeTab === "INQUIRIES"
                      ? "No pending rental inquiries"
                      : activeTab === "PAST"
                      ? "No past completed bookings recorded yet"
                      : "No rental requests found"}
                  </p>
                  <p className="text-[11px] text-ink-muted mt-1 max-w-sm mx-auto">
                    {activeTab === "ACTIVE"
                      ? "When your quotations are accepted and payments confirmed, mobilized machines appear here."
                      : activeTab === "INQUIRIES"
                      ? "Submit rental requests from the catalog to review pricing and availability."
                      : "Explore our verified heavy machinery fleet and submit your next rental request."}
                  </p>
                  <Link
                    href="/browse"
                    className="mt-4 inline-block bg-cheesco-yellow hover:bg-cheesco-yellow-bright text-[#0A0D14] px-5 py-2 rounded-xl text-xs font-bold transition shadow"
                  >
                    Browse Equipment Catalog
                  </Link>
                </div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                  {filteredRequests.map((request) => {
                    const isQuoted = ["QUOTATION_SENT", "QUOTATION_VIEWED"].includes(request.currentState);
                    const isPaymentPending = request.currentState === "PAYMENT_PENDING" || request.currentState === "QUOTATION_ACCEPTED";
                    const isPaymentConfirmed = request.currentState === "PAYMENT_CONFIRMED" || request.currentState === "DEPOSIT_HELD";
                    const isActive = isActiveBooking(request.currentState) && !isPaymentConfirmed;

                    return (
                      <motion.div
                        key={request.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        onClick={() => {
                          setSelectedRequest(request);
                          setTimeout(() => {
                            const el = document.getElementById("quotation-details-section");
                            if (el) {
                              el.scrollIntoView({ behavior: "smooth", block: "start" });
                            }
                          }, 100);
                        }}
                        className={`rounded-xl p-4 bg-canvas border cursor-pointer transition ${
                          selectedRequest?.id === request.id
                            ? "border-cheesco-yellow ring-2 ring-cheesco-yellow/40 bg-canvas-deep"
                            : "border-line-soft hover:border-cheesco-yellow/40 hover:bg-canvas-deep/50"
                        }`}
                      >
                        <div className="flex justify-between items-start gap-3 mb-2">
                          <div>
                            <h3 className="font-bold text-xs text-ink">{request.equipmentName}</h3>
                            <p className="text-[10px] text-cheesco-yellow font-mono">{request.referenceNumber}</p>
                          </div>
                          <div className="text-right flex flex-col items-end gap-1">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${getStateBadgeColor(request.currentState)}`}>
                              {String(request.currentState || "REQUEST_SUBMITTED").replace(/_/g, " ")}
                            </span>
                            {isQuoted && (
                              <span className="text-[9px] font-bold text-yellow-400 bg-yellow-400/10 px-1.5 py-0.5 rounded">
                                🔔 Quotation Ready
                              </span>
                            )}
                            {isPaymentPending && (
                              <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.5 rounded flex items-center gap-1">
                                💳 Ready to Pay
                              </span>
                            )}
                            {isPaymentConfirmed && (
                              <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.5 rounded flex items-center gap-1">
                                ✅ Payment Confirmed
                              </span>
                            )}
                            {isActive && (
                              <span className="text-[9px] font-bold text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded">
                                🚜 On Site / Active
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[11px] text-ink-muted mt-2 pt-2 border-t border-line-soft/50">
                          <div>📅 Start: {request.startDate ? new Date(request.startDate).toLocaleDateString() : "—"}</div>
                          <div>⏱️ Duration: {request.durationDays || 0} days</div>
                          <div>📍 Location: {request.projectLocation || "—"}</div>
                          <div>🕒 Requested: {request.createdAt ? new Date(request.createdAt).toLocaleDateString() : "—"}</div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Quotation & Payment Details — directly below the bookings list */}
            <div
              id="quotation-details-section"
                className="mt-6 rounded-2xl border border-line-soft bg-card p-6 shadow-sm scroll-mt-24 ring-1 ring-cheesco-yellow/40 transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 border-b border-line-soft pb-3">
                  <div>
                    <h2 className="text-base font-black text-ink">
                      {selectedRequest
                        ? quotation
                          ? "Quotation & Payment Details"
                          : "Rental Request Summary"
                        : "Quotation & Payment Details"}
                    </h2>
                    {selectedRequest && (
                      <p className="text-xs text-cheesco-yellow font-mono mt-0.5">
                        Ref: {selectedRequest.referenceNumber} · {selectedRequest.equipmentName}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    {selectedRequest && (
                      <span className={`self-start sm:self-auto text-[10px] font-bold px-2.5 py-1 rounded-md ${getStateBadgeColor(selectedRequest.currentState)}`}>
                        {String(selectedRequest.currentState || "REQUEST_SUBMITTED").replace(/_/g, " ")}
                      </span>
                    )}
                    {selectedRequest &&
                      (selectedRequest.currentState === "PAYMENT_CONFIRMED" ||
                        isActiveBooking(selectedRequest.currentState)) &&
                      (selectedRequest.quotationRef || selectedRequest.referenceNumber) && (
                        <a
                          href={`/invoice/${selectedRequest.quotationRef || selectedRequest.referenceNumber}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-black text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                        >
                          📄 Download Invoice
                        </a>
                      )}
                  </div>
                </div>

                {loadingQuotation ? (
                  <div className="p-8 text-center text-xs text-ink-muted">
                    <span className="text-2xl block mb-2 animate-bounce">⏳</span>
                    Loading quotation and pricing details...
                  </div>
                ) : selectedRequest && quotation ? (
                  <QuotationViewer
                    quotation={quotation}
                    rentalRequest={{
                      equipmentName: selectedRequest.equipmentName,
                      durationDays: selectedRequest.durationDays,
                      currentState: selectedRequest.currentState,
                    }}
                    onAccept={() => {
                      fetchRentalRequests();
                    }}
                    onDecline={() => {
                      fetchRentalRequests();
                      toast.error("Quotation declined");
                    }}
                  />
                ) : selectedRequest ? (
                  <div className="p-6 rounded-xl bg-canvas text-center text-xs text-ink-muted border border-line-soft">
                    <div className="text-2xl mb-2">📋</div>
                    <p className="font-bold text-ink">Quotation In Preparation</p>
                    <p className="mt-1 max-w-sm mx-auto">
                      Our operations team is currently confirming machine availability, calculating logistics haulage, and preparing your official quotation.
                    </p>
                  </div>
                ) : (
                  <div className="p-8 rounded-xl bg-canvas text-center text-xs text-ink-muted border border-line-soft">
                    <div className="text-3xl mb-2">👈</div>
                    <p className="font-bold text-ink">No Booking Selected</p>
                    <p className="mt-1">
                      Click any equipment booking in the list above to view quotation details and make payment.
                    </p>
                  </div>
                )}
              </div>
            </div>

          {/* Right 1 Col: Quick Actions & Help Guide */}
          <div className="space-y-6">
            {/* Quick Actions Panel */}
            <div className="rounded-2xl border border-line-soft bg-card p-6 shadow-sm">
              <h2 className="text-base font-black text-ink mb-4 border-b border-line-soft pb-3">Quick Actions</h2>
              <div className="space-y-2.5">
                {[
                  { label: "Request New Rental", icon: "📋", href: "/browse" },
                  { label: "Equipment Financing", icon: "🛡️", href: "/finance" },
                  { label: "Open Support Ticket", icon: "🎧", href: "/support" },
                  { label: "Contact Dispatch Desk", icon: "📞", href: "tel:+2348002433726" },
                ].map((qa, i) => (
                  <Link
                    key={i}
                    href={qa.href}
                    className="flex items-center gap-3 p-3 rounded-xl bg-canvas border border-line-soft hover:border-cheesco-yellow/50 hover:bg-canvas-deep transition-all text-left group"
                  >
                    <span className="text-base">{qa.icon}</span>
                    <span className="text-xs font-bold text-ink group-hover:text-cheesco-yellow transition-colors">
                      {qa.label}
                    </span>
                  </Link>
                ))}
              </div>
            </div>

            {/* How Payment & Mobilization Works */}
            <div className="rounded-2xl border border-line-soft bg-card p-6 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-cheesco-yellow mb-3">
                💡 Rental &amp; Payment Steps
              </h3>
              <ol className="space-y-3 text-xs text-ink-muted">
                <li className="flex items-start gap-2.5">
                  <span className="font-black text-ink bg-canvas-deep border border-line-soft rounded-full w-5 h-5 flex items-center justify-center shrink-0 text-[10px]">1</span>
                  <span><strong>Review Quotation:</strong> Check daily rate, haulage, operator allowances &amp; deposit.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="font-black text-ink bg-canvas-deep border border-line-soft rounded-full w-5 h-5 flex items-center justify-center shrink-0 text-[10px]">2</span>
                  <span><strong>Accept &amp; Pay:</strong> Click &ldquo;Accept Quotation&rdquo; then &ldquo;Pay Now&rdquo; to complete checkout via Paystack.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="font-black text-ink bg-canvas-deep border border-line-soft rounded-full w-5 h-5 flex items-center justify-center shrink-0 text-[10px]">3</span>
                  <span><strong>Site Mobilization:</strong> Cheesco dispatches heavy haulage and your machine arrives on site.</span>
                </li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}

// Suspense wrapper required by Next.js when useSearchParams is used
export function CustomerDashboardClientWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-canvas" />}>
      <CustomerDashboardClient />
    </Suspense>
  );
}
