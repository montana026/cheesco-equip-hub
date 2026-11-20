/* ── Logistics Tracker Component (Customer & Admin View) ────────────── */
'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { apiFetch } from '@/lib/api-client';

interface LogisticsTrackerProps {
  rentalRequestId: string;
  isAdmin?: boolean;
}

interface LogisticsData {
  id: string;
  carrierName: string;
  driverName: string;
  driverPhone: string;
  vehicleNumber: string;
  pickupLocation: string;
  deliveryLocation: string;
  estimatedPickupDate: string;
  estimatedDeliveryDate: string;
  actualPickupDate?: string;
  actualDeliveryDate?: string;
  status: string;
  currentLocation?: string;
  notes?: string;
}

export default function LogisticsTracker({ rentalRequestId, isAdmin = false }: LogisticsTrackerProps) {
  const [logistics, setLogistics] = useState<LogisticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmingDelivery, setConfirmingDelivery] = useState(false);

  useEffect(() => {
    fetchLogistics();
  }, [rentalRequestId]);

  const fetchLogistics = async () => {
    setLoading(true);
    try {
      const response = await apiFetch(`/api/logistics?rentalRequestId=${rentalRequestId}`);

      const result = await response.json();
      if (result.success && result.data) {
        setLogistics(result.data);
      }
    } catch (error) {
      console.error('Error fetching logistics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelivery = async () => {
    if (!logistics) return;
    if (!confirm('Confirm equipment has been delivered?')) return;

    setConfirmingDelivery(true);
    try {
      const response = await apiFetch(`/api/logistics/${logistics.id}/confirm-delivery`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notes: 'Delivery confirmed by customer',
        }),
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to confirm delivery');
      }

      toast.success('Delivery confirmed! Your rental is now active.');
      fetchLogistics();
    } catch (error: any) {
      toast.error(error.message || 'Failed to confirm delivery');
    } finally {
      setConfirmingDelivery(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-12 text-center">
        <p className="text-zinc-400">Loading logistics information...</p>
      </div>
    );
  }

  if (!logistics) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-12 text-center">
        <p className="text-zinc-400">No logistics assigned yet</p>
        <p className="text-sm text-zinc-500 mt-2">
          Logistics will be assigned after payment confirmation
        </p>
      </div>
    );
  }

  const statusSteps = [
    { key: 'ASSIGNED', label: 'Assigned', icon: '📋' },
    { key: 'PREPARING', label: 'Preparing', icon: '🔧' },
    { key: 'DISPATCHED', label: 'Dispatched', icon: '🚛' },
    { key: 'IN_TRANSIT', label: 'In Transit', icon: '🛣️' },
    { key: 'ARRIVED', label: 'Arrived', icon: '📍' },
    { key: 'DELIVERED', label: 'Delivered', icon: '✅' },
  ];

  const currentStepIndex = statusSteps.findIndex(s => s.key === logistics.status);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden"
    >
      {/* Header */}
      <div className="bg-zinc-800/50 px-6 py-4 border-b border-zinc-800">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold">Logistics Tracking</h2>
            <p className="text-zinc-400 text-sm mt-1">
              Carrier: {logistics.carrierName}
            </p>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-medium ${
            logistics.status === 'DELIVERED' ? 'bg-green-500/20 text-green-400' :
            logistics.status === 'IN_TRANSIT' ? 'bg-blue-500/20 text-blue-400' :
            'bg-yellow-500/20 text-yellow-400'
          }`}>
            {logistics.status.replace(/_/g, ' ')}
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Progress Timeline */}
        <div>
          <h3 className="font-semibold mb-4">Delivery Progress</h3>
          <div className="relative">
            {/* Progress Line */}
            <div className="absolute top-6 left-6 right-6 h-1 bg-zinc-800">
              <div
                className="h-full bg-yellow-500 transition-all duration-500"
                style={{ width: `${(currentStepIndex / (statusSteps.length - 1)) * 100}%` }}
              />
            </div>

            {/* Steps */}
            <div className="relative flex justify-between">
              {statusSteps.map((step, index) => (
                <div key={step.key} className="flex flex-col items-center">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl border-2 transition-all ${
                    index <= currentStepIndex
                      ? 'bg-yellow-500 border-yellow-500'
                      : 'bg-zinc-800 border-zinc-700'
                  }`}>
                    {step.icon}
                  </div>
                  <span className={`text-xs mt-2 ${
                    index <= currentStepIndex ? 'text-white font-medium' : 'text-zinc-500'
                  }`}>
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-zinc-400 mb-1">Driver</p>
            <p className="font-medium">{logistics.driverName}</p>
            <p className="text-xs text-zinc-500">{logistics.driverPhone}</p>
          </div>

          <div>
            <p className="text-zinc-400 mb-1">Vehicle</p>
            <p className="font-medium">{logistics.vehicleNumber}</p>
          </div>

          <div>
            <p className="text-zinc-400 mb-1">Pickup Location</p>
            <p className="font-medium">{logistics.pickupLocation}</p>
          </div>

          <div>
            <p className="text-zinc-400 mb-1">Delivery Location</p>
            <p className="font-medium">{logistics.deliveryLocation}</p>
          </div>

          <div>
            <p className="text-zinc-400 mb-1">Est. Pickup</p>
            <p className="font-medium">
              {format(new Date(logistics.estimatedPickupDate), 'MMM d, yyyy')}
            </p>
            {logistics.actualPickupDate && (
              <p className="text-xs text-green-400">
                Actual: {format(new Date(logistics.actualPickupDate), 'MMM d, yyyy')}
              </p>
            )}
          </div>

          <div>
            <p className="text-zinc-400 mb-1">Est. Delivery</p>
            <p className="font-medium">
              {format(new Date(logistics.estimatedDeliveryDate), 'MMM d, yyyy')}
            </p>
            {logistics.actualDeliveryDate && (
              <p className="text-xs text-green-400">
                Delivered: {format(new Date(logistics.actualDeliveryDate), 'MMM d, yyyy')}
              </p>
            )}
          </div>
        </div>

        {/* Current Location */}
        {logistics.currentLocation && (
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
            <p className="text-sm text-blue-400">
              📍 Current Location: {logistics.currentLocation}
            </p>
          </div>
        )}

        {/* Notes */}
        {logistics.notes && (
          <div className="bg-zinc-800/50 rounded-lg p-4">
            <p className="text-xs text-zinc-400 mb-1">Notes:</p>
            <p className="text-sm">{logistics.notes}</p>
          </div>
        )}

        {/* Confirm Delivery Button (Customer) */}
        {!isAdmin && logistics.status === 'ARRIVED' && (
          <button
            onClick={handleConfirmDelivery}
            disabled={confirmingDelivery}
            className="w-full bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-medium transition disabled:opacity-50"
          >
            {confirmingDelivery ? 'Confirming...' : '✓ Confirm Equipment Delivered'}
          </button>
        )}
      </div>
    </motion.div>
  );
}
