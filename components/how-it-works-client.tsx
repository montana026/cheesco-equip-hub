'use client';

import { useState } from 'react';
import Link from 'next/link';

export function HowItWorksClient() {
  const [activeTab, setActiveTab] = useState<'rental' | 'purchase'>('rental');

  const rentalSteps = [
    {
      step: '01',
      title: 'Find Your Equipment',
      description:
        'Browse our marketplace of verified heavy machinery. Filter by category, location, daily rate, and availability.',
      icon: '🔍',
    },
    {
      step: '02',
      title: 'Submit Rental Request',
      description:
        'Specify your required duration (1-day, 2-day quick presets or custom days), scope of work/nature of job, max load tonnage, and project site location.',
      icon: '📝',
    },
    {
      step: '03',
      title: 'Cheesco Verifies Availability',
      description:
        'Our operations team checks machine readiness, inspects service logs, and coordinates with verified fleet operators.',
      icon: '✓',
    },
    {
      step: '04',
      title: 'Receive Official Quotation',
      description:
        'Receive an itemized commercial quotation including equipment rental rates, logistics mobilization, and statutory 7.5% VAT (zero security deposit).',
      icon: '💰',
    },
    {
      step: '05',
      title: 'Review & Sign Agreement',
      description:
        'Confirm scope of work, operating conditions, and execute the digital rental agreement online.',
      icon: '✍️',
    },
    {
      step: '06',
      title: 'Secured Escrow Payment',
      description:
        'Fund your booking safely via Cheesco Escrow. Payments are verified instantly with bank-grade security.',
      icon: '💳',
    },
    {
      step: '07',
      title: 'Pre-Delivery Inspection',
      description:
        'A comprehensive checklist is completed to document machine hours, fluid levels, and physical condition before departure.',
      icon: '📋',
    },
    {
      step: '08',
      title: 'Lowbed Logistics Delivery',
      description:
        'Cheesco heavy haulage mobilizes the equipment to your project site. Operator conducts initial functional test.',
      icon: '🚚',
    },
    {
      step: '09',
      title: 'Delivery Confirmed & Active Rental',
      description:
        'Site manager signs electronic delivery receipt. Rental timer begins with 24/7 technical breakdown support.',
      icon: '📍',
    },
    {
      step: '10',
      title: 'Demobilization & Post-Rental Check',
      description:
        'At the end of the lease, the machine is inspected against pre-rental logs and demobilized via lowbed.',
      icon: '🔧',
    },
  ];

  const purchaseSteps = [
    {
      step: '01',
      title: 'Browse Available Machinery for Sale',
      description:
        'Filter by outright sale listings. Inspect machine specs, manufacture year, operating hours, and current yard location.',
      icon: '🚜',
    },
    {
      step: '02',
      title: 'Submit Purchase Request',
      description:
        'Specify destination yard, operating industry, preferred physical inspection schedule, buyer CAC company details, and payment preference.',
      icon: '📑',
    },
    {
      step: '03',
      title: 'Title, Customs & Ownership Audit',
      description:
        'Cheesco conducts rigorous title verification: Customs Single Goods Declaration (SGD), original import documents, engine/chassis serial audit, and non-encumbrance check.',
      icon: '🛡️',
    },
    {
      step: '04',
      title: 'Physical Technical Inspection',
      description:
        'Conduct an on-site physical inspection with your engineer or request a certified Cheesco 50-point diagnostic mechanical report before payment.',
      icon: '🔬',
    },
    {
      step: '05',
      title: 'Proforma Invoice & Sales Contract',
      description:
        'Receive an official Cheesco Proforma Invoice with agreed asset valuation, title transfer legal fees, logistics (if requested), and applicable VAT.',
      icon: '📄',
    },
    {
      step: '06',
      title: 'Deposit into Cheesco Secured Escrow',
      description:
        'Buyer deposits purchase funds into Cheesco Secured Escrow. Funds are protected and never released to the seller until ownership handover is complete.',
      icon: '🔒',
    },
    {
      step: '07',
      title: 'Legal Title Transfer & Documentation',
      description:
        'Notarized Deed of Legal Transfer, original Customs SGD papers, manufacturer logbooks, and Bill of Sale are formally executed and handed over.',
      icon: '📜',
    },
    {
      step: '08',
      title: 'Heavy Haulage Delivery & Final Sign-Off',
      description:
        'Equipment is mobilized via heavy lowbed to your facility. Buyer inspects serial numbers and executes final acceptance, releasing escrow funds to the seller.',
      icon: '🤝',
    },
  ];

  const rentalFaqs = [
    {
      q: 'Can I rent equipment for just 1 or 2 days?',
      a: 'Yes! Cheesco supports flexible short-term leases starting from single-day (1 day) and 2-day jobs up to multi-month construction contracts.',
    },
    {
      q: 'Why is there no security deposit charged?',
      a: 'Cheesco has removed security deposits for verified corporate clients to keep mobilization costs affordable. Standard operational terms apply.',
    },
    {
      q: 'What is included in the quotation?',
      a: 'Quotations include equipment rental rates, lowbed logistics mobilization/demobilization, and statutory 7.5% VAT. Fueling, operator accommodation, and site community charges remain client responsibility.',
    },
  ];

  const purchaseFaqs = [
    {
      q: 'How does Cheesco protect equipment buyers?',
      a: 'Every purchase is backed by Cheesco Escrow. Your funds are held securely and are never disbursed to the merchant until title documents (Customs SGD, Bill of Sale) and physical machine handover are verified.',
    },
    {
      q: 'Can I inspect the equipment before making payment?',
      a: 'Absolutely. You can schedule an on-site physical inspection with your mechanical engineers, or request an official Cheesco 50-point mechanical diagnostic audit.',
    },
    {
      q: 'What documentation is provided upon purchase?',
      a: 'You receive original Customs Single Goods Declaration (SGD) clearance documents, Proof of Ownership / Deed of Legal Transfer, Manufacturer Technical Logbooks, and an official Cheesco Bill of Sale.',
    },
    {
      q: 'Does Cheesco assist with delivery of purchased machinery?',
      a: 'Yes, Cheesco coordinates certified lowbed and flatbed heavy haulage to transport the machine directly to your yard anywhere in Nigeria.',
    },
  ];

  const currentSteps = activeTab === 'rental' ? rentalSteps : purchaseSteps;
  const currentFaqs = activeTab === 'rental' ? rentalFaqs : purchaseFaqs;

  return (
    <div className="space-y-16">
      {/* Tab Switcher */}
      <div className="flex justify-center">
        <div className="inline-flex rounded-2xl bg-card p-1.5 ring-1 ring-line-soft shadow-md">
          <button
            type="button"
            onClick={() => setActiveTab('rental')}
            className={`flex items-center gap-2 rounded-xl px-6 py-3 text-xs sm:text-sm font-black transition-all ${
              activeTab === 'rental'
                ? 'bg-cheesco-yellow text-[#0A0D14] shadow-sm'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            <span>🚜</span>
            <span>Renting Equipment (The Rental Workflow)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('purchase')}
            className={`flex items-center gap-2 rounded-xl px-6 py-3 text-xs sm:text-sm font-black transition-all ${
              activeTab === 'purchase'
                ? 'bg-cheesco-yellow text-[#0A0D14] shadow-sm'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            <span>🤝</span>
            <span>Buying Equipment (The Purchase Workflow)</span>
          </button>
        </div>
      </div>

      {/* Overview Banner */}
      <div className="rounded-2xl border border-line-soft bg-card-surface p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-cheesco-yellow">
              {activeTab === 'rental' ? 'Leasing & Rental Process' : 'Outright Asset Acquisition'}
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-ink mt-1">
              {activeTab === 'rental'
                ? 'How to Rent Heavy Equipment with Cheesco'
                : 'How to Buy Heavy Machinery with Cheesco Escrow'}
            </h2>
            <p className="text-xs sm:text-sm text-ink-muted mt-1 max-w-2xl">
              {activeTab === 'rental'
                ? 'From quick 1-day hires to multi-month construction projects, Cheesco manages verification, quotations, and lowbed logistics.'
                : 'Purchase verified fleet machinery with guaranteed title clearance, on-site mechanical inspections, and 100% escrow buyer protection.'}
            </p>
          </div>
          <Link
            href={`/browse?listing=${activeTab === 'rental' ? 'FOR_RENT' : 'FOR_SALE'}`}
            className="shrink-0 rounded-xl bg-cheesco-yellow px-5 py-2.5 text-xs font-black text-[#0A0D14] hover:bg-cheesco-yellow-bright transition-all"
          >
            {activeTab === 'rental' ? 'Browse Rental Fleet →' : 'Browse Equipment for Sale →'}
          </Link>
        </div>
      </div>

      {/* Steps List */}
      <div className="space-y-6">
        {currentSteps.map((item) => (
          <div
            key={item.step}
            className="card-surface rounded-2xl p-6 sm:p-7 flex flex-col md:flex-row gap-5 border border-line-soft hover:border-cheesco-yellow/40 transition-all"
          >
            <div className="flex-shrink-0">
              <div className="w-14 h-14 rounded-xl bg-cheesco-yellow/15 text-cheesco-yellow border border-cheesco-yellow/30 flex items-center justify-center text-2xl">
                {item.icon}
              </div>
            </div>
            <div className="flex-grow">
              <div className="flex items-center gap-3 mb-1.5">
                <span className="text-xs font-black text-cheesco-yellow bg-card px-2 py-0.5 rounded-md border border-line-soft">
                  Step {item.step}
                </span>
                <h3 className="text-base sm:text-lg font-black text-ink">{item.title}</h3>
              </div>
              <p className="text-xs sm:text-sm text-ink-muted leading-relaxed">{item.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* FAQs */}
      <div className="pt-8">
        <h2 className="text-2xl font-black text-ink text-center mb-8">
          Frequently Asked Questions ({activeTab === 'rental' ? 'Rentals' : 'Purchases'})
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {currentFaqs.map((faq, i) => (
            <div key={i} className="card-surface rounded-2xl p-6 border border-line-soft">
              <h3 className="font-bold text-sm text-ink mb-2">{faq.q}</h3>
              <p className="text-xs text-ink-muted leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
