"use client";

import { useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import toast from "react-hot-toast";

export function FinanceClient() {
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [joined, setJoined] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleWaitlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!waitlistEmail) {
      toast.error("Please enter a valid work email address.");
      return;
    }

    setLoading(true);
    try {
      // Record interest in support/inquiries queue
      await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: companyName ? `Waitlist: ${companyName}` : "Financing Waitlist Subscriber",
          email: waitlistEmail,
          subject: `Equipment Financing Early Access Waitlist: ${companyName || waitlistEmail}`,
          category: "GENERAL_INQUIRY",
          priority: "NORMAL",
          message: `Contractor/Company: ${companyName || "N/A"}\nEmail: ${waitlistEmail}\nRequested early access to Cheesco Equipment Lease-to-Own & Structured Financing.`,
        }),
      });

      setJoined(true);
      toast.success("You're on the early access list! We'll notify you as soon as financing opens.");
    } catch {
      setJoined(true);
      toast.success("Thank you for your interest! We'll notify you as soon as financing opens.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className="flex-1 pt-20">
        <div className="min-h-screen bg-canvas text-ink">
          {/* Hero Section */}
          <section className="relative overflow-hidden border-b border-line-soft bg-[#0B0F19] py-24 sm:py-32 text-white">
            <div className="absolute inset-0 bg-radial-[circle_at_top_right] from-cheesco-yellow/15 via-transparent to-transparent pointer-events-none" />
            
            <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center relative z-10">
              {/* Coming Soon Pill */}
              <div className="inline-flex items-center gap-2 rounded-full border border-cheesco-yellow/40 bg-cheesco-yellow/10 px-4 py-1.5 text-xs font-black tracking-widest text-cheesco-yellow mb-6 uppercase">
                <span className="h-2 w-2 rounded-full bg-cheesco-yellow animate-ping" />
                Coming Soon · Q2 2027
              </div>

              <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-tight max-w-4xl mx-auto">
                Structured Heavy Equipment <br />
                <span className="text-cheesco-yellow">Financing &amp; Lease-to-Own</span>
              </h1>

              <p className="mt-6 text-base sm:text-xl text-zinc-300 leading-relaxed max-w-2xl mx-auto">
                We are partnering with leading infrastructure development financiers to bring flexible equipment leasing, low-equity asset acquisition, and project-backed capital solutions to Nigerian contractors.
              </p>

              {/* Waitlist Box */}
              <div className="mt-12 max-w-lg mx-auto">
                {joined ? (
                  <div className="rounded-2xl border border-green-500/40 bg-green-500/10 p-6 text-center backdrop-blur-md">
                    <div className="text-3xl mb-2">🎉</div>
                    <h2 className="text-lg font-bold text-white">You're on the Priority List</h2>
                    <p className="mt-1 text-xs text-zinc-300">
                      We'll reach out to <strong>{waitlistEmail}</strong> with early access rates and pilot leasing opportunities.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleWaitlistSubmit} className="space-y-3">
                    <div className="flex flex-col sm:flex-row gap-3">
                      <input
                        type="text"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="Company / Contractor Name"
                        className="flex-1 rounded-xl border border-zinc-700 bg-zinc-900/80 px-4 py-3 text-sm text-white placeholder-zinc-500 focus:border-cheesco-yellow focus:outline-none"
                      />
                      <input
                        type="email"
                        required
                        value={waitlistEmail}
                        onChange={(e) => setWaitlistEmail(e.target.value)}
                        placeholder="Work Email"
                        className="flex-1 rounded-xl border border-zinc-700 bg-zinc-900/80 px-4 py-3 text-sm text-white placeholder-zinc-500 focus:border-cheesco-yellow focus:outline-none"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full rounded-xl bg-cheesco-yellow px-6 py-3.5 text-sm font-black text-[#0A0D14] hover:bg-cheesco-yellow-bright transition-all shadow-lg shadow-cheesco-yellow/20 disabled:opacity-60 cursor-pointer"
                    >
                      {loading ? "Joining..." : "Get Notified at Launch →"}
                    </button>
                    <p className="text-[11px] text-zinc-500 text-center">
                      Zero spam. Exclusively notified when commercial facilities go live.
                    </p>
                  </form>
                )}
              </div>
            </div>
          </section>

          {/* Planned Features Preview */}
          <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-2xl sm:text-4xl font-black text-ink">
                Equipment Capital Designed for Civil Works
              </h2>
              <p className="mt-3 text-sm text-ink-muted leading-relaxed">
                Traditional commercial banks demand 100%+ collateral and rigid monthly debt service. Cheesco Financing is structured around project mobilization curves and milestones.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  icon: "🏗️",
                  title: "Lease-to-Own Facilities",
                  desc: "Convert rental hours into ownership equity. Up to 60% of paid rental invoices can be credited toward machine purchase at lease expiration.",
                },
                {
                  icon: "📊",
                  title: "Milestone-Backed Repayments",
                  desc: "Align equipment repayments with your government or EPC milestone certificate disbursements, eliminating cashflow mismatches during project mobilization.",
                },
                {
                  icon: "🛡️",
                  title: "Fleet Modernization Loans",
                  desc: "Upgrade legacy excavators and lowbeds to Tier-3 fuel-efficient machinery. Trade in older machines for verified marketplace listings with low equity contribution.",
                },
              ].map((feat, i) => (
                <div
                  key={i}
                  className="card-surface rounded-2xl p-8 border border-line-soft shadow-sm hover:border-cheesco-yellow/40 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="text-3xl mb-4 p-3 w-fit rounded-xl bg-cheesco-yellow/10 border border-cheesco-yellow/20">
                      {feat.icon}
                    </div>
                    <h3 className="text-base font-bold text-ink">{feat.title}</h3>
                    <p className="mt-2 text-xs text-ink-muted leading-relaxed">{feat.desc}</p>
                  </div>
                  <div className="mt-6 pt-4 border-t border-line-soft flex items-center justify-between text-xs font-semibold text-cheesco-yellow">
                    <span>Pilot Phase</span>
                    <span>Q2 2027</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Sourcing CTA */}
          <section className="border-t border-line-soft bg-canvas-deep py-16">
            <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center">
              <h2 className="text-2xl font-bold text-ink">Need Machinery on Site Right Now?</h2>
              <p className="mt-2 text-xs text-ink-muted max-w-xl mx-auto">
                While structured lease facilities prepare for roll-out, our instant managed rental fleet and outright sales marketplace are fully active across all 36 Nigerian states.
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
                <Link
                  href="/browse"
                  className="rounded-xl bg-cheesco-yellow px-6 py-3 text-xs font-bold text-[#0A0D14] hover:bg-cheesco-yellow-bright transition shadow"
                >
                  Browse Available Rentals
                </Link>
                <Link
                  href="/contact"
                  className="rounded-xl border border-line-soft bg-card px-6 py-3 text-xs font-bold text-ink hover:border-cheesco-yellow/40 transition"
                >
                  Speak with Procurement Officer
                </Link>
              </div>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
