/* ── Quotation Builder Component (Operations Admin) ──────────────────── */
'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

interface LineItem {
  label: string;
  amount: number;
  note?: string;
}

interface QuotationBuilderProps {
  rentalRequest: {
    id: string;
    referenceNumber: string;
    equipmentName: string;
    durationDays: number;
    merchantBaseRate: number;
  };
  onSuccess?: () => void;
}

export default function QuotationBuilder({ rentalRequest, onSuccess }: QuotationBuilderProps) {
  const [loading, setLoading] = useState(false);
  const [merchantBaseRate, setMerchantBaseRate] = useState(rentalRequest.merchantBaseRate);
  const [cheescoMarginRate, setCheescoMarginRate] = useState(15); // Default 15% margin
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { label: 'Transportation', amount: 250000, note: 'Delivery to site' },
    { label: 'Operator', amount: 300000, note: 'Certified operator' },
  ]);
  const [depositAmount, setDepositAmount] = useState(500000);
  const [validDays, setValidDays] = useState(7);
  const [terms, setTerms] = useState(
    'This quotation is valid for 7 days. Payment must be received before equipment dispatch. Deposit is refundable upon equipment return in good condition.'
  );

  const cheescoManagedRate = merchantBaseRate * (1 + cheescoMarginRate / 100);
  const rentalCost = cheescoManagedRate * rentalRequest.durationDays;
  const lineItemsTotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
  const subtotal = rentalCost + lineItemsTotal;
  const totalAmount = subtotal + depositAmount;

  const merchantPayout = merchantBaseRate * rentalRequest.durationDays;
  const cheescoMargin = totalAmount - merchantPayout - depositAmount;

  const addLineItem = () => {
    setLineItems([...lineItems, { label: '', amount: 0, note: '' }]);
  };

  const updateLineItem = (index: number, field: keyof LineItem, value: string | number) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    setLineItems(updated);
  };

  const removeLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const handleCreateQuotation = async (sendImmediately: boolean = false) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/quotations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          rentalRequestId: rentalRequest.id,
          merchantBaseRate,
          cheescoMarginRate,
          lineItems,
          depositAmount,
          terms,
          validDays,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to create quotation');
      }

      if (sendImmediately) {
        // Send quotation immediately
        const sendResponse = await fetch(`/api/quotations/${result.data.id}/send`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const sendResult = await sendResponse.json();
        if (!sendResult.success) {
          throw new Error(sendResult.error || 'Failed to send quotation');
        }

        toast.success('Quotation created and sent to customer');
      } else {
        toast.success('Quotation saved as draft');
      }

      onSuccess?.();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create quotation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
      <h2 className="text-2xl font-bold mb-2">Create Quotation</h2>
      <p className="text-zinc-400 text-sm mb-6">
        Request: {rentalRequest.referenceNumber} • {rentalRequest.equipmentName} • {rentalRequest.durationDays} days
      </p>

      <div className="space-y-6">
        {/* Rental Rate */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Merchant Base Rate (per day)
            </label>
            <input
              type="number"
              value={merchantBaseRate}
              onChange={(e) => setMerchantBaseRate(Number(e.target.value))}
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-4 py-2 focus:outline-none focus:border-yellow-500"
              placeholder="₦500,000"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              Cheesco Margin (%)
            </label>
            <input
              type="number"
              value={cheescoMarginRate}
              onChange={(e) => setCheescoMarginRate(Number(e.target.value))}
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-4 py-2 focus:outline-none focus:border-yellow-500"
              placeholder="15"
            />
          </div>
        </div>

        {/* Calculated Rates */}
        <div className="bg-zinc-800/50 rounded-lg p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-zinc-400">Customer Rate (per day):</span>
            <span className="font-semibold">₦{cheescoManagedRate.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-400">Rental Cost ({rentalRequest.durationDays} days):</span>
            <span className="font-semibold">₦{rentalCost.toLocaleString()}</span>
          </div>
        </div>

        {/* Line Items */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <label className="block text-sm font-medium">Additional Services</label>
            <button
              onClick={addLineItem}
              className="text-yellow-500 hover:text-yellow-400 text-sm font-medium"
            >
              + Add Item
            </button>
          </div>
          <div className="space-y-3">
            {lineItems.map((item, index) => (
              <div key={index} className="grid grid-cols-3 gap-3">
                <input
                  type="text"
                  value={item.label}
                  onChange={(e) => updateLineItem(index, 'label', e.target.value)}
                  className="bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow-500"
                  placeholder="Service name"
                />
                <input
                  type="number"
                  value={item.amount}
                  onChange={(e) => updateLineItem(index, 'amount', Number(e.target.value))}
                  className="bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow-500"
                  placeholder="Amount"
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={item.note || ''}
                    onChange={(e) => updateLineItem(index, 'note', e.target.value)}
                    className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow-500"
                    placeholder="Note (optional)"
                  />
                  <button
                    onClick={() => removeLineItem(index)}
                    className="text-red-500 hover:text-red-400 px-2"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Deposit */}
        <div>
          <label className="block text-sm font-medium mb-2">Security Deposit</label>
          <input
            type="number"
            value={depositAmount}
            onChange={(e) => setDepositAmount(Number(e.target.value))}
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-4 py-2 focus:outline-none focus:border-yellow-500"
            placeholder="₦500,000"
          />
        </div>

        {/* Validity */}
        <div>
          <label className="block text-sm font-medium mb-2">Valid for (days)</label>
          <input
            type="number"
            value={validDays}
            onChange={(e) => setValidDays(Number(e.target.value))}
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-4 py-2 focus:outline-none focus:border-yellow-500"
            placeholder="7"
          />
        </div>

        {/* Terms */}
        <div>
          <label className="block text-sm font-medium mb-2">Terms & Conditions</label>
          <textarea
            value={terms}
            onChange={(e) => setTerms(e.target.value)}
            rows={4}
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-4 py-2 focus:outline-none focus:border-yellow-500 resize-none"
          />
        </div>

        {/* Summary */}
        <div className="bg-zinc-800 rounded-lg p-4 space-y-3">
          <h3 className="font-semibold mb-3">Quotation Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-400">Rental Cost:</span>
              <span>₦{rentalCost.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Additional Services:</span>
              <span>₦{lineItemsTotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Subtotal:</span>
              <span>₦{subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Security Deposit:</span>
              <span>₦{depositAmount.toLocaleString()}</span>
            </div>
            <div className="border-t border-zinc-700 pt-2 mt-2 flex justify-between font-bold text-lg">
              <span>Total Amount:</span>
              <span className="text-yellow-500">₦{totalAmount.toLocaleString()}</span>
            </div>
          </div>

          <div className="pt-3 mt-3 border-t border-zinc-700 space-y-2 text-xs text-zinc-400">
            <div className="flex justify-between">
              <span>Merchant Payout:</span>
              <span>₦{merchantPayout.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Cheesco Margin:</span>
              <span className="text-green-500">₦{cheescoMargin.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <button
            onClick={() => handleCreateQuotation(false)}
            disabled={loading}
            className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-3 rounded-lg font-medium transition disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save as Draft'}
          </button>
          <button
            onClick={() => handleCreateQuotation(true)}
            disabled={loading}
            className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-black px-6 py-3 rounded-lg font-medium transition disabled:opacity-50"
          >
            {loading ? 'Sending...' : 'Create & Send to Customer'}
          </button>
        </div>
      </div>
    </div>
  );
}
