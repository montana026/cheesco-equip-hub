"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { SessionUser } from "@/lib/auth";
import { logout } from "@/lib/auth";
import { CheescoLogo } from "./brand";
import Link from "next/link";

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
  children,
}: {
  user: SessionUser | any;
  nav: { href: string; label: string; badge?: string | number }[];
  title: string;
  children: ReactNode;
}) {
  const displayName = user?.name || user?.full_name || user?.email || "User";
  const displayRole = (user?.role || "CUSTOMER").replace(/_/g, " ");
  const initial = displayName.slice(0, 1).toUpperCase();

  return (
    <SessionContext.Provider value={user}>
      <div className="flex min-h-screen">
        {/* sidebar */}
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-line-soft bg-canvas-deep lg:flex">
          <Link href="/" className="flex items-center gap-2.5 px-5 py-5">
            <CheescoLogo size={32} />
            <span className="text-sm font-black tracking-widest">CHEESCO</span>
          </Link>
          <div className="mx-4 rounded-lg border border-line-soft bg-card px-3 py-2.5">
            <div className="truncate text-sm font-bold">{displayName}</div>
            <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-cheesco-yellow">
              <span className="h-1.5 w-1.5 rounded-full bg-cheesco-yellow" />
              {displayRole}
            </div>
          </div>
          <nav className="mt-4 flex-1 space-y-1 px-3 pb-6">
            {nav.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-semibold text-ink-muted transition-colors hover:bg-card hover:text-cheesco-yellow"
              >
                {n.label}
                {n.badge != null && n.badge !== 0 && (
                  <span className="rounded-full bg-cheesco-yellow px-2 py-0.5 text-[10px] font-black text-canvas">
                    {n.badge}
                  </span>
                )}
              </Link>
            ))}
          </nav>
          <div className="border-t border-line-soft p-3">
            <button
              onClick={() => { logout(); window.location.href = "/"; }}
              className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-ink-muted hover:bg-card hover:text-danger"
            >
              Sign out
            </button>
          </div>
        </aside>

        {/* main */}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-40 flex h-16 items-center justify-between gap-4 border-b border-line-soft bg-canvas/85 px-4 backdrop-blur-xl sm:px-8">
            <h1 className="text-lg font-black tracking-tight">{title}</h1>
            <div className="flex items-center gap-3">
              <span className="hidden text-xs text-ink-faint sm:block">{user?.email ?? ""}</span>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-cheesco-yellow text-sm font-black text-canvas">
                {initial}
              </div>
              <button
                onClick={() => { logout(); window.location.href = "/"; }}
                className="rounded-lg border border-line-soft px-3 py-1.5 text-xs font-bold text-ink-muted hover:text-danger lg:hidden"
              >
                Sign out
              </button>
            </div>
          </header>
          {/* mobile nav strip */}
          <div className="flex gap-1 overflow-x-auto border-b border-line-soft bg-canvas-deep px-3 py-2 lg:hidden">
            {nav.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold text-ink-muted hover:text-cheesco-yellow"
              >
                {n.label}
              </Link>
            ))}
          </div>
          <main className="flex-1 px-4 py-8 sm:px-8">{children}</main>
        </div>
      </div>
    </SessionContext.Provider>
  );
}
