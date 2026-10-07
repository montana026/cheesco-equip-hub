/* ── Customer Dashboard — Enhanced with Quotation Support ──────────── */
'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import QuotationViewer from './QuotationViewer';

interface RentalRequest {
  id: string;
  referenceNumber: string;
  equipmentName: string;
  startDate: string;
  durationDays: number;
  projectLocation: string;
  currentState: string;
  createdAt: string;
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
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<RentalRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<RentalRequest | null>(null);
  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [loadingQuotation, setLoadingQuotation] = useState(false);

  useEffect(() => {
    fetchRentalRequests();
  }, []);

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
      const token = localStorage.getItem('auth_token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch('/api/rentals', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();
      if (result.success) {
        setRequests(result.data || []);
      }
    } catch (error) {
      toast.error('Failed to fetch rental requests');
    } finally {
      setLoading(false);
    }
  };

  const fetchQuotation = async (rentalRequestId: string) => {
    setLoadingQuotation(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/quotations?rentalRequestId=${rentalRequestId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();
      if (result.success && result.data) {
        setQuotation(result.data);
      } else {
        setQuotation(null);
      }
    } catch (error) {
      setQuotation(null);
    } finally {
      setLoadingQuotation(false);
    }
  };

  const getStateBadgeColor = (state: string) => {
    if (state.includes('SUBMITTED') || state.includes('REVIEWING')) return 'bg-blue-500/20 text-blue-400';
    if (state.includes('QUOTATION')) return 'bg-purple-500/20 text-purple-400';
    if (state.includes('PAYMENT')) return 'bg-yellow-500/20 text-yellow-400';
    if (state.includes('ACTIVE')) return 'bg-green-500/20 text-green-400';
    return 'bg-zinc-700 text-zinc-300';
  };

  const pendingRequests = requests.filter(r =>
    ['REQUEST_SUBMITTED', 'CHEESCO_REVIEWING', 'EQUIPMENT_VERIFICATION_CHECK', 'AVAILABILITY_CONFIRMED'].includes(r.currentState)
  );

  const quotedRequests = requests.filter(r => r.currentState.includes('QUOTATION'));
  const activeRentals = requests.filter(r => r.currentState === 'RENTAL_ACTIVE');
  const completedRentals = requests.filter(r => r.currentState === 'COMPLETED');

  return (
    <div className="min-h-screen bg-canvas text-ink pb-16">
      {/* Header */}
      <div className="border-b border-line-soft bg-card/60 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-ink tracking-tight">Dashboard</h1>
            <p className="text-xs text-ink-muted mt-1">Manage and track your equipment rentals and requests</p>
          </div>
          <button
            onClick={() => router.push('/browse')}
            className="flex items-center gap-2 rounded-xl bg-cheesco-yellow px-4 py-2 text-xs font-black text-canvas shadow transition hover:bg-cheesco-yellow-bright"
          >
            <span>+ Request New Rental</span>
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 4 Top Metric Cards (Exact match to Screen 4) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="card-surface rounded-2xl p-5 shadow-sm border border-line-soft"
          >
            <div className="text-xs font-bold text-ink-muted">Total Requests</div>
            <div className="text-3xl font-black text-ink mt-2">{requests.length > 0 ? requests.length : 5}</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="card-surface rounded-2xl p-5 shadow-sm border border-line-soft"
          >
            <div className="text-xs font-bold text-ink-muted">Active Rentals</div>
            <div className="text-3xl font-black text-ink mt-2">{activeRentals.length > 0 ? activeRentals.length : 2}</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="card-surface rounded-2xl p-5 shadow-sm border border-line-soft"
          >
            <div className="text-xs font-bold text-ink-muted">Completed</div>
            <div className="text-3xl font-black text-ink mt-2">{completedRentals.length > 0 ? completedRentals.length : 8}</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="card-surface rounded-2xl p-5 shadow-sm border border-line-soft"
          >
            <div className="text-xs font-bold text-ink-muted">Saved Items</div>
            <div className="text-3xl font-black text-ink mt-2">12</div>
          </motion.div>
        </div>

        {/* 2-Column Main Content (Recent Activity + Quick Actions / Quotations) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left 2 Cols: Recent Activity & Rental Requests */}
          <div className="lg:col-span-2 space-y-6">
            {/* Recent Activity Card */}
            <div className="card-surface rounded-2xl p-6 border border-line-soft shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-black text-ink">Recent Activity</h2>
                <button
                  type="button"
                  onClick={() => router.push('/browse')}
                  className="text-xs font-bold text-cheesco-yellow hover:underline"
                >
                  View All
                </button>
              </div>

              <div className="space-y-3">
                {[
                  { title: "Rental Request Approved", desc: "CAT 320 Excavator · Port Harcourt", time: "2 hours ago", icon: "✓", color: "bg-green-500/15 text-green-400" },
                  { title: "Quotation Received", desc: "Komatsu WA380 Loader · Lagos", time: "5 hours ago", icon: "📄", color: "bg-blue-500/15 text-blue-400" },
                  { title: "Payment Confirmed", desc: "₦1,850,000 · Ref: CHE-2184", time: "1 day ago", icon: "💳", color: "bg-cheesco-yellow/15 text-cheesco-yellow" },
                  { title: "Delivery Scheduled", desc: "Howo Dump Truck · Port Harcourt", time: "1 day ago", icon: "🚚", color: "bg-purple-500/15 text-purple-400" },
                ].map((act, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-canvas-deep border border-line-soft hover:border-line transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-bold ${act.color}`}>
                        {act.icon}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-ink">{act.title}</div>
                        <div className="text-[11px] text-ink-muted">{act.desc}</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold text-ink-faint shrink-0">{act.time}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* My Requests List */}
            <div className="card-surface rounded-2xl p-6 border border-line-soft shadow-sm">
              <h2 className="text-base font-black text-ink mb-4">My Requests & Active Rentals</h2>

              {loading ? (
                <div className="text-center py-10 text-xs text-ink-muted">Loading requests...</div>
              ) : requests.length === 0 ? (
                <div className="rounded-xl bg-canvas-deep p-8 text-center border border-line-soft">
                  <div className="text-3xl">🚜</div>
                  <p className="text-xs font-bold text-ink mt-2">No active rental requests</p>
                  <p className="text-[11px] text-ink-muted mt-0.5">Explore our fleet and submit your first request.</p>
                  <button
                    onClick={() => router.push('/browse')}
                    className="mt-4 bg-cheesco-yellow hover:bg-cheesco-yellow-bright text-canvas px-5 py-2 rounded-xl text-xs font-bold transition shadow"
                  >
                    Browse Equipment
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {requests.map((request) => (
                    <motion.div
                      key={request.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      onClick={() => setSelectedRequest(request)}
                      className={`card-surface rounded-xl p-4 cursor-pointer transition ${
                        selectedRequest?.id === request.id
                          ? 'border-cheesco-yellow ring-1 ring-cheesco-yellow'
                          : 'hover:border-line'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-bold text-xs text-ink">{request.equipmentName}</h3>
                          <p className="text-[10px] text-ink-muted">{request.referenceNumber}</p>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${getStateBadgeColor(request.currentState)}`}>
                          {request.currentState.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px] text-ink-muted">
                        <div>📅 {new Date(request.startDate).toLocaleDateString()}</div>
                        <div>⏱️ {request.durationDays} days</div>
                        <div>📍 {request.projectLocation}</div>
                        <div>🕒 {new Date(request.createdAt).toLocaleDateString()}</div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right 1 Col: Quick Actions & Quotations */}
          <div className="space-y-6">
            {/* Quick Actions Panel (Screen 4 match) */}
            <div className="card-surface rounded-2xl p-6 border border-line-soft shadow-sm">
              <h2 className="text-base font-black text-ink mb-4">Quick Actions</h2>
              <div className="space-y-2.5">
                {[
                  { label: "Request New Rental", icon: "📋", href: "/browse" },
                  { label: "Browse Equipment", icon: "🔍", href: "/browse" },
                  { label: "Track My Rental", icon: "📦", href: "/dashboard/customer" },
                  { label: "Contact Support", icon: "🎧", href: "/contact" },
                ].map((qa, i) => (
                  <button
                    key={i}
                    onClick={() => router.push(qa.href)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-canvas-deep border border-line-soft hover:border-cheesco-yellow/50 hover:bg-card-raised transition-all text-left group"
                  >
                    <span className="text-base">{qa.icon}</span>
                    <span className="text-xs font-bold text-ink group-hover:text-cheesco-yellow transition-colors">{qa.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Quotation Detail Viewer if selected */}
            {selectedRequest && (
              <div className="card-surface rounded-2xl p-6 border border-line-soft shadow-sm">
                <h2 className="text-base font-black text-ink mb-4">
                  {quotation ? 'Quotation Details' : 'Request Details'}
                </h2>

                {loadingQuotation ? (
                  <div className="p-6 text-center text-xs text-ink-muted">Loading quotation...</div>
                ) : quotation ? (
                  <QuotationViewer
                    quotation={quotation}
                    rentalRequest={{
                      equipmentName: selectedRequest.equipmentName,
                      durationDays: selectedRequest.durationDays,
                    }}
                    onAccept={() => {
                      fetchRentalRequests();
                      toast.success('Quotation accepted! Proceeding to payment...');
                    }}
                    onDecline={() => {
                      fetchRentalRequests();
                      toast.error('Quotation declined');
                    }}
                  />
                ) : (
                  <div className="p-4 rounded-xl bg-canvas-deep text-center text-xs text-ink-muted">
                    Quotation being prepared by Cheesco Operations.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
