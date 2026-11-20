/* ── Quotation Viewer Component (Customer) ──────────────────────────── */
'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import AcceptQuotationModal from '@/components/AcceptQuotationModal';
import { apiFetch } from '@/lib/api-client';

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
    currentState?: string;
  };
  onAccept?: () => void;
  onDecline?: () => void;
}

export default function QuotationViewer({
  quotation,
  rentalRequest,
  onAccept,
  onDecline,
}: QuotationViewerProps) {
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const rentalCost = quotation.cheescoManagedRate * rentalRequest.durationDays;
  const isExpired = new Date(quotation.validUntil) < new Date();
  const canRespond = quotation.status === 'SENT' || quotation.status === 'VIEWED';

  const handleDecline = async () => {
    if (!confirm('Decline this quotation? You can request a revision if needed.')) return;

    setLoading(true);
    try {
      const response = await apiFetch(`/api/quotations/${quotation.id}/decline`, {
        method: 'POST',
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'Failed to decline quotation');
      toast.success('Quotation declined');
      onDecline?.();
    } catch (error: any) {
      toast.error(error.message || 'Failed to decline quotation');
    } finally {
      setLoading(false);
    }
  };

  const isPaymentConfirmed =
    rentalRequest.currentState &&
    (rentalRequest.currentState.includes('PAYMENT_CONFIRMED') ||
      rentalRequest.currentState.includes('ACTIVE') ||
      rentalRequest.currentState.includes('DELIVERED') ||
      rentalRequest.currentState.includes('TRANSIT') ||
      rentalRequest.currentState.includes('LOGISTICS'));

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl"
      >
        {/* Header */}
        <div className="bg-zinc-800/50 px-6 py-4 border-b border-zinc-800">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white">Quotation</h2>
              <p className="text-zinc-400 text-xs mt-1">Ref: {quotation.referenceNumber}</p>
            </div>
            <div className="text-right">
              <div
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                  quotation.status === 'ACCEPTED'
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : quotation.status === 'DECLINED'
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                    : quotation.status === 'SENT'
                    ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                    : 'bg-zinc-700 text-zinc-300'
                }`}
              >
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
          <div className="bg-zinc-800/30 rounded-xl p-4 border border-zinc-800/60">
            <h3 className="font-bold text-xs uppercase tracking-wider text-yellow-500 mb-2">
              Equipment Details
            </h3>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-zinc-400">Equipment:</span>
                <p className="font-bold text-white text-sm mt-0.5">{rentalRequest.equipmentName}</p>
              </div>
              <div>
                <span className="text-zinc-400">Duration:</span>
                <p className="font-bold text-white text-sm mt-0.5">{rentalRequest.durationDays} days</p>
              </div>
            </div>
          </div>

          {/* Pricing Breakdown */}
          <div>
            <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-400 mb-3">
              Pricing Breakdown
            </h3>
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between items-center py-1.5">
                <div>
                  <p className="font-bold text-white">Equipment Rental Base</p>
                  <p className="text-[11px] text-zinc-400">
                    ₦{quotation.cheescoManagedRate.toLocaleString()}/day × {rentalRequest.durationDays} days
                  </p>
                </div>
                <span className="font-bold text-white">₦{rentalCost.toLocaleString()}</span>
              </div>

              {(quotation.lineItems ?? []).map((item, index) => (
                <div key={index} className="flex justify-between items-center py-1.5">
                  <div>
                    <p className="font-medium text-zinc-200">{item.label}</p>
                    {item.note && <p className="text-[11px] text-zinc-400">{item.note}</p>}
                  </div>
                  <span className="font-semibold text-zinc-200">₦{item.amount.toLocaleString()}</span>
                </div>
              ))}

              <div className="flex justify-between items-center py-2 border-t border-zinc-800 mt-2">
                <span className="text-zinc-400 font-semibold">Subtotal:</span>
                <span className="font-bold text-white">₦{quotation.subtotal.toLocaleString()}</span>
              </div>

              {Number(quotation.depositAmount) > 0 && (
                <div className="flex justify-between items-center py-1.5">
                  <div>
                    <p className="font-medium text-zinc-200">Security Deposit</p>
                    <p className="text-[10px] text-zinc-400">Refundable upon return</p>
                  </div>
                  <span className="font-semibold text-zinc-200">₦{quotation.depositAmount.toLocaleString()}</span>
                </div>
              )}

              <div className="flex justify-between items-center py-4 border-t border-zinc-700/80 mt-2 bg-zinc-800/20 px-3 rounded-xl">
                <span className="text-sm font-black text-white">Total Amount (incl. VAT 7.5%):</span>
                <span className="text-xl sm:text-2xl font-black text-yellow-400">
                  ₦{quotation.totalAmount.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Validity */}
          <div
            className={`p-3.5 rounded-xl text-xs ${
              isExpired
                ? 'bg-red-500/10 border border-red-500/20 text-red-400'
                : 'bg-zinc-800/30 border border-zinc-800 text-zinc-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-zinc-400">Valid until:</span>
              <span className="font-bold text-white">
                {format(new Date(quotation.validUntil), 'MMMM d, yyyy')}
              </span>
              {isExpired && <span className="font-bold text-red-400">(Expired)</span>}
            </div>
          </div>

          {/* Terms */}
          <div>
            <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-400 mb-2">
              Terms &amp; Conditions
            </h3>
            <p className="text-xs text-zinc-400 whitespace-pre-line leading-relaxed bg-zinc-800/20 p-3.5 rounded-xl border border-zinc-800/60 font-mono">
              {quotation.terms}
            </p>
          </div>

          {/* ── ACTION BUTTONS ── */}
          {canRespond && !isExpired && (
            <div className="flex gap-3 pt-3">
              <button
                type="button"
                onClick={handleDecline}
                disabled={loading}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white px-5 py-3 rounded-xl font-bold transition disabled:opacity-50 text-xs"
              >
                Decline
              </button>
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="flex-1 bg-yellow-500 hover:bg-yellow-400 active:scale-[0.99] text-black px-6 py-3 rounded-xl font-black transition shadow-lg text-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>✅</span>
                <span>Accept Quotation</span>
              </button>
            </div>
          )}

          {/* Payment Confirmed State */}
          {isPaymentConfirmed ? (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-emerald-400 font-bold text-sm flex items-center gap-1.5">
                  <span>✅</span> Payment Confirmed &amp; Verified
                </span>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/20 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                  Settled
                </span>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Payment of <strong className="text-yellow-400">₦{quotation.totalAmount.toLocaleString()}</strong> has been verified. Cheesco Operations is mobilizing logistics for your equipment dispatch.
              </p>
              {/* Download Invoice CTA */}
              <a
                href={`/invoice/${quotation.referenceNumber}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 w-full rounded-xl border border-emerald-500/40 bg-emerald-500/10 py-2.5 text-xs font-black text-emerald-400 hover:bg-emerald-500/20 transition-colors"
              >
                📄 Download Official Invoice (PDF)
              </a>
            </div>
          ) : quotation.status === 'ACCEPTED' ? (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-emerald-400 font-bold text-sm flex items-center gap-1.5">
                  <span>✓</span> Quotation Accepted
                </span>
                <span className="text-[10px] font-bold text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 px-2 py-0.5 rounded-full">
                  Payment Required
                </span>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Click below to select your payment method (Paystack, Flutterwave, or Bank Transfer) to finalize your payment of{' '}
                <strong className="text-yellow-400">₦{quotation.totalAmount.toLocaleString()}</strong>.
              </p>
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="w-full flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-400 active:scale-[0.99] text-black font-black px-6 py-3 rounded-xl shadow-lg transition-all text-xs tracking-wide cursor-pointer"
              >
                <span>💳</span>
                <span>Choose Payment Method &amp; Pay</span>
              </button>
            </div>
          ) : null}

          {isExpired && canRespond && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-xs text-red-400">
              This quotation has expired. Please contact Cheesco for a revised quotation.
            </div>
          )}
        </div>
      </motion.div>

      {/* Accept Quotation Modal */}
      <AcceptQuotationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        quotation={{
          id: quotation.id,
          referenceNumber: quotation.referenceNumber,
          totalAmount: quotation.totalAmount,
          equipmentName: rentalRequest.equipmentName,
        }}
        onSuccess={() => {
          onAccept?.();
        }}
      />
    </>
  );
}
