"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { SessionUser } from "@/lib/auth";
import { logout } from "@/lib/auth";
import { useAuth } from "@/lib/contexts/auth-context";
import { CheescoLogo, CheescoWordmark } from "./brand";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./theme-toggle";
import { NotificationBell } from "./notification-bell";

const SessionContext = createContext<SessionUser | null>(null);

export function useSession(): SessionUser {
  const s = useContext(SessionContext);
  if (!s) throw new Error("useSession used outside a DashboardShell");
  return s;
}

export function DashboardShell({
  user,
  nav,
  title,
  subtitle,
  children,
}: {
  user: SessionUser | any;
  nav: { href: string; label: string; badge?: string | number }[];
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch {
      await logout();
      window.location.href = "/";
    }
  };

  const displayName = user?.name || user?.full_name || user?.email || "User";
  const displayRole = (user?.role || "CUSTOMER").replace(/_/g, " ");
  const initial = displayName.slice(0, 1).toUpperCase();

  return (
    <SessionContext.Provider value={user}>
      <div className="flex min-h-screen bg-canvas text-ink">
        {/* Left Sidebar (Dark Navy Industrial Theme) */}
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-zinc-800 bg-[#0A0D14] text-white lg:flex">
          {/* Logo Brand Header */}
          <Link
            href="/"
            className="flex items-center gap-2.5 px-5 py-5 border-b border-zinc-800/80 hover:bg-zinc-900/50 transition-colors"
          >
            <CheescoLogo size={32} />
            <div className="flex flex-col">
              <span className="text-xs font-black tracking-widest text-white">CHEESCO</span>
              <span className="text-[9px] font-bold tracking-[0.2em] text-cheesco-yellow">EQUIP HUB</span>
            </div>
          </Link>

          {/* User Profile Card in Sidebar */}
          <div className="mx-4 mt-4 rounded-xl border border-zinc-800 bg-zinc-900/90 p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cheesco-yellow font-black text-sm text-[#0A0D14]">
                {initial}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-bold text-white">{displayName}</div>
                <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-cheesco-yellow font-semibold">
                  <span className="h-1.5 w-1.5 rounded-full bg-cheesco-yellow animate-pulse" />
                  {displayRole}
                </div>
              </div>
            </div>
          </div>

          {/* Back to Website Button */}
          <div className="px-4 pt-3">
            <Link
              href="/"
              className="flex items-center justify-center gap-2 rounded-xl bg-zinc-900/60 px-3 py-2 text-xs font-bold text-zinc-300 border border-zinc-800 hover:border-cheesco-yellow/40 hover:text-cheesco-yellow transition-all"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
              </svg>
              <span>← Back to Website</span>
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="mt-4 flex-1 space-y-1.5 px-4 pb-6 overflow-y-auto">
            {nav.map((n) => {
              const isActive = pathname === n.href;
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-bold transition-all ${
                    isActive
                      ? "bg-cheesco-yellow text-[#0A0D14] shadow-md shadow-cheesco-yellow/20"
                      : "text-zinc-300 hover:bg-zinc-800/80 hover:text-cheesco-yellow"
                  }`}
                >
                  <span className="truncate">{n.label}</span>
                  {n.badge != null && n.badge !== 0 && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                        isActive
                          ? "bg-[#0A0D14] text-cheesco-yellow"
                          : "bg-cheesco-yellow text-[#0A0D14]"
                      }`}
                    >
                      {n.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Footer Sign Out */}
          <div className="border-t border-zinc-800 p-4">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-zinc-800 px-3 py-2 text-xs font-bold text-zinc-400 hover:bg-zinc-800 hover:text-red-400 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
              </svg>
              <span>Sign out</span>
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Top Bar Header */}
          <header className="sticky top-0 z-40 flex h-14 sm:h-16 items-center justify-between gap-2 sm:gap-4 border-b border-line-soft bg-canvas/95 backdrop-blur-md px-3 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              {/* Mobile Cheesco Logo */}
              <Link href="/" className="flex items-center gap-1.5 shrink-0 lg:hidden">
                <CheescoLogo size={26} />
              </Link>

              {/* Desktop Home Back Link */}
              <Link
                href="/"
                className="hidden lg:inline-flex items-center gap-1.5 rounded-lg border border-line-soft bg-canvas-deep px-2.5 py-1 text-xs font-bold text-ink-muted hover:text-cheesco-yellow hover:border-cheesco-yellow transition-all shrink-0"
              >
                <span>← Home</span>
              </Link>

              <div className="min-w-0">
                <h1 className="text-sm sm:text-lg font-black tracking-tight text-ink truncate leading-tight">
                  {title}
                </h1>
                {subtitle && (
                  <p className="text-[10px] sm:text-[11px] text-ink-muted truncate hidden sm:block">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
              <Link
                href="/browse"
                className="hidden md:inline-flex items-center gap-1 text-xs font-bold text-ink-muted hover:text-cheesco-yellow transition-colors"
              >
                Browse Fleet
              </Link>
              <Link
                href="/support"
                className="hidden md:inline-flex items-center gap-1 text-xs font-bold text-ink-muted hover:text-cheesco-yellow transition-colors"
              >
                Help Desk
              </Link>

              <div className="flex items-center gap-1">
                <ThemeToggle />
                <NotificationBell />
              </div>

              <div className="h-4 w-px bg-line-soft hidden sm:block" />

              <div className="flex items-center gap-1.5 sm:gap-2">
                <div
                  title={displayName}
                  className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-full bg-cheesco-yellow text-xs font-black text-[#0A0D14] shadow-sm"
                >
                  {initial}
                </div>
                <button
                  onClick={handleSignOut}
                  className="rounded-lg border border-line-soft px-2 py-1 text-[11px] sm:text-xs font-bold text-ink-muted hover:text-red-500 hover:border-red-500/40 transition-colors"
                >
                  <span className="hidden sm:inline">Sign out</span>
                  <span className="sm:hidden">Exit</span>
                </button>
              </div>
            </div>
          </header>

          {/* Mobile Navigation Strip (Sticky Segmented Bar) */}
          <div className="sticky top-14 z-30 flex gap-1.5 overflow-x-auto border-b border-line-soft bg-canvas-deep/95 backdrop-blur-md px-3 py-2 scrollbar-none lg:hidden">
            {nav.map((n) => {
              const isActive = pathname === n.href;
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={`shrink-0 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all shadow-sm ${
                    isActive
                      ? "bg-cheesco-yellow text-[#0A0D14]"
                      : "bg-card border border-line-soft text-ink-muted hover:text-cheesco-yellow"
                  }`}
                >
                  <span>{n.label}</span>
                  {n.badge != null && n.badge !== 0 && (
                    <span
                      className={`rounded-full px-1.5 py-0.2 text-[9px] font-black ${
                        isActive
                          ? "bg-[#0A0D14] text-cheesco-yellow"
                          : "bg-cheesco-yellow text-[#0A0D14]"
                      }`}
                    >
                      {n.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          {/* Page Content */}
          <main className="flex-1 px-4 py-8 sm:px-8 max-w-7xl w-full mx-auto">{children}</main>
        </div>
      </div>
    </SessionContext.Provider>
  );
}
