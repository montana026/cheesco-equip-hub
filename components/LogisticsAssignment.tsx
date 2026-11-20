/* ── Logistics Assignment Form (Operations Admin) ──────────────────── */
'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { apiFetch } from '@/lib/api-client';

interface LogisticsAssignmentProps {
  rentalRequest: {
    id: string;
    referenceNumber: string;
    equipmentName: string;
    projectLocation: string;
  };
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function LogisticsAssignment({
  rentalRequest,
  onSuccess,
  onCancel,
}: LogisticsAssignmentProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    carrierName: '',
    driverName: '',
    driverPhone: '',
    vehicleNumber: '',
    pickupLocation: '',
    deliveryLocation: rentalRequest.projectLocation,
    estimatedPickupDate: '',
    estimatedDeliveryDate: '',
    notes: '',
  });

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await apiFetch('/api/logistics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rentalRequestId: rentalRequest.id,
          ...formData,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to assign logistics');
      }

      toast.success('Logistics assigned successfully');
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.message || 'Failed to assign logistics');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-zinc-900 border border-zinc-800 rounded-lg p-6"
    >
      <h2 className="text-2xl font-bold mb-2">Assign Logistics</h2>
      <p className="text-zinc-400 text-sm mb-6">
        Request: {rentalRequest.referenceNumber} • {rentalRequest.equipmentName}
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Carrier & Driver Info */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Carrier/Company Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.carrierName}
              onChange={(e) => updateField('carrierName', e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-4 py-2 focus:outline-none focus:border-yellow-500"
              placeholder="e.g., Delta Logistics Ltd"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Driver Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.driverName}
              onChange={(e) => updateField('driverName', e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-4 py-2 focus:outline-none focus:border-yellow-500"
              placeholder="Driver full name"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Driver Phone <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={formData.driverPhone}
              onChange={(e) => updateField('driverPhone', e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-4 py-2 focus:outline-none focus:border-yellow-500"
              placeholder="+234 XXX XXX XXXX"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Vehicle/Lowbed Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.vehicleNumber}
              onChange={(e) => updateField('vehicleNumber', e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-4 py-2 focus:outline-none focus:border-yellow-500"
              placeholder="e.g., LAG 123 XY"
              required
            />
          </div>
        </div>

        {/* Locations */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Pickup Location <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.pickupLocation}
            onChange={(e) => updateField('pickupLocation', e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-4 py-2 focus:outline-none focus:border-yellow-500"
            placeholder="Equipment current location/depot"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Delivery Location <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.deliveryLocation}
            onChange={(e) => updateField('deliveryLocation', e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-4 py-2 focus:outline-none focus:border-yellow-500"
            placeholder="Project site address"
            required
          />
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Est. Pickup Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.estimatedPickupDate}
              onChange={(e) => updateField('estimatedPickupDate', e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-4 py-2 focus:outline-none focus:border-yellow-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Est. Delivery Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.estimatedDeliveryDate}
              onChange={(e) => updateField('estimatedDeliveryDate', e.target.value)}
              min={formData.estimatedPickupDate || new Date().toISOString().split('T')[0]}
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-4 py-2 focus:outline-none focus:border-yellow-500"
              required
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Notes (Optional)
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => updateField('notes', e.target.value)}
            rows={3}
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-4 py-2 focus:outline-none focus:border-yellow-500 resize-none"
            placeholder="Special instructions, route notes, etc..."
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-3 rounded-lg font-medium transition disabled:opacity-50"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-black px-6 py-3 rounded-lg font-medium transition disabled:opacity-50"
          >
            {loading ? 'Assigning...' : 'Assign Logistics'}
          </button>
        </div>
      </form>
    </motion.div>
  );
}
