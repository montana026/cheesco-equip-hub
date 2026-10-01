/* ── Quotation Viewer Component (Customer) ──────────────────────────── */
'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

interface QuotationViewerProps {
  quotation: {
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
  };
  rentalRequest: {
    equipmentName: string;
    durationDays: number;
  };
  onAccept?: () => void;
  onDecline?: () => void;
}

export default function QuotationViewer({ quotation, rentalRequest, onAccept, onDecline }: QuotationViewerProps) {
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState<'accept' | 'decline' | null>(null);

  const rentalCost = quotation.cheescoManagedRate * rentalRequest.durationDays;
  const lineItemsTotal = quotation.lineItems.reduce((sum, item) => sum + item.amount, 0);

  const isExpired = new Date(quotation.validUntil) < new Date();
  const canRespond = quotation.status === 'SENT' || quotation.status === 'VIEWED';

  const handleAccept = async () => {
    if (!confirm('Accept this quotation? You will proceed to payment after acceptance.')) return;

    setLoading(true);
    setAction('accept');
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/quotations/${quotation.id}/accept`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to accept quotation');
      }

      toast.success('Quotation accepted! Proceeding to payment...');
      onAccept?.();
    } catch (error: any) {
      toast.error(error.message || 'Failed to accept quotation');
    } finally {
      setLoading(false);
      setAction(null);
    }
  };

  const handleDecline = async () => {
    if (!confirm('Decline this quotation? You can request a revision if needed.')) return;

    setLoading(true);
    setAction('decline');
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/quotations/${quotation.id}/decline`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to decline quotation');
      }

      toast.success('Quotation declined');
      onDecline?.();
    } catch (error: any) {
      toast.error(error.message || 'Failed to decline quotation');
    } finally {
      setLoading(false);
      setAction(null);
    }
  };

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
            <h2 className="text-2xl font-bold">Quotation</h2>
            <p className="text-zinc-400 text-sm mt-1">Ref: {quotation.referenceNumber}</p>
          </div>
          <div className="text-right">
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
              quotation.status === 'ACCEPTED' ? 'bg-green-500/20 text-green-400' :
              quotation.status === 'DECLINED' ? 'bg-red-500/20 text-red-400' :
              quotation.status === 'SENT' ? 'bg-yellow-500/20 text-yellow-400' :
              'bg-zinc-700 text-zinc-300'
            }`}>
              {quotation.status.replace('_', ' ')}
            </div>
            {quotation.sentAt && (
              <p className="text-xs text-zinc-500 mt-2">
                Sent: {format(new Date(quotation.sentAt), 'MMM d, yyyy')}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Equipment Info */}
        <div className="bg-zinc-800/30 rounded-lg p-4">
          <h3 className="font-semibold mb-2">Equipment Details</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-zinc-400">Equipment:</span>
              <p className="font-medium">{rentalRequest.equipmentName}</p>
            </div>
            <div>
              <span className="text-zinc-400">Duration:</span>
              <p className="font-medium">{rentalRequest.durationDays} days</p>
            </div>
          </div>
        </div>

        {/* Pricing Breakdown */}
        <div>
          <h3 className="font-semibold mb-4">Pricing Breakdown</h3>
          <div className="space-y-3">
            {/* Rental Cost */}
            <div className="flex justify-between items-center py-2">
              <div>
                <p className="font-medium">Equipment Rental</p>
                <p className="text-sm text-zinc-400">
                  ₦{quotation.cheescoManagedRate.toLocaleString()}/day × {rentalRequest.durationDays} days
                </p>
              </div>
              <span className="font-semibold">₦{rentalCost.toLocaleString()}</span>
            </div>

            {/* Line Items */}
            {quotation.lineItems.map((item, index) => (
              <div key={index} className="flex justify-between items-center py-2">
                <div>
                  <p className="font-medium">{item.label}</p>
                  {item.note && <p className="text-sm text-zinc-400">{item.note}</p>}
                </div>
                <span className="font-semibold">₦{item.amount.toLocaleString()}</span>
              </div>
            ))}

            {/* Subtotal */}
            <div className="flex justify-between items-center py-2 border-t border-zinc-800 mt-2">
              <span className="text-zinc-400">Subtotal:</span>
              <span className="font-semibold">₦{quotation.subtotal.toLocaleString()}</span>
            </div>

            {/* Deposit */}
            <div className="flex justify-between items-center py-2">
              <div>
                <p className="font-medium">Security Deposit</p>
                <p className="text-xs text-zinc-400">Refundable upon return in good condition</p>
              </div>
              <span className="font-semibold">₦{quotation.depositAmount.toLocaleString()}</span>
            </div>

            {/* Total */}
            <div className="flex justify-between items-center py-4 border-t border-zinc-700 mt-2">
              <span className="text-lg font-bold">Total Amount:</span>
              <span className="text-2xl font-bold text-yellow-500">
                ₦{quotation.totalAmount.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Validity */}
        <div className={`p-4 rounded-lg ${isExpired ? 'bg-red-500/10 border border-red-500/20' : 'bg-zinc-800/30'}`}>
          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-400">Valid until:</span>
            <span className={`font-medium ${isExpired ? 'text-red-400' : 'text-white'}`}>
              {format(new Date(quotation.validUntil), 'MMMM d, yyyy')}
            </span>
            {isExpired && <span className="text-red-400 text-sm">(Expired)</span>}
          </div>
        </div>

        {/* Terms */}
        <div>
          <h3 className="font-semibold mb-2">Terms & Conditions</h3>
          <p className="text-sm text-zinc-400 whitespace-pre-line">{quotation.terms}</p>
        </div>

        {/* Actions */}
        {canRespond && !isExpired && (
          <div className="flex gap-3 pt-4">
            <button
              onClick={handleDecline}
              disabled={loading}
              className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-3 rounded-lg font-medium transition disabled:opacity-50"
            >
              {loading && action === 'decline' ? 'Declining...' : 'Decline'}
            </button>
            <button
              onClick={handleAccept}
              disabled={loading}
              className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-black px-6 py-3 rounded-lg font-medium transition disabled:opacity-50"
            >
              {loading && action === 'accept' ? 'Accepting...' : 'Accept Quotation'}
            </button>
          </div>
        )}

        {quotation.status === 'ACCEPTED' && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
            <p className="text-green-400 text-sm">
              ✓ Quotation accepted. Proceed to payment to confirm your rental.
            </p>
          </div>
        )}

        {isExpired && canRespond && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
            <p className="text-red-400 text-sm">
              This quotation has expired. Please contact Cheesco for a revised quotation.
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
