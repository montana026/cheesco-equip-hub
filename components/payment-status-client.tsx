'use client';

import React, { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { PAYMENT_STATUS } from '@/lib/types';

/** How often to poll while payment is still pending (ms). */
const POLL_INTERVAL_MS = 4_000;
/** Maximum time to keep polling before giving up (ms). */
const POLL_TIMEOUT_MS = 120_000;

interface PaymentRecord {
  id: string;
  reference: string;
  amount: number;
  currency: string;
  provider: string;
  status: string;
  created_at: string;
  paid_at?: string;
  quotation_id?: string;
  quotation?: {
    id: string;
    reference_number: string;
    total_amount: number;
    rental_requests?: {
      id: string;
      customer_name?: string;
      equipment?: {
        name: string;
      };
    };
  };
}

function PaymentStatusContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const ref =
    searchParams.get('ref') ||
    searchParams.get('reference') ||
    searchParams.get('trxref') ||
    '';
  const simulateProvider = searchParams.get('simulate');

  const [payment, setPayment] = useState<PaymentRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [manualChecking, setManualChecking] = useState(false);

  // Track polling state for the status indicator
  const [pollingActive, setPollingActive] = useState(false);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 1. Fetch payment record via authenticated API route
  const fetchPayment = async () => {
    if (!ref) {
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/payments/status?ref=${encodeURIComponent(ref)}`);
      const json = await res.json();
      if (json.success && json.payment) {
        setPayment(json.payment);
        return json.payment;
      }
    } catch (e) {
      console.error('Error loading payment:', e);
    } finally {
      setLoading(false);
    }
    return null;
  };

  // Initial load
  useEffect(() => {
    fetchPayment();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref]);

  // 2. Poll /api/payments/status every 4 s while payment is pending.
  //    Stops automatically on success, failure, or after POLL_TIMEOUT_MS.
  //    Uses only the authenticated API route — no Supabase Realtime client subscription.
  useEffect(() => {
    if (!ref) return;

    const stopPolling = () => {
      setPollingActive(false);
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current);
        pollTimeoutRef.current = null;
      }
    };

    // Start polling
    setPollingActive(true);

    pollIntervalRef.current = setInterval(async () => {
      // Stop polling if already in a terminal state
      if (payment?.status === PAYMENT_STATUS.CONFIRMED || payment?.status === PAYMENT_STATUS.FAILED) {
        stopPolling();
        return;
      }

      const updated = await fetchPayment();
      if (!updated) return;

      if (updated.status === PAYMENT_STATUS.CONFIRMED) {
        toast.success('🎉 Payment confirmed!');
        stopPolling();
      } else if (updated.status === PAYMENT_STATUS.FAILED) {
        stopPolling();
      }
    }, POLL_INTERVAL_MS);

    // Hard timeout — stop polling after 2 minutes regardless
    pollTimeoutRef.current = setTimeout(stopPolling, POLL_TIMEOUT_MS);

    return () => stopPolling();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref]);

  // Helper for simulated test mode webhook trigger
  const handleSimulateWebhook = async (targetStatus: 'paid' | 'failed') => {
    if (!payment) return;
    setSimulating(true);
    try {
      if (simulateProvider === 'paystack' || payment.provider === 'paystack') {
        await fetch('/api/webhooks/paystack', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: targetStatus === 'paid' ? 'charge.success' : 'charge.failed',
            data: {
              reference: payment.reference,
              amount: payment.amount * 100,
              currency: 'NGN',
              status: targetStatus === 'paid' ? 'success' : 'failed',
            },
          }),
        });
      } else if (simulateProvider === 'flutterwave' || payment.provider === 'flutterwave') {
        await fetch('/api/webhooks/flutterwave', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'charge.completed',
            data: {
              tx_ref: payment.reference,
              amount: payment.amount,
              currency: 'NGN',
              status: targetStatus === 'paid' ? 'successful' : 'failed',
            },
          }),
        });
      }
      toast.success(`Simulated ${targetStatus.toUpperCase()} event dispatched!`);
      setTimeout(() => fetchPayment(), 1000);
    } catch (e: any) {
      toast.error('Simulation error: ' + e.message);
    } finally {
      setSimulating(false);
    }
  };

  if (!ref) {
    return (
      <div className="min-h-screen bg-[#0A0D14] text-white flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-center space-y-4">
          <div className="text-4xl">⚠️</div>
          <h2 className="text-xl font-black">Missing Payment Reference</h2>
          <p className="text-xs text-zinc-400">
            No valid payment reference was found in the URL. Please return to your customer dashboard.
          </p>
          <Link
            href="/dashboard/customer"
            className="inline-block rounded-xl bg-yellow-500 px-6 py-2.5 text-xs font-black text-black hover:bg-yellow-400 transition-colors"
          >
            Go to Customer Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0D14] text-white flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-center space-y-4">
          <div className="text-4xl animate-bounce">⏳</div>
          <h2 className="text-lg font-black">Checking Payment Status...</h2>
          <p className="text-xs text-zinc-400">Reference: {ref}</p>
        </div>
      </div>
    );
  }

  const isPaid = payment?.status === PAYMENT_STATUS.CONFIRMED;
  const isAwaitingConfirmation = payment?.status === PAYMENT_STATUS.PROCESSING;
  const isFailed = payment?.status === PAYMENT_STATUS.FAILED;
  const isPending = !isPaid && !isAwaitingConfirmation && !isFailed;

  return (
    <div className="min-h-screen bg-[#0A0D14] text-white flex items-center justify-center p-4 selection:bg-yellow-500 selection:text-black">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg rounded-3xl border border-zinc-800 bg-zinc-900/90 backdrop-blur-md p-6 sm:p-8 shadow-2xl space-y-6"
      >
        {/* Polling Status Pill */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-2">
            <span className={`inline-block w-2.5 h-2.5 rounded-full ${pollingActive ? 'bg-green-500 animate-pulse' : 'bg-zinc-500'}`} />
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
              {pollingActive ? 'Polling for Updates' : 'Monitoring Complete'}
            </span>
          </div>
          <span className="text-[10px] font-mono text-zinc-500 font-bold uppercase">
            Cheesco Pay
          </span>
        </div>

        {/* ── STATE 1: PAID / SUCCESS ── */}
        {isPaid && (
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-3xl mb-1 shadow-lg shadow-emerald-500/10">
              ✓
            </div>
            <div>
              <h2 className="text-2xl font-black text-white">Payment Confirmed!</h2>
              <p className="text-xs text-emerald-400 font-semibold mt-1">
                Quotation Accepted &amp; Equipment Reserved
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-800/40 p-5 text-left space-y-2.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Payment Reference:</span>
                <span className="font-mono font-bold text-yellow-400">{payment?.reference}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Amount Paid:</span>
                <span className="font-bold text-white text-sm">
                  ₦{Number(payment?.amount || 0).toLocaleString()} NGN
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Payment Provider:</span>
                <span className="font-bold text-white capitalize">{payment?.provider || 'Paystack'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Status:</span>
                <span className="font-black text-[10px] uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Paid &amp; Accepted
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300">
              Cheesco Operations has received your booking confirmation. Mobilization and logistics scheduling are now in progress.
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Link
                href="/dashboard/customer?tab=rentals"
                className="flex-1 rounded-xl bg-yellow-500 px-6 py-3 text-xs font-black text-black hover:bg-yellow-400 transition-all text-center shadow-lg"
              >
                View My Rentals →
              </Link>
              <Link
                href="/dashboard/customer"
                className="flex-1 rounded-xl border border-zinc-700 bg-zinc-800 px-6 py-3 text-xs font-bold text-zinc-300 hover:bg-zinc-700 transition-colors text-center"
              >
                Dashboard
              </Link>
            </div>
          </div>
        )}

        {/* ── STATE 2: AWAITING CONFIRMATION (BANK TRANSFER) ── */}
        {isAwaitingConfirmation && (
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30 text-3xl mb-1 shadow-lg shadow-purple-500/10">
              ⏳
            </div>
            <div>
              <h2 className="text-2xl font-black text-white">Transfer Reported</h2>
              <p className="text-xs text-purple-300 font-semibold mt-1">
                Awaiting Cheesco Finance Verification
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-800/40 p-5 text-left space-y-2.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Reference:</span>
                <span className="font-mono font-bold text-yellow-400">{payment?.reference}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Reported Amount:</span>
                <span className="font-bold text-white text-sm">
                  ₦{Number(payment?.amount || 0).toLocaleString()} NGN
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Method:</span>
                <span className="font-bold text-white">Bank Transfer</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Verification Status:</span>
                <span className="font-black text-[10px] uppercase px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30 animate-pulse">
                  Awaiting Confirmation
                </span>
              </div>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed max-w-sm mx-auto">
              Our finance team verifies incoming transfers within 15 to 30 minutes during business hours. Once verified, your quotation will automatically switch to Accepted.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={fetchPayment}
                className="flex-1 rounded-xl bg-purple-600 px-6 py-3 text-xs font-black text-white hover:bg-purple-500 transition-all text-center"
              >
                ↻ Refresh Status
              </button>
              <Link
                href="/dashboard/customer"
                className="flex-1 rounded-xl border border-zinc-700 bg-zinc-800 px-6 py-3 text-xs font-bold text-zinc-300 hover:bg-zinc-700 transition-colors text-center"
              >
                Go to Dashboard
              </Link>
            </div>
          </div>
        )}

        {/* ── STATE 3: PENDING ── */}
        {isPending && (
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 text-3xl mb-1 animate-spin">
              ⌛
            </div>
            <div>
              <h2 className="text-2xl font-black text-white">Awaiting Payment</h2>
              <p className="text-xs text-yellow-400 font-semibold mt-1">
                Listening for gateway verification webhook...
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-800/40 p-5 text-left space-y-2.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Reference:</span>
                <span className="font-mono font-bold text-yellow-400">{payment?.reference}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Total Due:</span>
                <span className="font-bold text-white text-sm">
                  ₦{Number(payment?.amount || 0).toLocaleString()} NGN
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Provider:</span>
                <span className="font-bold text-white capitalize">{payment?.provider || 'Paystack'}</span>
              </div>
            </div>

            <p className="text-xs text-zinc-400">
              If you just completed payment in the popup or tab, please wait a moment. This page polls for confirmation every few seconds and will update automatically.
            </p>

            {/* Test Simulation Controls (Only when ?simulate= is present) */}
            {simulateProvider && (
              <div className="rounded-xl border border-dashed border-yellow-500/40 bg-yellow-500/5 p-3.5 space-y-2">
                <div className="text-[10px] font-black uppercase text-yellow-400">
                  🛠️ Developer Demo / Test Mode ({simulateProvider})
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={simulating}
                    onClick={() => handleSimulateWebhook('paid')}
                    className="flex-1 rounded-lg bg-emerald-500 py-1.5 text-xs font-black text-black hover:bg-emerald-400 transition-colors disabled:opacity-50"
                  >
                    Simulate Webhook Success ✓
                  </button>
                  <button
                    type="button"
                    disabled={simulating}
                    onClick={() => handleSimulateWebhook('failed')}
                    className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-400 hover:bg-red-500/20 disabled:opacity-50"
                  >
                    Simulate Failure ✕
                  </button>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                disabled={manualChecking}
                onClick={async () => {
                  setManualChecking(true);
                  toast.loading('Checking gateway verification...', { id: 'status-check' });
                  await fetchPayment();
                  toast.dismiss('status-check');
                  setManualChecking(false);
                }}
                className="flex-1 rounded-xl bg-yellow-500 px-6 py-3 text-xs font-black text-black hover:bg-yellow-400 transition-all text-center disabled:opacity-50 cursor-pointer"
              >
                {manualChecking ? '⏳ Verifying...' : '↻ Check Status Now'}
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 rounded-xl border border-zinc-700 bg-zinc-800 px-6 py-3 text-xs font-bold text-zinc-300 hover:bg-zinc-700 transition-colors text-center"
              >
                Retry / Select Another Method
              </button>
            </div>
          </div>
        )}

        {/* ── STATE 4: FAILED ── */}
        {isFailed && (
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 text-3xl mb-1 shadow-lg shadow-red-500/10">
              ✕
            </div>
            <div>
              <h2 className="text-2xl font-black text-white">Payment Unsuccessful</h2>
              <p className="text-xs text-red-400 font-semibold mt-1">
                The transaction was declined or could not be completed.
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-800/40 p-5 text-left space-y-2.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Reference:</span>
                <span className="font-mono font-bold text-zinc-300">{payment?.reference}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Status:</span>
                <span className="font-black text-[10px] uppercase px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                  Failed
                </span>
              </div>
            </div>

            <p className="text-xs text-zinc-400">
              No funds have been charged to your account. You can retry with a different card, USSD, or direct bank transfer.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 rounded-xl bg-yellow-500 px-6 py-3 text-xs font-black text-black hover:bg-yellow-400 transition-all text-center shadow-lg"
              >
                ↻ Retry Payment
              </button>
              <Link
                href="/dashboard/customer"
                className="flex-1 rounded-xl border border-zinc-700 bg-zinc-800 px-6 py-3 text-xs font-bold text-zinc-300 hover:bg-zinc-700 transition-colors text-center"
              >
                Return to Dashboard
              </Link>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

export function PaymentStatusClient() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0A0D14] flex items-center justify-center text-zinc-400 text-xs">
          Loading payment status...
        </div>
      }
    >
      <PaymentStatusContent />
    </Suspense>
  );
}
