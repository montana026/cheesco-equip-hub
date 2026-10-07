/* ── Operations Dashboard (Cheesco Admin) ──────────────────────────── */
'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import QuotationBuilder from '@/components/QuotationBuilder';

interface RentalRequest {
  id: string;
  referenceNumber: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  equipmentId: string;
  equipmentName: string;
  merchantName: string;
  startDate: string;
  durationDays: number;
  projectLocation: string;
  projectType: string;
  operatorRequired: boolean;
  deliveryRequired: boolean;
  currentState: string;
  createdAt: string;
  merchantBaseRate: number;
}

export default function OperationsDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<RentalRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<RentalRequest | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'quoted' | 'active'>('pending');

  useEffect(() => {
    fetchRequests();
  }, [filter]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/admin/rental-requests?filter=${filter}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();
      if (result.success) {
        setRequests(result.data);
      }
    } catch (error) {
      toast.error('Failed to fetch rental requests');
    } finally {
      setLoading(false);
    }
  };

  const getStateBadgeColor = (state: string) => {
    if (state.includes('SUBMITTED') || state.includes('REVIEWING')) return 'bg-blue-500/20 text-blue-400';
    if (state.includes('QUOTATION')) return 'bg-purple-500/20 text-purple-400';
    if (state.includes('PAYMENT')) return 'bg-yellow-500/20 text-yellow-400';
    if (state.includes('ACTIVE')) return 'bg-green-500/20 text-green-400';
    return 'bg-zinc-700 text-zinc-300';
  };

  return (
    <div className="min-h-screen bg-canvas text-ink pb-16">
      {/* Header */}
      <div className="border-b border-line-soft bg-card/60 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-2xl font-black text-ink tracking-tight">Admin Overview</h1>
          <p className="text-xs text-ink-muted mt-1">Platform management and operations desk</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 4 Stats Cards (Exact match to Screen 7) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="card-surface rounded-2xl p-5 border border-line-soft shadow-sm"
          >
            <div className="text-xs font-bold text-ink-muted">Total Users</div>
            <div className="text-3xl font-black text-ink mt-2">1,248</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="card-surface rounded-2xl p-5 border border-line-soft shadow-sm"
          >
            <div className="text-xs font-bold text-ink-muted">Verified Merchants</div>
            <div className="text-3xl font-black text-ink mt-2">236</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="card-surface rounded-2xl p-5 border border-line-soft shadow-sm"
          >
            <div className="text-xs font-bold text-ink-muted">Total Listings</div>
            <div className="text-3xl font-black text-ink mt-2">892</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="card-surface rounded-2xl p-5 border border-line-soft shadow-sm"
          >
            <div className="text-xs font-bold text-ink-muted">Active Rentals</div>
            <div className="text-3xl font-black text-ink mt-2">156</div>
          </motion.div>
        </div>

        {/* Recent Activities Panel (Matches Screen 7) */}
        <div className="card-surface rounded-2xl p-6 border border-line-soft shadow-sm mb-8">
          <h2 className="text-base font-black text-ink mb-4">Recent Activities</h2>
          <div className="space-y-3">
            {[
              { title: "New merchant registration", desc: "ABC Equipment Ltd · Pending Review", time: "1h ago", status: "Pending Review", statusColor: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
              { title: "Rental request submitted", desc: "CAT 320 Excavator · Port Harcourt", time: "2h ago", status: "New Request", statusColor: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
              { title: "Payment received", desc: "₦1,850,000 · Ref: CHE-2184", time: "5h ago", status: "Confirmed", statusColor: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
              { title: "Dispute opened", desc: "Equipment damage claim · Site Inspection", time: "1d ago", status: "Under Review", statusColor: "bg-red-500/15 text-red-400 border-red-500/30" },
            ].map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-3.5 rounded-xl bg-canvas-deep border border-line-soft">
                <div>
                  <div className="text-xs font-bold text-ink">{item.title}</div>
                  <div className="text-[11px] text-ink-muted mt-0.5">{item.desc}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${item.statusColor}`}>
                    {item.status}
                  </span>
                  <span className="text-[10px] text-ink-faint font-semibold">{item.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main Operations Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Requests List */}
          <div className="card-surface rounded-2xl p-6 border border-line-soft shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-base font-black text-ink">Rental Requests</h2>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
                className="h-8 rounded-lg bg-canvas-deep px-3 text-xs font-bold text-ink outline-none ring-1 ring-line-soft"
              >
                <option value="pending">Pending Review</option>
                <option value="quoted">Quoted</option>
                <option value="active">Active</option>
                <option value="all">All</option>
              </select>
            </div>

            {loading ? (
              <div className="text-center py-10 text-xs text-ink-muted">Loading...</div>
            ) : requests.length === 0 ? (
              <div className="rounded-xl bg-canvas-deep p-8 text-center text-xs text-ink-muted">
                No rental requests found
              </div>
            ) : (
              <div className="space-y-3">
                {requests.map((request) => (
                  <motion.div
                    key={request.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onClick={() => setSelectedRequest(request)}
                    className={`rounded-xl p-3.5 bg-canvas-deep border cursor-pointer transition ${
                      selectedRequest?.id === request.id
                        ? 'border-cheesco-yellow ring-1 ring-cheesco-yellow'
                        : 'border-line-soft hover:border-line'
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
                      <div>Customer: {request.customerName}</div>
                      <div>Duration: {request.durationDays} days</div>
                      <div>Location: {request.projectLocation}</div>
                      <div>Merchant: {request.merchantName}</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Quotation Builder */}
          <div className="card-surface rounded-2xl p-6 border border-line-soft shadow-sm">
            {selectedRequest ? (
              <QuotationBuilder
                rentalRequest={{
                  id: selectedRequest.id,
                  referenceNumber: selectedRequest.referenceNumber,
                  equipmentName: selectedRequest.equipmentName,
                  durationDays: selectedRequest.durationDays,
                  merchantBaseRate: selectedRequest.merchantBaseRate,
                }}
                onSuccess={() => {
                  toast.success('Quotation created successfully');
                  setSelectedRequest(null);
                  fetchRequests();
                }}
              />
            ) : (
              <div className="rounded-xl bg-canvas-deep p-12 text-center text-xs text-ink-muted">
                Select a rental request to create a quotation
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
