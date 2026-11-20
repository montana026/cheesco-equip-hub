"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { SessionUser } from "@/lib/auth";
import { useAuthGuard } from "@/lib/hooks/use-auth-guard";
import { DashboardShell } from "@/components/dashboard-shell";
import toast from "react-hot-toast";
import Link from "next/link";
import { apiFetch } from "@/lib/api-client";

const NAV = [
  { href: "/admin/operations", label: "Operations" },
  { href: "/admin/verification", label: "Verification" },
  { href: "/admin/finance", label: "Finance" },
  { href: "/admin/support", label: "Support" },
];

interface SupportTicket {
  id: string;
  reference: string;
  customerName: string;
  email: string;
  phone: string;
  category: string;
  subject: string;
  message: string;
  priority: "CRITICAL" | "URGENT" | "HIGH" | "NORMAL" | "LOW" | string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED" | string;
  createdAt: string;
}

export default function AdminSupportPage() {
  const router = useRouter();
  const { user, ready } = useAuthGuard("SUPPORT_ADMIN");
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [replyText, setReplyText] = useState("");
  const [filter, setFilter] = useState<"ALL" | "OPEN" | "IN_PROGRESS" | "RESOLVED">("ALL");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!ready || !user) return;
    fetchTickets();
  }, [ready, user]);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/support/tickets");
      const result = await res.json();
      if (result.success && result.data) {
        setTickets(result.data);
      }
    } catch (e) {
      console.error("Failed to fetch support tickets:", e);
      toast.error("Failed to load support tickets");
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (ticketId: string) => {
    setActionLoading(true);
    try {
      const res = await apiFetch(`/api/support/tickets/${ticketId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "RESOLVED" }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to resolve ticket");

      toast.success("Ticket marked as resolved!");
      setTickets((prev) =>
        prev.map((t) => (t.id === ticketId ? { ...t, status: "RESOLVED" } : t))
      );
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket((prev) => (prev ? { ...prev, status: "RESOLVED" } : null));
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedTicket) return;
    setActionLoading(true);
    try {
      const res = await apiFetch(`/api/support/tickets/${selectedTicket.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "IN_PROGRESS",
          replyMessage: replyText.trim(),
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to dispatch reply");

      toast.success(`Reply dispatched to ${selectedTicket.email}!`);
      setReplyText("");
      setTickets((prev) =>
        prev.map((t) => (t.id === selectedTicket.id ? { ...t, status: "IN_PROGRESS" } : t))
      );
      setSelectedTicket((prev) => (prev ? { ...prev, status: "IN_PROGRESS" } : null));
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const filteredTickets = tickets.filter((t) => {
    if (filter === "ALL") return true;
    return t.status === filter;
  });

  return (
    <DashboardShell
      user={user}
      nav={NAV}
      title="Customer Support & Operations Helpdesk"
      subtitle="Track customer breakdowns, logistics assistance requests, and contractor inquiries in real-time"
    >
      <div className="space-y-8">
        {/* Admin Navigation Pills (Desktop only, mobile uses sticky top strip) */}
        <div className="hidden lg:flex flex-wrap items-center gap-2 border-b border-line-soft pb-4">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${
                n.href === "/admin/support"
                  ? "bg-cheesco-yellow text-[#0A0D14]"
                  : "bg-canvas-deep text-ink-muted hover:text-cheesco-yellow hover:bg-card"
              }`}
            >
              {n.label}
            </Link>
          ))}
        </div>

        {/* Support Metrics */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-line-soft bg-card p-5 shadow-sm">
            <span className="text-xs font-bold text-ink-muted">Open Support Inquiries</span>
            <div className="mt-2 text-2xl font-black text-cheesco-yellow">
              {tickets.filter((t) => t.status === "OPEN").length}
            </div>
            <span className="mt-1 block text-[10px] text-red-400 font-semibold">● Requires operations response</span>
          </div>

          <div className="rounded-2xl border border-line-soft bg-card p-5 shadow-sm">
            <span className="text-xs font-bold text-ink-muted">In Progress</span>
            <div className="mt-2 text-2xl font-black text-blue-400">
              {tickets.filter((t) => t.status === "IN_PROGRESS").length}
            </div>
            <span className="mt-1 block text-[10px] text-ink-muted">Assigned to engineers</span>
          </div>

          <div className="rounded-2xl border border-line-soft bg-card p-5 shadow-sm">
            <span className="text-xs font-bold text-ink-muted">Total In Database</span>
            <div className="mt-2 text-2xl font-black text-ink">{tickets.length}</div>
            <span className="mt-1 block text-[10px] text-green-500 font-semibold">✓ Live Supabase sync</span>
          </div>

          <div className="rounded-2xl border border-line-soft bg-card p-5 shadow-sm">
            <span className="text-xs font-bold text-ink-muted">Resolved</span>
            <div className="mt-2 text-2xl font-black text-green-500">
              {tickets.filter((t) => t.status === "RESOLVED").length}
            </div>
            <span className="mt-1 block text-[10px] text-ink-muted">Under 2-hour response guarantee</span>
          </div>
        </div>

        {/* Tickets Grid + Detail Panel */}
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Ticket Queue */}
          <div className="lg:col-span-7 rounded-2xl border border-line-soft bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-line-soft pb-4 mb-4">
              <h2 className="text-base font-black text-ink">Support Tickets Queue</h2>
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  {(["ALL", "OPEN", "IN_PROGRESS", "RESOLVED"] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`rounded px-2.5 py-1 text-[11px] font-bold ${
                        filter === f
                          ? "bg-cheesco-yellow text-[#0A0D14]"
                          : "text-ink-muted hover:text-ink"
                      }`}
                    >
                      {f.replace("_", " ")}
                    </button>
                  ))}
                </div>
                <button
                  onClick={fetchTickets}
                  className="text-xs font-bold text-cheesco-yellow hover:underline ml-2"
                >
                  ↻
                </button>
              </div>
            </div>

            {loading ? (
              <div className="py-12 text-center text-xs text-ink-muted">Loading support tickets...</div>
            ) : filteredTickets.length === 0 ? (
              <div className="py-12 text-center text-xs text-ink-muted">
                No tickets matching filter. (When a user submits a ticket on /support, it will appear here instantly).
              </div>
            ) : (
              <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1">
                {filteredTickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    onClick={() => setSelectedTicket(ticket)}
                    className={`cursor-pointer rounded-xl border p-4 transition-all ${
                      selectedTicket?.id === ticket.id
                        ? "border-cheesco-yellow bg-canvas-deep ring-1 ring-cheesco-yellow"
                        : "border-line-soft bg-canvas hover:border-cheesco-yellow/40"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-bold text-cheesco-yellow">
                        {ticket.reference}
                      </span>
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[9px] font-black ${
                            ticket.priority === "CRITICAL" || ticket.priority === "URGENT"
                              ? "bg-red-500/20 text-red-400"
                              : ticket.priority === "HIGH"
                              ? "bg-orange-500/20 text-orange-400"
                              : "bg-blue-500/20 text-blue-400"
                          }`}
                        >
                          {ticket.priority}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[9px] font-black ${
                            ticket.status === "RESOLVED"
                              ? "bg-green-500/20 text-green-400"
                              : ticket.status === "IN_PROGRESS"
                              ? "bg-yellow-500/20 text-yellow-400"
                              : "bg-purple-500/20 text-purple-400"
                          }`}
                        >
                          {ticket.status.replace("_", " ")}
                        </span>
                      </div>
                    </div>

                    <h3 className="mt-2 text-sm font-bold text-ink">{ticket.subject}</h3>
                    <p className="mt-1 line-clamp-2 text-xs text-ink-muted">{ticket.message}</p>

                    <div className="mt-3 flex items-center justify-between text-[11px] text-ink-muted border-t border-line-soft pt-2">
                      <span>{ticket.customerName}</span>
                      <span>{ticket.createdAt}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Ticket Inspector / Action Panel */}
          <div className="lg:col-span-5 rounded-2xl border border-line-soft bg-card p-6 shadow-sm">
            {selectedTicket ? (
              <div className="space-y-4">
                <div className="border-b border-line-soft pb-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-cheesco-yellow">
                      {selectedTicket.reference}
                    </span>
                    <span className="text-[10px] text-ink-muted">{selectedTicket.createdAt}</span>
                  </div>
                  <h3 className="mt-2 text-base font-bold text-ink">{selectedTicket.subject}</h3>
                </div>

                <div className="rounded-xl bg-canvas p-4 text-xs space-y-1.5 border border-line-soft">
                  <div className="flex justify-between">
                    <span className="text-ink-muted">Requester:</span>
                    <span className="font-bold text-ink">{selectedTicket.customerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-muted">Email:</span>
                    <a href={`mailto:${selectedTicket.email}`} className="text-cheesco-yellow hover:underline font-semibold">
                      {selectedTicket.email}
                    </a>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-muted">Phone:</span>
                    <a href={`tel:${selectedTicket.phone}`} className="text-cheesco-yellow hover:underline font-semibold">
                      {selectedTicket.phone}
                    </a>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-muted">Category:</span>
                    <span className="font-semibold text-ink">{selectedTicket.category.replace(/_/g, " ")}</span>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-ink mb-1">Inquiry Description:</h4>
                  <p className="rounded-xl border border-line-soft bg-canvas p-4 text-xs text-ink leading-relaxed">
                    {selectedTicket.message}
                  </p>
                </div>

                {/* Response Box */}
                <div>
                  <label className="block text-xs font-bold text-ink mb-1.5">Dispatch Officer Reply</label>
                  <textarea
                    rows={3}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type official email response or technician dispatch instruction..."
                    className="w-full rounded-xl border border-line-soft bg-canvas p-3 text-xs text-ink placeholder-zinc-500 focus:border-cheesco-yellow focus:outline-none"
                  />
                  <div className="mt-3 flex gap-2">
                    <button
                      disabled={actionLoading}
                      onClick={handleSendReply}
                      className="flex-1 rounded-xl bg-cheesco-yellow py-2 text-xs font-bold text-[#0A0D14] hover:bg-cheesco-yellow-bright transition-all disabled:opacity-50"
                    >
                      Send Official Reply
                    </button>
                    {selectedTicket.status !== "RESOLVED" && (
                      <button
                        disabled={actionLoading}
                        onClick={() => handleResolve(selectedTicket.id)}
                        className="rounded-xl border border-green-500/40 bg-green-500/10 px-4 py-2 text-xs font-bold text-green-400 hover:bg-green-500/20 transition-all disabled:opacity-50"
                      >
                        Mark Resolved
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-24 text-center text-xs text-ink-muted">
                <div className="text-3xl mb-2">💬</div>
                Select an active ticket from the queue to view customer breakdown details, issue immediate responses, and log resolution status.
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
