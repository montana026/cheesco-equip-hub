/* ── Equipment Rental & Purchase Request Client ──────────────────── */
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import type { Equipment } from '@/lib/types';
import { fmtNgnFull } from '@/lib/format';
import { useAuth } from '@/lib/contexts/auth-context';
import { apiFetch } from '@/lib/api-client';

interface RentalRequestClientProps {
  eq: Equipment;
  kind: 'rent' | 'buy';
}

export function RentalRequestClient({ eq, kind }: RentalRequestClientProps) {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);

  const targetUrl = `/request/${eq.slug}?kind=${kind}`;
  const isPurchase = kind === 'buy';

  const [formData, setFormData] = useState({
    equipmentId: eq.id,
    equipmentName: eq.name,
    // Rental fields
    startDate: new Date().toISOString().split('T')[0],
    durationDays: 1,
    customDays: '',
    isCustomDuration: false,
    projectLocation: '',
    projectType: 'Construction',
    scopeOfWork: '',
    maxTonnage: '',
    operatorRequired: false,
    deliveryRequired: true,
    additionalRequirements: '',
    customerName: profile?.full_name || profile?.name || '',
    phone: profile?.phone || '',
    email: profile?.email || user?.email || '',
    // Purchase-specific fields
    intendedIndustry: 'Civil Construction & Earthworks',
    inspectionPreference: 'PHYSICAL_ON_SITE',
    inspectionDate: '',
    paymentPreference: 'ESCROW_MILESTONE',
    companyName: profile?.company || profile?.full_name || '',
    rcNumber: '',
  });

  // Sync profile information when auth state resolves
  useEffect(() => {
    if (profile || user) {
      setFormData(prev => ({
        ...prev,
        customerName: prev.customerName || profile?.full_name || profile?.name || '',
        phone: prev.phone || profile?.phone || '',
        email: prev.email || profile?.email || user?.email || '',
        companyName: prev.companyName || profile?.company || profile?.full_name || '',
      }));
    }
  }, [profile, user]);

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error('Please log in to submit your request');
      router.push(`/login?redirect=${encodeURIComponent(targetUrl)}`);
      return;
    }

    if (eq.listingType === 'FOR_SALE' && !isPurchase) {
      toast.error('This equipment is listed exclusively for outright purchase and cannot be rented.');
      return;
    }

    if (eq.listingType === 'FOR_RENT' && isPurchase) {
      toast.error('This equipment is listed exclusively for rental lease and cannot be purchased.');
      return;
    }

    if (!formData.projectLocation.trim()) {
      toast.error(
        isPurchase
          ? 'Please enter delivery destination or company yard address'
          : 'Please enter a project location'
      );
      return;
    }

    if (!isPurchase && !formData.scopeOfWork.trim()) {
      toast.error('Please enter the scope of work / nature of job');
      return;
    }

    const durationDays = formData.isCustomDuration
      ? Math.max(1, Number(formData.customDays) || 1)
      : Math.max(1, Number(formData.durationDays) || 1);

    setLoading(true);
    try {
      const startDateObj = new Date(formData.startDate);
      const endDateObj = new Date(startDateObj.getTime() + durationDays * 24 * 60 * 60 * 1000);

      const payload = isPurchase
        ? {
            equipmentId: eq.id,
            kind: 'buy',
            requestType: 'PURCHASE',
            projectLocation: formData.projectLocation.trim(),
            intendedIndustry: formData.intendedIndustry,
            inspectionPreference: formData.inspectionPreference,
            inspectionDate: formData.inspectionDate,
            paymentPreference: formData.paymentPreference,
            companyName: formData.companyName.trim(),
            rcNumber: formData.rcNumber.trim(),
            deliveryRequired: formData.deliveryRequired,
            additionalRequirements: formData.additionalRequirements.trim(),
          }
        : {
            equipmentId: eq.id,
            kind: 'rent',
            requestType: 'RENTAL',
            startDate: formData.startDate,
            endDate: endDateObj.toISOString().split('T')[0],
            durationDays,
            projectLocation: formData.projectLocation.trim(),
            projectType: formData.scopeOfWork.trim(),
            scopeOfWork: formData.scopeOfWork.trim(),
            maxTonnage: formData.maxTonnage.trim(),
            operatorRequired: formData.operatorRequired,
            deliveryRequired: formData.deliveryRequired,
            additionalRequirements: formData.additionalRequirements.trim(),
          };

      const response = await apiFetch('/api/rentals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.status === 401) {
        toast.error('Session expired. Please log in again.');
        router.push(`/login?redirect=${encodeURIComponent(targetUrl)}`);
        return;
      }

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to submit request');
      }

      toast.success(
        isPurchase
          ? 'Purchase request submitted! Cheesco Operations will verify title, mechanical diagnostics, and issue a Proforma Invoice.'
          : 'Rental request submitted to Cheesco Operations!'
      );
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
        {/* Back link */}
        <div className="mb-4">
          <Link
            href={`/equipment/${eq.slug}`}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-ink-muted hover:text-cheesco-yellow transition-colors"
          >
            <span>←</span>
            <span>Back to {eq.name}</span>
          </Link>
        </div>

        {/* Title & Badge */}
        <div className="mb-6">
          <div className="inline-flex items-center gap-2 rounded-lg bg-cheesco-yellow/15 px-3 py-1 text-xs font-black text-cheesco-yellow border border-cheesco-yellow/30 mb-2">
            <span>{isPurchase ? '🤝 OUTRIGHT ASSET ACQUISITION' : '🚜 COMMERCIAL LEASE / RENTAL'}</span>
          </div>
          <h1 className="text-2xl font-black text-ink tracking-tight">
            {isPurchase ? 'Request Equipment Purchase' : 'Request Equipment Rental'}
          </h1>
          <p className="text-xs text-ink-muted mt-1">
            {isPurchase
              ? 'Specify your yard delivery location, technical inspection timing, and payment structure. Cheesco verifies ownership title, customs clearance, and provides an official Proforma Invoice.'
              : 'Submit your rental duration, scope of work, and site location. Cheesco verifies availability and prepares your official quotation.'}
          </p>
        </div>

        {/* Guest alert if not authenticated */}
        {!user && (
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-cheesco-yellow/30 bg-cheesco-yellow/10 p-4 text-xs text-ink">
            <div className="flex items-center gap-2.5">
              <span className="text-base">🔒</span>
              <div>
                <span className="font-bold">You are browsing as a guest.</span>
                <p className="text-[11px] text-ink-muted mt-0.5">
                  Sign in or create an account to submit your request and track it in your customer dashboard.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => router.push(`/login?redirect=${encodeURIComponent(targetUrl)}`)}
              className="shrink-0 self-start sm:self-auto rounded-xl bg-cheesco-yellow px-4 py-2 text-xs font-black text-[#0A0D14] hover:bg-cheesco-yellow-bright transition-all shadow-sm"
            >
              Sign In
            </button>
          </div>
        )}

        {/* 5-Step Process Bar Tailored for Purchase vs Rental */}
        <div className="mb-6 card-surface rounded-2xl p-4 border border-line-soft shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold">
            {(isPurchase
              ? [
                  { id: 1, label: 'Purchase Request' },
                  { id: 2, label: 'Title Audit' },
                  { id: 3, label: 'Inspection' },
                  { id: 4, label: 'Escrow Deposit' },
                  { id: 5, label: 'Title & Handover' },
                ]
              : [
                  { id: 1, label: 'Request Details' },
                  { id: 2, label: 'Verification' },
                  { id: 3, label: 'Quotation' },
                  { id: 4, label: 'Payment' },
                  { id: 5, label: 'Site Delivery' },
                ]
            ).map((st, i, arr) => (
              <div key={st.id} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-black transition-all ${
                      st.id === 1
                        ? 'bg-cheesco-yellow text-[#0A0D14] shadow'
                        : 'bg-canvas-deep text-ink-muted ring-1 ring-line-soft'
                    }`}
                  >
                    {st.id}
                  </div>
                  <span className={`mt-1 text-[10px] text-center ${st.id === 1 ? 'text-cheesco-yellow font-bold' : 'text-ink-muted'}`}>
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
            1. Equipment Overview
          </h2>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 rounded-xl bg-canvas-deep p-3.5 border border-line-soft">
            <div className="h-20 w-28 shrink-0 overflow-hidden rounded-lg bg-card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={typeof eq.images?.[0] === 'string' ? eq.images[0] : ((eq.images?.[0] as any)?.image_url ?? '')}
                alt={eq.name}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-black text-ink truncate">{eq.name}</h3>
              <p className="text-[11px] text-ink-muted mt-0.5">📍 Current Yard: {eq.locationCity}, {eq.locationState}</p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-sm font-black text-cheesco-yellow">
                  ₦{fmtNgnFull(
                    isPurchase && eq.salePrice
                      ? eq.salePrice
                      : eq.cheescoAdjustedRate ?? eq.merchantRentalRate ?? 0
                  )}
                </span>
                <span className="text-[10px] text-ink-muted">
                  {isPurchase ? 'Outright Sale Price' : '/ day'}
                </span>
              </div>
              <div className="mt-1 text-[10px] text-ink-faint">
                📅 Year: {eq.year} · ⏱️ {(eq.operatingHours || 0).toLocaleString()} Operating Hours · Condition: {eq.condition}
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Requirements Form (Distinct for Purchase vs Rental) */}
        <div className="card-surface rounded-2xl p-5 border border-line-soft shadow-sm mb-6">
          <h2 className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-3">
            2. {isPurchase ? 'Purchase & Acquisition Requirements' : 'Rental Information & Requirements'}
          </h2>

          {isPurchase ? (
            /* ── Purchase-Specific Form ── */
            <div className="space-y-4">
              {/* Delivery / Destination Yard Address */}
              <div>
                <label className="block text-xs font-bold text-ink mb-1">
                  Delivery Destination / Company Yard Address <span className="text-cheesco-yellow">*</span>
                </label>
                <input
                  type="text"
                  value={formData.projectLocation}
                  onChange={(e) => updateField('projectLocation', e.target.value)}
                  placeholder="e.g. Plot 12, Trans-Amadi Industrial Layout, Port Harcourt, Rivers State"
                  className="h-10 w-full rounded-xl bg-canvas-deep px-3 text-xs text-ink outline-none ring-1 ring-line-soft focus:ring-1 focus:ring-cheesco-yellow"
                  required
                />
                <p className="text-[10px] text-ink-muted mt-0.5">
                  The facility, yard, or project hub where ownership title and physical machinery will be transferred.
                </p>
              </div>

              {/* Operating Industry / Intended Application */}
              <div>
                <label className="block text-xs font-bold text-ink mb-1">
                  Intended Operating Sector / Industry
                </label>
                <select
                  value={formData.intendedIndustry}
                  onChange={(e) => updateField('intendedIndustry', e.target.value)}
                  className="h-10 w-full rounded-xl bg-canvas-deep px-3 text-xs font-semibold text-ink outline-none ring-1 ring-line-soft focus:ring-1 focus:ring-cheesco-yellow"
                >
                  <option value="Civil Construction & Earthworks">Civil Construction & Earthworks</option>
                  <option value="Mining, Quarrying & Solid Minerals">Mining, Quarrying & Solid Minerals</option>
                  <option value="Road Construction & Asphalt Paving">Road Construction & Asphalt Paving</option>
                  <option value="Commercial Agriculture & Land Clearing">Commercial Agriculture & Land Clearing</option>
                  <option value="Marine, Dredging & Port Operations">Marine, Dredging & Port Operations</option>
                  <option value="Heavy Haulage, Logistics & Towing">Heavy Haulage, Logistics & Towing</option>
                  <option value="Plant Hire Fleet Expansion">Plant Hire Fleet Expansion</option>
                  <option value="Industrial Manufacturing & Facilities">Industrial Manufacturing & Facilities</option>
                </select>
              </div>

              {/* Physical Inspection & Technical Audit Schedule */}
              <div className="rounded-xl border border-line-soft bg-canvas-deep/70 p-3.5 space-y-2.5">
                <label className="block text-xs font-bold text-ink">
                  Technical Inspection & Verification Preference
                </label>
                <div className="space-y-2">
                  {[
                    {
                      id: 'PHYSICAL_ON_SITE',
                      label: 'On-Site Physical Inspection (Recommended)',
                      desc: 'You or your appointed mechanic/engineer will inspect the machine on-site before payment release.',
                    },
                    {
                      id: 'DIAGNOSTIC_AUDIT',
                      label: 'Cheesco 50-Point Certified Mechanical Audit',
                      desc: 'Cheesco heavy equipment engineers conduct comprehensive hydraulic, engine, and structural diagnostics on your behalf.',
                    },
                    {
                      id: 'DIRECT_PURCHASE',
                      label: 'Direct Purchase Inquiry',
                      desc: 'Proceed directly with verified merchant title documentation and Proforma Invoice.',
                    },
                  ].map((opt) => (
                    <label key={opt.id} className="flex items-start gap-2.5 cursor-pointer text-xs">
                      <input
                        type="radio"
                        name="inspectionPreference"
                        value={opt.id}
                        checked={formData.inspectionPreference === opt.id}
                        onChange={(e) => updateField('inspectionPreference', e.target.value)}
                        className="mt-0.5 accent-cheesco-yellow"
                      />
                      <div>
                        <div className="font-bold text-ink">{opt.label}</div>
                        <div className="text-[11px] text-ink-muted">{opt.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>

                {formData.inspectionPreference === 'PHYSICAL_ON_SITE' && (
                  <div className="pt-2 border-t border-line-soft/60">
                    <label className="block text-[11px] font-bold text-ink mb-1">
                      Preferred Inspection Date
                    </label>
                    <input
                      type="date"
                      value={formData.inspectionDate}
                      onChange={(e) => updateField('inspectionDate', e.target.value)}
                      className="h-9 w-full sm:w-48 rounded-xl bg-canvas px-3 text-xs text-ink outline-none ring-1 ring-line-soft focus:ring-1 focus:ring-cheesco-yellow"
                    />
                  </div>
                )}
              </div>

              {/* Purchaser Legal Entity & Company Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-ink mb-1">
                    Purchasing Company / Buyer Entity
                  </label>
                  <input
                    type="text"
                    value={formData.companyName}
                    onChange={(e) => updateField('companyName', e.target.value)}
                    placeholder="e.g. Julius & Sons Engineering Ltd"
                    className="h-10 w-full rounded-xl bg-canvas-deep px-3 text-xs text-ink outline-none ring-1 ring-line-soft focus:ring-1 focus:ring-cheesco-yellow"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-ink mb-1">
                    CAC RC / BN Number or Tax ID (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.rcNumber}
                    onChange={(e) => updateField('rcNumber', e.target.value)}
                    placeholder="e.g. RC-1489021 (For Bill of Sale & Title Transfer)"
                    className="h-10 w-full rounded-xl bg-canvas-deep px-3 text-xs text-ink outline-none ring-1 ring-line-soft focus:ring-1 focus:ring-cheesco-yellow"
                  />
                </div>
              </div>

              {/* Preferred Payment & Escrow Structure */}
              <div>
                <label className="block text-xs font-bold text-ink mb-1">
                  Preferred Payment & Settlement Structure
                </label>
                <select
                  value={formData.paymentPreference}
                  onChange={(e) => updateField('paymentPreference', e.target.value)}
                  className="h-10 w-full rounded-xl bg-canvas-deep px-3 text-xs font-semibold text-ink outline-none ring-1 ring-line-soft focus:ring-1 focus:ring-cheesco-yellow"
                >
                  <option value="ESCROW_MILESTONE">Cheesco Secured Escrow (100% Protected until title transfer & sign-off)</option>
                  <option value="BANK_WIRE">Direct Commercial Wire Transfer / Certified Bank Draft</option>
                  <option value="ASSET_FINANCING">Equipment Asset Financing / Bank Guarantee (Cheesco Partner)</option>
                </select>
                <p className="text-[10px] text-ink-muted mt-0.5">
                  Cheesco Escrow ensures funds are held securely and only disbursed to the seller after title handover.
                </p>
              </div>

              {/* Logistics & Delivery */}
              <div className="pt-1">
                <label className="flex items-center gap-2 text-xs font-medium text-ink cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.deliveryRequired}
                    onChange={(e) => updateField('deliveryRequired', e.target.checked)}
                    className="accent-cheesco-yellow"
                  />
                  <span>Include Cheesco Heavy Haulage (Lowbed Delivery to Destination Yard)</span>
                </label>
              </div>

              {/* Additional Requirements / Special Notes */}
              <div>
                <label className="block text-xs font-bold text-ink mb-1">
                  Additional Purchase Notes / Trade-in Inquiry
                </label>
                <textarea
                  rows={3}
                  value={formData.additionalRequirements}
                  onChange={(e) => updateField('additionalRequirements', e.target.value)}
                  placeholder="Specific bucket/boom attachment requirements, spare parts package, trade-in details, etc."
                  className="w-full rounded-xl bg-canvas-deep p-3 text-xs text-ink outline-none ring-1 ring-line-soft focus:ring-1 focus:ring-cheesco-yellow resize-none"
                />
              </div>
            </div>
          ) : (
            /* ── Rental-Specific Form ── */
            <div className="space-y-4">
              {/* Rental Duration with Quick 1-Day & 2-Day Selection */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-ink">
                    Rental Duration
                  </label>
                  <span className="text-[11px] text-cheesco-yellow font-bold">
                    {formData.isCustomDuration
                      ? `${formData.customDays || 1} day(s) selected`
                      : `${formData.durationDays} day(s) selected`}
                  </span>
                </div>

                {/* Quick Select Buttons */}
                <div className="grid grid-cols-5 gap-1.5 mb-2.5">
                  {[
                    { days: 1, label: '1 Day' },
                    { days: 2, label: '2 Days' },
                    { days: 3, label: '3 Days' },
                    { days: 7, label: '1 Week' },
                    { days: 30, label: '1 Month' },
                  ].map((preset) => {
                    const isSelected =
                      !formData.isCustomDuration && formData.durationDays === preset.days;
                    return (
                      <button
                        key={preset.days}
                        type="button"
                        onClick={() => {
                          updateField('isCustomDuration', false);
                          updateField('durationDays', preset.days);
                        }}
                        className={`py-2 px-1 rounded-xl text-[11px] font-bold border transition-all text-center ${
                          isSelected
                            ? 'bg-cheesco-yellow text-[#0A0D14] border-cheesco-yellow shadow-sm'
                            : 'bg-canvas-deep text-ink-muted border-line-soft hover:border-cheesco-yellow/50 hover:text-ink'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>

                <div className="relative">
                  <select
                    value={formData.isCustomDuration ? 'custom' : formData.durationDays}
                    onChange={(e) => {
                      if (e.target.value === 'custom') {
                        updateField('isCustomDuration', true);
                        if (!formData.customDays) updateField('customDays', '1');
                      } else {
                        updateField('isCustomDuration', false);
                        updateField('durationDays', parseInt(e.target.value));
                      }
                    }}
                    className="h-10 w-full appearance-none rounded-xl bg-canvas-deep px-3 pr-8 text-xs font-semibold text-ink outline-none ring-1 ring-line-soft focus:ring-1 focus:ring-cheesco-yellow"
                  >
                    <option value={1}>1 Day (Single Day Job)</option>
                    <option value={2}>2 Days</option>
                    <option value={3}>3 Days</option>
                    <option value={5}>5 Days</option>
                    <option value={7}>1 Week (7 Days)</option>
                    <option value={14}>2 Weeks (14 Days)</option>
                    <option value={30}>1 Month (30 Days)</option>
                    <option value={60}>2 Months (60 Days)</option>
                    <option value={90}>3 Months (90 Days)</option>
                    <option value={180}>6 Months (180 Days)</option>
                    <option value="custom">Custom Duration (Type specific number of days)...</option>
                  </select>
                  <span className="pointer-events-none absolute right-3 top-3 text-xs text-ink-muted">▼</span>
                </div>

                {formData.isCustomDuration && (
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max="365"
                      value={formData.customDays}
                      onChange={(e) => updateField('customDays', e.target.value)}
                      placeholder="Enter days (e.g. 1 or 2)"
                      className="h-9 w-32 rounded-xl bg-canvas-deep px-3 text-xs font-bold text-ink outline-none ring-1 ring-cheesco-yellow focus:ring-2"
                    />
                    <span className="text-xs text-ink-muted font-medium">Day(s) rental period</span>
                  </div>
                )}
              </div>

              {/* Scope of Work / Nature of Job */}
              <div>
                <label className="block text-xs font-bold text-ink mb-1">
                  Scope of Work / Nature of Job <span className="text-cheesco-yellow">*</span>
                </label>
                <input
                  type="text"
                  value={formData.scopeOfWork}
                  onChange={(e) => updateField('scopeOfWork', e.target.value)}
                  placeholder="e.g. Heavy earthmoving, foundation excavation, road compaction, dredging"
                  className="h-10 w-full rounded-xl bg-canvas-deep px-3 text-xs text-ink outline-none ring-1 ring-line-soft focus:ring-1 focus:ring-cheesco-yellow"
                  required
                />
                <p className="text-[10px] text-ink-muted mt-0.5">
                  Describe the specific tasks, ground conditions, or operations the equipment will perform.
                </p>
              </div>

              {/* Max Tonnage of Load */}
              <div>
                <label className="block text-xs font-bold text-ink mb-1">
                  Max Tonnage of Load (Tonnes)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={formData.maxTonnage}
                    onChange={(e) => updateField('maxTonnage', e.target.value)}
                    placeholder="e.g. 25 (maximum payload or operating tonnage required)"
                    className="h-10 w-full rounded-xl bg-canvas-deep px-3 pr-16 text-xs text-ink outline-none ring-1 ring-line-soft focus:ring-1 focus:ring-cheesco-yellow"
                  />
                  <span className="pointer-events-none absolute right-3 top-2.5 text-xs font-bold text-ink-muted">
                    Tonnes
                  </span>
                </div>
                <p className="text-[10px] text-ink-muted mt-0.5">
                  Specifies lifting capacity, bucket load, or payload weight requirement for operations matching.
                </p>
              </div>

              {/* Project Location */}
              <div>
                <label className="block text-xs font-bold text-ink mb-1">
                  Project Location / Site Address <span className="text-cheesco-yellow">*</span>
                </label>
                <input
                  type="text"
                  value={formData.projectLocation}
                  onChange={(e) => updateField('projectLocation', e.target.value)}
                  placeholder="e.g. Aba, Abia State (Full site address or milestone marker)"
                  className="h-10 w-full rounded-xl bg-canvas-deep px-3 text-xs text-ink outline-none ring-1 ring-line-soft focus:ring-1 focus:ring-cheesco-yellow"
                  required
                />
              </div>

              {/* Additional Requirements */}
              <div>
                <label className="block text-xs font-bold text-ink mb-1">
                  Additional Requirements / Special Notes
                </label>
                <textarea
                  rows={3}
                  value={formData.additionalRequirements}
                  onChange={(e) => updateField('additionalRequirements', e.target.value)}
                  placeholder="Access road restrictions, special attachments needed, site shift hours, etc."
                  className="w-full rounded-xl bg-canvas-deep p-3 text-xs text-ink outline-none ring-1 ring-line-soft focus:ring-1 focus:ring-cheesco-yellow resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <label className="flex items-center gap-2 text-xs font-medium text-ink cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.operatorRequired}
                    onChange={(e) => updateField('operatorRequired', e.target.checked)}
                    className="accent-cheesco-yellow"
                  />
                  <span>Include Certified Operator</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-medium text-ink cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.deliveryRequired}
                    onChange={(e) => updateField('deliveryRequired', e.target.checked)}
                    className="accent-cheesco-yellow"
                  />
                  <span>Cheesco Logistics Delivery</span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Submit Button and Cancel */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || (Boolean(user) && !formData.projectLocation)}
            className="h-12 w-full rounded-xl bg-cheesco-yellow font-black text-sm text-[#0A0D14] shadow-md transition-all hover:bg-cheesco-yellow-bright hover:shadow-lg disabled:opacity-50"
          >
            {loading
              ? 'Submitting...'
              : !user
              ? 'Sign In to Submit Request'
              : isPurchase
              ? 'Submit Purchase Request'
              : 'Submit Rental Request'}
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
