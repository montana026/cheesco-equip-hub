"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { SessionUser } from "@/lib/auth";
import { useAuthGuard } from "@/lib/hooks/use-auth-guard";
import { DashboardShell } from "@/components/dashboard-shell";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import type { EquipmentCategory, ListingType, EquipmentCondition } from "@/lib/types";
import { CATEGORY_META } from "@/lib/seed-ui";
import { storageService } from "@/lib/services/storage.service";
import { v4 as uuidv4 } from 'uuid';
import { apiFetch } from "@/lib/api-client";

const NAV = [
  { href: "/merchant/dashboard", label: "Overview" },
  { href: "/merchant/listings", label: "My Listings" },
  { href: "/merchant/ads", label: "Ad Campaigns" },
  { href: "/merchant/earnings", label: "Earnings & Payouts" },
  { href: "/merchant/verification", label: "Verification (KYC)" },
];

const CATEGORIES = Object.keys(CATEGORY_META) as EquipmentCategory[];

const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue",
  "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT",
  "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi",
  "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo",
  "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara"
];

export default function NewEquipmentPage() {
  const router = useRouter();
  const { user, ready } = useAuthGuard("MERCHANT");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    category: "" as EquipmentCategory | "",
    brand: "",
    model: "",
    year: new Date().getFullYear(),
    condition: "USED_GOOD" as EquipmentCondition,
    locationState: "",
    locationCity: "",
    operatingHours: 0,
    description: "",
    listingType: "FOR_RENT" as ListingType,
    salePrice: "",
    merchantRentalRate: "",
    isOperatorIncluded: false,
    isDeliveryAvailable: true,
    // Specs
    operatingWeight: "",
    maxLiftCapacity: "",
    boomReach: "",
    enginePower: "",
    fuelType: "",
  });

  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [documents, setDocuments] = useState<File[]>([]);

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (images.length + files.length > 10) {
      toast.error("Maximum 10 images allowed");
      return;
    }

    setImages(prev => [...prev, ...files]);

    // Create previews
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setDocuments(prev => [...prev, ...files]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.category || !formData.name || !formData.brand) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (images.length === 0) {
      toast.error("Please upload at least one image");
      return;
    }

    if (formData.listingType !== "FOR_SALE" && !formData.merchantRentalRate) {
      toast.error("Please set a rental rate");
      return;
    }

    if ((formData.listingType === "FOR_SALE" || formData.listingType === "FOR_SALE_AND_RENT") && !formData.salePrice) {
      toast.error("Please set a sale price");
      return;
    }

    setLoading(true);

    try {
      // 1. Upload images to Supabase Storage
      const uploadFolderId = uuidv4();
      const uploadResults = await storageService.uploadEquipmentImages(images, uploadFolderId);
      const imageUrls = uploadResults.map((r) => r.url);

      // 2. Prepare specs
      const specs: any = {};
      if (formData.operatingWeight) specs.operatingWeight = formData.operatingWeight;
      if (formData.maxLiftCapacity) specs.maxLiftCapacity = formData.maxLiftCapacity;
      if (formData.boomReach) specs.boomReach = formData.boomReach;
      if (formData.enginePower) specs.enginePower = formData.enginePower;
      if (formData.fuelType) specs.fuelType = formData.fuelType;

      // 3. Prepare payload
      const payload = {
        name: formData.name,
        category: formData.category,
        brand: formData.brand,
        model: formData.model,
        year: formData.year,
        condition: formData.condition,
        locationState: formData.locationState,
        locationCity: formData.locationCity,
        operatingHours: formData.operatingHours,
        description: formData.description,
        specs,
        listingType: formData.listingType,
        salePrice: formData.salePrice ? parseFloat(formData.salePrice) : null,
        merchantRentalRate: formData.merchantRentalRate ? parseFloat(formData.merchantRentalRate) : null,
        isOperatorIncluded: formData.isOperatorIncluded,
        isDeliveryAvailable: formData.isDeliveryAvailable,
        images: imageUrls,
      };

      // 4. Create equipment listing in database
      const response = await apiFetch("/api/equipment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to create equipment listing");
      }

      toast.success("Equipment listing submitted! Awaiting verification.");
      router.push("/merchant/listings");
    } catch (error: any) {
      console.error("Listing submission error:", error);
      toast.error(error.message || "Failed to create listing");
    } finally {
      setLoading(false);
    }
  };

  if (!user) return <div className="min-h-screen bg-canvas" />;

  return (
    <DashboardShell user={user} nav={NAV} title="Add New Equipment">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-4xl"
      >
        {/* Progress Steps */}
        <div className="mb-8 flex items-center justify-center gap-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${
                  step >= s
                    ? "bg-cheesco-yellow text-canvas"
                    : "bg-card text-ink-faint"
                }`}
              >
                {s}
              </div>
              {s < 3 && (
                <div
                  className={`h-1 w-16 ${
                    step > s ? "bg-cheesco-yellow" : "bg-line-soft"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        <div className="mb-4 text-center">
          <h2 className="text-xl font-bold">
            {step === 1 && "Equipment Details"}
            {step === 2 && "Pricing & Availability"}
            {step === 3 && "Images & Documents"}
          </h2>
          <p className="text-sm text-ink-muted">
            {step === 1 && "Basic information about your equipment"}
            {step === 2 && "Set your rates and availability"}
            {step === 3 && "Upload photos and ownership documents"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card-surface rounded-xl p-6">
          {/* Step 1: Equipment Details */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Equipment Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    className="auth-input"
                    placeholder="e.g., CAT 320 Excavator"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => updateField("category", e.target.value)}
                    className="auth-input"
                    required
                  >
                    <option value="">Select category</option>
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {CATEGORY_META[cat].icon} {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Brand <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.brand}
                    onChange={(e) => updateField("brand", e.target.value)}
                    className="auth-input"
                    placeholder="e.g., Caterpillar"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Model <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.model}
                    onChange={(e) => updateField("model", e.target.value)}
                    className="auth-input"
                    placeholder="e.g., 320"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Year <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.year}
                    onChange={(e) => updateField("year", parseInt(e.target.value))}
                    className="auth-input"
                    min="1950"
                    max={new Date().getFullYear() + 1}
                    required
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Condition <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.condition}
                    onChange={(e) => updateField("condition", e.target.value)}
                    className="auth-input"
                    required
                  >
                    <option value="NEW">New</option>
                    <option value="USED_EXCELLENT">Used - Excellent</option>
                    <option value="USED_GOOD">Used - Good</option>
                    <option value="USED_FAIR">Used - Fair</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Operating Hours
                  </label>
                  <input
                    type="number"
                    value={formData.operatingHours}
                    onChange={(e) => updateField("operatingHours", parseInt(e.target.value) || 0)}
                    className="auth-input"
                    placeholder="0"
                    min="0"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    State <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.locationState}
                    onChange={(e) => updateField("locationState", e.target.value)}
                    className="auth-input"
                    required
                  >
                    <option value="">Select state</option>
                    {NIGERIAN_STATES.map((state) => (
                      <option key={state} value={state}>
                        {state}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.locationCity}
                    onChange={(e) => updateField("locationCity", e.target.value)}
                    className="auth-input"
                    placeholder="e.g., Port Harcourt"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  className="auth-input"
                  rows={4}
                  placeholder="Detailed description of the equipment..."
                />
              </div>

              {/* Specifications */}
              <div className="border-t border-line-soft pt-4 mt-4">
                <h3 className="font-bold mb-3">Technical Specifications (Optional)</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <input
                    type="text"
                    value={formData.operatingWeight}
                    onChange={(e) => updateField("operatingWeight", e.target.value)}
                    className="auth-input"
                    placeholder="Operating Weight (e.g., 20 tons)"
                  />
                  <input
                    type="text"
                    value={formData.maxLiftCapacity}
                    onChange={(e) => updateField("maxLiftCapacity", e.target.value)}
                    className="auth-input"
                    placeholder="Max Lift Capacity (e.g., 50 tons)"
                  />
                  <input
                    type="text"
                    value={formData.boomReach}
                    onChange={(e) => updateField("boomReach", e.target.value)}
                    className="auth-input"
                    placeholder="Boom Reach (e.g., 10m)"
                  />
                  <input
                    type="text"
                    value={formData.enginePower}
                    onChange={(e) => updateField("enginePower", e.target.value)}
                    className="auth-input"
                    placeholder="Engine Power (e.g., 150HP)"
                  />
                  <input
                    type="text"
                    value={formData.fuelType}
                    onChange={(e) => updateField("fuelType", e.target.value)}
                    className="auth-input"
                    placeholder="Fuel Type (e.g., Diesel)"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="rounded-lg bg-cheesco-yellow px-6 py-3 font-bold text-canvas hover:bg-cheesco-yellow-bright"
                >
                  Next: Pricing
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Pricing & Availability */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Listing Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.listingType}
                  onChange={(e) => updateField("listingType", e.target.value)}
                  className="auth-input"
                  required
                >
                  <option value="FOR_RENT">For Rent Only</option>
                  <option value="FOR_SALE">For Sale Only</option>
                  <option value="FOR_SALE_AND_RENT">For Sale & Rent</option>
                </select>
              </div>

              {(formData.listingType === "FOR_RENT" || formData.listingType === "FOR_SALE_AND_RENT") && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Your Base Rental Rate (₦/day) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.merchantRentalRate}
                    onChange={(e) => updateField("merchantRentalRate", e.target.value)}
                    className="auth-input"
                    placeholder="e.g., 50000"
                    min="0"
                    step="1000"
                    required
                  />
                  <p className="mt-1 text-xs text-ink-muted">
                    Cheesco will apply a managed margin. You'll see the final rate after submission.
                  </p>
                </div>
              )}

              {(formData.listingType === "FOR_SALE" || formData.listingType === "FOR_SALE_AND_RENT") && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Sale Price (₦) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.salePrice}
                    onChange={(e) => updateField("salePrice", e.target.value)}
                    className="auth-input"
                    placeholder="e.g., 15000000"
                    min="0"
                    step="100000"
                    required
                  />
                </div>
              )}

              <div className="space-y-3 border-t border-line-soft pt-4">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={formData.isOperatorIncluded}
                    onChange={(e) => updateField("isOperatorIncluded", e.target.checked)}
                    className="h-5 w-5 rounded border-line-soft bg-card checked:bg-cheesco-yellow"
                  />
                  <span className="text-sm font-medium">Operator Available</span>
                </label>

                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={formData.isDeliveryAvailable}
                    onChange={(e) => updateField("isDeliveryAvailable", e.target.checked)}
                    className="h-5 w-5 rounded border-line-soft bg-card checked:bg-cheesco-yellow"
                  />
                  <span className="text-sm font-medium">Delivery Available</span>
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 rounded-lg border border-line-soft px-6 py-3 font-bold text-ink-muted hover:text-ink"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="flex-1 rounded-lg bg-cheesco-yellow px-6 py-3 font-bold text-canvas hover:bg-cheesco-yellow-bright"
                >
                  Next: Images
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Images & Documents */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Equipment Photos <span className="text-red-500">*</span>
                </label>
                <div className="border-2 border-dashed border-line-soft rounded-lg p-6 text-center">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageChange}
                    className="hidden"
                    id="image-upload"
                  />
                  <label
                    htmlFor="image-upload"
                    className="cursor-pointer inline-flex items-center gap-2 rounded-lg bg-card px-4 py-2 text-sm font-medium hover:bg-card-raised"
                  >
                    📷 Upload Photos
                  </label>
                  <p className="mt-2 text-xs text-ink-muted">
                    Upload up to 10 high-quality photos. First image will be the main photo.
                  </p>
                </div>

                {imagePreviews.length > 0 && (
                  <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
                    {imagePreviews.map((preview, idx) => (
                      <div key={idx} className="relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={preview}
                          alt={`Preview ${idx + 1}`}
                          className="h-24 w-full rounded-lg object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(idx)}
                          className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs text-white"
                        >
                          ✕
                        </button>
                        {idx === 0 && (
                          <div className="absolute bottom-1 left-1 rounded bg-cheesco-yellow px-2 py-0.5 text-[10px] font-bold text-canvas">
                            MAIN
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Ownership Documents (Optional)
                </label>
                <div className="border-2 border-dashed border-line-soft rounded-lg p-6 text-center">
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    multiple
                    onChange={handleDocumentChange}
                    className="hidden"
                    id="document-upload"
                  />
                  <label
                    htmlFor="document-upload"
                    className="cursor-pointer inline-flex items-center gap-2 rounded-lg bg-card px-4 py-2 text-sm font-medium hover:bg-card-raised"
                  >
                    📄 Upload Documents
                  </label>
                  <p className="mt-2 text-xs text-ink-muted">
                    Registration, insurance, maintenance records (visible to Cheesco ops only)
                  </p>
                </div>

                {documents.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {documents.map((doc, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between rounded-lg bg-card px-3 py-2 text-sm"
                      >
                        <span className="truncate">{doc.name}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setDocuments((prev) => prev.filter((_, i) => i !== idx))
                          }
                          className="text-red-500"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-line-soft pt-4">
                <div className="rounded-lg bg-card p-4 text-sm">
                  <h4 className="font-bold mb-2">📋 What Happens Next?</h4>
                  <ol className="space-y-1 text-ink-muted">
                    <li>1. Your listing will be submitted for verification</li>
                    <li>2. Cheesco operations will review the details and documents</li>
                    <li>3. Once approved, your equipment will be live on the platform</li>
                    <li>4. You'll be notified when customers submit rental requests</li>
                  </ol>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  disabled={loading}
                  className="flex-1 rounded-lg border border-line-soft px-6 py-3 font-bold text-ink-muted hover:text-ink disabled:opacity-50"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading || images.length === 0}
                  className="flex-1 rounded-lg bg-cheesco-yellow px-6 py-3 font-bold text-canvas hover:bg-cheesco-yellow-bright disabled:opacity-50"
                >
                  {loading ? "Creating..." : "Submit for Verification"}
                </button>
              </div>
            </div>
          )}
        </form>
      </motion.div>
    </DashboardShell>
  );
}
