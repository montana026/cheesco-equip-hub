"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

interface RentalRequestFormProps {
  equipmentId: string;
  equipmentName: string;
  onClose: () => void;
}

export function RentalRequestForm({
  equipmentId,
  equipmentName,
  onClose,
}: RentalRequestFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  const [formData, setFormData] = useState({
    startDate: "",
    endDate: "",
    projectLocation: "",
    projectType: "",
    operatorRequired: false,
    deliveryRequired: true,
    additionalRequirements: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/rentals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          equipmentId,
          ...formData,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to submit request");
      }

      toast.success(
        "Rental request submitted! Cheesco will verify and send you a quotation."
      );
      router.push("/dashboard/customer/requests");
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to submit request");
    } finally {
      setLoading(false);
    }
  };

  const canProceed = () => {
    if (step === 1) return formData.startDate && formData.endDate;
    if (step === 2)
      return formData.projectLocation && formData.projectLocation.length >= 5;
    return true;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-canvas/90 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-2xl rounded-2xl border border-line bg-card p-6 shadow-2xl"
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-2xl text-ink-muted hover:text-ink"
        >
          ×
        </button>

        <h2 className="text-2xl font-black">Request to Rent</h2>
        <p className="mt-1 text-sm text-ink-muted">{equipmentName}</p>

        {/* Progress indicator */}
        <div className="mt-6 flex gap-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full ${
                s <= step ? "bg-cheesco-yellow" : "bg-line"
              }`}
            />
          ))}
        </div>

        <form onSubmit={handleSubmit} className="mt-6">
          {/* Step 1: Rental Period */}
          {step === 1 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              <h3 className="font-bold">Step 1: Rental Period</h3>

              <div>
                <label className="mb-1 block text-sm font-semibold">
                  Start Date
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) =>
                    setFormData({ ...formData, startDate: e.target.value })
                  }
                  min={new Date().toISOString().split("T")[0]}
                  className="auth-input"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold">
                  End Date
                </label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) =>
                    setFormData({ ...formData, endDate: e.target.value })
                  }
                  min={formData.startDate || new Date().toISOString().split("T")[0]}
                  className="auth-input"
                  required
                />
              </div>

              {formData.startDate && formData.endDate && (
                <div className="rounded-lg bg-canvas-deep p-3 text-sm">
                  <span className="text-ink-muted">Duration: </span>
                  <span className="font-bold text-cheesco-yellow">
                    {Math.ceil(
                      (new Date(formData.endDate).getTime() -
                        new Date(formData.startDate).getTime()) /
                        (1000 * 60 * 60 * 24)
                    )}{" "}
                    days
                  </span>
                </div>
              )}
            </motion.div>
          )}

          {/* Step 2: Project Details */}
          {step === 2 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              <h3 className="font-bold">Step 2: Project Details</h3>

              <div>
                <label className="mb-1 block text-sm font-semibold">
                  Project Location
                </label>
                <input
                  type="text"
                  value={formData.projectLocation}
                  onChange={(e) =>
                    setFormData({ ...formData, projectLocation: e.target.value })
                  }
                  placeholder="e.g. Lekki Phase 1, Lagos"
                  className="auth-input"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold">
                  Project Type (Optional)
                </label>
                <input
                  type="text"
                  value={formData.projectType}
                  onChange={(e) =>
                    setFormData({ ...formData, projectType: e.target.value })
                  }
                  placeholder="e.g. Road construction, Building foundation"
                  className="auth-input"
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.operatorRequired}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        operatorRequired: e.target.checked,
                      })
                    }
                    className="h-4 w-4 rounded border-line-soft bg-canvas-deep"
                  />
                  <span className="text-sm">
                    I need an operator (Cheesco will assign a certified operator)
                  </span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.deliveryRequired}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        deliveryRequired: e.target.checked,
                      })
                    }
                    className="h-4 w-4 rounded border-line-soft bg-canvas-deep"
                  />
                  <span className="text-sm">
                    I need delivery (Cheesco will coordinate logistics)
                  </span>
                </label>
              </div>
            </motion.div>
          )}

          {/* Step 3: Additional Requirements */}
          {step === 3 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              <h3 className="font-bold">Step 3: Additional Requirements</h3>

              <div>
                <label className="mb-1 block text-sm font-semibold">
                  Additional Requirements (Optional)
                </label>
                <textarea
                  value={formData.additionalRequirements}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      additionalRequirements: e.target.value,
                    })
                  }
                  placeholder="Any special requirements, attachments needed, specific working conditions, etc."
                  className="auth-input min-h-[120px] resize-none"
                  rows={5}
                />
              </div>

              <div className="rounded-lg border border-cheesco-yellow/30 bg-cheesco-yellow/10 p-4 text-sm">
                <p className="font-bold text-cheesco-yellow">
                  ⚠️ Important: This is NOT an instant booking
                </p>
                <p className="mt-2 text-ink-muted">
                  After submitting this request, Cheesco will:
                </p>
                <ul className="mt-2 list-inside list-disc space-y-1 text-ink-muted">
                  <li>Verify equipment availability</li>
                  <li>Confirm your requirements</li>
                  <li>Prepare a detailed quotation</li>
                  <li>Send it to you for review and acceptance</li>
                </ul>
                <p className="mt-2 text-ink-muted">
                  You will NOT be charged until you accept the quotation.
                </p>
              </div>
            </motion.div>
          )}

          {/* Navigation */}
          <div className="mt-6 flex gap-3">
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="flex-1 rounded-lg border border-line bg-card px-4 py-3 font-bold text-ink hover:bg-card-raised"
              >
                Back
              </button>
            )}

            {step < 3 ? (
              <button
                type="button"
                onClick={() => setStep(step + 1)}
                disabled={!canProceed()}
                className="flex-1 rounded-lg bg-cheesco-yellow px-4 py-3 font-bold text-canvas hover:bg-cheesco-yellow-bright disabled:opacity-50"
              >
                Continue
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="flex-1 rounded-lg bg-cheesco-yellow px-4 py-3 font-bold text-canvas hover:bg-cheesco-yellow-bright disabled:opacity-50"
              >
                {loading ? "Submitting..." : "Submit Rental Request"}
              </button>
            )}
          </div>
        </form>
      </motion.div>
    </div>
  );
}
