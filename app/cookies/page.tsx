import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import Link from "next/link";
import type { Metadata } from "next";
import { ManageCookiesButton } from "@/components/manage-cookies-button";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description:
    "Learn about how Cheesco Equip Hub uses cookies and similar tracking technologies to keep your session secure and enhance your experience.",
};

const COOKIE_INVENTORY = [
  {
    name: "sb-access-token / auth_token",
    provider: "Cheesco / Supabase",
    category: "Strictly Necessary",
    duration: "7 Days",
    purpose: "Cryptographically signs and validates user identity for equipment bookings, merchant fleets, and admin dashboards (HttpOnly).",
  },
  {
    name: "sb-refresh-token",
    provider: "Cheesco / Supabase",
    category: "Strictly Necessary",
    duration: "30 Days",
    purpose: "Maintains uninterrupted login sessions across browser restarts (HttpOnly).",
  },
  {
    name: "cheesco.auth.status",
    provider: "Cheesco",
    category: "Strictly Necessary",
    duration: "7 Days",
    purpose: "Client-accessible authentication state indicator flag.",
  },
  {
    name: "cheesco_cookie_consent",
    provider: "Cheesco",
    category: "Strictly Necessary",
    duration: "1 Year",
    purpose: "Stores your personal cookie preference choices across visits.",
  },
  {
    name: "theme",
    provider: "Cheesco",
    category: "Functional",
    duration: "1 Year",
    purpose: "Remembers your preferred color theme (Dark / Industrial / Light).",
  },
  {
    name: "equipment_view_mode",
    provider: "Cheesco",
    category: "Functional",
    duration: "30 Days",
    purpose: "Remembers whether you prefer Grid or List view when browsing heavy equipment.",
  },
  {
    name: "_ga / _gid",
    provider: "Google Analytics",
    category: "Analytics & Performance",
    duration: "24 Hours - 2 Years",
    purpose: "Collects anonymous, aggregated statistics on page views, load times, and search queries.",
  },
  {
    name: "cheesco_partner_ref",
    provider: "Cheesco",
    category: "Marketing & Attribution",
    duration: "30 Days",
    purpose: "Tracks which equipment dealer or logistics affiliate referred your booking request.",
  },
];

const SECTIONS = [
  {
    heading: "1. What Are Cookies?",
    body: `Cookies are small text files placed on your computer, tablet, or smartphone when you visit a website. They are widely used to make web applications function efficiently, preserve user security between page reloads, and provide business analytics to platform owners.
    
In addition to traditional cookies, we may use related storage technologies such as HTML5 localStorage and session tokens to provide a seamless heavy machinery rental and procurement workflow.`,
  },
  {
    heading: "2. How Cheesco Uses Cookies",
    body: `Cheesco Equip Hub uses cookies for three primary purposes:
    
• Security & Identity: To keep your account logged in, protect checkout sessions, and prevent cross-site request forgery (CSRF) and brute force attacks.
• Personalization: To remember your filtering preferences, search locations (e.g. Lagos, Rivers, Abuja), and display options.
• Platform Diagnostics: To measure equipment page speed, detect broken search queries, and optimize mobile responsiveness across industrial job sites.`,
  },
  {
    heading: "3. Categories of Cookies We Use",
    body: `We classify our cookies under four transparent categories:
    
1. Strictly Necessary Cookies: Essential for the core marketplace functions. Without these, secure logins, digital quotation approvals, and Paystack/Flutterwave escrow payments cannot operate. These cannot be disabled.
2. Functional Cookies: Enable enhanced functionality and personalization, such as remembering your machinery category preferences.
3. Analytics & Performance Cookies: Allow us to analyze anonymized visitor counts and traffic sources to measure and improve our site performance.
4. Marketing & Attribution Cookies: Used to understand which marketing campaigns or merchant partner links led you to Cheesco Equip Hub.`,
  },
  {
    heading: "4. Cookie Inventory",
    body: `Below is a detailed breakdown of the cookies used across the Cheesco Equip Hub platform:`,
  },
  {
    heading: "5. Managing Your Preferences",
    body: `You have full control over non-essential cookies. You can update or withdraw your consent at any time using our Cookie Preferences Center or directly via your web browser settings.
    
Disabling functional or analytics cookies will not prevent you from using Cheesco, but it may require you to re-select filters every visit. Disabling strictly necessary cookies in your browser settings will break login and checkout capabilities.`,
  },
  {
    heading: "6. Browser-Level Controls",
    body: `Most web browsers allow you to manage cookie settings. You can configure your browser to reject all cookies or notify you when a cookie is placed:
    
• Google Chrome: Settings → Privacy and security → Cookies and other site data.
• Apple Safari: Preferences → Privacy → Block all cookies.
• Mozilla Firefox: Settings → Privacy & Security → Cookies and Site Data.
• Microsoft Edge: Settings → Cookies and site permissions → Manage and delete cookies.`,
  },
  {
    heading: "7. Regulatory Compliance (GDPR & NDPR)",
    body: `Cheesco Equip Hub strictly complies with the Nigeria Data Protection Act (NDPA), Nigeria Data Protection Regulation (NDPR), and international privacy standards (GDPR). We never sell your personal data or cookie telemetry to third-party ad networks.`,
  },
  {
    heading: "8. Contact Us",
    body: `If you have questions regarding this Cookie Policy or our data protection measures, please reach out to our privacy compliance team at privacy@cheesco.ng or write to:
    
Cheesco Leasing & Intermediary Services Ltd
Plot 54, Trans Amadi Industrial Layout,
Port Harcourt, Rivers State, Nigeria.`,
  },
];

export default function CookiesPage() {
  const lastUpdated = "28 October 2026";

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-canvas text-ink">
        {/* ── Hero ─────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden px-4 pb-16 pt-32 sm:px-6">
          <div className="pointer-events-none absolute -top-32 left-1/2 h-[400px] w-[600px] -translate-x-1/2 rounded-full bg-cheesco-yellow/5 blur-[100px]" />
          <div className="relative mx-auto max-w-4xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cheesco-yellow/30 bg-cheesco-yellow/10 px-4 py-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-cheesco-yellow" />
              <span className="text-xs font-black tracking-widest text-cheesco-yellow">PRIVACY & TRANSPARENCY</span>
            </div>
            <h1 className="mt-4 text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight">
              Cookie Policy
            </h1>
            <p className="mt-3 text-sm text-ink-muted">
              Last updated: <strong className="text-ink">{lastUpdated}</strong>
            </p>
            <p className="mt-4 max-w-2xl mx-auto text-sm sm:text-base text-ink-muted leading-relaxed">
              Transparent disclosure on how Cheesco Equip Hub uses cookies to secure your sessions,
              remember your machinery preferences, and deliver reliable equipment intermediary services.
            </p>

            {/* Interactive Preference Launcher */}
            <div className="mt-8 flex items-center justify-center">
              <ManageCookiesButton />
            </div>
          </div>
        </section>

        {/* ── Content Sections ─────────────────────────────────────── */}
        <section className="px-4 pb-28 sm:px-6">
          <div className="mx-auto max-w-4xl">
            {/* Quick jump table of contents */}
            <nav className="mb-12 rounded-xl border border-line-soft bg-card p-6">
              <p className="mb-3 text-xs font-black uppercase tracking-widest text-cheesco-yellow">
                Table of Contents
              </p>
              <ol className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {SECTIONS.map((s) => (
                  <li key={s.heading}>
                    <a
                      href={`#${s.heading.replace(/\s+/g, "-").toLowerCase()}`}
                      className="text-xs sm:text-sm text-ink-muted transition hover:text-cheesco-yellow"
                    >
                      {s.heading}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>

            {/* Detailed sections */}
            <div className="space-y-12">
              {SECTIONS.map((s) => (
                <section
                  key={s.heading}
                  id={s.heading.replace(/\s+/g, "-").toLowerCase()}
                  className="scroll-mt-24"
                >
                  <h2 className="mb-4 text-xl sm:text-2xl font-black">{s.heading}</h2>
                  <div className="rounded-xl border border-line-soft bg-card p-6 sm:p-7 text-sm leading-relaxed text-ink-muted">
                    {s.body.split("\n\n").map((para, i) => (
                      <p key={i} className="mt-0 mb-4 last:mb-0 whitespace-pre-line">
                        {para}
                      </p>
                    ))}

                    {/* Render Cookie Inventory Table inside Section 4 */}
                    {s.heading.startsWith("4.") && (
                      <div className="mt-6 overflow-x-auto rounded-lg border border-line-soft">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-canvas/50 text-[11px] font-bold uppercase tracking-wider text-ink border-b border-line-soft">
                            <tr>
                              <th className="p-3 sm:p-4">Cookie Name</th>
                              <th className="p-3 sm:p-4">Category</th>
                              <th className="p-3 sm:p-4">Provider</th>
                              <th className="p-3 sm:p-4">Duration</th>
                              <th className="p-3 sm:p-4">Purpose</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-line-soft font-normal text-ink-muted">
                            {COOKIE_INVENTORY.map((c) => (
                              <tr key={c.name} className="hover:bg-canvas/30 transition-colors">
                                <td className="p-3 sm:p-4 font-mono font-bold text-ink whitespace-nowrap">
                                  {c.name}
                                </td>
                                <td className="p-3 sm:p-4 whitespace-nowrap">
                                  <span
                                    className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                      c.category.includes("Strictly")
                                        ? "bg-cheesco-yellow/15 text-cheesco-yellow border border-cheesco-yellow/30"
                                        : "bg-zinc-800 text-zinc-300"
                                    }`}
                                  >
                                    {c.category}
                                  </span>
                                </td>
                                <td className="p-3 sm:p-4 whitespace-nowrap">{c.provider}</td>
                                <td className="p-3 sm:p-4 whitespace-nowrap">{c.duration}</td>
                                <td className="p-3 sm:p-4 text-xs leading-normal">{c.purpose}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </section>
              ))}
            </div>

            {/* Bottom Support Callout */}
            <div className="mt-16 rounded-2xl border border-cheesco-yellow/30 bg-cheesco-yellow/5 p-8 text-center">
              <h3 className="text-base font-black text-ink">Have Questions About Our Cookie Usage?</h3>
              <p className="mt-2 text-xs sm:text-sm text-ink-muted max-w-lg mx-auto">
                Our support and legal compliance team is ready to assist you.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <Link
                  href="/contact"
                  className="rounded-xl bg-cheesco-yellow px-5 py-2.5 text-xs font-black text-[#0A0D14] transition-all hover:bg-cheesco-yellow-bright"
                >
                  Contact Support
                </Link>
                <Link
                  href="/privacy"
                  className="rounded-xl border border-line-soft bg-card px-5 py-2.5 text-xs font-bold text-ink hover:border-zinc-500"
                >
                  View Privacy Policy
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
