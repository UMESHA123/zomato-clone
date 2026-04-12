"use client";

import Link from "next/link";
import { useState, useMemo, useEffect, useCallback } from "react";
import { useApp } from "@/context/AppContext";
import useOrderSocket from "@/hooks/useOrderSocket";

interface DisplayOrder {
  id: string;
  restaurant: string;
  items: { name: string; quantity: number }[];
  total: number;
  status: "confirmed" | "preparing" | "on_the_way" | "picked_up" | "delivered" | "cancelled";
  date: string;
  rating?: number;
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  confirmed: { label: "Confirmed", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/20" },
  preparing: { label: "Preparing", color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-900/20" },
  picked_up: { label: "Picked Up", color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-900/20" },
  on_the_way: { label: "On the Way", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/20" },
  delivered: { label: "Delivered", color: "text-green-600 dark:text-green-400", bg: "bg-green-50 dark:bg-green-900/20" },
  cancelled: { label: "Cancelled", color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-900/20" },
};

const activeStatuses = new Set(["confirmed", "preparing", "picked_up", "on_the_way"]);

export default function OrdersPage() {
  const { orders: liveOrders, refreshOrders, updateOrderInState } = useApp();
  const [filter, setFilter] = useState<"all" | "active" | "past">("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    refreshOrders().finally(() => setLoading(false));
  }, [refreshOrders]);

  const handleWsMessage = useCallback(
    (data: { type: string; order: any }) => {
      if (data.type === "order_updated" && data.order) {
        updateOrderInState(data.order);
      }
    },
    [updateOrderInState]
  );

  useOrderSocket(handleWsMessage);

  const allOrders: DisplayOrder[] = useMemo(() => {
    return liveOrders.map((o) => ({
      id: o.id,
      restaurant: o.restaurant,
      items: o.items.map((i) => ({ name: i.name, quantity: i.quantity })),
      total: o.total,
      status: o.status,
      date: o.date,
      rating: o.rating,
    }));
  }, [liveOrders]);

  const filtered = allOrders.filter((o) => {
    if (filter === "active") return activeStatuses.has(o.status);
    if (filter === "past") return o.status === "delivered" || o.status === "cancelled";
    return true;
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-zinc-100">Your Orders</h1>

      {/* Filter tabs */}
      <div className="mt-4 flex gap-2">
        {(["all", "active", "past"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-5 py-1.5 text-sm font-medium capitalize transition-colors ${
              filter === f
                ? "bg-red-500 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="mt-6 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse rounded-xl border border-gray-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-lg bg-gray-200 dark:bg-zinc-800" />
                <div className="flex-1">
                  <div className="h-4 w-32 rounded bg-gray-200 dark:bg-zinc-800" />
                  <div className="mt-2 h-3 w-48 rounded bg-gray-200 dark:bg-zinc-800" />
                </div>
              </div>
              <div className="mt-3 h-3 w-full rounded bg-gray-100 dark:bg-zinc-800" />
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Orders list */}
          <div className="mt-6 space-y-4">
            {filtered.map((order) => {
              const status = statusConfig[order.status] ?? statusConfig.confirmed;
              const isActive = activeStatuses.has(order.status);
              return (
                <div
                  key={order.id}
                  className={`rounded-xl border bg-white p-5 transition-shadow hover:shadow-md dark:bg-zinc-900 ${
                    isActive
                      ? "border-blue-200 dark:border-blue-900/50"
                      : "border-gray-200 dark:border-zinc-800"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-red-100 text-lg dark:bg-red-900/30">
                        🏪
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-zinc-100">{order.restaurant}</h3>
                        <p className="text-xs text-gray-500 dark:text-zinc-500">{order.id} &middot; {order.date}</p>
                      </div>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${status.color} ${status.bg}`}>
                      {status.label}
                    </span>
                  </div>

                  {/* Items */}
                  <div className="mt-3 border-t border-gray-100 pt-3 dark:border-zinc-800">
                    <p className="text-sm text-gray-600 dark:text-zinc-400">
                      {order.items.map((i) => `${i.name} x${i.quantity}`).join(", ")}
                    </p>
                  </div>

                  {/* Bottom row */}
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-3 dark:border-zinc-800">
                    <p className="font-semibold text-gray-800 dark:text-zinc-200">
                      {"\u20B9"}{order.total}
                    </p>

                    <div className="flex items-center gap-3">
                      {order.status === "delivered" && order.rating && (
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <svg
                              key={star}
                              className={`h-4 w-4 ${star <= order.rating! ? "text-yellow-400" : "text-gray-300 dark:text-zinc-700"}`}
                              fill="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                            </svg>
                          ))}
                        </div>
                      )}

                      {order.status === "delivered" && (
                        <button className="rounded-lg border border-red-500 px-4 py-1.5 text-xs font-semibold text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20">
                          Reorder
                        </button>
                      )}
                      {isActive && (
                        <Link
                          href={`/orders/${order.id}`}
                          className="rounded-lg bg-red-500 px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-600"
                        >
                          Track Order
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filtered.length === 0 && (
            <div className="py-20 text-center">
              <p className="text-4xl">📋</p>
              <p className="mt-3 text-lg font-medium text-gray-600 dark:text-zinc-400">
                {filter === "active" ? "No active orders" : filter === "past" ? "No past orders yet" : "No orders yet. Browse restaurants to get started!"}
              </p>
              <Link href="/" className="mt-4 inline-block text-sm font-medium text-red-500 hover:underline">
                Browse restaurants
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}
