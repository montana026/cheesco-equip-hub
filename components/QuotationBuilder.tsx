/* ── Quotation Builder Component (Operations Admin) ──────────────────── */
'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { apiFetch } from '@/lib/api-client';

export interface LineItem {
  label: string;
  amount: number;
  note?: string;
}

export interface RentalRequestInquiry {
  id: string;
  referenceNumber: string;
  equipmentName: string;
  durationDays: number;
  merchantBaseRate: number;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  projectLocation?: string;
  projectType?: string;
  startDate?: string;
  endDate?: string;
  operatorRequired?: boolean;
  deliveryRequired?: boolean;
  additionalRequirements?: string;
  merchantName?: string;
  isPurchase?: boolean;
  currentState?: string;
}

interface QuotationBuilderProps {
  rentalRequest: RentalRequestInquiry;
  onSuccess?: () => void;
  /** When true (reissue mode), the Send button is hidden — only Save as Draft is shown */
  draftOnlyMode?: boolean;
}

export default function QuotationBuilder({ rentalRequest, onSuccess, draftOnlyMode = false }: QuotationBuilderProps) {
  const isPurchase = Boolean(
    rentalRequest.isPurchase ||
    rentalRequest.referenceNumber?.startsWith('PUR') ||
    rentalRequest.projectType?.includes('Purchase') ||
    rentalRequest.additionalRequirements?.includes('[PURCHASE')
  );

  const [loading, setLoading] = useState(false);
  const [merchantBaseRate, setMerchantBaseRate] = useState(rentalRequest.merchantBaseRate || 0);
  const [cheescoMarginRate, setCheescoMarginRate] = useState(isPurchase ? 8 : 15); // 8% for machinery purchase escrow, 15% for rentals
  const [lineItems, setLineItems] = useState<LineItem[]>(() => {
    if (rentalRequest.deliveryRequired !== false) {
      return [
        {
          label: 'Transportation & Logistics',
          amount: 250000,
          note: isPurchase
            ? 'Heavy haulage lowbed mobilization to buyer yard'
            : 'Mobilization & Demobilization lowbed haulage',
        },
      ];
    }
    return [
      {
        label: 'Client Self-Pickup / Mobilization',
        amount: 0,
        note: 'Customer arranges transport independently',
      },
    ];
  });
  const [validDays, setValidDays] = useState(7);
  const [terms, setTerms] = useState(() => {
    if (isPurchase) {
      return `Outright Machinery Purchase & Title Transfer Agreement.\n\nOperator feeding and accommodation / fueling of the equipment and community charges are the client's responsibility.\n\nCustoms Single Goods Declaration (SGD) and official deed of ownership transfer documents are delivered alongside the equipment. Funds are safeguarded in Cheesco Secured Escrow until physical inspection sign-off.`;
    }
    return `Operator feeding and accommodation / fueling of the equipment and community charges are the client's responsibility.\n\nThis quotation is valid for 7 days. Payment must be funded in Cheesco Secured Escrow before equipment dispatch. Standard routine servicing and maintenance are included.`;
  });

  // Re-synchronize state whenever a different inquiry is selected
  useEffect(() => {
    setMerchantBaseRate(rentalRequest.merchantBaseRate || 0);
    setCheescoMarginRate(isPurchase ? 8 : 15);
    setLineItems(
      rentalRequest.deliveryRequired !== false
        ? [
            {
              label: 'Transportation & Logistics',
              amount: 250000,
              note: isPurchase
                ? 'Heavy haulage lowbed mobilization to buyer yard'
                : 'Mobilization & Demobilization lowbed haulage',
            },
          ]
        : [
            {
              label: 'Client Self-Pickup / Mobilization',
              amount: 0,
              note: 'Customer arranges transport independently',
            },
          ]
    );
    setValidDays(7);
    setTerms(
      isPurchase
        ? `Outright Machinery Purchase & Title Transfer Agreement.\n\nOperator feeding and accommodation / fueling of the equipment and community charges are the client's responsibility.\n\nCustoms Single Goods Declaration (SGD) and official deed of ownership transfer documents are delivered alongside the equipment. Funds are safeguarded in Cheesco Secured Escrow until physical inspection sign-off.`
        : `Operator feeding and accommodation / fueling of the equipment and community charges are the client's responsibility.\n\nThis quotation is valid for 7 days. Payment must be funded in Cheesco Secured Escrow before equipment dispatch. Standard routine servicing and maintenance are included.`
    );
  }, [rentalRequest.id, rentalRequest.merchantBaseRate, rentalRequest.deliveryRequired, isPurchase]);

  const VAT_RATE = 0.075; // 7.5% VAT
  const effectiveDuration = isPurchase ? 1 : Math.max(1, rentalRequest.durationDays || 1);
  const cheescoManagedRate = merchantBaseRate * (1 + cheescoMarginRate / 100);
  const baseAssetCost = isPurchase ? cheescoManagedRate : cheescoManagedRate * effectiveDuration;
  const lineItemsTotal = lineItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const subtotal = baseAssetCost + lineItemsTotal;
  const vatAmount = Math.round(subtotal * VAT_RATE);
  const totalAmount = subtotal + vatAmount;

  const merchantPayout = isPurchase ? merchantBaseRate : merchantBaseRate * effectiveDuration;
  const cheescoMargin = totalAmount - merchantPayout - vatAmount;

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
      // Always include statutory VAT (7.5%) line item and zero deposit
      const finalLineItems = [
        ...lineItems.filter((i) => !i.label.toLowerCase().includes('vat')),
        { label: 'VAT (7.5%)', amount: vatAmount, note: '7.5% Value Added Tax' },
      ];

      const response = await apiFetch('/api/quotations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rentalRequestId: rentalRequest.id,
          merchantBaseRate,
          cheescoMarginRate,
          lineItems: finalLineItems,
          depositAmount: 0,
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
        const sendResponse = await apiFetch(`/api/quotations/${result.data.id}/send`, {
          method: 'POST',
        });

        const sendResult = await sendResponse.json();
        if (!sendResult.success) {
          throw new Error(sendResult.error || 'Failed to send quotation');
        }

        toast.success('Quotation created and sent directly to customer via email & dashboard!');
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
    <div id="quotation-builder-card" className="bg-card border border-line-soft rounded-2xl p-6 shadow-sm">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black text-ink">Generate &amp; Send Cheesco Quotation</h2>
          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
            isPurchase ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-cheesco-yellow/20 text-cheesco-yellow border border-cheesco-yellow/30'
          }`}>
            {isPurchase ? '🤝 OUTRIGHT SALE QUOTATION' : '🚜 RENTAL LEASE QUOTATION'}
          </span>
        </div>
        <p className="text-xs text-ink-muted mt-1">
          Review customer specifications below, adjust margins, and dispatch the binding quotation with statutory VAT (7.5%).
        </p>
      </div>

      {/* ── SELECTED INQUIRY DETAILS (LIVE CONTEXT BOX) ── */}
      <div className="rounded-xl border border-line-soft bg-canvas-deep p-4 space-y-3 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line-soft/60 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-cheesco-yellow">
              {rentalRequest.referenceNumber}
            </span>
            <span className="text-xs text-ink font-semibold">
              • {rentalRequest.equipmentName}
            </span>
          </div>
          <div className="text-[11px] text-ink-muted">
            {isPurchase ? 'Outright Machinery Acquisition' : `${rentalRequest.durationDays} Days Rental`}
          </div>
        </div>

        {/* 4-Column Inquiry Context Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          {/* Customer */}
          <div className="p-2.5 rounded-lg bg-canvas border border-line-soft/50 space-y-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-cheesco-yellow block">
              👤 Client Contact
            </span>
            <span className="font-bold text-ink block truncate">
              {rentalRequest.customerName || 'Customer Client'}
            </span>
            <span className="text-[11px] text-ink-muted truncate block">
              {rentalRequest.customerEmail || 'No email specified'}
            </span>
            {rentalRequest.customerPhone && (
              <span className="text-[11px] text-ink-muted block">{rentalRequest.customerPhone}</span>
            )}
          </div>

          {/* Location */}
          <div className="p-2.5 rounded-lg bg-canvas border border-line-soft/50 space-y-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
              {isPurchase ? '📍 Delivery Yard' : '📍 Site Location'}
            </span>
            <span className="font-bold text-ink block truncate">
              {rentalRequest.projectLocation || 'Not provided'}
            </span>
            <span className="text-[11px] text-ink-muted block truncate">
              {isPurchase ? 'Destination Base' : rentalRequest.projectType || 'General Construction'}
            </span>
          </div>

          {/* Schedule */}
          <div className="p-2.5 rounded-lg bg-canvas border border-line-soft/50 space-y-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 block">
              {isPurchase ? '⏱️ Handover Schedule' : '⏱️ Duration & Dates'}
            </span>
            <span className="font-bold text-ink block">
              {isPurchase ? 'Permanent Title Transfer' : `${rentalRequest.durationDays} Days Lease`}
            </span>
            <span className="text-[11px] text-ink-muted block truncate">
              {rentalRequest.startDate || 'Immediate'} {rentalRequest.endDate ? `→ ${rentalRequest.endDate}` : ''}
            </span>
          </div>

          {/* Operations & Logistics */}
          <div className="p-2.5 rounded-lg bg-canvas border border-line-soft/50 space-y-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 block">
              ⚙️ Operator & Haulage
            </span>
            <span className="font-bold text-ink block">
              {isPurchase
                ? 'Outright Ownership'
                : rentalRequest.operatorRequired
                ? '✓ Operator Required'
                : 'Self-Operated'}
            </span>
            <span className="text-[11px] text-ink-muted block">
              {rentalRequest.deliveryRequired !== false
                ? '✓ Cheesco Haulage Needed'
                : 'Self-Mobilized'}
            </span>
          </div>
        </div>

        {/* Client Special Requirements / Specifications Box */}
        {rentalRequest.additionalRequirements && (
          <div className="p-2.5 rounded-lg bg-canvas border border-line-soft/60 text-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-cheesco-yellow block mb-1">
              {isPurchase ? '📋 Buyer Specifications & Inspection Schedule:' : '📝 Scope of Work, Max Tonnage & Requirements:'}
            </span>
            <p className="font-mono text-[11px] text-ink leading-relaxed bg-canvas-deep/80 p-2 rounded border border-line-soft/40">
              {rentalRequest.additionalRequirements}
            </p>
          </div>
        )}
      </div>

      <div className="space-y-6">
        {/* Pricing & Rate Adjustment */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-ink-muted mb-2">
              {isPurchase ? 'Machinery Asset Base Price (₦)' : 'Merchant Base Rate (₦ / day)'}
            </label>
            <input
              type="number"
              value={merchantBaseRate}
              onChange={(e) => setMerchantBaseRate(Number(e.target.value))}
              className="w-full bg-canvas-deep border border-line-soft rounded-xl px-4 py-2.5 text-sm font-semibold text-ink focus:outline-none focus:border-cheesco-yellow"
              placeholder="₦500,000"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-ink-muted mb-2">
              {isPurchase ? 'Cheesco Advisory & Escrow Margin (%)' : 'Cheesco Managed Margin (%)'}
            </label>
            <input
              type="number"
              value={cheescoMarginRate}
              onChange={(e) => setCheescoMarginRate(Number(e.target.value))}
              className="w-full bg-canvas-deep border border-line-soft rounded-xl px-4 py-2.5 text-sm font-semibold text-ink focus:outline-none focus:border-cheesco-yellow"
              placeholder="15"
            />
          </div>
        </div>

        {/* Calculated Rates Summary Box */}
        <div className="bg-canvas-deep rounded-xl p-4 space-y-2 text-xs border border-line-soft">
          <div className="flex justify-between">
            <span className="text-ink-muted">
              {isPurchase ? 'Cheesco Adjusted Purchase Price:' : 'Customer Rate (per day):'}
            </span>
            <span className="font-bold text-cheesco-yellow">₦{Math.round(cheescoManagedRate).toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-muted">
              {isPurchase
                ? 'Base Machine Cost (Permanent Title Transfer):'
                : `Rental Cost (${effectiveDuration} day${effectiveDuration === 1 ? '' : 's'}):`}
            </span>
            <span className="font-bold text-ink">₦{Math.round(baseAssetCost).toLocaleString()}</span>
          </div>
        </div>

        {/* Additional Line Items */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-ink-muted">
              Additional Services & Logistics
            </label>
            <button
              type="button"
              onClick={addLineItem}
              className="text-cheesco-yellow hover:underline text-xs font-bold"
            >
              + Add Item
            </button>
          </div>
          <div className="space-y-3">
            {lineItems.map((item, index) => (
              <div key={index} className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <input
                  type="text"
                  value={item.label}
                  onChange={(e) => updateLineItem(index, 'label', e.target.value)}
                  className="bg-canvas-deep border border-line-soft rounded-xl px-3 py-2 text-xs text-ink focus:outline-none focus:border-cheesco-yellow"
                  placeholder="Service name (e.g. Lowbed Mobilization)"
                />
                <input
                  type="number"
                  value={item.amount}
                  onChange={(e) => updateLineItem(index, 'amount', Number(e.target.value))}
                  className="bg-canvas-deep border border-line-soft rounded-xl px-3 py-2 text-xs text-ink focus:outline-none focus:border-cheesco-yellow"
                  placeholder="Amount (₦)"
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={item.note || ''}
                    onChange={(e) => updateLineItem(index, 'note', e.target.value)}
                    className="flex-1 bg-canvas-deep border border-line-soft rounded-xl px-3 py-2 text-xs text-ink focus:outline-none focus:border-cheesco-yellow"
                    placeholder="Note (optional)"
                  />
                  <button
                    type="button"
                    onClick={() => removeLineItem(index)}
                    className="text-red-400 hover:text-red-300 px-2 text-base font-bold"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Validity */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-ink-muted mb-2">
            Quotation Validity Period (Days)
          </label>
          <input
            type="number"
            value={validDays}
            onChange={(e) => setValidDays(Number(e.target.value))}
            className="w-full bg-canvas-deep border border-line-soft rounded-xl px-4 py-2.5 text-xs text-ink focus:outline-none focus:border-cheesco-yellow"
            placeholder="7"
          />
        </div>

        {/* Terms */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-ink-muted mb-2">
            Binding Terms &amp; Conditions
          </label>
          <p className="text-[11px] text-ink-muted mb-2">
            Includes mandatory customer responsibilities for machine fueling, operator feeding/accommodation, and community charges:
          </p>
          <textarea
            value={terms}
            onChange={(e) => setTerms(e.target.value)}
            rows={4}
            className="w-full bg-canvas-deep border border-line-soft rounded-xl px-4 py-2.5 text-xs text-ink focus:outline-none focus:border-cheesco-yellow resize-none leading-relaxed font-sans"
          />
        </div>

        {/* Final Financial Breakdown Summary */}
        <div className="bg-canvas-deep rounded-xl p-4 space-y-2 text-xs border border-line-soft">
          <h3 className="font-bold text-ink text-sm mb-2 border-b border-line-soft/60 pb-2">
            Quotation Financial Breakdown
          </h3>
          <div className="flex justify-between">
            <span className="text-ink-muted">{isPurchase ? 'Machine Acquisition Base:' : 'Base Rental Cost:'}</span>
            <span className="font-medium text-ink">₦{Math.round(baseAssetCost).toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-muted">Additional Services / Logistics:</span>
            <span className="font-medium text-ink">₦{Math.round(lineItemsTotal).toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-muted">Subtotal:</span>
            <span className="font-semibold text-ink">₦{Math.round(subtotal).toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-muted">Statutory VAT (7.5%):</span>
            <span className="font-semibold text-cheesco-yellow">₦{vatAmount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm font-black border-t border-line-soft/60 pt-2 text-ink">
            <span>Total Payable by Client:</span>
            <span className="text-cheesco-yellow text-base">₦{totalAmount.toLocaleString()}</span>
          </div>
          <div className="text-[11px] text-ink-faint pt-1">
            Merchant Net Payout: ₦{Math.round(merchantPayout).toLocaleString()} • Cheesco Gross Margin: ₦{Math.round(cheescoMargin).toLocaleString()}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            type="button"
            disabled={loading}
            onClick={() => handleCreateQuotation(false)}
            className="flex-1 rounded-xl border border-line-soft bg-canvas py-3 text-xs font-bold text-ink hover:border-cheesco-yellow hover:text-cheesco-yellow transition-all disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Save Quotation as Draft'}
          </button>
          {!draftOnlyMode && (
            <button
              type="button"
              disabled={loading}
              onClick={() => handleCreateQuotation(true)}
              className="flex-1 rounded-xl bg-cheesco-yellow py-3 text-xs font-black text-[#0A0D14] hover:bg-cheesco-yellow-bright transition-all shadow-md disabled:opacity-50"
            >
              {loading ? 'Dispatching...' : '✓ Issue & Send Quotation to Client'}
            </button>
          )}
          {draftOnlyMode && (
            <div className="flex-1 rounded-xl border border-amber-500/30 bg-amber-500/5 py-3 px-4 text-xs text-amber-400 font-bold text-center flex items-center justify-center gap-2">
              ⚠️ Quotation already sent — save as draft to revise, then re-send from the panel above
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
