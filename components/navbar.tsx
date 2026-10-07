"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CheescoLogo, CheescoWordmark } from "./brand";
import { useAuth } from "@/lib/contexts/auth-context";
import { ThemeToggle } from "./theme-toggle";

const NAV_LINKS = [
  { href: "/browse", label: "Browse" },
  { href: "/browse?listing=rent", label: "Rent" },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { user, profile, signOut } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  // Role-based dashboard links
  const getDashboardLink = () => {
    if (!profile) return "/dashboard/customer";

    switch (profile.role) {
      case "MERCHANT":
        return "/merchant/dashboard";
      case "OPERATIONS_ADMIN":
      case "SUPER_ADMIN":
        return "/admin/operations";
      case "VERIFICATION_ADMIN":
        return "/admin/verification";
      case "FINANCE_ADMIN":
        return "/admin/finance";
      case "SUPPORT_ADMIN":
        return "/admin/support";
      default:
        return "/dashboard/customer";
    }
  };

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-canvas/85 backdrop-blur-xl border-b border-line-soft shadow-[0_8px_32px_rgba(0,0,0,0.45)]"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-3" aria-label="Cheesco Equip Hub home">
          <CheescoLogo size={38} />
          <CheescoWordmark />
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm font-semibold text-ink-muted transition-colors hover:text-cheesco-yellow"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <ThemeToggle />
          {user ? (
            <>
              <Link
                href={getDashboardLink()}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-ink-muted transition-colors hover:text-ink"
              >
                Dashboard
              </Link>
              <button
                onClick={handleSignOut}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-ink-muted transition-colors hover:text-red-400"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-lg px-4 py-2 text-sm font-semibold text-ink-muted transition-colors hover:text-ink"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-cheesco-yellow px-4 py-2 text-sm font-bold text-canvas transition-transform hover:scale-[1.03] hover:bg-cheesco-yellow-bright"
              >
                List Your Equipment
              </Link>
            </>
          )}
        </div>

        {/* Mobile menu button */}
        <button
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-line-soft text-ink md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          <span className="text-lg">{open ? "✕" : "☰"}</span>
        </button>
      </div>

      {open && (
        <div className="border-t border-line-soft bg-canvas/95 backdrop-blur-xl px-4 pb-6 pt-3 md:hidden">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-3 text-sm font-semibold text-ink-muted hover:bg-card hover:text-cheesco-yellow"
            >
              {l.label}
            </Link>
          ))}
          {user ? (
            <>
              <Link
                href={getDashboardLink()}
                onClick={() => setOpen(false)}
                className="mt-3 block rounded-lg bg-cheesco-yellow px-3 py-3 text-center text-sm font-bold text-canvas"
              >
                Dashboard
              </Link>
              <button
                onClick={() => {
                  handleSignOut();
                  setOpen(false);
                }}
                className="mt-2 w-full block rounded-lg bg-zinc-800 px-3 py-3 text-center text-sm font-bold text-white hover:bg-zinc-700"
              >
                Sign out
              </button>
            </>
          ) : (
            <Link
              href="/register"
              onClick={() => setOpen(false)}
              className="mt-3 block rounded-lg bg-cheesco-yellow px-3 py-3 text-center text-sm font-bold text-canvas"
            >
              List Your Equipment
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
