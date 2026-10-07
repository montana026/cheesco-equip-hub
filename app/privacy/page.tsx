import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Learn how Cheesco Equip Hub collects, protects, and uses your information across our heavy equipment marketplace.",
};

const SECTIONS = [
  {
    heading: "1. Information We Collect",
    body: `When you create an account, submit a rental or purchase request, or contact our support team, we collect information you provide directly — including your full name, email address, phone number, business registration details, bank account information (for merchant payouts), and any correspondence.

We also automatically collect technical data such as IP address, browser type, and usage logs when you interact with our platform. This helps us detect fraud and improve the product.`,
  },
  {
    heading: "2. How We Use Your Information",
    body: `We use your data to:

• Process and manage your equipment rentals, purchases, and sourcing requests.
• Verify merchant identities and equipment condition (KYC / AML compliance).
• Issue quotations, digital rental agreements, and payment invoices.
• Communicate updates, logistics status, and support replies.
• Detect and prevent fraudulent or abusive activity.
• Improve our marketplace platform, performance, and user experience.

We do not use your data to show you third-party advertising.`,
  },
  {
    heading: "3. Sharing Your Information",
    body: `Cheesco never sells your personal data. We share information only where necessary to fulfil your request:

• With verified merchants to coordinate equipment availability and handover.
• With logistics partners to arrange transportation and delivery.
• With our payment processor (Paystack) to collect and disburse funds.
• With regulatory authorities if required by Nigerian law.

All third parties we work with are bound by confidentiality obligations.`,
  },
  {
    heading: "4. Data Security",
    body: `We implement industry-standard security controls including TLS encryption in transit, AES-256 encryption at rest, role-based access controls, and regular penetration testing. Our infrastructure is hosted on SOC-2 certified cloud providers.

Despite our best efforts, no system is 100% secure. If you suspect a security incident, contact us immediately at security@cheesco.ng.`,
  },
  {
    heading: "5. Cookies & Tracking",
    body: `We use essential cookies to keep you signed in and maintain session security. We also use analytics cookies (e.g. Google Analytics) to understand aggregate usage patterns. You can manage cookie preferences in your browser settings; however, disabling essential cookies will prevent you from using the platform.`,
  },
  {
    heading: "6. Your Rights",
    body: `You have the right to:

• Access and download a copy of your personal data.
• Correct inaccurate information in your profile.
• Request deletion of your account and associated data (subject to legal retention obligations).
• Withdraw consent for non-essential data processing at any time.

To exercise any of these rights, contact privacy@cheesco.ng or visit your account settings dashboard.`,
  },
  {
    heading: "7. Data Retention",
    body: `We retain your account data for as long as your account is active. After account closure we retain certain records for up to 7 years for regulatory, legal, and audit purposes as required under Nigerian law (Companies and Allied Matters Act, FIRS regulations).`,
  },
  {
    heading: "8. Changes to This Policy",
    body: `We may update this Privacy Policy from time to time. We will notify registered users by email at least 14 days before any material change takes effect. Continued use of the platform after the effective date constitutes acceptance of the updated policy.`,
  },
];

export default function PrivacyPage() {
  const lastUpdated = "6 October 2026";

  return (
    <>
      <Navbar />
      <main>
        {/* ── Hero ─────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden bg-canvas px-4 pb-20 pt-32 sm:px-6">
          <div className="pointer-events-none absolute -top-32 left-1/2 h-[400px] w-[600px] -translate-x-1/2 rounded-full bg-cheesco-yellow/5 blur-[100px]" />
          <div className="relative mx-auto max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cheesco-yellow/30 bg-cheesco-yellow/10 px-4 py-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-cheesco-yellow" />
              <span className="text-xs font-black tracking-widest text-cheesco-yellow">LEGAL</span>
            </div>
            <h1 className="mt-4 text-5xl font-black leading-tight sm:text-6xl">
              Privacy Policy
            </h1>
            <p className="mt-4 text-ink-muted">
              Last updated: <strong className="text-ink">{lastUpdated}</strong>
            </p>
            <p className="mt-3 max-w-xl text-base text-ink-muted">
              Your privacy matters to us. This document explains what we collect,
              why we collect it, and how we protect it across the Cheesco Equip
              Hub platform.
            </p>
          </div>
        </section>

        {/* ── Body ─────────────────────────────────────────────────── */}
        <section className="bg-canvas px-4 pb-28 sm:px-6">
          <div className="mx-auto max-w-3xl">
            {/* quick jump */}
            <nav className="mb-12 rounded-xl border border-line-soft bg-card p-6">
              <p className="mb-3 text-xs font-black uppercase tracking-widest text-cheesco-yellow">
                Contents
              </p>
              <ol className="space-y-1.5">
                {SECTIONS.map((s) => (
                  <li key={s.heading}>
                    <a
                      href={`#${s.heading.replace(/\s+/g, "-").toLowerCase()}`}
                      className="text-sm text-ink-muted transition hover:text-cheesco-yellow"
                    >
                      {s.heading}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>

            {/* sections */}
            <div className="space-y-12">
              {SECTIONS.map((s) => (
                <section
                  key={s.heading}
                  id={s.heading.replace(/\s+/g, "-").toLowerCase()}
                  className="scroll-mt-24"
                >
                  <h2 className="mb-4 text-xl font-black">{s.heading}</h2>
                  <div className="rounded-xl border border-line-soft bg-card p-6 text-sm leading-relaxed text-ink-muted">
                    {s.body.split("\n\n").map((para, i) => (
                      <p key={i} className="mt-0 mb-4 last:mb-0 whitespace-pre-line">
                        {para}
                      </p>
                    ))}
                  </div>
                </section>
              ))}
            </div>

            {/* bottom CTA */}
            <div className="mt-16 rounded-xl border border-cheesco-yellow/30 bg-cheesco-yellow/5 p-8 text-center">
              <p className="text-sm text-ink-muted">
                Questions about your privacy?{" "}
                <Link href="/contact" className="font-bold text-cheesco-yellow hover:underline">
                  Contact our team
                </Link>{" "}
                or email{" "}
                <a href="mailto:privacy@cheesco.ng" className="font-bold text-cheesco-yellow hover:underline">
                  privacy@cheesco.ng
                </a>
                .
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
