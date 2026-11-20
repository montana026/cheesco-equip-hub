"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { apiFetch } from "@/lib/api-client";

// ─── Types ───────────────────────────────────────────────────────────────────
interface InvoiceData {
  invoiceNumber: string;
  issuedAt: string;
  paidAt: string | null;
  isPaid: boolean;
  transactionType: string;
  isPurchase: boolean;
  status: string;
  rentalReference: string;
  rentalState: string;
  projectLocation: string;
  projectType: string;
  startDate: string | null;
  endDate: string | null;
  durationDays: number | null;
  equipment: { name: string; brand: string; model: string; year: string; category: string };
  merchant: { businessName: string; phone: string; address: string };
  client: { name: string; email: string; phone: string };
  pricing: {
    lineItems: Array<{ label: string; amount: number; note?: string }>;
    subtotal: number;
    totalAmount: number;
    depositAmount: number;
    currency: string;
  };
  payment: { provider: string; reference: string; status: string };
  terms: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmtNgn(n: number) {
  return "₦" + Number(n || 0).toLocaleString("en-NG", { minimumFractionDigits: 2 });
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-NG", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function InvoicePage() {
  const params = useParams<{ id: string }>();
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!params?.id) return;
    apiFetch(`/api/invoice/${params.id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setInvoice(d.invoice);
        else setError(d.error || "Invoice not found");
      })
      .catch(() => setError("Failed to load invoice"))
      .finally(() => setLoading(false));
  }, [params?.id]);

  const handlePrint = () => window.print();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="text-center text-zinc-400">
          <div className="text-4xl mb-3 animate-spin inline-block">⚙</div>
          <p className="text-sm font-bold">Loading invoice...</p>
        </div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="text-center text-red-400">
          <div className="text-4xl mb-3">⚠️</div>
          <p className="text-sm font-bold">{error || "Invoice not found"}</p>
        </div>
      </div>
    );
  }

  const { pricing, equipment, client, merchant, payment } = invoice;

  return (
    <>
      {/* ─── Print styles ─────────────────────────────────────────────────── */}
      <style>{`
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
          .invoice-page { box-shadow: none !important; border: none !important; margin: 0 !important; padding: 32px !important; }
        }
      `}</style>

      {/* ─── Action Bar (hidden on print) ─────────────────────────────────── */}
      <div className="no-print fixed top-0 left-0 right-0 z-50 bg-zinc-900 border-b border-zinc-800 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-cheesco-yellow font-black text-sm">CHEESCO</span>
          <span className="text-zinc-500 text-xs">Invoice Preview</span>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="/"
            className="text-xs text-zinc-400 hover:text-white transition-colors"
          >
            ← Back to Dashboard
          </a>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 rounded-xl bg-cheesco-yellow px-5 py-2 text-xs font-black text-zinc-900 hover:brightness-110 transition-all shadow-md"
          >
            ⬇ Download / Print PDF
          </button>
        </div>
      </div>

      {/* ─── Invoice Body ─────────────────────────────────────────────────── */}
      <div className="no-print pt-16 min-h-screen bg-zinc-950 py-10 px-4">
        <div ref={printRef} className="invoice-page max-w-3xl mx-auto bg-white text-zinc-900 rounded-2xl shadow-2xl overflow-hidden">
          <InvoiceDocument invoice={invoice} fmtNgn={fmtNgn} fmtDate={fmtDate} />
        </div>
      </div>

      {/* Print-only version (no wrapper) */}
      <div className="hidden print:block">
        <InvoiceDocument invoice={invoice} fmtNgn={fmtNgn} fmtDate={fmtDate} />
      </div>
    </>
  );
}

// ─── Invoice Document ─────────────────────────────────────────────────────────
function InvoiceDocument({
  invoice,
  fmtNgn,
  fmtDate,
}: {
  invoice: InvoiceData;
  fmtNgn: (n: number) => string;
  fmtDate: (iso: string | null) => string;
}) {
  const { pricing, equipment, client, merchant, payment } = invoice;

  return (
    <div className="font-sans text-zinc-900">
      {/* ─ Header ─ */}
      <div className="bg-zinc-900 text-white px-8 py-6 flex justify-between items-start">
        <div>
          <div className="text-2xl font-black tracking-tight text-yellow-400">CHEESCO</div>
          <div className="text-xs text-zinc-400 mt-0.5">Equip Hub · Heavy Equipment Marketplace</div>
          <div className="text-xs text-zinc-500 mt-1">Lagos, Nigeria · hello@cheesco.ng · www.cheesco.ng</div>
        </div>
        <div className="text-right">
          <div className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Official Invoice</div>
          <div className="text-xl font-black text-white mt-1">{invoice.invoiceNumber}</div>
          {/* Transaction type badge */}
          <span
            className={`inline-block mt-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
              invoice.isPurchase
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                : "bg-yellow-400/20 text-yellow-400 border border-yellow-400/30"
            }`}
          >
            {invoice.isPurchase ? "🤝 Outright Sale" : "🚜 Equipment Rental"}
          </span>
        </div>
      </div>

      {/* ─ Status Banner ─ */}
      <div
        className={`px-8 py-2 text-xs font-black flex items-center justify-between ${
          invoice.isPaid
            ? "bg-emerald-50 text-emerald-700 border-b border-emerald-200"
            : "bg-amber-50 text-amber-700 border-b border-amber-200"
        }`}
      >
        <span>{invoice.isPaid ? "✅ PAYMENT CONFIRMED" : "⏳ PAYMENT PENDING"}</span>
        <span>{invoice.isPaid && invoice.paidAt ? `Paid on ${fmtDate(invoice.paidAt)}` : `Issued: ${fmtDate(invoice.issuedAt)}`}</span>
      </div>

      <div className="px-8 py-6 space-y-6">
        {/* ─ Bill To / From ─ */}
        <div className="grid grid-cols-2 gap-6 text-sm">
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">Bill To (Client)</div>
            <div className="font-black text-zinc-900">{client.name}</div>
            {client.email && <div className="text-zinc-500 text-xs">{client.email}</div>}
            {client.phone && <div className="text-zinc-500 text-xs">{client.phone}</div>}
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">
              {invoice.isPurchase ? "Sold By (Merchant)" : "Equipment Owner (Merchant)"}
            </div>
            <div className="font-black text-zinc-900">{merchant.businessName}</div>
            {merchant.phone && <div className="text-zinc-500 text-xs">{merchant.phone}</div>}
            {merchant.address && <div className="text-zinc-500 text-xs">{merchant.address}</div>}
            <div className="text-zinc-500 text-xs">Managed via Cheesco Equip Hub</div>
          </div>
        </div>

        {/* ─ Equipment & Job Details ─ */}
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
          <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-3">
            {invoice.isPurchase ? "Asset Being Acquired" : "Equipment & Job Details"}
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
            <div>
              <span className="text-zinc-400">Equipment: </span>
              <span className="font-bold text-zinc-900">
                {equipment.name}
                {equipment.brand ? ` — ${equipment.brand}` : ""}
                {equipment.model ? ` ${equipment.model}` : ""}
                {equipment.year ? ` (${equipment.year})` : ""}
              </span>
            </div>
            <div>
              <span className="text-zinc-400">Category: </span>
              <span className="font-bold">{equipment.category || "Heavy Equipment"}</span>
            </div>
            {!invoice.isPurchase && (
              <>
                <div>
                  <span className="text-zinc-400">Duration: </span>
                  <span className="font-bold">{invoice.durationDays ? `${invoice.durationDays} Days` : "—"}</span>
                </div>
                <div>
                  <span className="text-zinc-400">Period: </span>
                  <span className="font-bold">
                    {fmtDate(invoice.startDate)} → {fmtDate(invoice.endDate)}
                  </span>
                </div>
              </>
            )}
            <div>
              <span className="text-zinc-400">{invoice.isPurchase ? "Delivery Location: " : "Site Location: "}</span>
              <span className="font-bold">{invoice.projectLocation || "To be confirmed"}</span>
            </div>
            <div>
              <span className="text-zinc-400">Ref: </span>
              <span className="font-mono font-bold text-zinc-900">{invoice.rentalReference}</span>
            </div>
          </div>
        </div>

        {/* ─ Line Items Table ─ */}
        <div>
          <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">Charges</div>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-zinc-100 text-zinc-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="text-left px-3 py-2 rounded-tl-lg">Description</th>
                <th className="text-left px-3 py-2">Note</th>
                <th className="text-right px-3 py-2 rounded-tr-lg">Amount</th>
              </tr>
            </thead>
            <tbody>
              {/* Base cost row (derived from subtotal minus line items total) */}
              {(() => {
                const lineItemsTotal = pricing.lineItems
                  .filter((i) => !i.label.toLowerCase().includes("vat"))
                  .reduce((s, i) => s + i.amount, 0);
                const vatItem = pricing.lineItems.find((i) => i.label.toLowerCase().includes("vat"));
                const baseAsset = pricing.subtotal - lineItemsTotal;

                return (
                  <>
                    <tr className="border-b border-zinc-100">
                      <td className="px-3 py-2 font-semibold text-zinc-800">
                        {invoice.isPurchase
                          ? `${equipment.name} — Machine Acquisition`
                          : `${equipment.name} — ${invoice.durationDays || 1}-Day ${invoice.projectType || "Rental"}`}
                      </td>
                      <td className="px-3 py-2 text-zinc-400">
                        {invoice.isPurchase ? "Outright purchase price incl. Cheesco advisory" : "Rental rate × duration incl. Cheesco management fee"}
                      </td>
                      <td className="px-3 py-2 text-right font-bold">{fmtNgn(baseAsset)}</td>
                    </tr>
                    {pricing.lineItems
                      .filter((i) => !i.label.toLowerCase().includes("vat"))
                      .map((item, idx) => (
                        <tr key={idx} className="border-b border-zinc-100">
                          <td className="px-3 py-2 text-zinc-700">{item.label}</td>
                          <td className="px-3 py-2 text-zinc-400">{item.note || "—"}</td>
                          <td className="px-3 py-2 text-right font-semibold">{fmtNgn(item.amount)}</td>
                        </tr>
                      ))}
                    {vatItem && (
                      <tr className="border-b border-zinc-100 bg-zinc-50">
                        <td className="px-3 py-2 text-zinc-600">{vatItem.label}</td>
                        <td className="px-3 py-2 text-zinc-400">{vatItem.note || "Statutory Value Added Tax"}</td>
                        <td className="px-3 py-2 text-right font-semibold">{fmtNgn(vatItem.amount)}</td>
                      </tr>
                    )}
                  </>
                );
              })()}
            </tbody>
          </table>
        </div>

        {/* ─ Totals ─ */}
        <div className="flex justify-end">
          <div className="w-64 space-y-1 text-sm">
            <div className="flex justify-between text-zinc-500">
              <span>Subtotal</span>
              <span>{fmtNgn(pricing.subtotal)}</span>
            </div>
            {pricing.depositAmount > 0 && (
              <div className="flex justify-between text-zinc-500">
                <span>Caution Deposit</span>
                <span>{fmtNgn(pricing.depositAmount)}</span>
              </div>
            )}
            <div className="flex justify-between font-black text-base border-t border-zinc-200 pt-2 text-zinc-900">
              <span>Total Payable</span>
              <span className="text-yellow-600">{fmtNgn(pricing.totalAmount)}</span>
            </div>
            <div
              className={`flex justify-between text-xs font-bold pt-1 ${
                invoice.isPaid ? "text-emerald-600" : "text-amber-600"
              }`}
            >
              <span>Payment Status</span>
              <span>{invoice.isPaid ? "✅ PAID" : "⏳ PENDING"}</span>
            </div>
            {payment.reference && (
              <div className="flex justify-between text-[10px] text-zinc-400">
                <span>Payment Ref</span>
                <span className="font-mono">{payment.reference}</span>
              </div>
            )}
          </div>
        </div>

        {/* ─ Terms ─ */}
        {invoice.terms && (
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
            <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">Terms & Conditions</div>
            <p className="text-[11px] text-zinc-600 leading-relaxed whitespace-pre-line">{invoice.terms}</p>
          </div>
        )}

        {/* ─ Footer ─ */}
        <div className="border-t border-zinc-200 pt-4 text-center text-[10px] text-zinc-400 space-y-1">
          <div className="font-black text-zinc-600">CHEESCO GLOBAL CONCEPT LTD</div>
          <div>RC: 1234567 · Lagos, Nigeria · hello@cheesco.ng</div>
          <div>This is an official Cheesco Equip Hub invoice. Funds are secured in Cheesco Escrow until {invoice.isPurchase ? "title transfer" : "delivery confirmation"}.</div>
          <div className="font-bold text-zinc-500">
            {invoice.isPurchase ? "OUTRIGHT SALE TRANSACTION" : "EQUIPMENT RENTAL TRANSACTION"} ·{" "}
            {invoice.invoiceNumber}
          </div>
        </div>
      </div>
    </div>
  );
}
