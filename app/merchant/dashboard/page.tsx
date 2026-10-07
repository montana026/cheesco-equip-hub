"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSession, guardRoute } from "@/lib/auth";
import type { SessionUser } from "@/lib/auth";
import { DashboardShell } from "@/components/dashboard-shell";
import Link from "next/link";

const NAV = [
  { href: "/merchant/dashboard", label: "Overview" },
  { href: "/merchant/listings", label: "My Listings" },
  { href: "/merchant/ads", label: "Ad Campaigns" },
  { href: "/merchant/earnings", label: "Earnings" },
  { href: "/merchant/verification", label: "Verification (KYC)" },
];

export default function MerchantDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [tab, setTab] = useState<"ALL" | "SALE" | "RENT">("ALL");

  useEffect(() => {
    const s = getSession();
    const redirect = guardRoute("MERCHANT", s);
    if (redirect) { router.replace(redirect); return; }
    setUser(s);
  }, [router]);

  if (!user) return <div className="min-h-screen bg-canvas" />;

  const sampleEquipment = [
    {
      id: "1",
      name: "CAT 320 Excavator",
      loc: "Lagos",
      type: "Rent",
      status: "Available",
      statusColor: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
      price: "₦500,000 / day",
      img: "https://images.unsplash.com/photo-1526835657244-e8a5c2c0e3c2?auto=format&fit=crop&w=200&q=70",
    },
    {
      id: "2",
      name: "Komatsu WA380 Loader",
      loc: "Lagos",
      type: "Sale",
      status: "Available",
      statusColor: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
      price: "₦65,000,000",
      img: "https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=200&q=70",
    },
    {
      id: "3",
      name: "50T Mobile Crane",
      loc: "Port Harcourt",
      type: "Rent",
      status: "Rented",
      statusColor: "bg-red-500/15 text-red-400 border-red-500/30",
      price: "₦850,000 / day",
      img: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=200&q=70",
    },
    {
      id: "4",
      name: "Howo Dump Truck",
      loc: "Port Harcourt",
      type: "Sale",
      status: "Available",
      statusColor: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
      price: "₦28,000,000",
      img: "https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=200&q=70",
    },
  ];

  const filteredEquipment = sampleEquipment.filter((item) => {
    if (tab === "SALE") return item.type === "Sale";
    if (tab === "RENT") return item.type === "Rent";
    return true;
  });

  return (
    <DashboardShell user={user} nav={NAV} title="Merchant Dashboard">
      {/* 4 Stat Metric Cards (Exact match to Screen 6) */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Active Listings" value="18" />
        <StatCard label="In Rent" value="12" />
        <StatCard label="Rental Requests" value="7" />
        <StatCard label="Sales Enquiries" value="4" />
      </div>

      {/* My Equipment Section (Matches Screen 6) */}
      <div className="mt-8 card-surface rounded-2xl p-6 border border-line-soft shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-line-soft pb-4">
          <div>
            <h2 className="text-base font-black text-ink">My Equipment</h2>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Tabs */}
            <div className="flex rounded-xl bg-canvas-deep p-1 ring-1 ring-line-soft">
              <button
                type="button"
                onClick={() => setTab("ALL")}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${
                  tab === "ALL"
                    ? "bg-cheesco-yellow text-canvas shadow-sm"
                    : "text-ink-muted hover:text-ink"
                }`}
              >
                All (18)
              </button>
              <button
                type="button"
                onClick={() => setTab("SALE")}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${
                  tab === "SALE"
                    ? "bg-cheesco-yellow text-canvas shadow-sm"
                    : "text-ink-muted hover:text-ink"
                }`}
              >
                For Sale (10)
              </button>
              <button
                type="button"
                onClick={() => setTab("RENT")}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${
                  tab === "RENT"
                    ? "bg-cheesco-yellow text-canvas shadow-sm"
                    : "text-ink-muted hover:text-ink"
                }`}
              >
                For Rent (8)
              </button>
            </div>

            {/* + List Equipment Button */}
            <Link
              href="/merchant/listings/new"
              className="flex items-center gap-1.5 rounded-xl bg-cheesco-yellow px-4 py-2 text-xs font-black text-canvas shadow transition-all hover:bg-cheesco-yellow-bright hover:shadow-lg"
            >
              <span>+ List Equipment</span>
            </Link>
          </div>
        </div>

        {/* Equipment List Table */}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-xs">
            <thead>
              <tr className="border-b border-line-soft text-left font-bold uppercase tracking-wider text-ink-faint">
                <th className="pb-3 pr-4">Equipment</th>
                <th className="pb-3 pr-4">Location</th>
                <th className="pb-3 pr-4">Type</th>
                <th className="pb-3 pr-4">Status</th>
                <th className="pb-3 pr-4">Rate / Price</th>
                <th className="pb-3 pr-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-soft">
              {filteredEquipment.map((eq) => (
                <tr key={eq.id} className="hover:bg-card-raised/50 transition-colors">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-3">
                      <div className="h-11 w-14 shrink-0 overflow-hidden rounded-lg bg-canvas-deep">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={eq.img} alt={eq.name} className="h-full w-full object-cover" />
                      </div>
                      <span className="font-bold text-ink">{eq.name}</span>
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-ink-muted">{eq.loc}</td>
                  <td className="py-3 pr-4">
                    <span className="rounded-md bg-canvas-deep px-2 py-0.5 text-[10px] font-bold text-ink ring-1 ring-line-soft">
                      {eq.type}
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${eq.statusColor}`}>
                      {eq.status}
                    </span>
                  </td>
                  <td className="py-3 pr-4 font-bold text-cheesco-yellow">{eq.price}</td>
                  <td className="py-3 pr-4 text-right">
                    <Link
                      href="/merchant/listings"
                      className="rounded-lg bg-canvas-deep px-2.5 py-1 text-[11px] font-bold text-ink-muted hover:text-cheesco-yellow ring-1 ring-line-soft"
                    >
                      Manage
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardShell>
  );
}

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="card-surface rounded-2xl p-5 border border-line-soft shadow-sm">
      <div className="text-[11px] font-bold uppercase tracking-wider text-ink-faint">{label}</div>
      <div className={`mt-1 text-2xl font-black ${accent ? "text-cheesco-yellow" : "text-ink"}`}>
        {value}
      </div>
      {sub && <div className="mt-1 text-xs text-ink-muted">{sub}</div>}
    </div>
  );
}
