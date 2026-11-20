'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { apiFetch } from '@/lib/api-client';

interface AcceptQuotationModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotation: {
    id: string;
    referenceNumber: string;
    totalAmount: number;
    equipmentName?: string;
  };
  onSuccess?: () => void;
}

type ProviderType = 'paystack' | 'flutterwave' | 'bank_transfer';

export default function AcceptQuotationModal({
  isOpen,
  onClose,
  quotation,
  onSuccess,
}: AcceptQuotationModalProps) {
  const [selectedProvider, setSelectedProvider] = useState<ProviderType>('paystack');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'SELECT_METHOD' | 'BANK_TRANSFER_DETAILS'>('SELECT_METHOD');
  const [bankDetails, setBankDetails] = useState<{
    reference: string;
    amount: number;
    bank_name: string;
    account_name: string;
    account_number: string;
    narration: string;
  } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    toast.success(`Copied ${fieldName} to clipboard!`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  /**
   * Initialize payment via secure Next.js API route (/api/payments/initialize)
   */
  const handleProceed = async () => {
    setLoading(true);
    try {
      const quoteTargetId = quotation.id || quotation.referenceNumber;

      const res = await apiFetch('/api/payments/initialize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quotation_id: quoteTargetId,
          reference_number: quotation.referenceNumber,
          provider: selectedProvider,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to initialize payment');
      }
      const initResponse = json.data;

      if (selectedProvider === 'bank_transfer') {
        // Show bank transfer details modal step
        setBankDetails({
          reference: initResponse.reference,
          amount: initResponse.amount || quotation.totalAmount,
          bank_name: initResponse.bank_details?.bank_name || 'Zenith Bank Plc',
          account_name: initResponse.bank_details?.account_name || 'Cheesco Global Concept Ltd',
          account_number: initResponse.bank_details?.account_number || '1224890331',
          narration: initResponse.reference,
        });
        setStep('BANK_TRANSFER_DETAILS');
      } else {
        // Paystack / Flutterwave: redirect immediately to checkout URL
        const checkoutUrl = initResponse.checkout_url;
        if (!checkoutUrl) {
          throw new Error('Checkout URL was not received from payment provider');
        }
        toast.success(`Redirecting to ${selectedProvider === 'paystack' ? 'Paystack' : 'Flutterwave'}...`);
        onSuccess?.();
        window.location.href = checkoutUrl;
      }
    } catch (err: any) {
      toast.error(err.message || 'Payment initialization failed');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Customer clicks "I've made the transfer"
   */
  const handleConfirmTransferMade = async () => {
    if (!bankDetails?.reference) return;
    setLoading(true);
    try {
      const res = await apiFetch('/api/payments/bank-transfer-notified', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reference: bankDetails.reference,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to submit notification');
      }

      toast.success('Payment reported! Admin will confirm shortly.');
      onSuccess?.();
      onClose();
      window.location.href = `/payment-status?ref=${encodeURIComponent(bankDetails.reference)}`;
    } catch (err: any) {
      toast.error(err.message || 'Error recording bank transfer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-lg overflow-hidden rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4 bg-zinc-900/60">
          <div>
            <h2 className="text-lg font-black text-white">Accept Quotation &amp; Pay</h2>
            <p className="text-xs text-zinc-400">Ref: {quotation.referenceNumber}</p>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            {step === 'SELECT_METHOD' && (
              <motion.div
                key="step-select"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-5"
              >
                {/* Quotation Amount Banner */}
                <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-wider text-yellow-500/80">
                      Total Payable Amount
                    </div>
                    <div className="text-2xl font-black text-yellow-400 mt-0.5">
                      ₦{quotation.totalAmount.toLocaleString()}
                    </div>
                    {quotation.equipmentName && (
                      <div className="text-xs text-zinc-400 mt-0.5">{quotation.equipmentName}</div>
                    )}
                  </div>
                  <div className="text-3xl">🛡️</div>
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
                    Select Payment Method:
                  </div>

                  {/* Paystack Option */}
                  <label
                    onClick={() => setSelectedProvider('paystack')}
                    className={`flex items-center gap-3.5 p-3.5 rounded-xl border cursor-pointer transition-all ${
                      selectedProvider === 'paystack'
                        ? 'border-yellow-500 bg-yellow-500/10 ring-1 ring-yellow-500'
                        : 'border-zinc-800 bg-zinc-800/40 hover:border-zinc-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment_provider"
                      checked={selectedProvider === 'paystack'}
                      onChange={() => setSelectedProvider('paystack')}
                      className="accent-yellow-500 w-4 h-4"
                    />
                    <div className="text-2xl">💳</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white">Paystack</span>
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          Instant
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        Debit &amp; Credit Cards (Visa, Mastercard, Verve), Bank Account, USSD
                      </p>
                    </div>
                  </label>

                  {/* Flutterwave Option */}
                  <label
                    onClick={() => setSelectedProvider('flutterwave')}
                    className={`flex items-center gap-3.5 p-3.5 rounded-xl border cursor-pointer transition-all ${
                      selectedProvider === 'flutterwave'
                        ? 'border-yellow-500 bg-yellow-500/10 ring-1 ring-yellow-500'
                        : 'border-zinc-800 bg-zinc-800/40 hover:border-zinc-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment_provider"
                      checked={selectedProvider === 'flutterwave'}
                      onChange={() => setSelectedProvider('flutterwave')}
                      className="accent-yellow-500 w-4 h-4"
                    />
                    <div className="text-2xl">🌊</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white">Flutterwave</span>
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                          Cards &amp; Mobile
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        Cards, Mobile Money, Bank Transfer &amp; Barter
                      </p>
                    </div>
                  </label>

                  {/* Direct Bank Transfer Option */}
                  <label
                    onClick={() => setSelectedProvider('bank_transfer')}
                    className={`flex items-center gap-3.5 p-3.5 rounded-xl border cursor-pointer transition-all ${
                      selectedProvider === 'bank_transfer'
                        ? 'border-yellow-500 bg-yellow-500/10 ring-1 ring-yellow-500'
                        : 'border-zinc-800 bg-zinc-800/40 hover:border-zinc-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment_provider"
                      checked={selectedProvider === 'bank_transfer'}
                      onChange={() => setSelectedProvider('bank_transfer')}
                      className="accent-yellow-500 w-4 h-4"
                    />
                    <div className="text-2xl">🏦</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white">Direct Bank Transfer</span>
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30">
                          Wire Transfer
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        Transfer directly to Cheesco Zenith Bank account with reference remark
                      </p>
                    </div>
                  </label>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-xs font-bold text-zinc-300 hover:bg-zinc-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleProceed}
                    className="flex items-center gap-2 rounded-xl bg-yellow-500 px-6 py-2.5 text-xs font-black text-black hover:bg-yellow-400 transition-all shadow-lg disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <span className="animate-spin text-sm">⏳</span>
                        <span>Initializing...</span>
                      </>
                    ) : (
                      <>
                        <span>Proceed to Pay</span>
                        <span>→</span>
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}

            {step === 'BANK_TRANSFER_DETAILS' && bankDetails && (
              <motion.div
                key="step-bank"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <div className="rounded-xl bg-purple-500/10 border border-purple-500/30 p-3.5 text-center">
                  <div className="text-2xl mb-1">🏦</div>
                  <h3 className="text-sm font-black text-purple-300">Bank Transfer Instructions</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Transfer the exact amount below and include the reference as your transaction remark/narration.
                  </p>
                </div>

                <div className="rounded-xl border border-zinc-800 bg-zinc-800/40 p-4 space-y-3 text-xs">
                  {/* Bank Name */}
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400 font-semibold">Bank Name:</span>
                    <span className="font-bold text-white text-sm">{bankDetails.bank_name}</span>
                  </div>

                  {/* Account Name */}
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400 font-semibold">Account Name:</span>
                    <span className="font-bold text-white text-sm">{bankDetails.account_name}</span>
                  </div>

                  {/* Account Number with Copy */}
                  <div className="flex justify-between items-center bg-zinc-900/80 p-2.5 rounded-lg border border-zinc-700/60">
                    <div>
                      <div className="text-[10px] text-zinc-400 uppercase font-bold">Account Number</div>
                      <div className="text-base font-black text-yellow-400 font-mono tracking-wider">
                        {bankDetails.account_number}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(bankDetails.account_number, 'Account Number')}
                      className="rounded-lg bg-zinc-700 px-3 py-1.5 text-[11px] font-bold text-zinc-200 hover:bg-zinc-600 transition-colors"
                    >
                      {copiedField === 'Account Number' ? '✓ Copied' : 'Copy'}
                    </button>
                  </div>

                  {/* Exact Amount */}
                  <div className="flex justify-between items-center bg-zinc-900/80 p-2.5 rounded-lg border border-zinc-700/60">
                    <div>
                      <div className="text-[10px] text-zinc-400 uppercase font-bold">Exact Amount to Pay</div>
                      <div className="text-base font-black text-white font-mono">
                        ₦{bankDetails.amount.toLocaleString()}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(bankDetails.amount.toString(), 'Amount')}
                      className="rounded-lg bg-zinc-700 px-3 py-1.5 text-[11px] font-bold text-zinc-200 hover:bg-zinc-600 transition-colors"
                    >
                      {copiedField === 'Amount' ? '✓ Copied' : 'Copy'}
                    </button>
                  </div>

                  {/* Narration Reference */}
                  <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-2.5">
                    <div className="text-[10px] text-amber-400 uppercase font-black tracking-wider">
                      Required Transfer Narration / Remark:
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="font-mono text-sm font-black text-yellow-300">
                        {bankDetails.reference}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(bankDetails.reference, 'Reference')}
                        className="rounded-md bg-amber-500/20 px-2.5 py-1 text-[10px] font-black text-amber-300 hover:bg-amber-500/30 transition-colors"
                      >
                        {copiedField === 'Reference' ? '✓ Copied' : 'Copy Narration'}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep('SELECT_METHOD')}
                    className="rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-xs font-bold text-zinc-300 hover:bg-zinc-700 transition-colors"
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleConfirmTransferMade}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-green-500 px-4 py-3 text-xs font-black text-black hover:bg-green-400 transition-all shadow-lg disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <span className="animate-spin text-sm">⏳</span>
                        <span>Confirming...</span>
                      </>
                    ) : (
                      <>
                        <span>✅ I&apos;ve Made the Transfer</span>
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
