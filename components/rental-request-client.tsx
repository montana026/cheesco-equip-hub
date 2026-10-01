/* ── Rental/Purchase Request Form (3-Step Modal) ──────────────────── */
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
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
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    // Equipment info (auto-filled)
    equipmentId: eq.id,
    equipmentName: eq.name,

    // Rental details
    startDate: '',
    durationDays: 7,
    projectLocation: '',
    projectType: '',
    operatorRequired: false,
    deliveryRequired: true,
    additionalRequirements: '',

    // Customer info
    customerName: profile?.full_name || '',
    companyName: '',
    phone: profile?.phone || '',
    email: profile?.email || user?.email || '',
    projectDescription: '',
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
          projectDescription: formData.projectDescription,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to submit request');
      }

      toast.success('Request submitted successfully!');
      router.push('/dashboard/customer');
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  const canProceed = () => {
    if (step === 1) return true;
    if (step === 2) {
      return formData.startDate && formData.projectLocation && formData.projectType;
    }
    if (step === 3) {
      return formData.customerName && formData.phone && formData.email;
    }
    return false;
  };

  const rate = eq.cheescoAdjustedRate ?? eq.merchantRentalRate;
  const estimatedTotal = rate * formData.durationDays;

  return (
    <div className="min-h-screen bg-black text-white pt-24 pb-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="text-zinc-400 hover:text-white text-sm mb-4 flex items-center gap-2"
          >
            ← Back to Equipment
          </button>
          <h1 className="text-3xl font-bold">
            {kind === 'rent' ? 'Request to Rent' : 'Request to Buy'}
          </h1>
          <p className="text-zinc-400 mt-2">
            Submit your request — Cheesco will verify and prepare a quotation
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
          {/* Form Section */}
          <div>
            {/* Progress Steps */}
            <div className="flex items-center justify-between mb-8">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex items-center flex-1">
                  <div className="flex items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition ${
                        s === step
                          ? 'bg-yellow-500 text-black'
                          : s < step
                          ? 'bg-green-500 text-white'
                          : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      {s < step ? '✓' : s}
                    </div>
                    <span className={`ml-3 text-sm font-medium ${s === step ? 'text-white' : 'text-zinc-500'}`}>
                      {s === 1 ? 'Equipment' : s === 2 ? 'Details' : 'Contact'}
                    </span>
                  </div>
                  {s < 3 && (
                    <div
                      className={`flex-1 h-1 mx-4 ${
                        s < step ? 'bg-green-500' : 'bg-zinc-800'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Step Content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-zinc-900 border border-zinc-800 rounded-lg p-6"
              >
                {/* Step 1: Equipment Confirmation */}
                {step === 1 && (
                  <div>
                    <h2 className="text-xl font-bold mb-4">Equipment Selected</h2>
                    <div className="flex gap-4">
                      <img
                        src={eq.images[0]}
                        alt={eq.name}
                        className="w-32 h-32 object-cover rounded-lg"
                      />
                      <div className="flex-1">
                        <h3 className="font-bold text-lg">{eq.name}</h3>
                        <p className="text-sm text-zinc-400 mt-1">
                          {eq.brand} {eq.model} • {eq.year}
                        </p>
                        <p className="text-sm text-zinc-400">
                          {eq.locationCity}, {eq.locationState}
                        </p>
                        {kind === 'rent' && (
                          <p className="text-yellow-500 font-bold mt-2">
                            ₦{fmtNgnFull(rate)} / day
                          </p>
                        )}
                        {kind === 'buy' && eq.salePrice && (
                          <p className="text-yellow-500 font-bold mt-2">
                            ₦{fmtNgnFull(eq.salePrice)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 2: Rental/Purchase Details */}
                {step === 2 && (
                  <div className="space-y-4">
                    <h2 className="text-xl font-bold mb-4">
                      {kind === 'rent' ? 'Rental Details' : 'Purchase Details'}
                    </h2>

                    {kind === 'rent' && (
                      <>
                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Start Date <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="date"
                            value={formData.startDate}
                            onChange={(e) => updateField('startDate', e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                            className="w-full bg-zinc-800 border border-zinc-700 rounded px-4 py-2 focus:outline-none focus:border-yellow-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Duration (days) <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            value={formData.durationDays}
                            onChange={(e) => updateField('durationDays', parseInt(e.target.value))}
                            min={1}
                            className="w-full bg-zinc-800 border border-zinc-700 rounded px-4 py-2 focus:outline-none focus:border-yellow-500"
                          />
                          <p className="text-xs text-zinc-500 mt-1">
                            Estimated total: ₦{fmtNgnFull(estimatedTotal)}
                          </p>
                        </div>
                      </>
                    )}

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Project Location <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.projectLocation}
                        onChange={(e) => updateField('projectLocation', e.target.value)}
                        placeholder="e.g., Lekki Phase 1, Lagos"
                        className="w-full bg-zinc-800 border border-zinc-700 rounded px-4 py-2 focus:outline-none focus:border-yellow-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Project Type <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.projectType}
                        onChange={(e) => updateField('projectType', e.target.value)}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded px-4 py-2 focus:outline-none focus:border-yellow-500"
                      >
                        <option value="">Select project type</option>
                        <option value="Construction">Construction</option>
                        <option value="Infrastructure">Infrastructure</option>
                        <option value="Oil & Gas">Oil & Gas</option>
                        <option value="Mining">Mining</option>
                        <option value="Dredging">Dredging</option>
                        <option value="Agriculture">Agriculture</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    {kind === 'rent' && (
                      <>
                        <div className="flex items-center gap-6">
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={formData.operatorRequired}
                              onChange={(e) => updateField('operatorRequired', e.target.checked)}
                              className="w-4 h-4 accent-yellow-500"
                            />
                            <span className="text-sm">Operator Required</span>
                          </label>

                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={formData.deliveryRequired}
                              onChange={(e) => updateField('deliveryRequired', e.target.checked)}
                              className="w-4 h-4 accent-yellow-500"
                            />
                            <span className="text-sm">Delivery Required</span>
                          </label>
                        </div>
                      </>
                    )}

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Additional Requirements
                      </label>
                      <textarea
                        value={formData.additionalRequirements}
                        onChange={(e) => updateField('additionalRequirements', e.target.value)}
                        placeholder="Any specific requirements or questions..."
                        rows={3}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded px-4 py-2 focus:outline-none focus:border-yellow-500 resize-none"
                      />
                    </div>
                  </div>
                )}

                {/* Step 3: Customer Information */}
                {step === 3 && (
                  <div className="space-y-4">
                    <h2 className="text-xl font-bold mb-4">Contact Information</h2>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.customerName}
                        onChange={(e) => updateField('customerName', e.target.value)}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded px-4 py-2 focus:outline-none focus:border-yellow-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Company Name
                      </label>
                      <input
                        type="text"
                        value={formData.companyName}
                        onChange={(e) => updateField('companyName', e.target.value)}
                        placeholder="Optional"
                        className="w-full bg-zinc-800 border border-zinc-700 rounded px-4 py-2 focus:outline-none focus:border-yellow-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Phone Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => updateField('phone', e.target.value)}
                        placeholder="+234 XXX XXX XXXX"
                        className="w-full bg-zinc-800 border border-zinc-700 rounded px-4 py-2 focus:outline-none focus:border-yellow-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => updateField('email', e.target.value)}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded px-4 py-2 focus:outline-none focus:border-yellow-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Project Description
                      </label>
                      <textarea
                        value={formData.projectDescription}
                        onChange={(e) => updateField('projectDescription', e.target.value)}
                        placeholder="Brief description of your project..."
                        rows={4}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded px-4 py-2 focus:outline-none focus:border-yellow-500 resize-none"
                      />
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Navigation Buttons */}
            <div className="flex gap-3 mt-6">
              {step > 1 && (
                <button
                  onClick={() => setStep(step - 1)}
                  disabled={loading}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-3 rounded-lg font-medium transition disabled:opacity-50"
                >
                  Back
                </button>
              )}
              {step < 3 ? (
                <button
                  onClick={() => setStep(step + 1)}
                  disabled={!canProceed()}
                  className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-black px-6 py-3 rounded-lg font-medium transition disabled:opacity-50 disabled:bg-zinc-700 disabled:text-zinc-500"
                >
                  Continue
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={loading || !canProceed()}
                  className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-black px-6 py-3 rounded-lg font-medium transition disabled:opacity-50 disabled:bg-zinc-700 disabled:text-zinc-500"
                >
                  {loading ? 'Submitting...' : 'Submit Request'}
                </button>
              )}
            </div>
          </div>

          {/* Summary Sidebar */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
              <h3 className="font-bold text-lg mb-4">Request Summary</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Equipment:</span>
                  <span className="font-medium text-right">{eq.name}</span>
                </div>
                {kind === 'rent' && formData.durationDays > 0 && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Duration:</span>
                      <span className="font-medium">{formData.durationDays} days</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Daily Rate:</span>
                      <span className="font-medium">₦{fmtNgnFull(rate)}</span>
                    </div>
                    <div className="border-t border-zinc-800 pt-3 flex justify-between">
                      <span className="text-zinc-400">Estimated:</span>
                      <span className="font-bold text-yellow-500">₦{fmtNgnFull(estimatedTotal)}</span>
                    </div>
                  </>
                )}
                {kind === 'buy' && eq.salePrice && (
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Sale Price:</span>
                    <span className="font-bold text-yellow-500">₦{fmtNgnFull(eq.salePrice)}</span>
                  </div>
                )}
              </div>

              <div className="mt-6 bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <p className="text-xs text-blue-400">
                  ℹ️ This is an estimate only. Cheesco operations will review your request and prepare an accurate quotation with all costs included.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
