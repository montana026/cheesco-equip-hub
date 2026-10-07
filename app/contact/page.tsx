"use client";

import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { useState } from "react";

const CONTACT_INFO = [
  {
    icon: "📍",
    title: "Headquarters",
    lines: ["123 Industrial Avenue", "Victoria Island, Lagos", "Nigeria"],
  },
  {
    icon: "📞",
    title: "Phone",
    lines: ["+234 (0) 800 CHEESCO", "Mon – Fri, 8 am – 6 pm WAT"],
  },
  {
    icon: "✉️",
    title: "Email",
    lines: ["support@cheesco.ng", "sales@cheesco.ng"],
  },
  {
    icon: "⏱️",
    title: "Response Time Promise",
    lines: ["Under 2 hours on business days", "24 / 7 for active rentals"],
  },
];

export default function ContactPage() {
  const [sent, setSent] = useState(false);

  return (
    <>
      <Navbar />
      <main>
        {/* ── Hero ─────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden bg-canvas px-4 pb-20 pt-32 sm:px-6">
          <div className="pointer-events-none absolute -top-40 left-1/2 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-cheesco-yellow/5 blur-[120px]" />
          <div className="relative mx-auto max-w-3xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cheesco-yellow/30 bg-cheesco-yellow/10 px-4 py-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-cheesco-yellow" />
              <span className="text-xs font-black tracking-widest text-cheesco-yellow">
                GET IN TOUCH
              </span>
            </div>
            <h1 className="mt-4 text-5xl font-black leading-tight sm:text-6xl">
              We&apos;re here{" "}
              <span className="text-cheesco-yellow">to help.</span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-lg text-ink-muted">
              Whether you need to rent equipment, list your fleet, or just have a question—our operations team responds in under 2 hours.
            </p>
          </div>
        </section>

        {/* ── Main grid ────────────────────────────────────────────── */}
        <section className="bg-canvas px-4 pb-28 sm:px-6">
          <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1fr_1.1fr]">

            {/* LEFT — contact cards + map */}
            <div className="space-y-4">
              {CONTACT_INFO.map((c) => (
                <div
                  key={c.title}
                  className="flex items-start gap-4 rounded-xl border border-line-soft bg-card p-6 transition hover:border-cheesco-yellow/40"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-cheesco-yellow/10 text-xl">
                    {c.icon}
                  </div>
                  <div>
                    <div className="text-xs font-black uppercase tracking-widest text-cheesco-yellow">
                      {c.title}
                    </div>
                    {c.lines.map((l) => (
                      <p key={l} className="mt-0.5 text-sm text-ink-muted">{l}</p>
                    ))}
                  </div>
                </div>
              ))}

              {/* Map */}
              <div className="relative overflow-hidden rounded-xl border border-line-soft" style={{ height: 280 }}>
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d15854.755698024936!2d3.4234789!3d6.4281254!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x103bf53dab5d4a7f%3A0x4f3e7d73e72e4fc9!2sVictoria%20Island%2C%20Lagos!5e0!3m2!1sen!2sng!4v1714123456789!5m2!1sen!2sng"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen={false}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="absolute inset-0 opacity-70 grayscale"
                />
                {/* overlay badge */}
                <div className="absolute bottom-4 left-4 rounded-lg border border-line-soft bg-canvas/90 px-4 py-2 backdrop-blur-md">
                  <p className="text-xs font-bold">Victoria Island, Lagos</p>
                  <p className="text-[10px] text-ink-muted">Cheesco HQ</p>
                </div>
              </div>
            </div>

            {/* RIGHT — contact form */}
            {sent ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-cheesco-yellow/30 bg-cheesco-yellow/5 p-12 text-center">
                <div className="text-6xl">🎉</div>
                <h2 className="mt-6 text-3xl font-black">Message sent!</h2>
                <p className="mt-3 text-ink-muted">
                  Our team will respond within 2 hours on business days. Check your inbox.
                </p>
              </div>
            ) : (
              <form
                onSubmit={(e) => { e.preventDefault(); setSent(true); }}
                className="rounded-2xl border border-line-soft bg-card p-8 md:p-10"
              >
                {/* top accent */}
                <div className="hazard-bar mb-8 h-1 w-16 rounded-full" />
                <h2 className="text-2xl font-black">Send us a message</h2>
                <p className="mt-1 text-sm text-ink-muted">
                  Fill in the form and we'll get back to you shortly.
                </p>

                <div className="mt-8 space-y-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-ink-faint">
                        Full Name
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Chukwuemeka Obi"
                        className="auth-input"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-ink-faint">
                        Company
                      </label>
                      <input
                        type="text"
                        placeholder="Your company name"
                        className="auth-input"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-ink-faint">
                      Email
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="you@company.com"
                      className="auth-input"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-ink-faint">
                      Phone
                    </label>
                    <input
                      type="tel"
                      placeholder="+234 800 000 0000"
                      className="auth-input"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-ink-faint">
                      What do you need?
                    </label>
                    <select className="auth-input">
                      <option value="">Select a topic…</option>
                      <option>I want to rent equipment</option>
                      <option>I want to list my equipment</option>
                      <option>I have a sourcing request</option>
                      <option>General enquiry</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-ink-faint">
                      Message
                    </label>
                    <textarea
                      required
                      rows={5}
                      placeholder="Tell us more about your project, equipment type, timeline, and location…"
                      className="auth-input !h-auto resize-none py-3 leading-relaxed"
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn-primary w-full py-4 text-base"
                  >
                    Send Message →
                  </button>

                  <p className="text-center text-xs text-ink-faint">
                    By sending this form you agree to our{" "}
                    <a href="/privacy" className="text-cheesco-yellow underline">
                      Privacy Policy
                    </a>
                    .
                  </p>
                </div>
              </form>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
