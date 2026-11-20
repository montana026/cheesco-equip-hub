"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CheescoLogo, CheescoWordmark } from "./brand";
import { useAuth } from "@/lib/contexts/auth-context";
import { ThemeToggle } from "./theme-toggle";
import { NotificationBell } from "./notification-bell";
import { ROLE_HOME } from "@/lib/auth";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/browse", label: "Browse Equipment" },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/about", label: "About Us" },
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
    if (!profile?.role) return "/dashboard/customer";
    return ROLE_HOME[profile.role as keyof typeof ROLE_HOME] || "/dashboard/customer";
  };

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[#0B0F19]/95 backdrop-blur-xl border-b border-zinc-800 shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
          : "bg-[#0B0F19] border-b border-zinc-800/80"
      }`}
    >
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3" aria-label="Cheesco Equip Hub home">
          <CheescoLogo size={38} />
          <CheescoWordmark />
        </Link>

        <nav className="hidden items-center gap-6 lg:gap-8 md:flex">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm font-semibold text-zinc-300 transition-colors hover:text-cheesco-yellow"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/browse"
            aria-label="Search Equipment"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-300 transition-colors hover:bg-card hover:text-cheesco-yellow"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </Link>
          <ThemeToggle />
          {user ? (
            <>
              <NotificationBell />
              <Link
                href={getDashboardLink()}
                className="rounded-lg px-3.5 py-2 text-sm font-semibold text-zinc-300 transition-colors hover:text-white hover:bg-card"
              >
                Dashboard
              </Link>
              <button
                onClick={handleSignOut}
                className="rounded-lg px-3.5 py-2 text-sm font-semibold text-zinc-400 transition-colors hover:text-red-400"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-lg px-3.5 py-2 text-sm font-semibold text-zinc-300 transition-colors hover:text-white"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="rounded-xl bg-cheesco-yellow px-5 py-2 text-sm font-bold text-[#0A0D14] shadow transition-all hover:scale-[1.02] hover:bg-cheesco-yellow-bright hover:shadow-lg"
              >
                Sign Up
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
