"use client";

import { useState, useEffect, useCallback } from "react";
import { restaurants as restaurantsApi, orders as ordersApi, type Order, type RestaurantStats } from "@/services/api";
import { StatCardSkeleton, ListItemSkeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";

const statusConfig: Record<string, { label: string; color: string; bg: string; next?: string }> = {
  PLACED: { label: "New", color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-900/20", next: "Accept" },
  CONFIRMED: { label: "Confirmed", color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-900/20", next: "Start Preparing" },
  PREPARING: { label: "Preparing", color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-900/20", next: "Mark Ready" },
  READY: { label: "Ready", color: "text-green-600", bg: "bg-green-50 dark:bg-green-900/20" },
  PICKED_UP: { label: "Picked Up", color: "text-gray-500", bg: "bg-gray-50 dark:bg-zinc-800" },
};

export default function RestaurantDashboardPage() {
  const [stats, setStats] = useState<RestaurantStats | null>(null);
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsData, ordersData] = await Promise.all([
        restaurantsApi.getOwnerStats(),
        ordersApi.restaurantActive(),
      ]);
      setStats(statsData);
      setActiveOrders(ordersData);
    } catch {
      setError("Failed to load dashboard data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Auto-refresh active orders every 15 seconds
    const interval = setInterval(async () => {
      try {
        const ordersData = await ordersApi.restaurantActive();
        setActiveOrders(ordersData);
      } catch { /* silent refresh failure */ }
    }, 15000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const advanceOrder = async (id: number, currentStatus: string) => {
    const nextStatus: Record<string, string> = {
      PLACED: "CONFIRMED",
      CONFIRMED: "PREPARING",
      PREPARING: "READY",
    };
    const next = nextStatus[currentStatus];
    if (!next) return;

    try {
      const updated = await ordersApi.updateStatus(id, next);
      setActiveOrders((prev) =>
        prev.map((o) => (o.id === updated.id ? updated : o))
      );
    } catch {
      // Optimistic update if API fails
      setActiveOrders((prev) =>
        prev.map((o) => (o.id === id ? { ...o, status: next } : o))
      );
    }
  };

  if (error && !loading) {
    return <ErrorState message={error} onRetry={fetchData} />;
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-zinc-100">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-zinc-500">Restaurant overview</p>
        </div>
        <p className="text-sm text-gray-500 dark:text-zinc-500">
          {new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* Stats cards */}
      {loading ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      ) : stats ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-sm font-medium text-gray-500 dark:text-zinc-500">Today&apos;s Revenue</p>
            <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-zinc-100">{"\u20B9"}{stats.todayRevenue.toLocaleString()}</p>
            {stats.revenueChange !== 0 && (
              <p className={`mt-1 text-xs ${stats.revenueChange > 0 ? "text-green-600" : "text-red-500"}`}>
                {stats.revenueChange > 0 ? "+" : ""}{stats.revenueChange}% from yesterday
              </p>
            )}
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-sm font-medium text-gray-500 dark:text-zinc-500">Orders Today</p>
            <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-zinc-100">{stats.todayOrders}</p>
            {stats.orderChange !== 0 && (
              <p className={`mt-1 text-xs ${stats.orderChange > 0 ? "text-green-600" : "text-red-500"}`}>
                {stats.orderChange > 0 ? "+" : ""}{stats.orderChange} from yesterday
              </p>
            )}
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
            <p className="mt-1 text-xs text-gray-500 dark:text-zinc-500">Based on {stats.reviewCount} reviews</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-sm font-medium text-gray-500 dark:text-zinc-500">Avg Prep Time</p>
            <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-zinc-100">{stats.avgPrepTime} min</p>
          </div>
        </div>
      ) : null}

      {/* Live orders */}
      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 dark:text-zinc-100">Live Orders</h2>
          <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-600 dark:bg-red-900/20 dark:text-red-400">
            {activeOrders.filter((o) => o.status !== "PICKED_UP" && o.status !== "DELIVERED").length} active
          </span>
        </div>

        {loading ? (
          <div className="mt-4 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <ListItemSkeleton key={i} />
            ))}
          </div>
        ) : activeOrders.length === 0 ? (
          <EmptyState
            icon="📋"
            title="No active orders"
            description="New orders will appear here automatically"
          />
        ) : (
          <div className="mt-4 space-y-3">
            {activeOrders.map((order) => {
              const config = statusConfig[order.status] || statusConfig.PLACED;
              return (
                <div
                  key={order.id}
                  className={`rounded-xl border bg-white p-4 transition-shadow hover:shadow-md dark:bg-zinc-900 ${
                    order.status === "PLACED" ? "border-blue-300 dark:border-blue-800" : "border-gray-200 dark:border-zinc-800"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900 dark:text-zinc-100">{order.orderNumber}</span>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${config.color} ${config.bg}`}>
                          {config.label}
                        </span>
                        {order.status === "PLACED" && (
                          <span className="relative flex h-3 w-3">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
                            <span className="relative inline-flex h-3 w-3 rounded-full bg-blue-500" />
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-gray-500 dark:text-zinc-500">
                        {new Date(order.createdAt).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true })}
                      </p>
                    </div>
                    <p className="text-lg font-bold text-gray-900 dark:text-zinc-100">{"\u20B9"}{order.total}</p>
                  </div>
                  <p className="mt-2 text-sm text-gray-600 dark:text-zinc-400">
                    {order.items.map((i) => `${i.name} x${i.quantity}`).join(", ")}
                  </p>
                  {config.next && (
                    <div className="mt-3 flex justify-end">
                      <button
                        onClick={() => advanceOrder(order.id, order.status)}
                        className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors ${
                          order.status === "PLACED"
                            ? "bg-blue-500 hover:bg-blue-600"
                            : "bg-orange-500 hover:bg-orange-600"
                        }`}
                      >
                        {config.next}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <a href="/dashboard/menu" className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900">
          <span className="text-2xl">📋</span>
          <div>
            <p className="font-semibold text-gray-900 dark:text-zinc-100">Manage Menu</p>
            <p className="text-xs text-gray-500 dark:text-zinc-500">Add, edit or remove items</p>
          </div>
        </a>
        <a href="/dashboard/orders" className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900">
          <span className="text-2xl">🛍️</span>
          <div>
            <p className="font-semibold text-gray-900 dark:text-zinc-100">All Orders</p>
            <p className="text-xs text-gray-500 dark:text-zinc-500">View complete order history</p>
          </div>
        </a>
        <a href="/dashboard/reviews" className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900">
          <span className="text-2xl">⭐</span>
          <div>
            <p className="font-semibold text-gray-900 dark:text-zinc-100">Reviews</p>
            <p className="text-xs text-gray-500 dark:text-zinc-500">See customer feedback</p>
          </div>
        </a>
      </div>
    </div>
  );
}
