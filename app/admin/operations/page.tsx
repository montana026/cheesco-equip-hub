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

  const priorityRequests = requests.filter(r =>
    ['REQUEST_SUBMITTED', 'CHEESCO_REVIEWING', 'EQUIPMENT_VERIFICATION_CHECK', 'AVAILABILITY_CONFIRMED'].includes(r.currentState)
  );

  const quotedRequests = requests.filter(r =>
    r.currentState.includes('QUOTATION')
  );

  const activeRentals = requests.filter(r =>
    ['RENTAL_ACTIVE', 'IN_TRANSIT', 'DELIVERED'].includes(r.currentState)
  );

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-900/50">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <h1 className="text-3xl font-bold">Operations Center</h1>
          <p className="text-zinc-400 mt-1">Manage rental requests and quotations</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-zinc-900 border border-zinc-800 rounded-lg p-6"
          >
            <div className="text-3xl font-bold text-yellow-500">{priorityRequests.length}</div>
            <div className="text-sm text-zinc-400 mt-1">Pending Review</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-zinc-900 border border-zinc-800 rounded-lg p-6"
          >
            <div className="text-3xl font-bold text-purple-500">{quotedRequests.length}</div>
            <div className="text-sm text-zinc-400 mt-1">Awaiting Customer Response</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-zinc-900 border border-zinc-800 rounded-lg p-6"
          >
            <div className="text-3xl font-bold text-green-500">{activeRentals.length}</div>
            <div className="text-sm text-zinc-400 mt-1">Active Rentals</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-zinc-900 border border-zinc-800 rounded-lg p-6"
          >
            <div className="text-3xl font-bold">{requests.length}</div>
            <div className="text-sm text-zinc-400 mt-1">Total Requests</div>
          </motion.div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Requests List */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Rental Requests</h2>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
                className="bg-zinc-900 border border-zinc-800 rounded px-3 py-1 text-sm"
              >
                <option value="pending">Pending Review</option>
                <option value="quoted">Quoted</option>
                <option value="active">Active</option>
                <option value="all">All</option>
              </select>
            </div>

            {loading ? (
              <div className="text-center py-12 text-zinc-400">Loading...</div>
            ) : requests.length === 0 ? (
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-12 text-center">
                <p className="text-zinc-400">No rental requests found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {requests.map((request) => (
                  <motion.div
                    key={request.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onClick={() => setSelectedRequest(request)}
                    className={`bg-zinc-900 border rounded-lg p-4 cursor-pointer transition ${
                      selectedRequest?.id === request.id
                        ? 'border-yellow-500'
                        : 'border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold">{request.equipmentName}</h3>
                        <p className="text-sm text-zinc-400">{request.referenceNumber}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${getStateBadgeColor(request.currentState)}`}>
                        {request.currentState.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-zinc-400">
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
          <div>
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
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-12 text-center">
                <p className="text-zinc-400">Select a rental request to create a quotation</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
