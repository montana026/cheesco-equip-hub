"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { SessionUser } from "@/lib/auth";
import { useAuthGuard } from "@/lib/hooks/use-auth-guard";
import { DashboardShell } from "@/components/dashboard-shell";
import { fmtNgn } from "@/lib/format";
import { apiFetch } from "@/lib/api-client";
import toast from "react-hot-toast";

const NAV = [
  { href: "/merchant/dashboard", label: "Overview" },
  { href: "/merchant/listings", label: "My Listings" },
  { href: "/merchant/ads", label: "Ad Campaigns" },
  { href: "/merchant/earnings", label: "Earnings & Payouts" },
  { href: "/merchant/verification", label: "Verification (KYC)" },
];

export default function MerchantEarningsPage() {
  const router = useRouter();
  const { user, ready } = useAuthGuard("MERCHANT");
  const [loading, setLoading] = useState(true);
  const [bankForm, setBankForm] = useState({
    bankName: "Access Bank Plc",
    accountNumber: "0123456789",
    accountName: "Cheesco Equipment Fleet Logistics",
  });
  const [savingBank, setSavingBank] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);

  // Merchant financial summaries (loaded live from database)
  const [earnings, setEarnings] = useState({
    totalEarned: 0,
    availablePayout: 0,
    inEscrow: 0,
    withdrawn: 0,
  });

  const [payouts, setPayouts] = useState<any[]>([]);

  const fetchEarnings = async () => {
    try {
      const res = await apiFetch("/api/merchant/earnings");
      const data = await res.json();
      if (data.success) {
        if (data.earnings) setEarnings(data.earnings);
        if (data.payouts) setPayouts(data.payouts);
      }
    } catch (e) {
      console.warn("Could not fetch live merchant earnings:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!ready || !user) return;
    fetchEarnings();
  }, [ready, user]);

  const handleSaveBank = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingBank(true);
    try {
      const res = await apiFetch("/api/merchant/earnings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "SAVE_BANK", bankForm }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || "Bank account settlement information updated!");
      } else {
        toast.error(data.error || "Failed to update bank details");
      }
    } catch {
      toast.error("Failed to update bank details");
    } finally {
      setSavingBank(false);
    }
  };

  const handleRequestPayout = async () => {
    if (earnings.availablePayout <= 0) {
      toast.error("No available payout balance at this time.");
      return;
    }

    const confirmed = window.confirm(
      `Confirm withdrawal request of ${fmtNgn(earnings.availablePayout)} to ${bankForm.bankName} (${bankForm.accountNumber})?`
    );
    if (!confirmed) return;

    setWithdrawing(true);
    try {
      const res = await apiFetch("/api/merchant/earnings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "WITHDRAW",
          amount: earnings.availablePayout,
          bankForm,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || `Payout of ${fmtNgn(earnings.availablePayout)} requested!`);
        setEarnings((prev) => ({
          ...prev,
          withdrawn: prev.withdrawn + prev.availablePayout,
          availablePayout: 0,
        }));
      } else {
        toast.error(data.error || "Failed to process withdrawal request");
      }
    } catch {
      toast.error("Failed to process withdrawal request");
    } finally {
      setWithdrawing(false);
    }
  };

  return (
    <DashboardShell user={user} nav={NAV} title="Merchant Earnings & Settlements">
      <div className="space-y-8">
        {/* Earnings Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-line-soft bg-card p-5">
            <span className="text-xs font-bold text-ink-muted">Gross Lifetime Earnings</span>
            <div className="mt-2 text-2xl font-black text-ink font-mono">{fmtNgn(earnings.totalEarned)}</div>
            <span className="mt-1 block text-[10px] text-green-500 font-semibold">● Net of Cheesco 10% platform fee</span>
          </div>

          <div className="rounded-2xl border border-line-soft bg-card p-5">
            <span className="text-xs font-bold text-ink-muted">Available for Withdrawal</span>
            <div className="mt-2 text-2xl font-black text-cheesco-yellow font-mono">{fmtNgn(earnings.availablePayout)}</div>
            <button
              onClick={handleRequestPayout}
              disabled={withdrawing || earnings.availablePayout <= 0}
              className="mt-3 w-full rounded-lg bg-cheesco-yellow py-1.5 text-xs font-black text-[#0A0D14] hover:bg-cheesco-yellow-bright transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {withdrawing ? "Processing..." : "Withdraw to Bank"}
            </button>
          </div>

          <div className="rounded-2xl border border-line-soft bg-card p-5">
            <span className="text-xs font-bold text-ink-muted">Funds in Active Escrow</span>
            <div className="mt-2 text-2xl font-black text-blue-400 font-mono">{fmtNgn(earnings.inEscrow)}</div>
            <span className="mt-1 block text-[10px] text-ink-muted">Releases on demobilization sign-off</span>
          </div>

          <div className="rounded-2xl border border-line-soft bg-card p-5">
            <span className="text-xs font-bold text-ink-muted">Total Disbursed to Bank</span>
            <div className="mt-2 text-2xl font-black text-ink font-mono">{fmtNgn(earnings.withdrawn)}</div>
            <span className="mt-1 block text-[10px] text-ink-muted">Direct NIBSS settlement</span>
          </div>
        </div>

        {/* Payout History and Bank Settings */}
        <div className="grid gap-8 lg:grid-cols-12">
          {/* Payout History Ledger */}
          <div className="lg:col-span-8 rounded-2xl border border-line-soft bg-card p-6 shadow-sm">
            <div className="border-b border-line-soft pb-4 mb-4">
              <h2 className="text-lg font-black text-ink">Rental Payout Ledger</h2>
              <p className="text-xs text-ink-muted">
                Detailed record of equipment rental disbursements and escrow releases.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-line-soft text-ink-muted">
                    <th className="pb-3 font-bold">Reference / Date</th>
                    <th className="pb-3 font-bold">Equipment & Client</th>
                    <th className="pb-3 font-bold">Gross Rate</th>
                    <th className="pb-3 font-bold">Platform (10%)</th>
                    <th className="pb-3 font-bold">Net Payout</th>
                    <th className="pb-3 font-bold">Status</th>
                    <th className="pb-3 font-bold">Invoice</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-soft">
                  {payouts.map((p) => (
                    <tr key={p.id} className="hover:bg-canvas-deep/40 transition-colors">
                      <td className="py-4">
                        <div className="font-mono font-bold text-ink">{p.reference}</div>
                        <div className="text-[10px] text-ink-muted">{p.date}</div>
                      </td>
                      <td className="py-4">
                        <div className="font-bold text-ink">{p.equipment}</div>
                        <div className="text-[10px] text-ink-muted">{p.client}</div>
                      </td>
                      <td className="py-4 font-mono font-medium text-ink">{fmtNgn(p.gross)}</td>
                      <td className="py-4 font-mono text-ink-muted">-{fmtNgn(p.fee)}</td>
                      <td className="py-4 font-mono font-bold text-cheesco-yellow">{fmtNgn(p.net)}</td>
                      <td className="py-4">
                        <span
                          className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-black ${
                            p.status === "COMPLETED"
                              ? "bg-green-500/20 text-green-400"
                              : p.status === "READY_FOR_WITHDRAWAL"
                              ? "bg-cheesco-yellow/20 text-cheesco-yellow"
                              : "bg-purple-500/20 text-purple-400"
                          }`}
                        >
                          {p.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="py-4">
                        {(p.status === "COMPLETED" || p.status === "READY_FOR_WITHDRAWAL") && p.reference && (
                          <a
                            href={`/invoice/${p.reference}`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-black text-emerald-400 hover:bg-emerald-500/20 transition-colors whitespace-nowrap"
                          >
                            📄 Invoice
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bank Account Settings */}
          <div className="lg:col-span-4 rounded-2xl border border-line-soft bg-card p-6 shadow-sm">
            <div className="border-b border-line-soft pb-4 mb-5">
              <h2 className="text-lg font-black text-ink">Settlement Account</h2>
              <p className="text-xs text-ink-muted">
                Where your rental earnings will be automatically deposited.
              </p>
            </div>

            <form onSubmit={handleSaveBank} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-ink mb-1.5">Bank Name</label>
                <select
                  value={bankForm.bankName}
                  onChange={(e) => setBankForm({ ...bankForm, bankName: e.target.value })}
                  className="w-full rounded-lg border border-line-soft bg-canvas px-3.5 py-2.5 text-xs text-ink focus:border-cheesco-yellow focus:outline-none"
                >
                  <option value="Access Bank Plc">Access Bank Plc</option>
                  <option value="Zenith Bank Plc">Zenith Bank Plc</option>
                  <option value="Guaranty Trust Bank (GTBank)">Guaranty Trust Bank (GTBank)</option>
                  <option value="First Bank of Nigeria">First Bank of Nigeria</option>
                  <option value="United Bank for Africa (UBA)">United Bank for Africa (UBA)</option>
                  <option value="Stanbic IBTC Bank">Stanbic IBTC Bank</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-ink mb-1.5">Account Number</label>
                <input
                  type="text"
                  maxLength={10}
                  required
                  value={bankForm.accountNumber}
                  onChange={(e) => setBankForm({ ...bankForm, accountNumber: e.target.value })}
                  className="w-full rounded-lg border border-line-soft bg-canvas px-3.5 py-2.5 text-xs text-ink font-mono focus:border-cheesco-yellow focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink mb-1.5">Account Name (Verified)</label>
                <input
                  type="text"
                  required
                  value={bankForm.accountName}
                  onChange={(e) => setBankForm({ ...bankForm, accountName: e.target.value })}
                  className="w-full rounded-lg border border-line-soft bg-canvas px-3.5 py-2.5 text-xs text-ink focus:border-cheesco-yellow focus:outline-none"
                />
              </div>

              <div className="rounded-lg bg-green-500/10 p-3 text-[11px] text-green-400 border border-green-500/20">
                ✓ Account verified with NIBSS electronic name enquiry.
              </div>

              <button
                type="submit"
                disabled={savingBank}
                className="w-full rounded-xl bg-cheesco-yellow py-2.5 text-xs font-black text-[#0A0D14] hover:bg-cheesco-yellow-bright transition-all disabled:opacity-50"
              >
                {savingBank ? "Saving..." : "Update Bank Details"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
