/* ── Payment Modal Component (Paystack Integration) ────────────────── */
'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { apiFetch } from '@/lib/api-client';

interface PaymentModalProps {
  quotation: {
    id: string;
    referenceNumber: string;
    totalAmount: number;
    depositAmount: number;
  };
  customerEmail: string;
  customerName: string;
  onSuccess: () => void;
  onClose: () => void;
}

declare global {
  interface Window {
    PaystackPop?: any;
  }
}

export default function PaymentModal({
  quotation,
  customerEmail,
  customerName,
  onSuccess,
  onClose,
}: PaymentModalProps) {
  const [loading, setLoading] = useState(false);
  const [loadingScript, setLoadingScript] = useState(true);

  useEffect(() => {
    // Load Paystack inline script
    const script = document.createElement('script');
    script.src = 'https://js.paystack.co/v1/inline.js';
    script.async = true;
    script.onload = () => setLoadingScript(false);
    script.onerror = () => {
      toast.error('Failed to load payment gateway');
      setLoadingScript(false);
    };
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handlePayment = async () => {
    if (!window.PaystackPop) {
      toast.error('Payment gateway not loaded');
      return;
    }

    setLoading(true);
    try {
      // Initialize payment
      const response = await apiFetch('/api/payments/initialize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quotationId: quotation.id,
          email: customerEmail,
          name: customerName,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to initialize payment');
      }

      const { authorizationUrl, accessCode, reference } = result.data;

      // Initialize Paystack popup
      const handler = window.PaystackPop.setup({
        key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || '',
        email: customerEmail,
        amount: quotation.totalAmount * 100, // Convert to kobo
        ref: reference,
        onClose: function () {
          toast.error('Payment cancelled');
          setLoading(false);
        },
        callback: async function (response: any) {
          // Verify payment
          const verifyResponse = await apiFetch(`/api/payments/verify?reference=${reference}`);

          const verifyResult = await verifyResponse.json();

          if (verifyResult.success && verifyResult.data.status === 'success') {
            toast.success('Payment successful!');
            onSuccess();
          } else {
            toast.error('Payment verification failed');
          }
          setLoading(false);
        },
      });

      handler.openIframe();
    } catch (error: any) {
      toast.error(error.message || 'Failed to process payment');
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-zinc-900 border border-zinc-800 rounded-lg max-w-md w-full p-6"
        >
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-bold">Complete Payment</h2>
              <p className="text-sm text-zinc-400 mt-1">Quotation: {quotation.referenceNumber}</p>
            </div>
            <button
              onClick={onClose}
              disabled={loading}
              className="text-zinc-400 hover:text-white transition disabled:opacity-50"
            >
              ✕
            </button>
          </div>

          {/* Payment Summary */}
          <div className="bg-zinc-800/50 rounded-lg p-4 mb-6 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Total Amount:</span>
              <span className="font-semibold">₦{quotation.totalAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Security Deposit:</span>
              <span className="font-semibold">₦{quotation.depositAmount.toLocaleString()}</span>
            </div>
            <div className="border-t border-zinc-700 pt-3 flex justify-between">
              <span className="font-bold">Amount to Pay:</span>
              <span className="text-xl font-bold text-yellow-500">
                ₦{quotation.totalAmount.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Customer Info */}
          <div className="space-y-3 mb-6">
            <div>
              <label className="block text-sm font-medium mb-1 text-zinc-400">Email</label>
              <input
                type="email"
                value={customerEmail}
                disabled
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-4 py-2 text-sm opacity-60"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-zinc-400">Name</label>
              <input
                type="text"
                value={customerName}
                disabled
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-4 py-2 text-sm opacity-60"
              />
            </div>
          </div>

          {/* Payment Info */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-400">
              🔒 Secure payment powered by Paystack. Your card information is encrypted and never stored on our servers.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-3 rounded-lg font-medium transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handlePayment}
              disabled={loading || loadingScript}
              className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-black px-6 py-3 rounded-lg font-medium transition disabled:opacity-50 disabled:bg-zinc-700 disabled:text-zinc-400"
            >
              {loading ? 'Processing...' : loadingScript ? 'Loading...' : 'Pay Now'}
            </button>
          </div>

          {/* Terms */}
          <p className="text-xs text-zinc-500 mt-4 text-center">
            By proceeding, you agree to the rental terms and payment policy.
          </p>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
