"use client";

import { useState } from "react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import toast from "react-hot-toast";
import { apiFetch } from "@/lib/api-client";

export function SupportClient() {
  const [ticketForm, setTicketForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    category: "RENTAL",
    referenceNumber: "",
    subject: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketForm.fullName || !ticketForm.email || !ticketForm.message) {
      toast.error("Please fill in your name, email, and message.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiFetch("/api/support/tickets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(ticketForm),
      });

      const result = await res.json();
      if (result.success) {
        setSubmittedId(result.ticketNumber);
        toast.success(`Support ticket ${result.ticketNumber} created! Our operations desk has been notified.`);
      } else {
        throw new Error(result.error || "Failed to submit ticket");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to submit ticket. Please try again or call our hotline.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className="flex-1 pt-20">
        <div className="min-h-screen bg-canvas text-ink">
          {/* Hero Banner */}
          <section className="border-b border-line-soft bg-canvas-deep py-16 sm:py-20">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-cheesco-yellow/40 bg-cheesco-yellow/10 px-4 py-1.5 text-xs font-bold text-cheesco-yellow mb-5">
                <span className="h-2 w-2 rounded-full bg-cheesco-yellow animate-pulse" />
                24/7 Heavy Equipment Operations & Customer Support
              </div>
              <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-ink">
                How Can We <span className="text-cheesco-yellow">Help You Today?</span>
              </h1>
              <p className="mt-4 text-base sm:text-lg text-ink-muted max-w-2xl mx-auto">
                Need urgent technical assistance, rental tracking, payment escrow inquiries, or site mobilization support? We're available 24/7 with a response promise of under 2 hours.
              </p>
            </div>
          </section>

          {/* Direct Support Channels */}
          <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 -mt-6">
            <div className="grid gap-6 md:grid-cols-3">
              {/* Channel 1 */}
              <div className="rounded-2xl border border-line-soft bg-card p-6 shadow-sm transition-all hover:border-cheesco-yellow/40">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cheesco-yellow/15 text-cheesco-yellow text-2xl mb-4 font-bold">
                  ⚡
                </div>
                <h3 className="text-lg font-bold text-ink mb-1">Emergency Operations Desk</h3>
                <p className="text-xs text-ink-muted mb-4">
                  For active equipment breakdowns, site emergencies, or critical transport coordination.
                </p>
                <div className="space-y-2">
                  <a
                    href="tel:+2348002433726"
                    className="flex items-center gap-2 text-sm font-bold text-cheesco-yellow hover:underline"
                  >
                    <span>📞 +234 800 CHEESCO (24/7)</span>
                  </a>
                  <a
                    href="https://wa.me/2348002433726?text=Hello%20Cheesco%20Operations%20Support"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-green-500 hover:underline"
                  >
                    <span>💬 WhatsApp Live Desk</span>
                  </a>
                </div>
              </div>

              {/* Channel 2 */}
              <div className="rounded-2xl border border-line-soft bg-card p-6 shadow-sm transition-all hover:border-cheesco-yellow/40">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/15 text-blue-400 text-2xl mb-4 font-bold">
                  ✉️
                </div>
                <h3 className="text-lg font-bold text-ink mb-1">Email Support</h3>
                <p className="text-xs text-ink-muted mb-4">
                  Quotations, billing, merchant onboarding, and contractual verification assistance.
                </p>
                <div className="space-y-1">
                  <a
                    href="mailto:support@cheescoequiphub.com"
                    className="block text-sm font-bold text-cheesco-yellow hover:underline truncate"
                  >
                    support@cheescoequiphub.com
                  </a>
                  <a
                    href="mailto:operations@cheescoequiphub.com"
                    className="block text-xs font-semibold text-ink-muted hover:underline truncate"
                  >
                    operations@cheescoequiphub.com
                  </a>
                </div>
              </div>

              {/* Channel 3 */}
              <div className="rounded-2xl border border-line-soft bg-card p-6 shadow-sm transition-all hover:border-cheesco-yellow/40">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/15 text-purple-400 text-2xl mb-4 font-bold">
                  🏢
                </div>
                <h3 className="text-lg font-bold text-ink mb-1">Corporate Headquarters</h3>
                <p className="text-xs text-ink-muted mb-4">
                  Visit our regional logistics coordination centers in Lagos & Port Harcourt.
                </p>
                <p className="text-xs font-bold text-ink">
                  Plot 54, Trans Amadi Industrial Layout, Trans Amadi, Port Harcourt, Rivers State, Nigeria
                </p>
              </div>
            </div>
          </section>

          {/* Interactive Ticket Form & FAQ Grid */}
          <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="grid gap-12 lg:grid-cols-12">
              {/* Support Ticket Submission */}
              <div className="lg:col-span-7">
                <div className="rounded-2xl border border-line-soft bg-card p-6 sm:p-8">
                  <div className="border-b border-line-soft pb-4 mb-6">
                    <h2 className="text-2xl font-black text-ink">Open a Support Ticket</h2>
                    <p className="text-xs text-ink-muted mt-1">
                      Our dispatch & support coordinators log every case into our tracking system.
                    </p>
                  </div>

                  {submittedId ? (
                    <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-6 text-center">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-500 text-black font-black text-xl mb-3">
                        ✓
                      </div>
                      <h3 className="text-lg font-bold text-ink">Ticket Created Successfully!</h3>
                      <p className="mt-1 text-sm text-ink-muted">
                        Your Ticket Reference is: <strong className="text-cheesco-yellow font-mono text-base">{submittedId}</strong>
                      </p>
                      <p className="mt-3 text-xs text-ink-muted">
                        A confirmation has been sent to <strong>{ticketForm.email}</strong>. Our on-duty engineer will review your ticket and contact you shortly.
                      </p>
                      <button
                        onClick={() => {
                          setSubmittedId(null);
                          setTicketForm({
                            fullName: "",
                            email: "",
                            phone: "",
                            category: "RENTAL_ISSUE",
                            referenceNumber: "",
                            subject: "",
                            message: "",
                          });
                        }}
                        className="mt-6 inline-flex items-center rounded-lg bg-cheesco-yellow px-5 py-2.5 text-xs font-bold text-[#0A0D14] hover:bg-cheesco-yellow-bright transition-colors"
                      >
                        Submit Another Ticket
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <label className="block text-xs font-bold text-ink mb-1.5">
                            Full Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={ticketForm.fullName}
                            onChange={(e) => setTicketForm({ ...ticketForm, fullName: e.target.value })}
                            placeholder="e.g. Aliko Babatunde"
                            className="w-full rounded-lg border border-line-soft bg-canvas px-3.5 py-2.5 text-sm text-ink placeholder-zinc-500 focus:border-cheesco-yellow focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-ink mb-1.5">
                            Work / Personal Email <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="email"
                            required
                            value={ticketForm.email}
                            onChange={(e) => setTicketForm({ ...ticketForm, email: e.target.value })}
                            placeholder="name@company.ng"
                            className="w-full rounded-lg border border-line-soft bg-canvas px-3.5 py-2.5 text-sm text-ink placeholder-zinc-500 focus:border-cheesco-yellow focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <label className="block text-xs font-bold text-ink mb-1.5">Phone Number</label>
                          <input
                            type="tel"
                            value={ticketForm.phone}
                            onChange={(e) => setTicketForm({ ...ticketForm, phone: e.target.value })}
                            placeholder="+234 800 000 0000"
                            className="w-full rounded-lg border border-line-soft bg-canvas px-3.5 py-2.5 text-sm text-ink placeholder-zinc-500 focus:border-cheesco-yellow focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-ink mb-1.5">Issue Category</label>
                          <select
                            value={ticketForm.category}
                            onChange={(e) => setTicketForm({ ...ticketForm, category: e.target.value })}
                            className="w-full rounded-lg border border-line-soft bg-canvas px-3.5 py-2.5 text-sm text-ink focus:border-cheesco-yellow focus:outline-none"
                          >
                            <option value="RENTAL">Active Rental / Equipment Issue</option>
                            <option value="PAYMENT">Quotation & Escrow Payment</option>
                            <option value="DELIVERY">Mobilization & Delivery Status</option>
                            <option value="MERCHANT">Merchant Verification (KYC)</option>
                            <option value="DISPUTE">Caution Deposit & Dispute Settlement</option>
                            <option value="ACCOUNT">Account & Profile Settings</option>
                            <option value="EQUIPMENT">Equipment Specifications & Inspection</option>
                            <option value="OTHER">General Inquiry</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-ink mb-1.5">
                          Equipment / Booking Reference (Optional)
                        </label>
                        <input
                          type="text"
                          value={ticketForm.referenceNumber}
                          onChange={(e) => setTicketForm({ ...ticketForm, referenceNumber: e.target.value })}
                          placeholder="e.g. CHK-REQ-1049 or Equipment Name"
                          className="w-full rounded-lg border border-line-soft bg-canvas px-3.5 py-2.5 text-sm text-ink placeholder-zinc-500 focus:border-cheesco-yellow focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-ink mb-1.5">
                          Subject <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={ticketForm.subject}
                          onChange={(e) => setTicketForm({ ...ticketForm, subject: e.target.value })}
                          placeholder="Brief description of the request or problem"
                          className="w-full rounded-lg border border-line-soft bg-canvas px-3.5 py-2.5 text-sm text-ink placeholder-zinc-500 focus:border-cheesco-yellow focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-ink mb-1.5">
                          Detailed Message <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          rows={4}
                          required
                          value={ticketForm.message}
                          onChange={(e) => setTicketForm({ ...ticketForm, message: e.target.value })}
                          placeholder="Explain what you need assistance with. For site issues, include site coordinates or machinery state..."
                          className="w-full rounded-lg border border-line-soft bg-canvas px-3.5 py-2.5 text-sm text-ink placeholder-zinc-500 focus:border-cheesco-yellow focus:outline-none"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={submitting}
                        className="w-full rounded-xl bg-cheesco-yellow py-3 text-sm font-black text-[#0A0D14] hover:bg-cheesco-yellow-bright transition-all disabled:opacity-50 shadow-md shadow-cheesco-yellow/20"
                      >
                        {submitting ? "Submitting Ticket..." : "Submit Support Request"}
                      </button>
                    </form>
                  )}
                </div>
              </div>

              {/* FAQs and Knowledge Center */}
              <div className="lg:col-span-5 space-y-6">
                <div>
                  <h2 className="text-2xl font-black text-ink">Frequently Asked Questions</h2>
                  <p className="text-xs text-ink-muted mt-1">
                    Quick answers to the most common queries from contractors and equipment owners.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="rounded-xl border border-line-soft bg-card p-5">
                    <h3 className="text-sm font-bold text-ink mb-1.5">
                      How does Cheesco guarantee equipment uptime on site?
                    </h3>
                    <p className="text-xs text-ink-muted leading-relaxed">
                      Every piece of machinery undergoes strict pre-mobilization inspection. In the rare event of a mechanical breakdown, our operations team deploys certified technicians or coordinates an immediate replacement machine.
                    </p>
                  </div>

                  <div className="rounded-xl border border-line-soft bg-card p-5">
                    <h3 className="text-sm font-bold text-ink mb-1.5">
                      When is my caution deposit returned?
                    </h3>
                    <p className="text-xs text-ink-muted leading-relaxed">
                      Caution deposits are held in Cheesco Escrow and released within 24 to 48 hours following joint post-demobilization inspection sign-off.
                    </p>
                  </div>

                  <div className="rounded-xl border border-line-soft bg-card p-5">
                    <h3 className="text-sm font-bold text-ink mb-1.5">
                      Can I inspect equipment physically before paying?
                    </h3>
                    <p className="text-xs text-ink-muted leading-relaxed">
                      Yes. After an initial booking confirmation, Cheesco operations arranges a scheduled site inspection accompanied by our certified equipment verifiers.
                    </p>
                  </div>

                  <div className="rounded-xl border border-line-soft bg-card p-5">
                    <h3 className="text-sm font-bold text-ink mb-1.5">
                      How are operators vetted and assigned?
                    </h3>
                    <p className="text-xs text-ink-muted leading-relaxed">
                      All machine operators provided through Cheesco hold valid heavy equipment certifications, medical fitness checks, and minimum 5+ years operational safety experience.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
