import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Case Studies",
  description:
    "See how contractors and merchants across Nigeria scaled operations with Cheesco Equip Hub's managed equipment marketplace.",
};

const STUDIES = [
  {
    icon: "🏗️",
    tag: "Construction",
    client: "Delta Plant Rentals",
    headline: "40% lift in fleet utilization in 90 days",
    story:
      "Delta Plant Rentals had idle excavators depreciating on their yard during off-peak seasons. Listing on Cheesco connected them to nationwide contractors overnight. With escrow-backed payments and Cheesco-managed logistics, they took on clients they'd previously turned away—too risky, too far. In three months their average utilization jumped from 52% to 73%.",
    stats: [
      { value: "40%", label: "Utilization increase" },
      { value: "₦18M", label: "Additional revenue" },
      { value: "90", label: "Days to result" },
    ],
    quote: '\u201cCheesco removed the risk. I list, they verify, they collect\u2014I just show up with the machine.\u201d',
    person: "— Emmanuel O., Managing Director, Delta Plant Rentals",
  },
  {
    icon: "🚧",
    tag: "Infrastructure",
    client: "Lagos Metro Rail Consortium",
    headline: "15 cranes sourced and on-site in under 48 hours",
    story:
      "When the original lifting contractor pulled out mid-project, the Consortium faced a \u20a6400M daily delay penalty. Their procurement team contacted Cheesco at 11pm. By 7am the next morning, four verified crane merchants had been matched. All 15 units were inspected, insured, and delivered to the Apapa worksite by hour 43. The project resumed without a single penalty.",
    stats: [
      { value: "48h", label: "Sourcing window" },
      { value: "15", label: "Cranes deployed" },
      { value: "\u20a60", label: "Penalty incurred" },
    ],
    quote:
      '\u201cWe\u2019ve used procurement platforms before. None of them answer at midnight and deliver by morning.\u201d',
    person: "— Fatima A., Head of Procurement, LMR Consortium",
  },
  {
    icon: "📋",
    tag: "Civil Works",
    client: "Abuja Civil Works Ltd",
    headline: "Zero equipment-condition disputes across 22 rentals",
    story:
      "Before Cheesco, Abuja Civil Works spent an average of six weeks and \u20a62M in legal fees resolving each end-of-rental condition dispute. Cheesco\u2019s mandatory pre- and post-rental photographic inspections, reviewed by a neutral Cheesco operations officer, eliminated the ambiguity entirely. 22 rentals later\u2014zero disputes, zero legal fees.",
    stats: [
      { value: "22", label: "Rentals completed" },
      { value: "0", label: "Disputes raised" },
      { value: "\u20a644M", label: "Legal fees saved" },
    ],
    quote:
      '\u201cThe inspection report is timestamped and co-signed. There\u2019s nothing to argue about.\u201d',
    person: "— Kingsley N., COO, Abuja Civil Works Ltd",
  },
];

export default function CaseStudiesPage() {
  return (
    <>
      <Navbar />
      <main>
        {/* ── Hero ─────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden bg-canvas px-4 pb-24 pt-32 sm:px-6">
          {/* background glow */}
          <div className="pointer-events-none absolute -top-40 left-1/2 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-cheesco-yellow/5 blur-[120px]" />
          <div className="relative mx-auto max-w-4xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cheesco-yellow/30 bg-cheesco-yellow/10 px-4 py-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-cheesco-yellow" />
              <span className="text-xs font-black tracking-widest text-cheesco-yellow">SUCCESS STORIES</span>
            </div>
            <h1 className="mt-4 text-5xl font-black leading-tight tracking-tight sm:text-6xl">
              Real results.{" "}
              <span className="text-cheesco-yellow">Real machines.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-ink-muted">
              Contractors and merchants across Nigeria are transforming how they
              move iron. Here's how they did it through Cheesco.
            </p>
          </div>
        </section>

        {/* ── Stats bar ────────────────────────────────────────────── */}
        <section className="border-y border-line-soft bg-card-raised px-4 py-10 sm:px-6">
          <div className="mx-auto grid max-w-5xl grid-cols-2 gap-8 text-center md:grid-cols-4">
            {[
              { value: "500+", label: "Verified equipment units" },
              { value: "150+", label: "Vetted merchants" },
              { value: "₦2B+", label: "Transactions facilitated" },
              { value: "<2h", label: "Average response time" },
            ].map((s) => (
              <div key={s.label}>
                <div className="text-4xl font-black text-cheesco-yellow">{s.value}</div>
                <div className="mt-1 text-sm text-ink-muted">{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Case study cards ─────────────────────────────────────── */}
        <section className="bg-canvas px-4 py-24 sm:px-6">
          <div className="mx-auto max-w-5xl space-y-16">
            {STUDIES.map((s, i) => (
              <article
                key={s.client}
                className="overflow-hidden rounded-2xl border border-line-soft bg-card"
              >
                {/* top accent bar */}
                <div className="hazard-bar h-1 w-full" />

                <div className="p-8 md:p-12">
                  {/* header row */}
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-cheesco-yellow/10 text-3xl">
                        {s.icon}
                      </div>
                      <div>
                        <div className="text-xs font-bold uppercase tracking-widest text-cheesco-yellow">
                          {s.tag}
                        </div>
                        <h2 className="text-xl font-black">{s.client}</h2>
                      </div>
                    </div>
                    <span className="rounded-full border border-line-soft bg-canvas-deep px-4 py-1.5 text-xs font-semibold text-ink-muted">
                      Case Study #{String(i + 1).padStart(2, "0")}
                    </span>
                  </div>

                  {/* headline */}
                  <h3 className="mt-6 text-2xl font-black leading-snug sm:text-3xl">
                    {s.headline}
                  </h3>

                  {/* story */}
                  <p className="mt-4 text-base leading-relaxed text-ink-muted">{s.story}</p>

                  {/* stats */}
                  <div className="mt-8 grid grid-cols-3 gap-4">
                    {s.stats.map((stat) => (
                      <div
                        key={stat.label}
                        className="rounded-xl border border-line-soft bg-canvas-deep px-4 py-5 text-center"
                      >
                        <div className="text-3xl font-black text-cheesco-yellow">
                          {stat.value}
                        </div>
                        <div className="mt-1 text-xs text-ink-muted">{stat.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* quote */}
                  <blockquote className="mt-8 rounded-xl border-l-4 border-cheesco-yellow bg-cheesco-yellow/5 px-6 py-5">
                    <p className="text-sm font-semibold italic text-ink">{s.quote}</p>
                    <footer className="mt-2 text-xs text-ink-muted">{s.person}</footer>
                  </blockquote>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* ── Bottom CTA ───────────────────────────────────────────── */}
        <section className="bg-cheesco-yellow px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-black text-canvas sm:text-4xl">
              Ready to write your own story?
            </h2>
            <p className="mt-4 text-canvas/80">
              Join Nigeria's most trusted equipment marketplace today.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
              <Link
                href="/browse"
                className="rounded-lg bg-canvas px-8 py-3 font-bold text-cheesco-yellow transition hover:bg-canvas/90"
              >
                Browse Equipment
              </Link>
              <Link
                href="/register"
                className="rounded-lg border-2 border-canvas px-8 py-3 font-bold text-canvas transition hover:bg-canvas/10"
              >
                List Your Equipment
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
