"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { restaurants as restaurantsApi, type Review, type Restaurant } from "@/services/api";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";

export default function ReviewsPage() {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterRating, setFilterRating] = useState<number | null>(null);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rest = await restaurantsApi.getOwnerRestaurant();
      setRestaurant(rest);
      const reviewData = await restaurantsApi.getReviews(rest.id);
      setReviews(reviewData);
    } catch {
      setError("Failed to load reviews. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const avgRating = useMemo(() => {
    if (reviews.length === 0) return 0;
    return reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
  }, [reviews]);

  const ratingDist = useMemo(() => {
    const dist = [0, 0, 0, 0, 0];
    reviews.forEach((r) => dist[r.rating - 1]++);
    return dist;
  }, [reviews]);

  const filtered = useMemo(() => {
    if (filterRating === null) return reviews;
    return reviews.filter((r) => r.rating === filterRating);
  }, [reviews, filterRating]);

  if (error && !loading) return <ErrorState message={error} onRetry={fetchData} />;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-zinc-100">Customer Reviews</h1>

      {loading ? (
        <div className="mt-6 space-y-4">
          <div className="flex gap-6 rounded-xl border border-gray-200 p-5 dark:border-zinc-800">
            <Skeleton className="h-20 w-20" />
            <div className="flex-1 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-3 w-full" />
              ))}
            </div>
          </div>
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <EmptyState
          icon="⭐"
          title="No reviews yet"
          description="Customer reviews will appear here once you start receiving orders"
        />
      ) : (
        <>
          {/* Rating overview */}
          <div className="mt-6 flex flex-wrap gap-6 rounded-xl border border-gray-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex flex-col items-center justify-center">
              <span className="text-4xl font-bold text-gray-900 dark:text-zinc-100">{avgRating.toFixed(1)}</span>
              <div className="mt-1 flex gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <svg key={star} className={`h-4 w-4 ${star <= Math.round(avgRating) ? "text-yellow-400" : "text-gray-200 dark:text-zinc-700"}`} fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                ))}
              </div>
              <span className="mt-1 text-xs text-gray-500 dark:text-zinc-500">{reviews.length} reviews</span>
            </div>
            <div className="flex-1 space-y-1.5">
              {[5, 4, 3, 2, 1].map((star) => (
                <button
                  key={star}
                  onClick={() => setFilterRating(filterRating === star ? null : star)}
                  className={`flex w-full items-center gap-2 rounded px-1 py-0.5 transition-colors ${filterRating === star ? "bg-yellow-50 dark:bg-yellow-900/20" : "hover:bg-gray-50 dark:hover:bg-zinc-800"}`}
                >
                  <span className="w-3 text-xs font-medium text-gray-600 dark:text-zinc-400">{star}</span>
                  <svg className="h-3 w-3 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-zinc-800">
                    <div className="h-full rounded-full bg-yellow-400" style={{ width: `${(ratingDist[star - 1] / reviews.length) * 100}%` }} />
                  </div>
                  <span className="w-4 text-right text-xs text-gray-400 dark:text-zinc-600">{ratingDist[star - 1]}</span>
                </button>
              ))}
            </div>
          </div>

          {filterRating && (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-sm text-gray-500 dark:text-zinc-500">Showing {filterRating}-star reviews</span>
              <button onClick={() => setFilterRating(null)} className="text-xs text-red-500 hover:underline">Clear filter</button>
            </div>
          )}

          {/* Reviews list */}
          <div className="mt-4 space-y-3">
            {filtered.map((review) => (
              <div key={review.id} className="rounded-xl border border-gray-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-sm font-bold text-gray-600 dark:bg-zinc-800 dark:text-zinc-400">
                      {review.userName?.charAt(0) || "?"}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-zinc-100">{review.userName}</p>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <svg key={star} className={`h-3.5 w-3.5 ${star <= review.rating ? "text-yellow-400" : "text-gray-200 dark:text-zinc-700"}`} fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                          </svg>
                        ))}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 dark:text-zinc-600">
                    {new Date(review.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-gray-600 dark:text-zinc-400">{review.comment}</p>

                {review.reply ? (
                  <div className="mt-3 rounded-lg bg-gray-50 p-3 dark:bg-zinc-800">
                    <p className="text-xs font-semibold text-gray-700 dark:text-zinc-300">Your Reply</p>
                    <p className="mt-1 text-sm text-gray-600 dark:text-zinc-400">{review.reply}</p>
                  </div>
                ) : (
                  <div className="mt-3">
                    {replyingTo === review.id ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Write a reply..."
                          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-red-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                          autoFocus
                        />
                        <button
                          onClick={() => { setReplyingTo(null); setReplyText(""); }}
                          className="rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-500 dark:border-zinc-700"
                        >
                          Cancel
                        </button>
                        <button
                          disabled={!replyText.trim()}
                          className="rounded-lg bg-red-500 px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
                        >
                          Reply
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setReplyingTo(review.id)}
                        className="text-xs font-medium text-red-500 hover:underline"
                      >
                        Reply to this review
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {filtered.length === 0 && (
            <EmptyState icon="⭐" title="No reviews match this filter" />
          )}
        </>
      )}
    </div>
  );
}
