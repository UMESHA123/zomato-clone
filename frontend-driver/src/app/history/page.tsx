"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

interface HistoryDelivery {
  id: string;
  _id?: string;
  orderId: string;
  orderNumber?: string;
  restaurantName: string;
  restaurantAddress: string;
  customerName: string;
  customerAddress: string;
  items: { name: string; quantity: number }[];
  total: number;
  status: string;
  distance: string;
  estimatedTime: string;
  earning: number;
  createdAt: string;
  completedAt?: string;
  deliveredAt?: string;
  rating?: number;
  cancelled?: boolean;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

type DateFilter = "today" | "week" | "month" | "all";

const filterOptions: { key: DateFilter; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "all", label: "All Time" },
];

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`h-4 w-4 ${
            star <= rating
              ? "text-yellow-400"
              : "text-gray-300 dark:text-gray-600"
          }`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

export default function DeliveryHistoryPage() {
  const { token } = useAuth();
  const [deliveries, setDeliveries] = useState<HistoryDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [visibleCount, setVisibleCount] = useState(8);

  const fetchHistory = useCallback(async () => {
    if (!token) return;
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/delivery/history`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch delivery history");
      const data = await res.json();
      const list = Array.isArray(data) ? data : data.deliveries || [];
      setDeliveries(
        list.map((d: any) => ({
          ...d,
          id: d.id || d._id,
          earning: d.earning || 0,
          distance: d.distance || "N/A",
          estimatedTime: d.estimatedTime || "N/A",
          items: d.items || [],
          cancelled: d.status === "CANCELLED",
        }))
      );
    } catch (err: any) {
      setError(err.message || "Failed to load history");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const filteredDeliveries = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return deliveries.filter((d) => {
      const created = new Date(d.createdAt);
      switch (dateFilter) {
        case "today":
          return created >= startOfToday;
        case "week":
          return created >= startOfWeek;
        case "month":
          return created >= startOfMonth;
        default:
          return true;
      }
    });
  }, [dateFilter, deliveries]);

  const stats = useMemo(() => {
    const delivered = filteredDeliveries.filter((d) => !d.cancelled);
    const totalEarnings = delivered.reduce((sum, d) => sum + d.earning, 0);
    const rated = delivered.filter((d) => d.rating);
    const avgRating =
      rated.length > 0
        ? rated.reduce((sum, d) => sum + (d.rating || 0), 0) / rated.length
        : 0;
    return {
      totalDeliveries: delivered.length,
      totalEarnings,
      avgRating: Math.round(avgRating * 10) / 10,
    };
  }, [filteredDeliveries]);

  const visibleDeliveries = filteredDeliveries.slice(0, visibleCount);
  const hasMore = visibleCount < filteredDeliveries.length;

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Delivery History</h1>
        <div className="mt-6 space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse rounded-xl bg-white p-5 shadow-sm dark:bg-gray-900">
              <div className="flex items-center gap-3">
                <div className="h-5 w-32 rounded bg-gray-200 dark:bg-gray-800" />
                <div className="h-4 w-4 rounded bg-gray-200 dark:bg-gray-800" />
                <div className="h-4 w-48 rounded bg-gray-200 dark:bg-gray-800" />
              </div>
              <div className="mt-3 h-3 w-64 rounded bg-gray-100 dark:bg-gray-800" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Delivery History</h1>
        <div className="mt-8 py-16 text-center">
          <p className="text-red-500">{error}</p>
          <button onClick={fetchHistory} className="mt-4 rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Delivery History
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Your past deliveries and earnings summary
          </p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl bg-white p-5 shadow-sm dark:bg-gray-900">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <svg className="h-5 w-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Total Deliveries</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalDeliveries}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-white p-5 shadow-sm dark:bg-gray-900">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
              <svg className="h-5 w-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Total Earnings</p>
              <p className="text-2xl font-bold text-emerald-600">{"\u20B9"}{stats.totalEarnings}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-white p-5 shadow-sm dark:bg-gray-900">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
              <svg className="h-5 w-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Average Rating</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.avgRating > 0 ? stats.avgRating : "--"}
                <span className="ml-1 text-sm font-normal text-gray-400">/5</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Date Filter Pills */}
      <div className="mb-6 flex flex-wrap gap-2">
        {filterOptions.map((option) => (
          <button
            key={option.key}
            onClick={() => {
              setDateFilter(option.key);
              setVisibleCount(8);
            }}
            className={`cursor-pointer rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              dateFilter === option.key
                ? "bg-red-600 text-white"
                : "bg-white text-gray-600 hover:bg-gray-100 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Deliveries List */}
      {visibleDeliveries.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl bg-white py-20 text-center shadow-sm dark:bg-gray-900">
          <div className="mb-4 text-6xl">{"\u{1F4DC}"}</div>
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
            No deliveries found
          </h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {dateFilter === "all"
              ? "Complete deliveries to see your history here."
              : "No delivery history for the selected time period."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleDeliveries.map((delivery) => (
            <div
              key={delivery.id}
              className="rounded-xl bg-white p-5 shadow-sm transition-colors hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800/50"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {delivery.restaurantName}
                    </p>
                    <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {delivery.customerAddress}
                    </p>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                    <span>{formatDate(delivery.createdAt)}</span>
                    <span>{"\u2022"}</span>
                    <span>{formatTime(delivery.createdAt)}</span>
                    <span>{"\u2022"}</span>
                    <span>
                      {delivery.items.reduce((acc, i) => acc + i.quantity, 0)} items
                    </span>
                    <span>{"\u2022"}</span>
                    <span>{delivery.distance}</span>
                  </div>
                  {delivery.rating && !delivery.cancelled && (
                    <div className="mt-2">
                      <StarRating rating={delivery.rating} />
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-4 sm:flex-col sm:items-end sm:gap-2">
                  {delivery.cancelled ? (
                    <span className="inline-flex items-center rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
                      Cancelled
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                      Delivered
                    </span>
                  )}
                  <span
                    className={`text-lg font-bold ${
                      delivery.cancelled
                        ? "text-gray-400 line-through"
                        : "text-emerald-600"
                    }`}
                  >
                    {"\u20B9"}{delivery.earning}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {hasMore && (
            <div className="pt-4 text-center">
              <button
                onClick={() => setVisibleCount((prev) => prev + 8)}
                className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Load More
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
