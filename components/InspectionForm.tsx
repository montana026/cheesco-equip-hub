/* ── Equipment Inspection Form (Pre-Delivery & Post-Rental) ──────────── */
'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { storageService } from '@/lib/services/storage.service';
import { apiFetch } from '@/lib/api-client';

type InspectionKind = 'PRE_DELIVERY' | 'POST_RENTAL';

interface InspectionFormProps {
  rentalRequest: {
    id: string;
    referenceNumber: string;
    equipmentName: string;
  };
  equipment: {
    id: string;
    name: string;
    category: string;
  };
  inspectionKind: InspectionKind;
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface ChecklistItem {
  item: string;
  passed: boolean;
  note: string;
}

const DEFAULT_CHECKLIST_ITEMS = [
  'Engine Condition',
  'Hydraulic System',
  'Tyres/Tracks',
  'Body/Frame Condition',
  'Attachments Present',
  'Hour Meter Reading',
  'Fluid Levels',
  'Safety Equipment',
  'Operational Test',
];

export default function InspectionForm({
  rentalRequest,
  equipment,
  inspectionKind,
  onSuccess,
  onCancel,
}: InspectionFormProps) {
  const [loading, setLoading] = useState(false);
  const [inspectorName, setInspectorName] = useState('');
  const [hourMeterReading, setHourMeterReading] = useState('');
  const [inspectionNotes, setInspectionNotes] = useState('');
  const [depositDeduction, setDepositDeduction] = useState('');

  const [checklist, setChecklist] = useState<ChecklistItem[]>(
    DEFAULT_CHECKLIST_ITEMS.map(item => ({
      item,
      passed: true,
      note: '',
    }))
  );

  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);

  const updateChecklistItem = (index: number, field: keyof ChecklistItem, value: any) => {
    setChecklist(prev =>
      prev.map((item, idx) =>
        idx === index ? { ...item, [field]: value } : item
      )
    );
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (photos.length + files.length > 20) {
      toast.error('Maximum 20 photos allowed');
      return;
    }

    setPhotos(prev => [...prev, ...files]);

    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
    setPhotoPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inspectorName.trim()) {
      toast.error('Inspector name is required');
      return;
    }

    if (photos.length === 0) {
      toast.error('Please upload at least one inspection photo');
      return;
    }

    setLoading(true);

    try {
      // Upload photos to Supabase Storage
      const uploadResults = await storageService.uploadInspectionPhotos(photos, rentalRequest.id);
      const photoUrls = uploadResults.map(r => r.url);

      const payload = {
        rentalRequestId: rentalRequest.id,
        equipmentId: equipment.id,
        kind: inspectionKind,
        inspectorName,
        hourMeterReading: hourMeterReading ? parseInt(hourMeterReading) : null,
        checklist,
        conditionPhotos: photoUrls,
        inspectionNotes,
        depositDeductionRecommendation: depositDeduction ? parseFloat(depositDeduction) : null,
      };

      const response = await apiFetch('/api/inspections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to submit inspection');
      }

      toast.success('Inspection submitted successfully');
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit inspection');
    } finally {
      setLoading(false);
    }
  };

  const failedItems = checklist.filter(item => !item.passed);
  const passRate = ((checklist.length - failedItems.length) / checklist.length * 100).toFixed(0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-canvas-deep border border-line rounded-xl overflow-hidden"
    >
      {/* Header */}
      <div className="bg-card border-b border-line p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-black">
              {inspectionKind === 'PRE_DELIVERY' ? '📋 Pre-Delivery Inspection' : '🔍 Post-Rental Inspection'}
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              Request: {rentalRequest.referenceNumber}
            </p>
            <p className="text-sm font-medium">{equipment.name}</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-ink-faint">Pass Rate</div>
            <div className={`text-3xl font-black ${
              parseInt(passRate) >= 90 ? 'text-success' :
              parseInt(passRate) >= 70 ? 'text-warn' :
              'text-danger'
            }`}>
              {passRate}%
            </div>
          </div>
        </div>

        {inspectionKind === 'POST_RENTAL' && (
          <div className="mt-4 rounded-lg bg-warn/10 border border-warn/30 p-3 text-sm text-warn">
            ⚠️ Post-rental inspection is used for deposit settlement. Document all damage carefully.
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Inspector Info */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium mb-2">
              Inspector Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={inspectorName}
              onChange={(e) => setInspectorName(e.target.value)}
              className="auth-input"
              placeholder="Full name of inspector"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Hour Meter Reading
            </label>
            <input
              type="number"
              value={hourMeterReading}
              onChange={(e) => setHourMeterReading(e.target.value)}
              className="auth-input"
              placeholder="Current operating hours"
              min="0"
            />
          </div>
        </div>

        {/* Inspection Checklist */}
        <div>
          <h3 className="font-bold mb-3">Inspection Checklist</h3>
          <div className="space-y-3">
            {checklist.map((item, idx) => (
              <div
                key={idx}
                className={`rounded-lg border p-4 transition ${
                  item.passed
                    ? 'border-line-soft bg-card'
                    : 'border-danger/50 bg-danger/5'
                }`}
              >
                <div className="flex items-start gap-3">
                  <label className="flex items-center gap-2 cursor-pointer flex-1">
                    <input
                      type="checkbox"
                      checked={item.passed}
                      onChange={(e) => updateChecklistItem(idx, 'passed', e.target.checked)}
                      className="h-5 w-5 rounded border-line-soft bg-canvas-deep checked:bg-success"
                    />
                    <span className={`font-medium ${item.passed ? '' : 'text-danger'}`}>
                      {item.item}
                    </span>
                  </label>

                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                    item.passed
                      ? 'bg-success/20 text-success'
                      : 'bg-danger/20 text-danger'
                  }`}>
                    {item.passed ? 'PASS' : 'FAIL'}
                  </span>
                </div>

                <input
                  type="text"
                  value={item.note}
                  onChange={(e) => updateChecklistItem(idx, 'note', e.target.value)}
                  className="mt-2 w-full bg-canvas-deep border border-line-soft rounded px-3 py-2 text-sm outline-none focus:border-cheesco-yellow/60"
                  placeholder={item.passed ? 'Optional notes...' : 'Describe the issue...'}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Photo Upload */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Inspection Photos <span className="text-red-500">*</span>
          </label>
          <div className="border-2 border-dashed border-line-soft rounded-lg p-6 text-center">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handlePhotoUpload}
              className="hidden"
              id="inspection-photos"
            />
            <label
              htmlFor="inspection-photos"
              className="cursor-pointer inline-flex items-center gap-2 rounded-lg bg-card px-4 py-2 text-sm font-medium hover:bg-card-raised"
            >
              📷 Upload Photos
            </label>
            <p className="mt-2 text-xs text-ink-muted">
              Upload up to 20 photos showing equipment condition
            </p>
          </div>

          {photoPreviews.length > 0 && (
            <div className="mt-4 grid grid-cols-4 gap-3 sm:grid-cols-6">
              {photoPreviews.map((preview, idx) => (
                <div key={idx} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={preview}
                    alt={`Inspection ${idx + 1}`}
                    className="h-20 w-full rounded-lg object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(idx)}
                    className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* General Notes */}
        <div>
          <label className="block text-sm font-medium mb-2">
            General Inspection Notes
          </label>
          <textarea
            value={inspectionNotes}
            onChange={(e) => setInspectionNotes(e.target.value)}
            rows={4}
            className="auth-input resize-none"
            placeholder="Any additional observations, concerns, or recommendations..."
          />
        </div>

        {/* Deposit Deduction (Post-Rental Only) */}
        {inspectionKind === 'POST_RENTAL' && (
          <div className="border-t border-line-soft pt-4">
            <label className="block text-sm font-medium mb-2">
              Recommended Deposit Deduction (₦)
            </label>
            <input
              type="number"
              value={depositDeduction}
              onChange={(e) => setDepositDeduction(e.target.value)}
              className="auth-input"
              placeholder="Amount to deduct from deposit (if any)"
              min="0"
              step="1000"
            />
            {failedItems.length > 0 && (
              <div className="mt-2 text-sm text-ink-muted">
                ⚠️ {failedItems.length} item(s) failed inspection. Consider deposit deduction for:
                <ul className="mt-1 ml-4 list-disc">
                  {failedItems.map((item, idx) => (
                    <li key={idx}>{item.item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Summary Card */}
        <div className="rounded-lg bg-card border border-line p-4">
          <h4 className="font-bold mb-2">📊 Inspection Summary</h4>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-ink-faint">Passed Items</div>
              <div className="font-bold text-success">{checklist.length - failedItems.length}</div>
            </div>
            <div>
              <div className="text-ink-faint">Failed Items</div>
              <div className="font-bold text-danger">{failedItems.length}</div>
            </div>
            <div>
              <div className="text-ink-faint">Photos</div>
              <div className="font-bold">{photos.length}</div>
            </div>
            <div>
              <div className="text-ink-faint">Overall Status</div>
              <div className={`font-bold ${
                parseInt(passRate) >= 90 ? 'text-success' :
                parseInt(passRate) >= 70 ? 'text-warn' :
                'text-danger'
              }`}>
                {parseInt(passRate) >= 90 ? 'EXCELLENT' :
                 parseInt(passRate) >= 70 ? 'ACCEPTABLE' :
                 'NEEDS ATTENTION'}
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="flex-1 rounded-lg border border-line-soft px-6 py-3 font-bold text-ink-muted hover:text-ink disabled:opacity-50"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={loading || photos.length === 0}
            className="flex-1 rounded-lg bg-cheesco-yellow px-6 py-3 font-bold text-canvas hover:bg-cheesco-yellow-bright disabled:opacity-50"
          >
            {loading ? 'Submitting...' : 'Submit Inspection'}
          </button>
        </div>
      </form>
    </motion.div>
  );
}
