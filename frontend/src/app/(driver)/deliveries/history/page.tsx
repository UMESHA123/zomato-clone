"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { delivery as deliveryApi, type Delivery, type DeliveryStats } from "@/services/api";
import { Skeleton, StatCardSkeleton, ListItemSkeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";

const periodOptions = [
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "all", label: "All Time" },
];

export default function DeliveryHistoryPage() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [stats, setStats] = useState<DeliveryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState("week");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [historyData, statsData] = await Promise.all([
        deliveryApi.history({ period }),
        deliveryApi.stats(),
      ]);
      setDeliveries(historyData);
      setStats(statsData);
    } catch {
      setError("Failed to load delivery history.");
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const completedDeliveries = useMemo(
    () => deliveries.filter((d) => d.status === "DELIVERED"),
    [deliveries]
  );

  const cancelledDeliveries = useMemo(
    () => deliveries.filter((d) => d.status === "CANCELLED"),
    [deliveries]
  );

  const totalEarnings = useMemo(
    () => completedDeliveries.reduce((sum, d) => sum + d.earning, 0),
    [completedDeliveries]
  );

  if (error && !loading) return <ErrorState message={error} onRetry={fetchData} />;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Delivery History</h1>

      {/* Period filter */}
      <div className="mt-4 flex gap-2">
        {periodOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setPeriod(opt.value)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              period === opt.value
                ? "bg-emerald-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-zinc-800 dark:text-zinc-400"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Stats */}
      {loading ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      ) : stats ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-sm font-medium text-gray-500 dark:text-zinc-500">Total Earnings</p>
            <p className="mt-2 text-3xl font-bold text-emerald-600">{"\u20B9"}{totalEarnings.toLocaleString()}</p>
            <p className="mt-1 text-xs text-gray-500">{completedDeliveries.length} deliveries</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-sm font-medium text-gray-500 dark:text-zinc-500">Today&apos;s Earnings</p>
            <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-zinc-100">{"\u20B9"}{stats.todayEarnings}</p>
            <p className="mt-1 text-xs text-gray-500">{stats.todayDeliveries} deliveries</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-sm font-medium text-gray-500 dark:text-zinc-500">Avg Rating</p>
            <div className="mt-2 flex items-baseline gap-2">
              <p className="text-3xl font-bold text-gray-900 dark:text-zinc-100">{stats.avgRating.toFixed(1)}</p>
              <div className="flex">
                {[1, 2, 3, 4, 5].map((s) => (
                  <svg key={s} className={`h-4 w-4 ${s <= Math.round(stats.avgRating) ? "text-yellow-400" : "text-gray-300 dark:text-zinc-700"}`} fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                ))}
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-sm font-medium text-gray-500 dark:text-zinc-500">Total Deliveries</p>
            <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-zinc-100">{stats.totalDeliveries}</p>
            {cancelledDeliveries.length > 0 && (
              <p className="mt-1 text-xs text-red-500">{cancelledDeliveries.length} cancelled</p>
            )}
          </div>
        </div>
      ) : null}

      {/* Delivery list */}
      {loading ? (
        <div className="mt-6 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <ListItemSkeleton key={i} />
          ))}
        </div>
      ) : deliveries.length === 0 ? (
        <EmptyState
          icon="📦"
          title="No deliveries yet"
          description="Your delivery history will appear here"
          actionLabel="View Available Deliveries"
          actionHref="/deliveries"
        />
      ) : (
        <div className="mt-6 space-y-3">
          {deliveries.map((del) => (
            <div
              key={del.id}
              className={`rounded-xl border bg-white p-4 dark:bg-zinc-900 ${
                del.status === "CANCELLED" ? "border-red-200 dark:border-red-900/50" : "border-gray-200 dark:border-zinc-800"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900 dark:text-zinc-100">{del.restaurantName}</h3>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      del.status === "DELIVERED"
                        ? "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400"
                        : "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400"
                    }`}>
                      {del.status === "DELIVERED" ? "Completed" : "Cancelled"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-500 dark:text-zinc-500">
                    {del.orderNumber} &middot; {del.customerName} &middot; {del.distance}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-400">
                    {new Date(del.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`text-lg font-bold ${del.status === "DELIVERED" ? "text-emerald-600" : "text-gray-400 line-through"}`}>
                    {"\u20B9"}{del.earning}
                  </p>
                  {del.rating && (
                    <div className="mt-1 flex items-center justify-end gap-1">
                      <svg className="h-3.5 w-3.5 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                      <span className="text-sm font-medium text-gray-600 dark:text-zinc-400">{del.rating}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
