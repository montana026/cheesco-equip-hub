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
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-900/50">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <h1 className="text-3xl font-bold">My Dashboard</h1>
          <p className="text-zinc-400 mt-1">Track your rental requests and equipment</p>
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
            <div className="text-3xl font-bold text-blue-500">{pendingRequests.length}</div>
            <div className="text-sm text-zinc-400 mt-1">Pending Review</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-zinc-900 border border-zinc-800 rounded-lg p-6"
          >
            <div className="text-3xl font-bold text-purple-500">{quotedRequests.length}</div>
            <div className="text-sm text-zinc-400 mt-1">Quotations Received</div>
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
            <div className="text-3xl font-bold">{completedRentals.length}</div>
            <div className="text-sm text-zinc-400 mt-1">Completed</div>
          </motion.div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Requests List */}
          <div>
            <h2 className="text-xl font-bold mb-4">My Rental Requests</h2>

            {loading ? (
              <div className="text-center py-12 text-zinc-400">Loading...</div>
            ) : requests.length === 0 ? (
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-12 text-center">
                <p className="text-zinc-400 mb-4">No rental requests yet</p>
                <button
                  onClick={() => router.push('/browse')}
                  className="bg-yellow-500 hover:bg-yellow-600 text-black px-6 py-2 rounded-lg font-medium transition"
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
                      <div>Start: {new Date(request.startDate).toLocaleDateString()}</div>
                      <div>Duration: {request.durationDays} days</div>
                      <div>Location: {request.projectLocation}</div>
                      <div>Created: {new Date(request.createdAt).toLocaleDateString()}</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Quotation Viewer */}
          <div>
            {selectedRequest ? (
              <div>
                <h2 className="text-xl font-bold mb-4">
                  {quotation ? 'Quotation Details' : 'Request Details'}
                </h2>

                {loadingQuotation ? (
                  <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-12 text-center">
                    <p className="text-zinc-400">Loading quotation...</p>
                  </div>
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
                    }}
                  />
                ) : (
                  <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-8">
                    <h3 className="font-semibold text-lg mb-4">{selectedRequest.equipmentName}</h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Reference:</span>
                        <span className="font-medium">{selectedRequest.referenceNumber}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Status:</span>
                        <span className={`px-2 py-1 rounded text-xs ${getStateBadgeColor(selectedRequest.currentState)}`}>
                          {selectedRequest.currentState.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Start Date:</span>
                        <span>{new Date(selectedRequest.startDate).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Duration:</span>
                        <span>{selectedRequest.durationDays} days</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Location:</span>
                        <span>{selectedRequest.projectLocation}</span>
                      </div>
                    </div>

                    {selectedRequest.currentState.includes('REVIEWING') && (
                      <div className="mt-6 bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                        <p className="text-blue-400 text-sm">
                          ⏳ Cheesco is reviewing your request. You'll receive a quotation soon.
                        </p>
                      </div>
                    )}

                    {selectedRequest.currentState === 'REQUEST_SUBMITTED' && (
                      <div className="mt-6 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                        <p className="text-yellow-400 text-sm">
                          📋 Your request has been submitted. Cheesco will verify availability and prepare a quotation.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-12 text-center">
                <p className="text-zinc-400">Select a rental request to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
