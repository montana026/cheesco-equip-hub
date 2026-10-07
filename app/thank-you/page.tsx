import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Thank You — Request Received",
  description:
    "Your equipment request has been submitted. The Cheesco operations team will respond within 2 hours.",
};

const NEXT_STEPS = [
  {
    step: "01",
    icon: "🔍",
    title: "Equipment Verification",
    desc: "We confirm the machine is available, in condition, and the merchant is active.",
  },
  {
    step: "02",
    icon: "💰",
    title: "Quotation Prepared",
    desc: "Our team builds a detailed quote — rental, transport, operator (if needed), and deposit.",
  },
  {
    step: "03",
    icon: "✍️",
    title: "Review & Accept",
    desc: "You review the quote inside your dashboard and accept or request a revision.",
  },
  {
    step: "04",
    icon: "🚚",
    title: "Logistics & Delivery",
    desc: "Once payment is confirmed, Cheesco coordinates transport to your project site.",
  },
];

export default function ThankYouPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-canvas">
        {/* ── Hero ─────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden px-4 pb-16 pt-32 sm:px-6">
          <div className="pointer-events-none absolute -top-40 left-1/2 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-cheesco-yellow/6 blur-[120px]" />
          <div className="relative mx-auto max-w-2xl text-center">
            {/* animated checkmark ring */}
            <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full border-4 border-cheesco-yellow/30 bg-cheesco-yellow/10">
              <span className="text-4xl">✓</span>
            </div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cheesco-yellow/30 bg-cheesco-yellow/10 px-4 py-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-cheesco-yellow" />
              <span className="text-xs font-black tracking-widest text-cheesco-yellow">
                REQUEST RECEIVED
              </span>
            </div>
            <h1 className="mt-4 text-5xl font-black leading-tight sm:text-6xl">
              You&apos;re in the{" "}
              <span className="text-cheesco-yellow">queue!</span>
            </h1>
            <p className="mx-auto mt-5 max-w-lg text-lg text-ink-muted">
              Our operations desk has your request and will respond with a
              detailed quotation{" "}
              <strong className="text-ink">within 2 hours</strong>.
            </p>

            <div className="mt-8 flex justify-center gap-4">
              <Link
                href="/dashboard/customer"
                className="rounded-lg bg-cheesco-yellow px-8 py-3 font-bold text-canvas transition hover:bg-cheesco-yellow-bright"
              >
                View My Dashboard →
              </Link>
              <Link
                href="/browse"
                className="rounded-lg border border-line-soft bg-card px-8 py-3 font-bold text-ink-muted transition hover:text-ink"
              >
                Browse More
              </Link>
            </div>
          </div>
        </section>

        {/* ── What happens next ────────────────────────────────────── */}
        <section className="border-y border-line-soft bg-card-raised px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-5xl">
            <p className="mb-10 text-center text-xs font-black uppercase tracking-widest text-cheesco-yellow">
              What happens next
            </p>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {NEXT_STEPS.map((s) => (
                <div
                  key={s.step}
                  className="rounded-xl border border-line-soft bg-canvas p-6"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cheesco-yellow/10 text-xl">
                      {s.icon}
                    </div>
                    <span className="text-xs font-black text-cheesco-yellow">
                      STEP {s.step}
                    </span>
                  </div>
                  <h3 className="mb-2 font-bold">{s.title}</h3>
                  <p className="text-sm leading-relaxed text-ink-muted">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Bottom nudge ─────────────────────────────────────────── */}
        <section className="px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-xl text-center">
            <p className="text-sm text-ink-muted">
              Have an urgent sourcing need?{" "}
              <Link href="/contact" className="font-bold text-cheesco-yellow hover:underline">
                Call us directly
              </Link>{" "}
              — we answer within the hour.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
