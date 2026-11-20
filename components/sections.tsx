"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { CATEGORY_META } from "@/lib/seed-ui";

export function TrustBar() {
  const items = [
    "Cheesco-Verified Merchants",
    "Deposit Held in Escrow",
    "Pre-Delivery Inspection",
    "Post-Rental Settlement",
  ];
  return (
    <div className="border-y border-line-soft bg-canvas-deep">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-10 gap-y-2 px-4 py-3 sm:px-6">
        {items.map((t) => (
          <span key={t} className="flex items-center gap-2 text-xs font-semibold tracking-wide text-ink-muted">
            <span className="text-cheesco-yellow">✓</span> {t}
          </span>
        ))}
      </div>
    </div>
  );
}

export function CategoryCards() {
 const cats = [
  { name: "Excavators", icon: "🚜", image: "/images/categories/excavators.jpg" },
  { name: "Cranes", icon: "🏗️", image: "/images/categories/cranes.jpg" },
  { name: "Trucks", icon: "🚛", image: "/images/categories/trucks.jpg" },
  { name: "Bulldozers", icon: "🚜", image: "/images/categories/bulldozers.jpg" },
  { name: "Loaders", icon: "🚜", image: "/images/categories/loaders.jpg" },
  { name: "Generators", icon: "⚡", image: "/images/categories/generators.jpg" },
  { name: "Lowbeds", icon: "🚛", image: "/images/categories/lowbeds.jpg" },
  { name: "Forklifts", icon: "🏗️", image: "/images/categories/forklifts.jpg" },
];

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black tracking-tight text-ink sm:text-2xl">
          Popular Categories
        </h2>
        <Link
          href="/browse"
          className="text-xs font-bold text-cheesco-yellow hover:underline flex items-center gap-1"
        >
          <span>View All</span>
          <span>&gt;</span>
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        {cats.map((cat, i) => (
          <motion.div
            key={cat.name}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.04, duration: 0.4 }}
          >
            <Link
              href={`/browse?category=${encodeURIComponent(cat.name)}`}
              className="card-surface group flex flex-col items-center rounded-2xl p-3 text-center transition-all hover:-translate-y-1 hover:border-cheesco-yellow/50 hover:shadow-lg"
            >
              <div className="flex h-14 w-full items-center justify-center overflow-hidden rounded-xl bg-canvas-deep p-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={cat.image}
                  alt={cat.name}
                  className="h-full w-full object-cover rounded-lg transition-transform duration-300 group-hover:scale-110"
                />
              </div>
              <div className="mt-2 text-xs font-bold text-ink group-hover:text-cheesco-yellow truncate w-full">
                {cat.name}
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}



/**
 * The Equipment Workflow (Managed by Cheesco)
 * Supports both Rental Workflow (7 Steps) and Outright Purchase Workflow (6 Steps).
 */
export function HowItWorks() {
  const [activeWorkflow, setActiveWorkflow] = useState<"rental" | "purchase">("rental");

  const rentalSteps = [
    {
      num: 1,
      title: "1. Customer Requests",
      desc: "Select rental duration (1-day, 2-day or monthly), scope of work, and project location.",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
    },
    {
      num: 2,
      title: "2. Cheesco Verifies",
      desc: "We confirm equipment availability, merchant credentials, and mechanical readiness.",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
    },
    {
      num: 3,
      title: "3. Quotation & VAT",
      desc: "Receive an itemized quote with transparent rates, logistics, and statutory 7.5% VAT.",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      num: 4,
      title: "4. Customer Confirms",
      desc: "Review terms, scope of work, and confirm the digital rental agreement.",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ),
    },
    {
      num: 5,
      title: "5. Escrow Payment",
      desc: "Fund your rental securely via Cheesco Escrow. Payments are verified instantly.",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      ),
    },
    {
      num: 6,
      title: "6. Lowbed Delivery",
      desc: "Heavy haulage logistics mobilizes equipment to your project site with pre-delivery check.",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      num: 7,
      title: "7. Active Rental",
      desc: "Execute your project with 24/7 technical backup until demobilization.",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
  ];

  const purchaseSteps = [
    {
      num: 1,
      title: "1. Purchase Request",
      desc: "Select machinery, define destination yard, inspection schedule & payment preference.",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      ),
    },
    {
      num: 2,
      title: "2. Title & SGD Audit",
      desc: "Cheesco audits Customs Single Goods Declaration (SGD), bill of sale & ownership history.",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
    },
    {
      num: 3,
      title: "3. Physical Inspection",
      desc: "You or certified engineers conduct on-site mechanical inspection and diagnostic tests.",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      ),
    },
    {
      num: 4,
      title: "4. Proforma & Escrow",
      desc: "Receive official Proforma Invoice. Buyer deposits purchase funds into Cheesco Secured Escrow.",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      ),
    },
    {
      num: 5,
      title: "5. Legal Title Transfer",
      desc: "Original customs papers, deed of legal transfer, and logbooks are officially endorsed to buyer.",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      num: 6,
      title: "6. Yard Handover",
      desc: "Heavy haulage delivers machinery to your facility. Final handover sign-off releases escrow funds.",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ),
    },
  ];

  const steps = activeWorkflow === "rental" ? rentalSteps : purchaseSteps;

  return (
    <section className="border-y border-line-soft bg-canvas-deep/80 py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-2xl font-black tracking-tight text-ink sm:text-3xl">
            How Cheesco Works
          </h2>
          <p className="mt-2 text-sm text-ink-muted">
            Whether leasing heavy machinery or acquiring permanent fleet assets, our process is managed and escrow-secured.
          </p>

          {/* Workflow Mode Selector */}
          <div className="mt-6 inline-flex rounded-xl bg-card p-1 ring-1 ring-line-soft">
            <button
              type="button"
              onClick={() => setActiveWorkflow("rental")}
              className={`rounded-lg px-4 py-2 text-xs font-bold transition-all ${
                activeWorkflow === "rental"
                  ? "bg-cheesco-yellow text-[#0A0D14] shadow-sm"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              🚜 Equipment Rental Workflow (7 Steps)
            </button>
            <button
              type="button"
              onClick={() => setActiveWorkflow("purchase")}
              className={`rounded-lg px-4 py-2 text-xs font-bold transition-all ${
                activeWorkflow === "purchase"
                  ? "bg-cheesco-yellow text-[#0A0D14] shadow-sm"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              🤝 Outright Purchase Workflow (6 Steps)
            </button>
          </div>
        </div>

        {/* Connected Workflow Process */}
        <div
          className={`mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 ${
            activeWorkflow === "rental" ? "lg:grid-cols-7" : "lg:grid-cols-6"
          }`}
        >
          {steps.map((s, idx) => (
            <motion.div
              key={`${activeWorkflow}-${s.num}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.06, duration: 0.4 }}
              className="relative flex flex-col items-center text-center"
            >
              {/* Connector line on desktop */}
              {idx < steps.length - 1 && (
                <div className="hidden lg:block absolute left-1/2 top-6 h-0.5 w-full -translate-y-1/2 border-t-2 border-dashed border-cheesco-yellow/40 z-0" />
              )}

              {/* Step Circle Node */}
              <div className="relative z-10 flex h-13 w-13 items-center justify-center rounded-full bg-cheesco-yellow text-[#0A0D14] shadow-lg ring-4 ring-canvas transition-transform hover:scale-110">
                {s.icon}
              </div>

              {/* Title */}
              <h3 className="mt-4 text-xs font-black text-ink">
                {s.title}
              </h3>

              {/* Description */}
              <p className="mt-1.5 text-[11px] text-ink-muted leading-relaxed">
                {s.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

const TESTIMONIALS = [
  {
    quote: "Cheesco sourced a 90-ton crane in 48 hours, handled the lowbed and inspection. We just signed and built.",
    name: "Engr. Adebayo O.", role: "Project Director, civil works",
  },
  {
    quote: "Our idle fleet now earns. The sponsored slot paid for itself in the first week of enquiries.",
    name: "Femi A.", role: "Fleet Owner, Port Harcourt",
  },
  {
    quote: "Deposit disputes used to kill rentals. Now the inspection record settles everything in hours.",
    name: "Chidinma E.", role: "Site Manager, Abuja",
  },
];

export function Testimonials() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      <SectionHeading eyebrow="Trusted On Site" title="What the industry says" />
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {TESTIMONIALS.map((t) => (
          <figure key={t.name} className="card-surface rounded-xl p-6">
            <div className="text-cheesco-yellow">★★★★★</div>
            <blockquote className="mt-3 text-sm leading-relaxed text-ink">
              “{t.quote}”
            </blockquote>
            <figcaption className="mt-4 text-sm">
              <div className="font-bold">{t.name}</div>
              <div className="text-ink-faint">{t.role}</div>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

export function SectorCoverage() {
  const sectors = [
    "Oil & Gas", "Construction", "Power & Energy", "Mining",
    "Logistics & Haulage", "Manufacturing", "Ports & Marine", "Agriculture",
  ];
  return (
    <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
      <SectionHeading eyebrow="Industrial Reach" title="Sectors we keep moving" />
      <div className="mt-6 flex flex-wrap gap-2">
        {sectors.map((s) => (
          <span
            key={s}
            className="rounded-full border border-line bg-card px-4 py-2 text-sm font-semibold text-ink-muted"
          >
            {s}
          </span>
        ))}
      </div>
    </section>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  sub,
}: {
  eyebrow: string;
  title: string;
  sub?: string;
}) {
  return (
    <div className="max-w-2xl">
      <div className="text-xs font-black tracking-[0.3em] text-cheesco-yellow">
        {eyebrow.toUpperCase()}
      </div>
      <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">{title}</h2>
      {sub && <p className="mt-3 text-sm text-ink-muted">{sub}</p>}
    </div>
  );
}
