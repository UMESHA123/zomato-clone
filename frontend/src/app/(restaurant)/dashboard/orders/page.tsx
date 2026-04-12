"use client";

import { useState, useEffect, useCallback } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

function getAuthHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("zomato_token") : null;
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

interface Order {
  id: string;
  customer: string;
  customerName?: string;
  phone: string;
  items: { name: string; qty: number; quantity?: number; price: number }[];
  total: number;
  status: "new" | "confirmed" | "accepted" | "preparing" | "ready" | "picked_up" | "delivered" | "cancelled";
  time: string;
  date?: string;
  placedAt?: string;
  paymentMethod: string;
  createdAt?: number;
}

const statusFlow: Record<string, { label: string; color: string; bg: string; nextStatus?: string; nextLabel?: string }> = {
  new: { label: "New Order", color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-900/20", nextStatus: "accepted", nextLabel: "Accept Order" },
  confirmed: { label: "New Order", color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-900/20", nextStatus: "accepted", nextLabel: "Accept Order" },
  accepted: { label: "Accepted", color: "text-indigo-600", bg: "bg-indigo-50 dark:bg-indigo-900/20", nextStatus: "preparing", nextLabel: "Start Preparing" },
  preparing: { label: "Preparing", color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-900/20", nextStatus: "ready", nextLabel: "Mark Ready" },
  ready: { label: "Ready for Pickup", color: "text-green-600", bg: "bg-green-50 dark:bg-green-900/20" },
  picked_up: { label: "Picked Up", color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-900/20" },
  delivered: { label: "Delivered", color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
  cancelled: { label: "Cancelled", color: "text-red-600", bg: "bg-red-50 dark:bg-red-900/20" },
};

const filterTabs = ["all", "new", "preparing", "ready", "completed"] as const;

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/orders`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to fetch orders");
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setOrders(
        list.map((o: any) => ({
          id: o.id || o.orderNumber,
          customer: o.customerName || o.customer || "Customer",
          phone: o.phone || "",
          items: (o.items || []).map((i: any) => ({
            name: i.name,
            qty: i.quantity || i.qty || 1,
            price: i.price || 0,
          })),
          total: o.total || 0,
          status: o.status || "confirmed",
          time: o.placedAt || o.time || "",
          paymentMethod: o.paymentMethod || "Online",
        }))
      );
    } catch (err: any) {
      setError(err.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const advanceOrder = async (id: string) => {
    const order = orders.find((o) => o.id === id);
    if (!order) return;
    const next = statusFlow[order.status]?.nextStatus;
    if (!next) return;

    try {
      const res = await fetch(`${API_BASE}/api/orders/${id}/status`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ status: next }),
      });
      if (res.ok) {
        const updated = await res.json();
        setOrders((prev) =>
          prev.map((o) => (o.id === updated.id ? { ...o, status: updated.status } : o))
        );
      } else {
        // Fallback: update locally
        setOrders((prev) =>
          prev.map((o) =>
            o.id === id ? { ...o, status: next as Order["status"] } : o
          )
        );
      }
    } catch {
      // Update locally on network error
      setOrders((prev) =>
        prev.map((o) =>
          o.id === id ? { ...o, status: next as Order["status"] } : o
        )
      );
    }
  };

  const filtered = orders.filter((o) => {
    if (activeTab === "all") return true;
    if (activeTab === "completed") return o.status === "delivered" || o.status === "cancelled" || o.status === "picked_up";
    if (activeTab === "preparing") return o.status === "accepted" || o.status === "preparing";
    if (activeTab === "new") return o.status === "new" || o.status === "confirmed";
    return o.status === activeTab;
  });

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-zinc-100">Order Management</h1>
        <div className="mt-6 space-y-3">
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
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-zinc-100">Order Management</h1>
        <div className="mt-8 py-16 text-center">
          <p className="text-red-500">{error}</p>
          <button onClick={fetchOrders} className="mt-4 rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-zinc-100">Order Management</h1>

      {/* Filter tabs */}
      <div className="mt-4 flex flex-wrap gap-2">
        {filterTabs.map((tab) => {
          const count = orders.filter((o) => {
            if (tab === "all") return true;
            if (tab === "completed") return o.status === "delivered" || o.status === "cancelled" || o.status === "picked_up";
            if (tab === "preparing") return o.status === "accepted" || o.status === "preparing";
            if (tab === "new") return o.status === "new" || o.status === "confirmed";
            return o.status === tab;
          }).length;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium capitalize transition-colors ${
                activeTab === tab
                  ? "bg-red-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
              }`}
            >
              {tab} ({count})
            </button>
          );
        })}
      </div>

      {/* Orders */}
      <div className="mt-6 space-y-3">
        {filtered.map((order) => {
          const config = statusFlow[order.status] || { label: order.status, color: "text-gray-500", bg: "bg-gray-50 dark:bg-zinc-800" };
          const isExpanded = expandedOrder === order.id;
          return (
            <div
              key={order.id}
              className={`rounded-xl border bg-white transition-shadow dark:bg-zinc-900 ${
                order.status === "new" || order.status === "confirmed" ? "border-blue-300 shadow-sm dark:border-blue-800" : "border-gray-200 dark:border-zinc-800"
              }`}
            >
              <button
                onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                className="flex w-full items-center justify-between px-5 py-4 text-left"
              >
                <div className="flex items-center gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900 dark:text-zinc-100">{order.id}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${config.color} ${config.bg}`}>
                        {config.label}
                      </span>
                    </div>
                    <p className="mt-0.5 text-sm text-gray-500 dark:text-zinc-500">
                      {order.customer} &middot; {order.time} &middot; {order.paymentMethod}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <p className="font-bold text-gray-900 dark:text-zinc-100">{"\u20B9"}{order.total}</p>
                  <svg className={`h-4 w-4 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-gray-100 px-5 py-4 dark:border-zinc-800">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-500">Order Items</h4>
                  <div className="mt-2 space-y-1">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span className="text-gray-700 dark:text-zinc-300">{item.name} x{item.qty}</span>
                        <span className="text-gray-600 dark:text-zinc-400">{"\u20B9"}{item.price}</span>
                      </div>
                    ))}
                    <div className="flex justify-between border-t border-gray-100 pt-2 text-sm font-bold dark:border-zinc-800">
                      <span className="text-gray-900 dark:text-zinc-100">Total</span>
                      <span className="text-gray-900 dark:text-zinc-100">{"\u20B9"}{order.total}</span>
                    </div>
                  </div>

                  {config.nextLabel && (
                    <button
                      onClick={(e) => { e.stopPropagation(); advanceOrder(order.id); }}
                      className="mt-4 w-full rounded-lg bg-red-500 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-600"
                    >
                      {config.nextLabel}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="py-16 text-center">
          <p className="text-4xl">📋</p>
          <p className="mt-3 text-gray-500 dark:text-zinc-500">No orders in this category</p>
        </div>
      )}
    </div>
  );
}
