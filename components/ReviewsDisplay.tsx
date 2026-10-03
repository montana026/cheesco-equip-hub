/* ── Review Display Component for Equipment Pages ──────────────────── */
'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface Review {
  id: string;
  overallRating: number;
  equipmentConditionRating: number;
  merchantServiceRating: number;
  deliveryExperienceRating: number;
  valueForMoneyRating: number;
  reviewText: string;
  wouldRecommend: boolean;
  reviewImages: string[];
  createdAt: string;
  customer: {
    fullName: string;
    avatarUrl: string | null;
  };
  rental: {
    referenceNumber: string;
  };
}

interface ReviewsDisplayProps {
  equipmentId: string;
  merchantId?: string;
}

export default function ReviewsDisplay({ equipmentId, merchantId }: ReviewsDisplayProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | '5' | '4' | '3' | '2' | '1'>('all');

  useEffect(() => {
    loadReviews();
  }, [equipmentId, merchantId]);

  const loadReviews = async () => {
    try {
      const params = new URLSearchParams({ status: 'APPROVED' });
      if (equipmentId) params.set('equipmentId', equipmentId);
      if (merchantId) params.set('merchantId', merchantId);

      const response = await fetch(`/api/reviews?${params.toString()}`);
      const result = await response.json();

      if (result.success) {
        setReviews(result.data);
      }
    } catch (error) {
      console.error('Failed to load reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredReviews = filter === 'all'
    ? reviews
    : reviews.filter(r => Math.floor(r.overallRating) === parseInt(filter));

  const stats = {
    total: reviews.length,
    average: reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.overallRating, 0) / reviews.length
      : 0,
    distribution: {
      5: reviews.filter(r => Math.floor(r.overallRating) === 5).length,
      4: reviews.filter(r => Math.floor(r.overallRating) === 4).length,
      3: reviews.filter(r => Math.floor(r.overallRating) === 3).length,
      2: reviews.filter(r => Math.floor(r.overallRating) === 2).length,
      1: reviews.filter(r => Math.floor(r.overallRating) === 1).length,
    },
    wouldRecommend: reviews.filter(r => r.wouldRecommend).length,
  };

  if (loading) {
    return (
      <div className="card-surface rounded-xl p-8 text-center">
        <div className="text-ink-muted">Loading reviews...</div>
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="card-surface rounded-xl p-8 text-center">
        <div className="text-4xl mb-3">⭐</div>
        <div className="font-bold text-lg">No Reviews Yet</div>
        <div className="text-sm text-ink-muted mt-1">
          Be the first to review this equipment
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="card-surface rounded-xl p-6">
        <div className="grid gap-6 sm:grid-cols-[auto_1fr]">
          {/* Average Rating */}
          <div className="text-center sm:border-r border-line-soft sm:pr-6">
            <div className="text-5xl font-black">{stats.average.toFixed(1)}</div>
            <div className="flex items-center justify-center gap-1 my-2">
              {[1, 2, 3, 4, 5].map(star => (
                <span key={star} className="text-2xl text-cheesco-yellow">
                  {star <= Math.round(stats.average) ? '★' : '☆'}
                </span>
              ))}
            </div>
            <div className="text-sm text-ink-muted">
              Based on {stats.total} review{stats.total !== 1 ? 's' : ''}
            </div>
          </div>

          {/* Rating Distribution */}
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map(rating => {
              const count = stats.distribution[rating as keyof typeof stats.distribution];
              const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0;

              return (
                <button
                  key={rating}
                  onClick={() => setFilter(count > 0 ? rating.toString() as any : 'all')}
                  className={`w-full flex items-center gap-3 group ${
                    filter === rating.toString() ? 'opacity-100' : 'opacity-60 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center gap-1 text-sm font-medium min-w-[60px]">
                    <span>{rating}</span>
                    <span className="text-cheesco-yellow">★</span>
                  </div>
                  <div className="flex-1 h-2 bg-line-soft rounded-full overflow-hidden">
                    <div
                      className="h-full bg-cheesco-yellow transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="text-sm text-ink-muted min-w-[40px] text-right">
                    {count}
                  </div>
                </button>
              );
            })}

            <div className="pt-3 border-t border-line-soft mt-3">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-2xl">👍</span>
                <span className="font-medium">
                  {stats.wouldRecommend} of {stats.total} would recommend
                </span>
                <span className="text-ink-muted">
                  ({stats.total > 0 ? Math.round((stats.wouldRecommend / stats.total) * 100) : 0}%)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Reset */}
        {filter !== 'all' && (
          <div className="mt-4 pt-4 border-t border-line-soft">
            <button
              onClick={() => setFilter('all')}
              className="text-sm text-cheesco-yellow hover:underline"
            >
              ← Show all reviews
            </button>
          </div>
        )}
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {filteredReviews.map((review, idx) => (
          <motion.div
            key={review.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="card-surface rounded-xl p-6"
          >
            {/* Reviewer Info */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-card flex items-center justify-center font-bold text-cheesco-yellow">
                  {review.customer.fullName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-bold">{review.customer.fullName}</div>
                  <div className="text-xs text-ink-muted">
                    {new Date(review.createdAt).toLocaleDateString('en-NG', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </div>
                </div>
              </div>

              {/* Overall Rating */}
              <div className="flex items-center gap-1 text-xl">
                {[1, 2, 3, 4, 5].map(star => (
                  <span
                    key={star}
                    className={star <= review.overallRating ? 'text-cheesco-yellow' : 'text-line-soft'}
                  >
                    ★
                  </span>
                ))}
              </div>
            </div>

            {/* Detailed Ratings */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div className="text-xs">
                <div className="text-ink-faint">Equipment</div>
                <div className="font-bold">{review.equipmentConditionRating}.0 ★</div>
              </div>
              <div className="text-xs">
                <div className="text-ink-faint">Service</div>
                <div className="font-bold">{review.merchantServiceRating}.0 ★</div>
              </div>
              <div className="text-xs">
                <div className="text-ink-faint">Delivery</div>
                <div className="font-bold">{review.deliveryExperienceRating}.0 ★</div>
              </div>
              <div className="text-xs">
                <div className="text-ink-faint">Value</div>
                <div className="font-bold">{review.valueForMoneyRating}.0 ★</div>
              </div>
            </div>

            {/* Review Text */}
            <p className="text-sm leading-relaxed mb-4">{review.reviewText}</p>

            {/* Review Images */}
            {review.reviewImages.length > 0 && (
              <div className="grid grid-cols-5 gap-2 mb-4">
                {review.reviewImages.map((img, imgIdx) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={imgIdx}
                    src={img}
                    alt={`Review photo ${imgIdx + 1}`}
                    className="h-16 w-full rounded-lg object-cover cursor-pointer hover:opacity-80"
                  />
                ))}
              </div>
            )}

            {/* Recommendation Badge */}
            {review.wouldRecommend && (
              <div className="inline-flex items-center gap-1 rounded-full bg-success/20 px-3 py-1 text-xs font-bold text-success">
                <span>👍</span>
                <span>Recommended</span>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {filteredReviews.length === 0 && filter !== 'all' && (
        <div className="card-surface rounded-xl p-8 text-center">
          <div className="text-ink-muted">No {filter}-star reviews</div>
        </div>
      )}
    </div>
  );
}
