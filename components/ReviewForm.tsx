/* ── Review & Rating Component for Completed Rentals ──────────────────── */
'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { storageService } from '@/lib/services/storage.service';
import { apiFetch } from '@/lib/api-client';

interface ReviewFormProps {
  rental: {
    id: string;
    referenceNumber: string;
    equipmentId: string;
    equipmentName: string;
    merchantId: string;
    merchantName: string;
  };
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface Rating {
  category: string;
  score: number;
  label: string;
}

export default function ReviewForm({
  rental,
  onSuccess,
  onCancel,
}: ReviewFormProps) {
  const [loading, setLoading] = useState(false);
  const [ratings, setRatings] = useState<Rating[]>([
    { category: 'equipment_condition', score: 0, label: 'Equipment Condition' },
    { category: 'merchant_service', score: 0, label: 'Merchant Service' },
    { category: 'delivery_experience', score: 0, label: 'Delivery Experience' },
    { category: 'value_for_money', score: 0, label: 'Value for Money' },
  ]);
  const [reviewText, setReviewText] = useState('');
  const [wouldRecommend, setWouldRecommend] = useState<boolean | null>(null);
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  const updateRating = (index: number, score: number) => {
    setRatings(prev =>
      prev.map((rating, idx) =>
        idx === index ? { ...rating, score } : rating
      )
    );
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (images.length + files.length > 5) {
      toast.error('Maximum 5 images allowed');
      return;
    }

    setImages(prev => [...prev, ...files]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (ratings.some(r => r.score === 0)) {
      toast.error('Please rate all categories');
      return;
    }

    if (!reviewText.trim()) {
      toast.error('Please write a review');
      return;
    }

    if (wouldRecommend === null) {
      toast.error('Please indicate if you would recommend');
      return;
    }

    setLoading(true);

    try {
      // Calculate overall rating
      const overallRating = ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length;

      // Upload review images to Supabase Storage
      const uploadResults = await storageService.uploadInspectionPhotos(images, rental.id); // Using rental.id as a temporary identifier for the review
      const imageUrls = uploadResults.map(r => r.url);

      const payload = {
        rentalRequestId: rental.id,
        equipmentId: rental.equipmentId,
        merchantId: rental.merchantId,
        overallRating,
        ratings: ratings.reduce((acc, r) => ({
          ...acc,
          [r.category]: r.score,
        }), {}),
        reviewText,
        wouldRecommend,
        images: imageUrls, // Now using the uploaded image URLs
      };

      const response = await apiFetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to submit review');
      }

      toast.success('Review submitted successfully!');
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit review');
    } finally {
      setLoading(false);
    }
  };

  const averageRating = ratings.length > 0
    ? ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-canvas-deep border border-line rounded-xl overflow-hidden"
    >
      {/* Header */}
      <div className="bg-card border-b border-line p-6">
        <h2 className="text-2xl font-black">⭐ Rate Your Rental Experience</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Rental: {rental.referenceNumber}
        </p>
        <p className="text-sm font-medium">{rental.equipmentName}</p>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Rating Categories */}
        <div>
          <h3 className="font-bold mb-4">Rate Each Aspect</h3>
          <div className="space-y-4">
            {ratings.map((rating, index) => (
              <div key={rating.category} className="card-surface rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{rating.label}</span>
                  <span className={`text-lg font-black ${
                    rating.score === 0 ? 'text-ink-faint' :
                    rating.score >= 4 ? 'text-success' :
                    rating.score >= 3 ? 'text-warn' :
                    'text-danger'
                  }`}>
                    {rating.score > 0 ? `${rating.score}.0` : '—'}
                  </span>
                </div>

                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => updateRating(index, star)}
                      className={`text-3xl transition-all hover:scale-110 ${
                        star <= rating.score
                          ? 'text-cheesco-yellow'
                          : 'text-line-soft hover:text-cheesco-yellow/50'
                      }`}
                    >
                      {star <= rating.score ? '★' : '☆'}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Overall Rating Display */}
        <div className="rounded-lg bg-card border border-line p-5 text-center">
          <div className="text-sm text-ink-faint mb-1">Overall Rating</div>
          <div className="flex items-center justify-center gap-2">
            <span className="text-5xl">⭐</span>
            <span className="text-4xl font-black">
              {averageRating > 0 ? averageRating.toFixed(1) : '—'}
            </span>
            <span className="text-ink-faint">/ 5.0</span>
          </div>
        </div>

        {/* Written Review */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Share Your Experience <span className="text-red-500">*</span>
          </label>
          <textarea
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            rows={6}
            className="auth-input resize-none"
            placeholder="Tell others about your rental experience. What went well? What could be improved?"
            required
          />
          <div className="mt-1 text-xs text-ink-muted">
            {reviewText.length} / 1000 characters
          </div>
        </div>

        {/* Photos */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Add Photos (Optional)
          </label>
          <div className="border-2 border-dashed border-line-soft rounded-lg p-4 text-center">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
              className="hidden"
              id="review-images"
            />
            <label
              htmlFor="review-images"
              className="cursor-pointer inline-flex items-center gap-2 rounded-lg bg-card px-4 py-2 text-sm font-medium hover:bg-card-raised"
            >
              📷 Add Photos
            </label>
            <p className="mt-2 text-xs text-ink-muted">
              Up to 5 photos of the equipment
            </p>
          </div>

          {imagePreviews.length > 0 && (
            <div className="mt-3 grid grid-cols-5 gap-2">
              {imagePreviews.map((preview, idx) => (
                <div key={idx} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={preview}
                    alt={`Review photo ${idx + 1}`}
                    className="h-20 w-full rounded-lg object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recommendation */}
        <div>
          <label className="block text-sm font-medium mb-3">
            Would you recommend this equipment/merchant? <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setWouldRecommend(true)}
              className={`rounded-lg border-2 p-4 text-center transition ${
                wouldRecommend === true
                  ? 'border-success bg-success/10'
                  : 'border-line-soft hover:border-success/50'
              }`}
            >
              <div className="text-3xl mb-1">👍</div>
              <div className="font-bold">Yes, Recommend</div>
            </button>

            <button
              type="button"
              onClick={() => setWouldRecommend(false)}
              className={`rounded-lg border-2 p-4 text-center transition ${
                wouldRecommend === false
                  ? 'border-danger bg-danger/10'
                  : 'border-line-soft hover:border-danger/50'
              }`}
            >
              <div className="text-3xl mb-1">👎</div>
              <div className="font-bold">Not Really</div>
            </button>
          </div>
        </div>

        {/* Merchant Info */}
        <div className="rounded-lg bg-card border border-line p-4 text-sm">
          <div className="text-ink-faint mb-1">Your review will be visible on:</div>
          <div className="font-medium">
            • Equipment Page: {rental.equipmentName}
          </div>
          <div className="font-medium">
            • Merchant Profile: {rental.merchantName}
          </div>
        </div>

        {/* Submit Actions */}
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
            disabled={loading || averageRating === 0 || !reviewText.trim() || wouldRecommend === null}
            className="flex-1 rounded-lg bg-cheesco-yellow px-6 py-3 font-bold text-canvas hover:bg-cheesco-yellow-bright disabled:opacity-50"
          >
            {loading ? 'Submitting...' : 'Submit Review'}
          </button>
        </div>
      </form>
    </motion.div>
  );
}
