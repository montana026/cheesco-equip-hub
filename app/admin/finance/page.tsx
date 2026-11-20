"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { SessionUser } from "@/lib/auth";
import { useAuthGuard } from "@/lib/hooks/use-auth-guard";
import { DashboardShell } from "@/components/dashboard-shell";
import { fmtNgn } from "@/lib/format";
import { apiFetch } from "@/lib/api-client";
import toast from "react-hot-toast";
import Link from "next/link";
import type { FinanceTransaction } from "@/app/api/admin/finance/route";

const NAV = [
  { href: "/admin/operations", label: "Operations" },
  { href: "/admin/verification", label: "Verification" },
  { href: "/admin/finance", label: "Finance" },
  { href: "/admin/support", label: "Support" },
];

export default function AdminFinancePage() {
  const router = useRouter();
  const { user, ready } = useAuthGuard(["FINANCE_ADMIN", "SUPER_ADMIN"]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<
    "ALL" | "ESCROW_HELD" | "PAYOUT_READY" | "DISBURSED" | "PENDING_PAYMENT"
  >("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Financial aggregate stats (live from database)
  const [stats, setStats] = useState({
    totalEscrow: 0,
    pendingPayouts: 0,
    platformRevenue: 0,
    cautionDepositsHeld: 0,
    totalVolume: 0,
    disbursedTotal: 0,
  });

  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);

  useEffect(() => {
    if (!ready || !user) return;
    fetchFinanceData();

    // Auto-refresh every 20 seconds to catch live payment webhooks
    const timer = setInterval(() => {
      fetchFinanceData(false);
    }, 20000);

    return () => clearInterval(timer);
  }, [ready, user]);

  const fetchFinanceData = async (showLoadingState = true) => {
    if (showLoadingState) setLoading(true);
    else setRefreshing(true);

    try {
      const res = await apiFetch("/api/admin/finance");

      const json = await res.json();
      if (json.success) {
        setStats(json.stats || {
          totalEscrow: 0,
          pendingPayouts: 0,
          platformRevenue: 0,
          cautionDepositsHeld: 0,
          totalVolume: 0,
          disbursedTotal: 0,
        });
        setTransactions(json.transactions || []);
      } else {
        toast.error(json.error || "Failed to load financial records");
      }
    } catch (e: any) {
      console.error("Finance fetch error:", e);
      toast.error("Network error while connecting to finance vault");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleDisbursePayout = async (tx: FinanceTransaction) => {
    const bankInfo = tx.merchantBank
      ? `\n\nVerified Settlement Bank:\n• Bank: ${tx.merchantBank.bankName}\n• Account Number: ${tx.merchantBank.accountNumber}\n• Account Name: ${tx.merchantBank.accountName}`
      : "";

    const confirmed = window.confirm(
      `Disburse merchant payout of ${fmtNgn(tx.merchantPayout)} for ${tx.reference} (${tx.equipmentName}) to ${tx.merchantName}?${bankInfo}`
    );
    if (!confirmed) return;

    setProcessingId(tx.id);
    try {
      const res = await apiFetch("/api/admin/finance/disburse", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paymentId: tx.paymentId,
          rentalRequestId: tx.rentalRequestId,
          reference: tx.reference,
          amount: tx.merchantPayout,
          notes: `Disbursed by ${user?.name || user?.email || "Finance Admin"} via Cheesco Vault`,
        }),
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Disbursement failed");

      toast.success(json.message || "Merchant payout disbursed successfully!");
      await fetchFinanceData(false);
    } catch (e: any) {
      toast.error(e.message || "Failed to disburse payout");
    } finally {
      setProcessingId(null);
    }
  };

  const handleRefundDeposit = async (tx: FinanceTransaction) => {
    const confirmed = window.confirm(
      `Release caution deposit of ${fmtNgn(tx.cautionDeposit)} for ${tx.reference} to ${tx.customerName}?`
    );
    if (!confirmed) return;

    setProcessingId(tx.id);
    try {
      const res = await apiFetch("/api/admin/finance/refund-deposit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paymentId: tx.paymentId,
          rentalRequestId: tx.rentalRequestId,
          reference: tx.reference,
          amount: tx.cautionDeposit,
          reason: "Approved post-inspection sign-off",
        }),
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Deposit release failed");

      toast.success(json.message || "Caution deposit released successfully!");
      await fetchFinanceData(false);
    } catch (e: any) {
      toast.error(e.message || "Failed to refund deposit");
    } finally {
      setProcessingId(null);
    }
  };

  const filteredTx = useMemo(() => {
    return transactions.filter((t) => {
      // 1. Tab filter
      if (filter !== "ALL" && t.escrowStatus !== filter) {
        return false;
      }
      // 2. Search query filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        t.reference.toLowerCase().includes(q) ||
        t.customerName.toLowerCase().includes(q) ||
        t.merchantName.toLowerCase().includes(q) ||
        t.equipmentName.toLowerCase().includes(q) ||
        (t.customerEmail && t.customerEmail.toLowerCase().includes(q))
      );
    });
  }, [transactions, filter, searchQuery]);

  return (
    <DashboardShell user={user} nav={NAV} title="Financial Management & Escrow">
      <div className="space-y-8">
        {/* Admin Navigation Pills & Refresh */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line-soft pb-4">
          <div className="hidden lg:flex flex-wrap items-center gap-2">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${
                  n.href === "/admin/finance"
                    ? "bg-cheesco-yellow text-[#0A0D14]"
                    : "bg-canvas-deep text-ink-muted hover:text-cheesco-yellow hover:bg-card"
                }`}
              >
                {n.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-3 ml-auto">
            <span className="text-[11px] text-ink-muted flex items-center gap-1.5 font-medium">
              <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Live DB Synced
            </span>
            <button
              onClick={() => fetchFinanceData(false)}
              disabled={loading || refreshing}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line-soft bg-card px-3 py-1.5 text-xs font-bold text-ink hover:border-cheesco-yellow hover:text-cheesco-yellow transition-all disabled:opacity-50"
              title="Refresh ledger from database"
            >
              <svg
                className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-cheesco-yellow" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-line-soft bg-card p-5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-cheesco-yellow/5 rounded-full blur-2xl group-hover:bg-cheesco-yellow/10 transition-all" />
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-ink-muted">Total Escrow Vault</span>
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-black text-emerald-400">
                100% Secured
              </span>
            </div>
            <div className="mt-2 text-2xl font-black text-ink font-mono">
              {loading ? "..." : fmtNgn(stats.totalEscrow)}
            </div>
            <span className="mt-1 block text-[10px] text-emerald-400 font-semibold">
              ● Active funds held in custody
            </span>
          </div>

          <div className="rounded-2xl border border-line-soft bg-card p-5 relative overflow-hidden group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-ink-muted">Pending Merchant Payouts</span>
              <span className="rounded-full bg-cheesco-yellow/10 px-2 py-0.5 text-[10px] font-black text-cheesco-yellow">
                Ready / Active
              </span>
            </div>
            <div className="mt-2 text-2xl font-black text-cheesco-yellow font-mono">
              {loading ? "..." : fmtNgn(stats.pendingPayouts)}
            </div>
            <span className="mt-1 block text-[10px] text-ink-muted">
              Awaiting delivery / demob sign-off
            </span>
          </div>

          <div className="rounded-2xl border border-line-soft bg-card p-5 relative overflow-hidden group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-ink-muted">Platform Revenue (Gross Margins)</span>
              <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-black text-green-400">
                Realized
              </span>
            </div>
            <div className="mt-2 text-2xl font-black text-green-400 font-mono">
              {loading ? "..." : fmtNgn(stats.platformRevenue)}
            </div>
            <span className="mt-1 block text-[10px] text-ink-muted">
              Net realized commissions & margins
            </span>
          </div>

          <div className="rounded-2xl border border-line-soft bg-card p-5 relative overflow-hidden group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-ink-muted">Caution Deposits In Custody</span>
              <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-black text-blue-400">
                Refundable
              </span>
            </div>
            <div className="mt-2 text-2xl font-black text-blue-400 font-mono">
              {loading ? "..." : fmtNgn(stats.cautionDepositsHeld)}
            </div>
            <span className="mt-1 block text-[10px] text-ink-muted">
              Refundable post-inspection
            </span>
          </div>
        </div>

        {/* Transaction Ledger */}
        <div className="rounded-2xl border border-line-soft bg-card p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-line-soft pb-5">
            <div>
              <h2 className="text-xl font-black text-ink">Escrow & Payout Ledger</h2>
              <p className="text-xs text-ink-muted mt-0.5">
                Real-time escrow audits, milestone merchant payout releases, and caution deposit settlements.
              </p>
            </div>

            {/* Search bar & Filter tabs */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search ref, customer, merchant..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full sm:w-64 rounded-lg border border-line-soft bg-canvas px-3 py-1.5 text-xs text-ink placeholder:text-ink-muted focus:border-cheesco-yellow focus:outline-none"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-ink-muted hover:text-ink"
                  >
                    ×
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-line-soft bg-canvas p-1">
                {(
                  [
                    { id: "ALL", label: "All" },
                    { id: "ESCROW_HELD", label: "Held in Escrow" },
                    { id: "PAYOUT_READY", label: "Payout Ready" },
                    { id: "DISBURSED", label: "Disbursed" },
                    { id: "PENDING_PAYMENT", label: "Pending Pay" },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFilter(f.id)}
                    className={`rounded-md px-2.5 py-1 text-xs font-bold transition-all ${
                      filter === f.id
                        ? "bg-cheesco-yellow text-[#0A0D14]"
                        : "text-ink-muted hover:text-ink"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-line-soft text-ink-muted">
                  <th className="pb-3 font-bold">Reference / Date</th>
                  <th className="pb-3 font-bold">Parties</th>
                  <th className="pb-3 font-bold">Asset & Type</th>
                  <th className="pb-3 font-bold">Gross Paid</th>
                  <th className="pb-3 font-bold">Merchant Payout</th>
                  <th className="pb-3 font-bold">Platform Margin</th>
                  <th className="pb-3 font-bold">Escrow Status</th>
                  <th className="pb-3 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-soft">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-ink-muted">
                      <div className="inline-flex items-center gap-2">
                        <svg className="w-4 h-4 animate-spin text-cheesco-yellow" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span>Loading live escrow records from database...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredTx.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-ink-muted">
                      No financial transactions found matching the selected filter.
                    </td>
                  </tr>
                ) : (
                  filteredTx.map((tx) => (
                    <tr key={tx.id} className="hover:bg-canvas-deep/40 transition-colors">
                      {/* Reference & Date */}
                      <td className="py-4 font-medium">
                        <div className="font-mono font-bold text-ink flex items-center gap-1.5">
                          {tx.rentalRequestId ? (
                            <Link
                              href={`/admin/operations?requestId=${tx.rentalRequestId}`}
                              className="hover:text-cheesco-yellow transition-colors underline decoration-dotted"
                              title="View in Operations"
                            >
                              {tx.reference}
                            </Link>
                          ) : (
                            <span>{tx.reference}</span>
                          )}
                        </div>
                        <div className="text-[10px] text-ink-muted flex items-center gap-1 mt-0.5">
                          <span>{tx.date}</span>
                          <span className="uppercase text-[9px] font-bold px-1.5 py-0.2 rounded bg-canvas border border-line-soft">
                            {tx.paymentMethod}
                          </span>
                        </div>
                      </td>

                      {/* Parties & Settlement Account */}
                      <td className="py-4">
                        <div className="font-bold text-ink">{tx.customerName}</div>
                        <div className="text-[10px] text-ink-muted truncate max-w-[170px]">
                          Merchant: <span className="text-ink font-medium">{tx.merchantName}</span>
                        </div>
                        {tx.merchantBank && (
                          <div className="mt-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const textToCopy = `${tx.merchantBank?.bankName} - ${tx.merchantBank?.accountNumber} (${tx.merchantBank?.accountName})`;
                                navigator.clipboard.writeText(textToCopy);
                                toast.success(`Copied: ${tx.merchantBank?.bankName} • ${tx.merchantBank?.accountNumber}`);
                              }}
                              className="inline-flex items-center gap-1 rounded bg-cheesco-yellow/10 border border-cheesco-yellow/20 px-1.5 py-0.5 text-[9px] font-mono text-cheesco-yellow hover:bg-cheesco-yellow/20 transition-all text-left"
                              title={`Verified Settlement Account:\n${tx.merchantBank.bankName}\nAccount: ${tx.merchantBank.accountNumber}\nName: ${tx.merchantBank.accountName}\nClick to copy`}
                            >
                              <span>🏦</span>
                              <span>{tx.merchantBank.bankName.split(" ")[0]} • {tx.merchantBank.accountNumber}</span>
                              <span className="opacity-70 underline text-[8px]">copy</span>
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Asset & Type */}
                      <td className="py-4 max-w-[180px]">
                        <div className="font-medium text-ink truncate" title={tx.equipmentName}>
                          {tx.equipmentName}
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span
                            className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded ${
                              tx.isPurchase
                                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                            }`}
                          >
                            {tx.isPurchase ? "Purchase" : "Rental"}
                          </span>
                          <span className="text-[9px] text-ink-muted font-mono">
                            {tx.rentalState}
                          </span>
                        </div>
                      </td>

                      {/* Gross Paid */}
                      <td className="py-4 font-mono font-bold text-ink">
                        {fmtNgn(tx.rentalAmount)}
                        {tx.cautionDeposit > 0 && (
                          <div className="text-[10px] text-blue-400 font-normal">
                            Dep: {fmtNgn(tx.cautionDeposit)}
                          </div>
                        )}
                      </td>

                      {/* Merchant Payout */}
                      <td className="py-4 font-mono font-bold text-cheesco-yellow">
                        {fmtNgn(tx.merchantPayout)}
                      </td>

                      {/* Platform Fee */}
                      <td className="py-4 font-mono font-bold text-green-400">
                        {fmtNgn(tx.platformFee)}
                      </td>

                      {/* Status */}
                      <td className="py-4">
                        <span
                          className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-black ${
                            tx.escrowStatus === "DISBURSED"
                              ? "bg-green-500/20 text-green-400 border border-green-500/30"
                              : tx.escrowStatus === "PAYOUT_READY"
                              ? "bg-cheesco-yellow/20 text-cheesco-yellow border border-cheesco-yellow/30"
                              : tx.escrowStatus === "DEPOSIT_REFUNDED"
                              ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                              : tx.escrowStatus === "PENDING_PAYMENT"
                              ? "bg-zinc-700/40 text-zinc-400 border border-zinc-600/30"
                              : "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                          }`}
                        >
                          {tx.escrowStatus.replace("_", " ")}
                        </span>
                        {tx.depositStatus === "RELEASED" && (
                          <div className="text-[9px] text-emerald-400 font-semibold mt-0.5">
                            ✓ Deposit Released
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {tx.escrowStatus === "PAYOUT_READY" && (
                            <button
                              disabled={processingId === tx.id}
                              onClick={() => handleDisbursePayout(tx)}
                              className="rounded-lg bg-cheesco-yellow px-3 py-1.5 text-xs font-black text-[#0A0D14] hover:bg-cheesco-yellow-bright transition-all disabled:opacity-50 shadow-sm"
                            >
                              {processingId === tx.id ? "Processing..." : "Disburse Payout"}
                            </button>
                          )}

                          {tx.cautionDeposit > 0 && tx.depositStatus === "HELD" && (
                            <button
                              disabled={processingId === tx.id}
                              onClick={() => handleRefundDeposit(tx)}
                              className="rounded-lg border border-line-soft bg-canvas px-2.5 py-1.5 text-xs font-bold text-ink-muted hover:text-blue-400 hover:border-blue-400/40 transition-all disabled:opacity-50"
                              title="Release caution deposit post-inspection"
                            >
                              Release Dep
                            </button>
                          )}

                          {tx.escrowStatus === "DISBURSED" && (
                            <span className="text-[10px] font-bold text-green-400 inline-flex items-center gap-1">
                              ✓ Disbursed
                            </span>
                          )}

                          {tx.escrowStatus === "PENDING_PAYMENT" && (
                            <span className="text-[10px] text-zinc-500 font-medium">
                              Awaiting Customer Pay
                            </span>
                          )}

                          {tx.escrowStatus === "ESCROW_HELD" && (
                            <span className="text-[10px] text-purple-400 font-medium">
                              Vault Secured
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
