"use client";

import Link from "next/link";
import { useState } from "react";
import { CheescoLogo, CheescoWordmark } from "./brand";
import { openCookieSettings } from "@/lib/cookie-consent";
import toast from "react-hot-toast";

export function Footer({ hideCta = false }: { hideCta?: boolean }) {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }
    setSubscribed(true);
    toast.success("Thank you for subscribing to Cheesco updates!");
    setEmail("");
  };

  return (
    <div className="w-full">
      {/* ── Pre-Footer CTA Banner ─────────────────────────────────── */}
      {!hideCta && (
        <section className="relative overflow-hidden bg-[#0A0D14] border-t border-zinc-800 text-white">
          {/* Industrial Sunset Cranes Silhouette Background */}
          <div className="absolute inset-0 z-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=2000&q=70"
              alt="Industrial equipment background"
              className="h-full w-full object-cover object-center opacity-15"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0A0D14] via-[#0A0D14]/95 to-[#0A0D14]/85" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0A0D14] via-transparent to-[#0A0D14]/60" />
          </div>

          <div className="relative z-10 mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
              {/* Left Headline */}
              <div className="max-w-xl">
                <div className="flex items-center gap-2">
                  <span className="h-0.5 w-6 bg-cheesco-yellow" />
                  <span className="text-[11px] font-black uppercase tracking-widest text-cheesco-yellow">
                    READY TO GET STARTED?
                  </span>
                </div>
                <h2 className="mt-2 text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white">
                  Your Next Project{" "}
                  <span className="text-cheesco-yellow">Starts Here</span>
                </h2>
                <p className="mt-2 text-xs sm:text-sm text-zinc-300 leading-relaxed">
                  Browse our verified equipment, request a quote, or speak with our team today.
                </p>
              </div>

              {/* Middle Action Buttons */}
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href="/browse"
                  className="inline-flex items-center gap-2 rounded-xl bg-cheesco-yellow px-5 py-3 text-xs sm:text-sm font-black text-[#0A0D14] shadow-lg transition-all hover:bg-cheesco-yellow-bright hover:scale-[1.02] active:scale-[0.98]"
                >
                  <span>Browse Equipment</span>
                  <span className="text-base leading-none">→</span>
                </Link>
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900/80 backdrop-blur-md px-5 py-3 text-xs sm:text-sm font-bold text-zinc-200 transition-all hover:bg-zinc-800 hover:border-zinc-500 hover:text-white"
                >
                  <svg className="h-4 w-4 text-cheesco-yellow" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.09-1.637.322-2.414.234-.847 1.058-1.354 1.938-1.354h2.24z" />
                  </svg>
                  <span>Talk to Our Team</span>
                </Link>
              </div>

              {/* Right Trust Badges */}
              <div className="flex items-center gap-6 sm:gap-8 pt-4 lg:pt-0 border-t lg:border-t-0 border-zinc-800/80">
                <div className="flex flex-col items-center text-center">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 text-cheesco-yellow">
                    <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                    </svg>
                  </div>
                  <span className="mt-1.5 text-[10px] font-bold text-zinc-300">Verified<br />Equipment</span>
                </div>

                <div className="flex flex-col items-center text-center">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 text-cheesco-yellow">
                    <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                  </div>
                  <span className="mt-1.5 text-[10px] font-bold text-zinc-300">Secure<br />Transactions</span>
                </div>

                <div className="flex flex-col items-center text-center">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 text-cheesco-yellow">
                    <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-.778.099-1.533.284-2.253" />
                    </svg>
                  </div>
                  <span className="mt-1.5 text-[10px] font-bold text-zinc-300">Nationwide<br />Coverage</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Main Footer ─────────────────────────────────────────── */}
      <footer className="border-t border-zinc-800 bg-[#070A0F] text-white">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-5">
            {/* Col 1: Brand */}
            <div className="lg:col-span-1">
              <Link href="/" className="flex items-center gap-2.5">
                <CheescoLogo size={36} />
                <CheescoWordmark />
              </Link>
              <p className="mt-4 text-xs text-zinc-400 leading-relaxed">
                Heavy equipment. Real opportunities.
              </p>
              <p className="mt-0.5 text-xs font-semibold text-zinc-500">
                Buy. Rent. Build.
              </p>
            </div>

            {/* Col 2: Quick Links */}
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-white">
                Quick Links
              </h3>
              <ul className="mt-4 space-y-2.5">
                {[
                  { label: "Home", href: "/" },
                  { label: "Browse Equipment", href: "/browse" },
                  { label: "How It Works", href: "/how-it-works" },
                  { label: "Sell Equipment", href: "/browse?listing=buy" },
                  { label: "Rent Out Equipment", href: "/merchant/listings/new" },
                  { label: "About Us", href: "/about" },
                  { label: "Contact", href: "/contact" },
                ].map((item) => (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className="text-xs text-zinc-400 hover:text-cheesco-yellow transition-colors"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Col 3: Support */}
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-white">
                Support
              </h3>
              <ul className="mt-4 space-y-2.5">
                {[
                  { label: "Help Center", href: "/support" },
                  { label: "FAQs", href: "/contact#faqs" },
                  { label: "Terms of Service", href: "/terms" },
                  { label: "Privacy Policy", href: "/privacy" },
                  { label: "Support Tickets", href: "/support" },
                  { label: "Report a Problem", href: "/support" },
                ].map((item) => (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className="text-xs text-zinc-400 hover:text-cheesco-yellow transition-colors"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Col 4: Contact Us */}
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-white">
                Contact Us
              </h3>
              <div className="mt-4 space-y-3 text-xs text-zinc-400">
                <a
                  href="tel:+2349162729421"
                  className="flex items-center gap-2 hover:text-cheesco-yellow transition-colors"
                >
                  <svg className="h-4 w-4 shrink-0 text-cheesco-yellow" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                  </svg>
                  <span>+234 916 272 9421</span>
                </a>

                <a
                  href="mailto:support@cheescoequiphub.com"
                  className="flex items-center gap-2 hover:text-cheesco-yellow transition-colors"
                >
                  <svg className="h-4 w-4 shrink-0 text-cheesco-yellow" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                  </svg>
                  <span>support@cheescoequiphub.com</span>
                </a>

                <div className="flex items-start gap-2">
                  <svg className="h-4 w-4 shrink-0 text-cheesco-yellow mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                  </svg>
                  <span>Plot 54, Trans Amadi Industrial Layout, Trans Amadi, Port Harcourt</span>
                </div>

                {/* Social Media Links Row */}
                <div className="pt-2 flex items-center gap-2">
                  {[
                    {
                      name: "LinkedIn",
                      href: "https://www.linkedin.com/in/cheesco-leasing-agency-b558081a6?utm_source=share_via&utm_content=profile&utm_medium=member_android",
                      svg: (
                        <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                      ),
                    },
                    {
                      name: "Facebook",
                      href: "https://www.facebook.com/share/1Diwc2NzZV/",
                      svg: (
                        <path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"/>
                      ),
                    },
                    {
                      name: "Instagram",
                      href: "https://www.instagram.com/cheescoleasingagency?psln=MWt0cm9ramlrZnI5bQ==",
                      svg: (
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                      ),
                    },
                    {
                      name: "TikTok",
                      href: "https://tiktok.com/@cheescoleasingagency?_d=f20mg1gil2a7lc&_r=1&enable_checksum=1&item_author_type=1&sec_uid=MS4wLjABAAAAFwPr_6Z6N9QEQZoGimBkOk8EiRMVihM3_16baq8HbrYVFXJsWMOEj9JgT1FT3JbW&sec_user_id=MS4wLjABAAAAFwPr_6Z6N9QEQZoGimBkOk8EiRMVihM3_16baq8HbrYVFXJsWMOEj9JgT1FT3JbW&share_app_id=1233&share_author_id=7638732047625077782&share_iid=7696504340672120598&share_link_id=2e3db4d5-74e4-49c3-b84e-6d145ef63b91&sharer_language=en&social_share_type=5&source=h5_m&timestamp=1792827638&u_code=f3d184k93g4lel&ug_btm=b8727%2Cb7360&ugbiz_name=ACCOUNT&user_id=7638732047625077782",
                      svg: (
                        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
                      ),
                    },
                  ].map((s) => (
                    <a
                      key={s.name}
                      href={s.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={s.name}
                      className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-cheesco-yellow hover:border-cheesco-yellow/40 transition-colors"
                    >
                      <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                        {s.svg}
                      </svg>
                    </a>
                  ))}
                </div>
              </div>
            </div>

            {/* Col 5: Stay Updated */}
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-white">
                Stay Updated
              </h3>
              <p className="mt-4 text-xs text-zinc-400 leading-relaxed">
                Get the latest equipment, deals and updates.
              </p>

              <form onSubmit={handleSubscribe} className="mt-4 space-y-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  className="w-full rounded-xl bg-zinc-900 border border-zinc-800 px-3.5 py-2.5 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-cheesco-yellow focus:ring-1 focus:ring-cheesco-yellow transition-all"
                  required
                />
                <button
                  type="submit"
                  className="w-full rounded-xl bg-cheesco-yellow px-4 py-2.5 text-xs font-black text-[#0A0D14] shadow transition-all hover:bg-cheesco-yellow-bright hover:shadow-md"
                >
                  {subscribed ? "Subscribed!" : "Subscribe"}
                </button>
              </form>
            </div>
          </div>

          {/* Bottom Copyright Row */}
          <div className="mt-12 pt-8 border-t border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
            <p>© 2025 Cheesco Equip Hub. All rights reserved.</p>
            <div className="flex flex-wrap items-center gap-4 sm:gap-6">
              <Link href="/privacy" className="hover:text-zinc-400 transition-colors">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-zinc-400 transition-colors">Terms of Service</Link>
              <Link href="/cookies" className="hover:text-zinc-400 transition-colors">Cookie Policy</Link>
              <button
                type="button"
                onClick={openCookieSettings}
                className="hover:text-cheesco-yellow transition-colors cursor-pointer text-left"
              >
                Cookie Settings
              </button>
              <Link href="/support" className="hover:text-zinc-400 transition-colors">Support Desk</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
