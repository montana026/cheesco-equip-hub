/* ── Rental Request Form (Matching Screen 5) ──────────────────── */
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import type { Equipment } from '@/lib/types';
import { fmtNgnFull } from '@/lib/format';
import { useAuth } from '@/lib/contexts/auth-context';

interface RentalRequestClientProps {
  eq: Equipment;
  kind: 'rent' | 'buy';
}

export function RentalRequestClient({ eq, kind }: RentalRequestClientProps) {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    equipmentId: eq.id,
    equipmentName: eq.name,
    startDate: new Date().toISOString().split('T')[0],
    durationDays: 30,
    projectLocation: '',
    projectType: 'Construction',
    operatorRequired: false,
    deliveryRequired: true,
    additionalRequirements: '',
    customerName: profile?.full_name || '',
    phone: profile?.phone || '',
    email: profile?.email || user?.email || '',
  });

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error('Please login to submit a request');
      router.push(`/login?redirect=/request/${eq.slug}?kind=${kind}`);
      return;
    }

    if (!formData.projectLocation) {
      toast.error('Please enter a project location');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');

      const response = await fetch('/api/rentals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          equipmentId: eq.id,
          startDate: formData.startDate,
          durationDays: formData.durationDays,
          projectLocation: formData.projectLocation,
          projectType: formData.projectType,
          operatorRequired: formData.operatorRequired,
          deliveryRequired: formData.deliveryRequired,
          additionalRequirements: formData.additionalRequirements,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to submit request');
      }

      toast.success('Rental request submitted to Cheesco Operations!');
      router.push('/dashboard/customer');
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas text-ink pt-28 pb-20">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        {/* Title */}
        <div className="mb-6">
          <h1 className="text-2xl font-black text-ink tracking-tight">Request Rental</h1>
        </div>

        {/* 5-Step Process Line (Matches Screen 5: Details -> Verification -> Quotation -> Payment -> Delivery) */}
        <div className="mb-6 card-surface rounded-2xl p-4 border border-line-soft shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold">
            {[
              { id: 1, label: "Details" },
              { id: 2, label: "Verification" },
              { id: 3, label: "Quotation" },
              { id: 4, label: "Payment" },
              { id: 5, label: "Delivery" },
            ].map((st, i, arr) => (
              <div key={st.id} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-black transition-all ${
                      st.id === 1
                        ? "bg-cheesco-yellow text-canvas shadow"
                        : "bg-canvas-deep text-ink-muted ring-1 ring-line-soft"
                    }`}
                  >
                    {st.id}
                  </div>
                  <span className={`mt-1 text-[10px] ${st.id === 1 ? "text-cheesco-yellow font-bold" : "text-ink-muted"}`}>
                    {st.label}
                  </span>
                </div>
                {i < arr.length - 1 && (
                  <div className="h-0.5 flex-1 mx-2 bg-line-soft" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Section 1: Equipment Details Card */}
        <div className="card-surface rounded-2xl p-5 border border-line-soft shadow-sm mb-6">
          <h2 className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-3">
            1. Equipment Details
          </h2>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 rounded-xl bg-canvas-deep p-3.5 border border-line-soft">
            <div className="h-20 w-28 shrink-0 overflow-hidden rounded-lg bg-card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={typeof eq.images?.[0] === "string" ? eq.images[0] : ((eq.images?.[0] as any)?.image_url ?? "")}
                alt={eq.name}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-black text-ink truncate">{eq.name}</h3>
              <p className="text-[11px] text-ink-muted mt-0.5">📍 {eq.locationCity}, {eq.locationState}</p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-sm font-black text-cheesco-yellow">
                  ₦{fmtNgnFull(eq.cheescoAdjustedRate ?? eq.merchantRentalRate)}
                </span>
                <span className="text-[10px] text-ink-muted">/ month</span>
              </div>
              <div className="mt-1 text-[10px] text-ink-faint">
                📅 {eq.year} · ⏱️ {(eq.operatingHours || 0).toLocaleString()} hrs
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Rental Information Form */}
        <div className="card-surface rounded-2xl p-5 border border-line-soft shadow-sm mb-6">
          <h2 className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-3">
            2. Rental Information
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-ink mb-1">
                Duration
              </label>
              <div className="relative">
                <select
                  value={formData.durationDays}
                  onChange={(e) => updateField("durationDays", parseInt(e.target.value))}
                  className="h-10 w-full appearance-none rounded-xl bg-canvas-deep px-3 pr-8 text-xs font-semibold text-ink outline-none ring-1 ring-line-soft focus:ring-1 focus:ring-cheesco-yellow"
                >
                  <option value={7}>1 Week (7 Days)</option>
                  <option value={14}>2 Weeks (14 Days)</option>
                  <option value={30}>1 Month (30 Days)</option>
                  <option value={60}>2 Months (60 Days)</option>
                  <option value={90}>3 Months (90 Days)</option>
                  <option value={180}>6 Months (180 Days)</option>
                </select>
                <span className="pointer-events-none absolute right-3 top-3 text-xs text-ink-muted">▼</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-ink mb-1">
                Project Location
              </label>
              <input
                type="text"
                value={formData.projectLocation}
                onChange={(e) => updateField("projectLocation", e.target.value)}
                placeholder="e.g. Aba, Abia State"
                className="h-10 w-full rounded-xl bg-canvas-deep px-3 text-xs text-ink outline-none ring-1 ring-line-soft focus:ring-1 focus:ring-cheesco-yellow"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-ink mb-1">
                Additional Requirements
              </label>
              <textarea
                rows={3}
                value={formData.additionalRequirements}
                onChange={(e) => updateField("additionalRequirements", e.target.value)}
                placeholder="Need operator and delivery to site"
                className="w-full rounded-xl bg-canvas-deep p-3 text-xs text-ink outline-none ring-1 ring-line-soft focus:ring-1 focus:ring-cheesco-yellow resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <label className="flex items-center gap-2 text-xs font-medium text-ink cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.operatorRequired}
                  onChange={(e) => updateField("operatorRequired", e.target.checked)}
                  className="accent-cheesco-yellow"
                />
                <span>Include Certified Operator</span>
              </label>
              <label className="flex items-center gap-2 text-xs font-medium text-ink cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.deliveryRequired}
                  onChange={(e) => updateField("deliveryRequired", e.target.checked)}
                  className="accent-cheesco-yellow"
                />
                <span>Cheesco Logistics Delivery</span>
              </label>
            </div>
          </div>
        </div>

        {/* Next Button and Cancel */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !formData.projectLocation}
            className="h-12 w-full rounded-xl bg-cheesco-yellow font-black text-sm text-canvas shadow-md transition-all hover:bg-cheesco-yellow-bright hover:shadow-lg disabled:opacity-50"
          >
            {loading ? "Submitting..." : "Next"}
          </button>
          <div className="text-center">
            <button
              type="button"
              onClick={() => router.back()}
              className="text-xs font-semibold text-ink-muted hover:text-ink hover:underline"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
