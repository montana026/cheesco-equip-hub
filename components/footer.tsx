import Link from "next/link";
import { CheescoLogo, CheescoWordmark } from "./brand";

const COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Marketplace",
    links: [
      { label: "Browse Equipment", href: "/browse" },
      { label: "Rent Equipment", href: "/browse?listing=rent" },
      { label: "Buy Equipment", href: "/browse?listing=buy" },
      { label: "How It Works", href: "/how-it-works" },
    ],
  },
  {
    title: "For Merchants",
    links: [
      { label: "List Your Equipment", href: "/register?role=merchant" },
      { label: "Merchant Dashboard", href: "/merchant/dashboard" },
      { label: "Ad Campaigns", href: "/merchant/ads" },
      { label: "Verification (KYC)", href: "/merchant/verification" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About Cheesco", href: "/about" },
      { label: "Case Studies", href: "/case-studies" },
      { label: "Contact Us", href: "/contact" },
      { label: "Support", href: "/" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms & Agreements", href: "/terms" },
      { label: "Operations Center", href: "/admin/operations" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-line-soft bg-canvas-deep">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-3">
            <CheescoLogo size={40} />
            <CheescoWordmark />
          </div>
          <p className="mt-4 max-w-xs text-sm text-ink-muted">
            The trusted intermediary for heavy-equipment sales, managed rentals,
            sourcing and industrial logistics across Nigeria.
          </p>
          <div className="hazard-bar mt-6 h-1.5 w-40 rounded-full" />
        </div>
        {COLUMNS.map((col) => (
          <div key={col.title}>
            <div className="text-xs font-black tracking-[0.25em] text-cheesco-yellow">
              {col.title.toUpperCase()}
            </div>
            <ul className="mt-4 space-y-2.5">
              {col.links.map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className="text-sm text-ink-muted hover:text-ink">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-line-soft py-5 text-center text-xs text-ink-faint">
        © {new Date().getFullYear()} Cheesco Equip Hub · Leasing Agency. Every transaction verified.
      </div>
    </footer>
  );
}
