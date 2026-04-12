"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

interface Review {
  id: string;
  userId: number;
  userName: string;
  rating: number;
  comment: string;
  reply?: string;
  createdAt: string;
}

export default function ReviewsPage() {
  const { token, user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [restaurantId, setRestaurantId] = useState<string | null>(null);

  const fetchReviews = useCallback(async () => {
    if (!token || !user) return;
    setError(null);
    try {
      // First get the restaurant for this owner
      const restRes = await fetch(`${API_BASE}/api/restaurants/owner/${user.userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!restRes.ok) throw new Error("Failed to fetch restaurant");
      const restaurants = await restRes.json();
      if (!Array.isArray(restaurants) || restaurants.length === 0) {
        setLoading(false);
        return;
      }
      const rid = restaurants[0].id;
      setRestaurantId(String(rid));

      // Then fetch reviews
      const revRes = await fetch(`${API_BASE}/api/restaurants/${rid}/reviews`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!revRes.ok) throw new Error("Failed to fetch reviews");
      const data = await revRes.json();
      setReviews(Array.isArray(data) ? data : data.content || []);
    } catch (err: any) {
      setError(err.message || "Failed to load reviews");
    } finally {
      setLoading(false);
    }
  }, [token, user]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : "0.0";
  const ratingDist = [5, 4, 3, 2, 1].map((r) => ({
    rating: r,
    count: reviews.filter((rev) => rev.rating === r).length,
    pct: reviews.length > 0 ? Math.round((reviews.filter((rev) => rev.rating === r).length / reviews.length) * 100) : 0,
  }));

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  };

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-zinc-100">Customer Reviews</h1>
        <div className="mt-6 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse rounded-xl border border-gray-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-zinc-800" />
                <div className="flex-1">
                  <div className="h-4 w-24 rounded bg-gray-200 dark:bg-zinc-800" />
                  <div className="mt-2 h-3 w-48 rounded bg-gray-200 dark:bg-zinc-800" />
                </div>
              </div>
              <div className="mt-3 h-3 w-full rounded bg-gray-100 dark:bg-zinc-800" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-zinc-100">Customer Reviews</h1>
        <div className="mt-8 py-16 text-center">
          <p className="text-red-500">{error}</p>
          <button onClick={fetchReviews} className="mt-4 rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-zinc-100">Customer Reviews</h1>

      {reviews.length === 0 ? (
        <div className="mt-8 py-16 text-center">
          <p className="text-4xl">⭐</p>
          <p className="mt-3 text-lg font-medium text-gray-600 dark:text-zinc-400">No reviews yet</p>
          <p className="mt-1 text-sm text-gray-500 dark:text-zinc-500">Reviews from customers will appear here</p>
        </div>
      ) : (
        <>
          {/* Rating overview */}
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-5xl font-bold text-gray-900 dark:text-zinc-100">{avgRating}</p>
                  <div className="mt-1 flex justify-center">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <svg key={s} className={`h-5 w-5 ${s <= Math.round(Number(avgRating)) ? "text-yellow-400" : "text-gray-300 dark:text-zinc-700"}`} fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                    ))}
                  </div>
                  <p className="mt-1 text-sm text-gray-500 dark:text-zinc-500">{reviews.length} reviews</p>
                </div>
                <div className="flex-1 space-y-2">
                  {ratingDist.map((d) => (
                    <div key={d.rating} className="flex items-center gap-2 text-sm">
                      <span className="w-3 text-gray-600 dark:text-zinc-400">{d.rating}</span>
                      <svg className="h-3 w-3 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-zinc-800">
                        <div className="h-full rounded-full bg-yellow-400" style={{ width: `${d.pct}%` }} />
                      </div>
                      <span className="w-6 text-right text-gray-500 dark:text-zinc-500">{d.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
                <p className="text-sm font-medium text-gray-500 dark:text-zinc-500">5-Star Reviews</p>
                <p className="mt-1 text-2xl font-bold text-green-600">{ratingDist[0].count}</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
                <p className="text-sm font-medium text-gray-500 dark:text-zinc-500">Response Rate</p>
                <p className="mt-1 text-2xl font-bold text-blue-600">{reviews.length > 0 ? Math.round((reviews.filter((r) => r.reply).length / reviews.length) * 100) : 0}%</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
                <p className="text-sm font-medium text-gray-500 dark:text-zinc-500">Total Reviews</p>
                <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-zinc-100">{reviews.length}</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
                <p className="text-sm font-medium text-gray-500 dark:text-zinc-500">Needs Reply</p>
                <p className="mt-1 text-2xl font-bold text-orange-600">{reviews.filter((r) => !r.reply).length}</p>
              </div>
            </div>
          </div>

          {/* Reviews list */}
          <div className="mt-8 space-y-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-zinc-100">All Reviews</h2>
            {reviews.map((review) => (
              <div key={review.id} className="rounded-xl border border-gray-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-sm font-bold text-gray-600 dark:bg-zinc-800 dark:text-zinc-400">
                      {(review.userName || "U").charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-zinc-100">{review.userName || "Customer"}</p>
                      <p className="text-xs text-gray-500 dark:text-zinc-500">{formatDate(review.createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <svg key={s} className={`h-4 w-4 ${s <= review.rating ? "text-yellow-400" : "text-gray-300 dark:text-zinc-700"}`} fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                    ))}
                  </div>
                </div>

                <p className="mt-3 text-sm text-gray-700 dark:text-zinc-300">{review.comment}</p>

                {review.reply && (
                  <div className="mt-3 rounded-lg bg-gray-50 p-3 dark:bg-zinc-800">
                    <p className="text-xs font-semibold text-gray-500 dark:text-zinc-500">Your reply:</p>
                    <p className="mt-1 text-sm text-gray-700 dark:text-zinc-300">{review.reply}</p>
                  </div>
                )}

                {!review.reply && (
                  <div className="mt-3">
                    {replyingTo === review.id ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Write a reply..."
                          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-red-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                        />
                        <button
                          onClick={() => { setReplyingTo(null); setReplyText(""); }}
                          className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600"
                        >
                          Send
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setReplyingTo(review.id)}
                        className="text-sm font-medium text-red-500 hover:text-red-600"
                      >
                        Reply
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
