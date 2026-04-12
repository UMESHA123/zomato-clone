"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import useOrderSocket from "../hooks/useOrderSocket";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  restaurantId: string;
  restaurant: string;
  restaurantAddress: string;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  discount: number;
  taxes: number;
  total: number;
  status: string;
  paymentMethod: string;
  customerName: string;
  date: string;
  placedAt: string;
  createdAt: number;
}

interface DashboardStats {
  todayRevenue: number;
  todayOrders: number;
  avgRating: number;
  reviewCount: number;
  avgPrepTime: number;
}

const statusFlow: Record<string, { label: string; color: string; bg: string; nextStatus?: string; nextLabel?: string }> = {
  confirmed: { label: "New", color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-900/20", nextStatus: "accepted", nextLabel: "Accept" },
  accepted: { label: "Accepted", color: "text-indigo-600", bg: "bg-indigo-50 dark:bg-indigo-900/20", nextStatus: "preparing", nextLabel: "Start Preparing" },
  preparing: { label: "Preparing", color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-900/20", nextStatus: "ready", nextLabel: "Mark Ready" },
  ready: { label: "Ready", color: "text-green-600", bg: "bg-green-50 dark:bg-green-900/20", nextStatus: "picked_up", nextLabel: "Picked Up" },
  picked_up: { label: "Picked Up", color: "text-gray-500", bg: "bg-gray-50 dark:bg-zinc-800" },
  delivered: { label: "Delivered", color: "text-green-700", bg: "bg-green-100 dark:bg-green-900/30" },
};

function formatItems(items: OrderItem[]): string {
  return items.map((i) => `${i.name} x${i.quantity}`).join(", ");
}

function timeAgo(createdAt: number): string {
  const diff = Math.floor((Date.now() - createdAt) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

export default function RestaurantDashboardPage() {
  const { token, user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [restaurantName, setRestaurantName] = useState<string>("");
  const [stats, setStats] = useState<DashboardStats>({
    todayRevenue: 0,
    todayOrders: 0,
    avgRating: 0,
    reviewCount: 0,
    avgPrepTime: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);

  // Fetch restaurant info and stats
  useEffect(() => {
    if (!token || !user) return;

    const fetchRestaurantData = async () => {
      try {
        const restRes = await fetch(`${API_BASE}/api/restaurants/owner/${user.userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (restRes.ok) {
          const restaurants = await restRes.json();
          if (Array.isArray(restaurants) && restaurants.length > 0) {
            const restaurant = restaurants[0];
            setRestaurantName(restaurant.name || user.name);
            setStats((prev) => ({
              ...prev,
              avgRating: restaurant.rating || 0,
              reviewCount: restaurant.reviewCount || 0,
            }));
          } else {
            setRestaurantName(user.name);
          }
        }
      } catch {
        setRestaurantName(user.name);
      }

      // Compute stats from orders
      try {
        const ordersRes = await fetch(`${API_BASE}/api/orders`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (ordersRes.ok) {
          const allOrders: Order[] = await ordersRes.json();
          if (Array.isArray(allOrders)) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayOrders = allOrders.filter((o) => {
              const d = new Date(o.createdAt || o.date);
              return d >= today;
            });
            const todayRevenue = todayOrders
              .filter((o) => o.status !== "cancelled")
              .reduce((sum, o) => sum + (o.total || 0), 0);
            setStats((prev) => ({
              ...prev,
              todayRevenue,
              todayOrders: todayOrders.length,
            }));
          }
        }
      } catch {
        // Stats will show 0 if API fails
      }

      setStatsLoading(false);
    };

    fetchRestaurantData();
  }, [token, user]);

  // Fetch active orders
  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE}/api/orders`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch orders");
        return res.json();
      })
      .then((data: Order[]) => {
        setOrders(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [token]);

  const handleWsMessage = useCallback((data: { type: string; order: any }) => {
    if (data.type === "new_order") {
      setOrders((prev) => {
        if (prev.some((o) => o.id === data.order.id)) return prev;
        return [data.order, ...prev];
      });
    } else if (data.type === "order_updated") {
      setOrders((prev) =>
        prev.map((o) => (o.id === data.order.id ? data.order : o))
      );
    }
  }, []);

  useOrderSocket(handleWsMessage);

  const advanceOrder = async (id: string) => {
    const order = orders.find((o) => o.id === id);
    if (!order) return;
    const config = statusFlow[order.status];
    if (!config?.nextStatus) return;

    try {
      const res = await fetch(`${API_BASE}/api/orders/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: config.nextStatus }),
      });
      if (res.ok) {
        const updated: Order = await res.json();
        setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
      }
    } catch {
      // Network error
    }
  };

  const activeOrders = orders.filter(
    (o) => o.status !== "picked_up" && o.status !== "delivered"
  );

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-zinc-100">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-zinc-500">
            Welcome back{restaurantName ? `, ${restaurantName}` : ""}
          </p>
        </div>
        <p className="text-sm text-gray-500 dark:text-zinc-500">
          {new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* Stats cards */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm font-medium text-gray-500 dark:text-zinc-500">Today&apos;s Revenue</p>
          {statsLoading ? (
            <div className="mt-2 h-8 w-24 animate-pulse rounded bg-gray-200 dark:bg-zinc-800" />
          ) : (
            <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-zinc-100">{"\u20B9"}{stats.todayRevenue.toLocaleString()}</p>
          )}
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm font-medium text-gray-500 dark:text-zinc-500">Orders Today</p>
          {statsLoading ? (
            <div className="mt-2 h-8 w-16 animate-pulse rounded bg-gray-200 dark:bg-zinc-800" />
          ) : (
            <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-zinc-100">{stats.todayOrders}</p>
          )}
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm font-medium text-gray-500 dark:text-zinc-500">Avg Rating</p>
          {statsLoading ? (
            <div className="mt-2 h-8 w-16 animate-pulse rounded bg-gray-200 dark:bg-zinc-800" />
          ) : (
            <>
              <div className="mt-2 flex items-baseline gap-2">
                <p className="text-3xl font-bold text-gray-900 dark:text-zinc-100">{stats.avgRating > 0 ? stats.avgRating.toFixed(1) : "--"}</p>
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <svg key={s} className={`h-4 w-4 ${s <= Math.round(stats.avgRating) ? "text-yellow-400" : "text-gray-300 dark:text-zinc-700"}`} fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  ))}
                </div>
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-zinc-500">Based on {stats.reviewCount} reviews</p>
            </>
          )}
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm font-medium text-gray-500 dark:text-zinc-500">Active Orders</p>
          {statsLoading ? (
            <div className="mt-2 h-8 w-16 animate-pulse rounded bg-gray-200 dark:bg-zinc-800" />
          ) : (
            <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-zinc-100">{activeOrders.length}</p>
          )}
        </div>
      </div>

      {/* Live orders */}
      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 dark:text-zinc-100">Live Orders</h2>
          <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-600 dark:bg-red-900/20 dark:text-red-400">
            {activeOrders.length} active
          </span>
        </div>

        {loading ? (
          <div className="mt-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse rounded-xl border border-gray-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="h-4 w-24 rounded bg-gray-200 dark:bg-zinc-800" />
                    <div className="mt-2 h-3 w-40 rounded bg-gray-200 dark:bg-zinc-800" />
                  </div>
                  <div className="h-6 w-16 rounded bg-gray-200 dark:bg-zinc-800" />
                </div>
              </div>
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-4xl">🛍️</p>
            <p className="mt-3 text-gray-500 dark:text-zinc-500">No orders yet</p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {activeOrders.map((order) => {
              const config = statusFlow[order.status] || {
                label: order.status,
                color: "text-gray-500",
                bg: "bg-gray-50 dark:bg-zinc-800",
              };
              return (
                <div
                  key={order.id}
                  className={`rounded-xl border bg-white p-4 transition-shadow hover:shadow-md dark:bg-zinc-900 ${
                    order.status === "confirmed" ? "border-blue-300 dark:border-blue-800" : "border-gray-200 dark:border-zinc-800"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900 dark:text-zinc-100">{order.id}</span>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${config.color} ${config.bg}`}>
                            {config.label}
                          </span>
                          {order.status === "confirmed" && (
                            <span className="inline-flex h-3 w-3 rounded-full bg-blue-500" />
                          )}
                        </div>
                        <p className="mt-1 text-sm text-gray-500 dark:text-zinc-500">
                          {order.customerName} &middot; {order.placedAt || timeAgo(order.createdAt)}
                        </p>
                      </div>
                    </div>
                    <p className="text-lg font-bold text-gray-900 dark:text-zinc-100">{"\u20B9"}{order.total}</p>
                  </div>
                  <p className="mt-2 text-sm text-gray-600 dark:text-zinc-400">{formatItems(order.items)}</p>
                  {config.nextLabel && (
                    <div className="mt-3 flex justify-end">
                      <button
                        onClick={() => advanceOrder(order.id)}
                        className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors ${
                          order.status === "confirmed"
                            ? "bg-blue-500 hover:bg-blue-600"
                            : "bg-orange-500 hover:bg-orange-600"
                        }`}
                      >
                        {config.nextLabel}
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
        <a href="/menu" className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900">
          <span className="text-2xl">📋</span>
          <div>
            <p className="font-semibold text-gray-900 dark:text-zinc-100">Manage Menu</p>
            <p className="text-xs text-gray-500 dark:text-zinc-500">Add, edit or remove items</p>
          </div>
        </a>
        <a href="/orders" className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900">
          <span className="text-2xl">🛍️</span>
          <div>
            <p className="font-semibold text-gray-900 dark:text-zinc-100">All Orders</p>
            <p className="text-xs text-gray-500 dark:text-zinc-500">View complete order history</p>
          </div>
        </a>
        <a href="/reviews" className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900">
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
