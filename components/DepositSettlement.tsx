/* ── Deposit Settlement Component (Operations Admin) ──────────────────── */
'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { fmtNgnFull } from '@/lib/format';

interface Inspection {
  id: string;
  kind: 'PRE_DELIVERY' | 'POST_RENTAL';
  inspectorName: string;
  hourMeterReading: number | null;
  checklist: Array<{
    item: string;
    passed: boolean;
    note: string;
  }>;
  conditionPhotos: string[];
  inspectionNotes: string;
  depositDeductionRecommendation: number | null;
  inspectedAt: string;
}

interface DepositSettlementProps {
  rentalRequest: {
    id: string;
    referenceNumber: string;
    equipmentName: string;
    customerName: string;
  };
  deposit: {
    id: string;
    amount: number;
    status: 'HELD' | 'RELEASED' | 'PARTIALLY_DEDUCTED' | 'FULLY_DEDUCTED';
  };
  inspections: {
    preDelivery: Inspection | null;
    postRental: Inspection | null;
  };
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function DepositSettlement({
  rentalRequest,
  deposit,
  inspections,
  onSuccess,
  onCancel,
}: DepositSettlementProps) {
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState<'RELEASE' | 'PARTIAL' | 'FULL' | null>(null);
  const [deductionAmount, setDeductionAmount] = useState(
    inspections.postRental?.depositDeductionRecommendation?.toString() || ''
  );
  const [deductionReason, setDeductionReason] = useState('');

  const preInspection = inspections.preDelivery;
  const postInspection = inspections.postRental;

  // Calculate differences
  const preFailedItems = preInspection?.checklist.filter(item => !item.passed) || [];
  const postFailedItems = postInspection?.checklist.filter(item => !item.passed) || [];
  const newDamages = postFailedItems.filter(
    post => !preFailedItems.some(pre => pre.item === post.item)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!action) {
      toast.error('Please select a settlement action');
      return;
    }

    if ((action === 'PARTIAL' || action === 'FULL') && !deductionReason.trim()) {
      toast.error('Please provide a reason for deduction');
      return;
    }

    if (action === 'PARTIAL' && !deductionAmount) {
      toast.error('Please specify deduction amount');
      return;
    }

    const amount = action === 'RELEASE' ? 0 :
                   action === 'FULL' ? deposit.amount :
                   parseFloat(deductionAmount);

    if (amount > deposit.amount) {
      toast.error('Deduction cannot exceed deposit amount');
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/deposits/settle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          depositId: deposit.id,
          rentalRequestId: rentalRequest.id,
          action,
          deductionAmount: amount,
          reason: deductionReason,
          inspectionReferences: {
            preDeliveryId: preInspection?.id,
            postRentalId: postInspection?.id,
          },
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to settle deposit');
      }

      toast.success('Deposit settled successfully');
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.message || 'Failed to settle deposit');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-canvas-deep border border-line rounded-xl overflow-hidden"
    >
      {/* Header */}
      <div className="bg-card border-b border-line p-6">
        <h2 className="text-2xl font-black">💰 Deposit Settlement</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Request: {rentalRequest.referenceNumber} • {rentalRequest.equipmentName}
        </p>
        <p className="text-sm font-medium">Customer: {rentalRequest.customerName}</p>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Deposit Info */}
        <div className="rounded-lg bg-card border border-line p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-ink-faint">Deposit Amount</div>
              <div className="text-3xl font-black">₦{fmtNgnFull(deposit.amount)}</div>
            </div>
            <div className={`px-4 py-2 rounded-full text-sm font-bold ${
              deposit.status === 'HELD' ? 'bg-warn/20 text-warn' :
              deposit.status === 'RELEASED' ? 'bg-success/20 text-success' :
              'bg-ink-faint/20 text-ink-faint'
            }`}>
              {deposit.status.replace(/_/g, ' ')}
            </div>
          </div>
        </div>

        {/* Inspection Comparison */}
        <div>
          <h3 className="font-bold mb-3">📋 Inspection Comparison</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Pre-Delivery */}
            <div className="rounded-lg border border-line-soft bg-card p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="font-bold text-sm">Pre-Delivery</div>
                {preInspection && (
                  <div className="text-xs text-ink-faint">
                    {new Date(preInspection.inspectedAt).toLocaleDateString()}
                  </div>
                )}
              </div>
              {preInspection ? (
                <>
                  <div className="text-2xl font-black text-success mb-2">
                    {((preInspection.checklist.length - preFailedItems.length) /
                      preInspection.checklist.length * 100).toFixed(0)}%
                  </div>
                  <div className="text-xs text-ink-muted">
                    {preFailedItems.length} issue(s) noted
                  </div>
                  {preFailedItems.length > 0 && (
                    <div className="mt-3 space-y-1">
                      {preFailedItems.map((item, idx) => (
                        <div key={idx} className="text-xs text-ink-muted">
                          • {item.item}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-xs text-ink-muted">No inspection recorded</div>
              )}
            </div>

            {/* Post-Rental */}
            <div className="rounded-lg border border-line-soft bg-card p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="font-bold text-sm">Post-Rental</div>
                {postInspection && (
                  <div className="text-xs text-ink-faint">
                    {new Date(postInspection.inspectedAt).toLocaleDateString()}
                  </div>
                )}
              </div>
              {postInspection ? (
                <>
                  <div className={`text-2xl font-black mb-2 ${
                    postFailedItems.length > preFailedItems.length ? 'text-warn' : 'text-success'
                  }`}>
                    {((postInspection.checklist.length - postFailedItems.length) /
                      postInspection.checklist.length * 100).toFixed(0)}%
                  </div>
                  <div className="text-xs text-ink-muted">
                    {postFailedItems.length} issue(s) noted
                  </div>
                  {postFailedItems.length > 0 && (
                    <div className="mt-3 space-y-1">
                      {postFailedItems.map((item, idx) => (
                        <div key={idx} className={`text-xs ${
                          newDamages.some(d => d.item === item.item)
                            ? 'text-danger font-medium'
                            : 'text-ink-muted'
                        }`}>
                          {newDamages.some(d => d.item === item.item) && '⚠️ '}
                          {item.item}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-xs text-ink-muted">No inspection recorded</div>
              )}
            </div>
          </div>

          {/* New Damages Alert */}
          {newDamages.length > 0 && (
            <div className="mt-4 rounded-lg bg-danger/10 border border-danger/30 p-4">
              <div className="font-bold text-sm text-danger mb-2">
                ⚠️ New Damage Detected ({newDamages.length} item{newDamages.length > 1 ? 's' : ''})
              </div>
              <div className="text-xs text-danger space-y-1">
                {newDamages.map((item, idx) => (
                  <div key={idx}>• {item.item}: {item.note || 'No details provided'}</div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendation */}
          {postInspection?.depositDeductionRecommendation && (
            <div className="mt-4 rounded-lg bg-warn/10 border border-warn/30 p-4">
              <div className="text-sm font-medium text-warn">
                Inspector's Recommendation:
              </div>
              <div className="text-lg font-black text-warn mt-1">
                Deduct ₦{fmtNgnFull(postInspection.depositDeductionRecommendation)}
              </div>
            </div>
          )}
        </div>

        {/* Settlement Actions */}
        <div>
          <h3 className="font-bold mb-3">Settlement Action</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => setAction('RELEASE')}
              className={`rounded-lg border-2 p-4 text-center transition ${
                action === 'RELEASE'
                  ? 'border-success bg-success/10'
                  : 'border-line-soft hover:border-success/50'
              }`}
            >
              <div className="text-2xl mb-1">✅</div>
              <div className="font-bold text-sm">Release Full</div>
              <div className="text-xs text-ink-muted mt-1">No damage</div>
            </button>

            <button
              type="button"
              onClick={() => setAction('PARTIAL')}
              className={`rounded-lg border-2 p-4 text-center transition ${
                action === 'PARTIAL'
                  ? 'border-warn bg-warn/10'
                  : 'border-line-soft hover:border-warn/50'
              }`}
            >
              <div className="text-2xl mb-1">⚠️</div>
              <div className="font-bold text-sm">Partial Deduct</div>
              <div className="text-xs text-ink-muted mt-1">Minor damage</div>
            </button>

            <button
              type="button"
              onClick={() => setAction('FULL')}
              className={`rounded-lg border-2 p-4 text-center transition ${
                action === 'FULL'
                  ? 'border-danger bg-danger/10'
                  : 'border-line-soft hover:border-danger/50'
              }`}
            >
              <div className="text-2xl mb-1">❌</div>
              <div className="font-bold text-sm">Deduct Full</div>
              <div className="text-xs text-ink-muted mt-1">Major damage</div>
            </button>
          </div>
        </div>

        {/* Deduction Amount (for partial) */}
        {action === 'PARTIAL' && (
          <div>
            <label className="block text-sm font-medium mb-2">
              Deduction Amount (₦) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={deductionAmount}
              onChange={(e) => setDeductionAmount(e.target.value)}
              className="auth-input"
              placeholder="e.g., 50000"
              min="0"
              max={deposit.amount}
              step="1000"
              required
            />
            <div className="mt-1 text-xs text-ink-muted">
              Customer will receive: ₦{fmtNgnFull(deposit.amount - (parseFloat(deductionAmount) || 0))}
            </div>
          </div>
        )}

        {/* Deduction Reason */}
        {(action === 'PARTIAL' || action === 'FULL') && (
          <div>
            <label className="block text-sm font-medium mb-2">
              Reason for Deduction <span className="text-red-500">*</span>
            </label>
            <textarea
              value={deductionReason}
              onChange={(e) => setDeductionReason(e.target.value)}
              rows={4}
              className="auth-input resize-none"
              placeholder="Explain what damage was found and why this deduction is necessary..."
              required
            />
          </div>
        )}

        {/* Summary */}
        {action && (
          <div className="rounded-lg bg-card border border-line p-5">
            <h4 className="font-bold mb-3">Settlement Summary</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-ink-muted">Original Deposit</span>
                <span className="font-bold">₦{fmtNgnFull(deposit.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-muted">Deduction Amount</span>
                <span className="font-bold text-danger">
                  -₦{fmtNgnFull(
                    action === 'RELEASE' ? 0 :
                    action === 'FULL' ? deposit.amount :
                    parseFloat(deductionAmount) || 0
                  )}
                </span>
              </div>
              <div className="border-t border-line-soft pt-2 flex justify-between">
                <span className="font-bold">Amount to Refund</span>
                <span className="text-xl font-black text-success">
                  ₦{fmtNgnFull(
                    action === 'RELEASE' ? deposit.amount :
                    action === 'FULL' ? 0 :
                    deposit.amount - (parseFloat(deductionAmount) || 0)
                  )}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="flex-1 rounded-lg border border-line-soft px-6 py-3 font-bold text-ink-muted hover:text-ink disabled:opacity-50"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={loading || !action}
            className="flex-1 rounded-lg bg-cheesco-yellow px-6 py-3 font-bold text-canvas hover:bg-cheesco-yellow-bright disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Confirm Settlement'}
          </button>
        </div>
      </form>
    </motion.div>
  );
}
