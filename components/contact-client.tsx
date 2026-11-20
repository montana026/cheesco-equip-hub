"use client";

import { useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import toast from "react-hot-toast";

const FAQS_LEFT = [
  {
    q: "How do I rent equipment on Cheesco?",
    a: "Browse our fleet, select the machine and duration, and click 'Request Rental'. Cheesco coordinates merchant confirmation, inspection, escrow deposit, and lowbed mobilization directly to your site.",
  },
  {
    q: "How do I become a verified merchant?",
    a: "Register an account, navigate to 'Verification (KYC)', and submit your CAC certificate, government identification, and company address. Our compliance officers review and verify your account within 24–48 hours.",
  },
  {
    q: "What documents do I need for verification?",
    a: "You will need your CAC Certificate of Incorporation or Business Name Registration, valid government-issued ID (NIN, Driver's License, or International Passport), and proof of business address.",
  },
  {
    q: "How does the payment process work?",
    a: "Rental payments and security deposits are held in Cheesco's secure escrow. Funds are released to the merchant only after equipment delivery, joint pre-mobilization inspection, and client sign-off.",
  },
];

const FAQS_RIGHT = [
  {
    q: "Can I cancel a rental request?",
    a: "Yes. You can cancel free of charge before quotation acceptance or dispatch confirmation. Once lowbed logistics are dispatched, mobilization fees may apply in accordance with our terms.",
  },
  {
    q: "How do I track my rental delivery?",
    a: "Every mobilized equipment order is assigned a Cheesco Logistics Coordinator. Real-time GPS status and delivery milestones are accessible directly in your Customer Dashboard.",
  },
  {
    q: "What if there is damage to the equipment?",
    a: "Every deployment includes a rigorous digital Pre-Delivery Inspection (PDI) with photos. Any post-rental discrepancies are evaluated against the initial inspection record before escrow deposit settlement.",
  },
  {
    q: "How do I contact customer support?",
    a: "Our helpdesk operates 24/7. You can reach us via WhatsApp (+234 916 272 9421), email (support@cheesco.com), phone, or submit a ticket directly through our Help Center.",
  },
];

export function ContactClient() {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
    agreed: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [activeFaq, setActiveFaq] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.agreed) {
      toast.error("Please accept the Terms of Service and Privacy Policy");
      return;
    }

    setSubmitting(true);
    try {
      // Post to support tickets API endpoint
      const res = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          subject: formData.subject || "Contact Form Inquiry",
          message: formData.message,
          category: "GENERAL_INQUIRY",
          priority: "HIGH",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to send message");
      }

      toast.success(
        `Message sent! Reference: ${data.ticketNumber ?? ""}. Our team will get back to you within 2 hours.`
      );
      setFormData({
        fullName: "",
        email: "",
        phone: "",
        subject: "",
        message: "",
        agreed: false,
      });
    } catch (err: any) {
      toast.error(err?.message || "Failed to send message. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleFaq = (key: string) => {
    setActiveFaq(activeFaq === key ? null : key);
  };

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-canvas text-ink">
        {/* ── 1. Hero Section ────────────────────────────────────────── */}
        <section className="relative min-h-[480px] sm:min-h-[520px] overflow-hidden bg-[#0A0D14] pt-24 sm:pt-28 pb-16 text-white flex items-center">
          {/* Heavy Construction Crane & Project Site Background with Sunset */}
          <div className="absolute inset-0 z-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/about/hero.jpg"
              alt="Industrial heavy equipment site with crane and engineer"
              className="h-full w-full object-cover object-center"
            />
            {/* Gradient Overlays for high contrast */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#0A0D14] via-[#0A0D14]/85 to-[#0A0D14]/40" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0A0D14] via-transparent to-[#0A0D14]/70" />
          </div>

          <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 w-full">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-xs font-semibold text-zinc-400">
              <Link href="/" className="hover:text-cheesco-yellow transition-colors">
                Home
              </Link>
              <span>›</span>
              <span className="text-zinc-200">Contact</span>
            </nav>

            <div className="mt-4 max-w-3xl">
              {/* Eyebrow */}
              <div className="flex items-center gap-2">
                <span className="h-0.5 w-6 bg-cheesco-yellow" />
                <span className="text-xs font-black uppercase tracking-widest text-cheesco-yellow">
                  GET IN TOUCH
                </span>
              </div>

              {/* Title */}
              <h1 className="mt-3 text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-tight">
                We&apos;re Here to <span className="text-cheesco-yellow">Help</span>
              </h1>

              {/* Subtext */}
              <p className="mt-4 text-xs sm:text-sm lg:text-base text-zinc-300 leading-relaxed max-w-2xl">
                Have a question, need support, or want to partner with us? Our team is ready to assist you. Reach out to us through any of the channels below and we&apos;ll get back to you as soon as possible.
              </p>

              {/* 3 Value Badges in Hero */}
              <div className="mt-8 flex flex-wrap items-center gap-3 sm:gap-4">
                {/* 1. 24/7 Support */}
                <div className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-[#0B0F19]/80 backdrop-blur-md px-4 py-3 shadow-lg">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cheesco-yellow text-[#0A0D14]">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 1.5a4.5 4.5 0 00-4.5 4.5v3a4.5 4.5 0 009 0v-3a4.5 4.5 0 00-4.5-4.5z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white leading-tight">24/7 Support</div>
                    <div className="text-[10px] text-zinc-400">We&apos;re always here to help</div>
                  </div>
                </div>

                {/* 2. Trusted Platform */}
                <div className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-[#0B0F19]/80 backdrop-blur-md px-4 py-3 shadow-lg">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cheesco-yellow text-[#0A0D14]">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white leading-tight">Trusted Platform</div>
                    <div className="text-[10px] text-zinc-400">Your safety is our priority</div>
                  </div>
                </div>

                {/* 3. Quick Response */}
                <div className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-[#0B0F19]/80 backdrop-blur-md px-4 py-3 shadow-lg">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cheesco-yellow text-[#0A0D14]">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white leading-tight">Quick Response</div>
                    <div className="text-[10px] text-zinc-400">We reply within 24 hours</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── 2. Main 3-Column Content Section ──────────────────────── */}
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 items-start">
            {/* ── LEFT: Contact Information (4 cols) ───────────────── */}
            <div className="lg:col-span-4 space-y-6">
              <div>
                <div className="flex items-center gap-2">
                  <span className="h-0.5 w-5 bg-cheesco-yellow" />
                  <span className="text-xs font-black uppercase tracking-wider text-cheesco-yellow">
                    CONTACT INFORMATION
                  </span>
                </div>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-ink">
                  Get in Touch With Us
                </h2>
                <p className="mt-2 text-xs text-ink-muted leading-relaxed">
                  We&apos;re here to answer your questions and provide the support you need. Choose the best way to reach us.
                </p>
              </div>

              {/* Contact Item Cards */}
              <div className="space-y-3.5">
                {/* 1. Phone */}
                <div className="flex items-start gap-3.5 rounded-2xl border border-line-soft bg-card p-4 transition-all hover:border-cheesco-yellow/40 hover:shadow-sm">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cheesco-yellow text-[#0A0D14] shadow-sm">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-black text-ink">Phone</div>
                    <div className="mt-0.5 text-xs font-bold text-ink">
                      <a href="tel:+2349162729421" className="hover:text-cheesco-yellow">+234 916 272 9421</a>
                      <span className="mx-1 text-ink-muted">|</span>
                      <a href="tel:+2349049591747" className="hover:text-cheesco-yellow">+234 904 959 1747</a>
                    </div>
                    <div className="text-[11px] text-ink-muted mt-0.5">Mon – Fri: 8:00 AM – 6:00 PM (WAT)</div>
                  </div>
                </div>

                {/* 2. Email */}
                <div className="flex items-start gap-3.5 rounded-2xl border border-line-soft bg-card p-4 transition-all hover:border-cheesco-yellow/40 hover:shadow-sm">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cheesco-yellow text-[#0A0D14] shadow-sm">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-black text-ink">Email</div>
                    <div className="mt-0.5 text-xs font-bold text-ink">
                      <a href="mailto:support@cheesco.com" className="hover:text-cheesco-yellow">support@cheesco.com</a>
                    </div>
                    <div className="text-[11px] text-ink-muted mt-0.5">We reply within 24 hours</div>
                  </div>
                </div>

                {/* 3. WhatsApp */}
                <div className="flex items-start gap-3.5 rounded-2xl border border-line-soft bg-card p-4 transition-all hover:border-cheesco-yellow/40 hover:shadow-sm">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cheesco-yellow text-[#0A0D14] shadow-sm">
                    <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                      <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.149.929 3.182 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.771-5.768-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.633.064-1.745-.395-1.392-.577-2.3-1.977-2.368-2.068-.07-.091-.564-.75-.564-1.429 0-.679.356-.994.482-1.121.126-.127.276-.159.369-.159.092 0 .184.001.264.005.085.004.198-.032.309.234.115.277.391.954.426 1.025.034.07.057.153.012.245-.045.092-.068.149-.136.227-.068.079-.143.176-.205.236-.068.067-.14.139-.06.277.08.138.356.587.763.95.525.467.967.611 1.105.68.138.069.219.057.3-.035.08-.093.345-.402.437-.539.092-.138.184-.115.309-.069.126.046.793.374.93.443.137.069.229.103.264.161.034.057.034.333-.11.738z"/>
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-black text-ink">WhatsApp</div>
                    <div className="mt-0.5 text-xs font-bold text-ink">
                      <a href="https://wa.me/2349162729421" target="_blank" rel="noopener noreferrer" className="hover:text-cheesco-yellow">
                        +234 916 272 9421
                      </a>
                    </div>
                    <div className="text-[11px] text-ink-muted mt-0.5">Chat with us directly</div>
                  </div>
                </div>

                {/* 4. Office Address */}
                <div className="flex items-start gap-3.5 rounded-2xl border border-line-soft bg-card p-4 transition-all hover:border-cheesco-yellow/40 hover:shadow-sm">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cheesco-yellow text-[#0A0D14] shadow-sm">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-black text-ink">Office Address</div>
                    <div className="mt-0.5 text-xs font-bold text-ink leading-snug">
                      Plot 54, Trans Amadi Industrial Layout, Trans Amadi, Port Harcourt, Rivers State, Nigeria.
                    </div>
                  </div>
                </div>
              </div>

              {/* Social Media Link Pills */}
              <div className="flex items-center gap-2 pt-2">
                {[
                  { name: "LinkedIn", href: "https://www.linkedin.com/in/cheesco-leasing-agency-b558081a6?utm_source=share_via&utm_content=profile&utm_medium=member_android", path: "M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" },
                  { name: "Facebook", href: "https://www.facebook.com/share/1Diwc2NzZV/", path: "M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z" },
                  { name: "Instagram", href: "https://www.instagram.com/cheescoleasingagency?psln=MWt0cm9ramlrZnI5bQ==", path: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" },
                  { name: "TikTok", href: "https://tiktok.com/@cheescoleasingagency?_d=f20mg1gil2a7lc&_r=1&enable_checksum=1&item_author_type=1&sec_uid=MS4wLjABAAAAFwPr_6Z6N9QEQZoGimBkOk8EiRMVihM3_16baq8HbrYVFXJsWMOEj9JgT1FT3JbW&sec_user_id=MS4wLjABAAAAFwPr_6Z6N9QEQZoGimBkOk8EiRMVihM3_16baq8HbrYVFXJsWMOEj9JgT1FT3JbW&share_app_id=1233&share_author_id=7638732047625077782&share_iid=7696504340672120598&share_link_id=2e3db4d5-74e4-49c3-b84e-6d145ef63b91&sharer_language=en&social_share_type=5&source=h5_m&timestamp=1792827638&u_code=f3d184k93g4lel&ug_btm=b8727%2Cb7360&ugbiz_name=ACCOUNT&user_id=7638732047625077782", path: "M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" },
                ].map((s) => (
                  <a
                    key={s.name}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.name}
                    className="flex h-8 w-8 items-center justify-center rounded-xl bg-card border border-line-soft text-ink-muted hover:text-cheesco-yellow hover:border-cheesco-yellow/40 transition-colors"
                  >
                    <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                      <path d={s.path} />
                    </svg>
                  </a>
                ))}
              </div>
            </div>

            {/* ── CENTER: Send Us a Message Form Card (4.5 cols) ─────── */}
            <div className="lg:col-span-5">
              <div className="rounded-3xl border border-zinc-800 bg-[#0C121E] p-6 sm:p-8 text-white shadow-2xl relative overflow-hidden">
                <h3 className="text-xl font-black text-white">Send Us a Message</h3>
                <p className="mt-1 text-xs text-zinc-400">
                  Fill out the form below and we&apos;ll get back to you shortly.
                </p>

                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                  {/* Full Name */}
                  <div>
                    <label className="block text-xs font-bold text-zinc-300 mb-1">
                      Full Name <span className="text-cheesco-yellow">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      placeholder="Enter your full name"
                      className="w-full rounded-xl bg-[#070A0F] border border-zinc-800 px-3.5 py-2.5 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-cheesco-yellow focus:ring-1 focus:ring-cheesco-yellow transition-all"
                    />
                  </div>

                  {/* Email & Phone Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-bold text-zinc-300 mb-1">
                        Email Address <span className="text-cheesco-yellow">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="you@example.com"
                        className="w-full rounded-xl bg-[#070A0F] border border-zinc-800 px-3.5 py-2.5 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-cheesco-yellow focus:ring-1 focus:ring-cheesco-yellow transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-300 mb-1">
                        Phone Number <span className="text-cheesco-yellow">*</span>
                      </label>
                      <input
                        type="tel"
                        required
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="+234 801 234 5678"
                        className="w-full rounded-xl bg-[#070A0F] border border-zinc-800 px-3.5 py-2.5 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-cheesco-yellow focus:ring-1 focus:ring-cheesco-yellow transition-all"
                      />
                    </div>
                  </div>

                  {/* Subject */}
                  <div>
                    <label className="block text-xs font-bold text-zinc-300 mb-1">
                      Subject <span className="text-cheesco-yellow">*</span>
                    </label>
                    <select
                      required
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      className="w-full rounded-xl bg-[#070A0F] border border-zinc-800 px-3.5 py-2.5 text-xs text-white outline-none focus:border-cheesco-yellow focus:ring-1 focus:ring-cheesco-yellow transition-all"
                    >
                      <option value="" disabled className="text-zinc-600">Select a subject</option>
                      <option value="RENTAL_INQUIRY">Equipment Rental Request</option>
                      <option value="MERCHANT_VERIFICATION">Merchant Accreditation / Listing</option>
                      <option value="SOURCING">Heavy Equipment Sourcing</option>
                      <option value="FINANCING">Equipment Financing & Lease</option>
                      <option value="SUPPORT">General Inquiry / Helpdesk</option>
                    </select>
                  </div>

                  {/* Message */}
                  <div>
                    <label className="block text-xs font-bold text-zinc-300 mb-1">
                      Message <span className="text-cheesco-yellow">*</span>
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      placeholder="How can we help you?"
                      className="w-full rounded-xl bg-[#070A0F] border border-zinc-800 px-3.5 py-2.5 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-cheesco-yellow focus:ring-1 focus:ring-cheesco-yellow transition-all resize-none"
                    />
                  </div>

                  {/* Agreement Checkbox */}
                  <div className="flex items-start gap-2.5 pt-1">
                    <input
                      type="checkbox"
                      id="agreed"
                      checked={formData.agreed}
                      onChange={(e) => setFormData({ ...formData, agreed: e.target.checked })}
                      className="mt-0.5 h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-cheesco-yellow focus:ring-cheesco-yellow"
                    />
                    <label htmlFor="agreed" className="text-[11px] text-zinc-400 leading-snug">
                      I agree to the{" "}
                      <Link href="/terms" className="text-cheesco-yellow hover:underline">Terms of Service</Link>
                      {" "}and{" "}
                      <Link href="/privacy" className="text-cheesco-yellow hover:underline">Privacy Policy</Link>
                    </label>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-cheesco-yellow py-3 text-xs font-black text-[#0A0D14] shadow-lg transition-all hover:bg-cheesco-yellow-bright hover:shadow-xl active:scale-[0.99] disabled:opacity-50"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                    </svg>
                    <span>{submitting ? "Sending..." : "Send Message"}</span>
                  </button>
                </form>
              </div>
            </div>

            {/* ── RIGHT: Map & Office Location Card (3.5 cols) ───────── */}
            <div className="lg:col-span-3 space-y-4">
              {/* Map Card */}
              <div className="relative overflow-hidden rounded-2xl border border-line-soft bg-card shadow-sm">
                <div className="relative h-48 w-full bg-canvas-deep">
                  <iframe
                    title="Cheesco Port Harcourt Trans Amadi Office Map"
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d15902.5!2d7.027!3d4.815!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x1069cd5b8801c403%3A0x6b7724a737f22da9!2sTrans%20Amadi%2C%20Port%20Harcourt!5e0!3m2!1sen!2sng!4v1714123456789!5m2!1sen!2sng"
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen={false}
                    loading="lazy"
                    className="absolute inset-0 opacity-80"
                  />
                  {/* Pin Card Marker Overlay matching reference image */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-1.5 rounded-full bg-[#0A0D14] border border-cheesco-yellow px-3 py-1 shadow-2xl">
                    <span className="h-2 w-2 rounded-full bg-cheesco-yellow animate-ping" />
                    <span className="text-[10px] font-black text-cheesco-yellow">Our Office</span>
                  </div>
                </div>

                {/* Our Location Info */}
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 text-xs font-black text-ink">
                        <svg className="h-3.5 w-3.5 text-cheesco-yellow shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                        </svg>
                        <span>Our Location</span>
                      </div>
                      <p className="mt-1 text-[11px] text-ink-muted leading-relaxed">
                        Plot 54, Trans Amadi Industrial Layout, Trans Amadi, Port Harcourt, Rivers State, Nigeria.
                      </p>
                    </div>

                    {/* Thumbnail building photo matching design */}
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-canvas-deep border border-line-soft">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=400&q=75"
                        alt="Cheesco Headquarters building"
                        className="h-full w-full object-cover"
                      />
                    </div>
                  </div>

                  <a
                    href="https://maps.google.com/?q=Plot+54+Trans+Amadi+Industrial+Layout+Port+Harcourt+Nigeria"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-ink hover:text-cheesco-yellow transition-colors"
                  >
                    <span>Get Directions</span>
                    <span>→</span>
                  </a>
                </div>
              </div>

              {/* Business Hours Card */}
              <div className="rounded-2xl border border-line-soft bg-card p-4 shadow-sm">
                <div className="flex items-center gap-1.5 text-xs font-black text-ink">
                  <svg className="h-3.5 w-3.5 text-cheesco-yellow shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Business Hours</span>
                </div>

                <div className="mt-2.5 space-y-1.5 text-[11px] text-ink-muted leading-relaxed">
                  <div className="flex justify-between">
                    <span className="font-semibold text-ink">Monday – Friday:</span>
                    <span>8:00 AM – 6:00 PM (WAT)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-ink">Saturday:</span>
                    <span>9:00 AM – 2:00 PM (WAT)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-ink">Sunday:</span>
                    <span className="font-bold text-red-500">Closed</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── 3. Frequently Asked Questions (FAQ) Section ───────────── */}
        <section id="faqs" className="border-t border-line-soft bg-canvas-deep/50 py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 items-start">
              {/* Left Headline & Action */}
              <div className="lg:col-span-4">
                <div className="flex items-center gap-2">
                  <span className="h-0.5 w-5 bg-cheesco-yellow" />
                  <span className="text-xs font-black uppercase tracking-wider text-cheesco-yellow">
                    QUICK HELP
                  </span>
                </div>
                <h2 className="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-ink">
                  Frequently Asked Questions
                </h2>
                <p className="mt-2 text-xs text-ink-muted leading-relaxed">
                  Find answers to common questions about our services, process, and platform.
                </p>

                <div className="mt-6">
                  <Link
                    href="/support"
                    className="inline-flex items-center gap-2 rounded-xl border border-cheesco-yellow px-4 py-2 text-xs font-bold text-ink transition-all hover:bg-cheesco-yellow hover:text-[#0A0D14] shadow-sm"
                  >
                    <span>View All FAQs</span>
                    <span>→</span>
                  </Link>
                </div>
              </div>

              {/* Right Accordion 2 Columns */}
              <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Column 1 */}
                <div className="space-y-3">
                  {FAQS_LEFT.map((faq, idx) => {
                    const key = `left-${idx}`;
                    const isOpen = activeFaq === key;
                    return (
                      <div
                        key={key}
                        className="rounded-xl border border-line-soft bg-card overflow-hidden transition-all shadow-sm"
                      >
                        <button
                          type="button"
                          onClick={() => toggleFaq(key)}
                          className="flex w-full items-center justify-between gap-3 p-3.5 text-left text-xs font-bold text-ink transition-colors hover:text-cheesco-yellow"
                        >
                          <span>{faq.q}</span>
                          <span className={`shrink-0 text-xs transition-transform duration-200 text-ink-muted ${isOpen ? "rotate-180 text-cheesco-yellow" : ""}`}>
                            ▾
                          </span>
                        </button>
                        {isOpen && (
                          <div className="px-3.5 pb-3.5 pt-0 text-[11px] text-ink-muted leading-relaxed border-t border-line-soft/60 mt-1">
                            {faq.a}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Column 2 */}
                <div className="space-y-3">
                  {FAQS_RIGHT.map((faq, idx) => {
                    const key = `right-${idx}`;
                    const isOpen = activeFaq === key;
                    return (
                      <div
                        key={key}
                        className="rounded-xl border border-line-soft bg-card overflow-hidden transition-all shadow-sm"
                      >
                        <button
                          type="button"
                          onClick={() => toggleFaq(key)}
                          className="flex w-full items-center justify-between gap-3 p-3.5 text-left text-xs font-bold text-ink transition-colors hover:text-cheesco-yellow"
                        >
                          <span>{faq.q}</span>
                          <span className={`shrink-0 text-xs transition-transform duration-200 text-ink-muted ${isOpen ? "rotate-180 text-cheesco-yellow" : ""}`}>
                            ▾
                          </span>
                        </button>
                        {isOpen && (
                          <div className="px-3.5 pb-3.5 pt-0 text-[11px] text-ink-muted leading-relaxed border-t border-line-soft/60 mt-1">
                            {faq.a}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
