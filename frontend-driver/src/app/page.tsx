"use client";

import Link from "next/link";
import { useState, useCallback, useEffect } from "react";
import useOrderSocket from "../hooks/useOrderSocket";
import { useAuth } from "../context/AuthContext";

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

function Toast({
  message,
  onClose,
}: {
  message: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed right-4 top-4 z-[100] rounded-lg bg-emerald-600 px-6 py-3 text-white shadow-lg md:right-6 md:top-6">
      <div className="flex items-center gap-2">
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
        {message}
      </div>
    </div>
  );
}

export default function DeliveriesPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());
  const [isOnline] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();

  // Fetch orders with status "ready" on mount
  useEffect(() => {
    async function fetchOrders() {
      try {
        if (!token) return;
        const res = await fetch(`${API_BASE}/api/orders`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data: Order[] = await res.json();
          setOrders(data.filter((o) => o.status === "ready"));
        }
      } catch (err) {
        console.error("Failed to fetch orders:", err);
      } finally {
        setLoading(false);
      }
    }
    if (token) {
      fetchOrders();
    }
  }, [token]);

  // Listen for real-time order updates via WebSocket
  useOrderSocket(
    useCallback((data: { type: string; order: Order }) => {
      if (data.type === "new_order" || data.type === "order_updated") {
        const order = data.order;
        setOrders((prev) => {
          // If the order is now "ready", add it or update it
          if (order.status === "ready") {
            const exists = prev.find((o) => o.id === order.id);
            if (exists) {
              return prev.map((o) => (o.id === order.id ? order : o));
            }
            return [order, ...prev];
          }
          // If the order is no longer "ready", remove it
          return prev.filter((o) => o.id !== order.id);
        });
      }
    }, [])
  );

  const handleAccept = useCallback(async (id: string) => {
    setAcceptingId(id);
    try {
      const res = await fetch(`${API_BASE}/api/orders/${id}/status`, {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ status: "picked_up" }),
      });
      if (res.ok) {
        setToastMessage("Delivery accepted!");
        // Animate card out then remove
        setTimeout(() => {
          setRemovingIds((prev) => new Set(prev).add(id));
          setTimeout(() => {
            setOrders((prev) => prev.filter((o) => o.id !== id));
            setRemovingIds((prev) => {
              const next = new Set(prev);
              next.delete(id);
              return next;
            });
            setAcceptingId(null);
          }, 500);
        }, 1000);
      } else {
        setAcceptingId(null);
        setToastMessage("Failed to accept delivery.");
      }
    } catch {
      setAcceptingId(null);
      setToastMessage("Network error. Please try again.");
    }
  }, [token]);

  const handleCloseToast = useCallback(() => {
    setToastMessage(null);
  }, []);

  const availableOrders = orders.filter((o) => !removingIds.has(o.id));

  return (
    <div>
      {toastMessage && (
        <Toast message={toastMessage} onClose={handleCloseToast} />
      )}

      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Available Deliveries
          </h1>
          <span className="inline-flex items-center rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
            {availableOrders.length}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Live via WebSocket
        </div>
      </div>

      {/* Offline banner */}
      {!isOnline && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-yellow-300 bg-yellow-50 px-5 py-4 dark:border-yellow-700 dark:bg-yellow-900/20">
          <svg
            className="h-5 w-5 text-yellow-600 dark:text-yellow-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
          <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
            You are offline. Go online to receive delivery requests.
          </p>
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="flex flex-col items-center justify-center rounded-xl bg-white py-20 text-center shadow-sm dark:bg-gray-900">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-red-600" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Loading available deliveries...
          </p>
        </div>
      ) : availableOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl bg-white py-20 text-center shadow-sm dark:bg-gray-900">
          <div className="mb-4 text-6xl">{"\u{1F4E6}"}</div>
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
            No deliveries available right now
          </h3>
          <p className="mt-2 max-w-md text-sm text-gray-500 dark:text-gray-400">
            Stay online and we&apos;ll notify you when new delivery requests
            come in!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {availableOrders.map((order) => {
            const accepted = acceptingId === order.id;
            const removing = removingIds.has(order.id);
            const earning = Math.round(order.total * 0.1);
            const itemCount = order.items.reduce(
              (acc, i) => acc + i.quantity,
              0
            );
            const distance = `${(2 + Math.random() * 3).toFixed(1)} km`;

            return (
              <div
                key={order.id}
                className={`overflow-hidden rounded-xl bg-white shadow-sm transition-all duration-500 dark:bg-gray-900 ${
                  removing
                    ? "scale-95 opacity-0"
                    : "scale-100 opacity-100"
                }`}
              >
                {/* Restaurant section */}
                <div className="border-b border-gray-100 p-5 dark:border-gray-800">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {order.restaurant}
                      </h3>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {order.restaurantAddress || "Restaurant address"}
                      </p>
                    </div>
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {order.id}
                    </span>
                  </div>
                  {/* Map placeholder */}
                  <div className="mt-3 flex h-24 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
                    <div className="flex flex-col items-center text-gray-400 dark:text-gray-500">
                      <span className="text-2xl">{"\u{1F4CD}"}</span>
                      <span className="mt-1 text-xs">Pickup Location</span>
                    </div>
                  </div>
                </div>

                {/* Delivery details */}
                <div className="border-b border-gray-100 p-5 dark:border-gray-800">
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 text-sm">{"\u{1F4CD}"}</span>
                    <div>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {order.items
                          .map((i) => `${i.name} x${i.quantity}`)
                          .join(", ")}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-400">
                        Deliver to {order.customerName}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-4">
                    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                      <svg
                        className="h-3.5 w-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                        />
                      </svg>
                      {distance}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                      <svg
                        className="h-3.5 w-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      {order.placedAt}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                      <svg
                        className="h-3.5 w-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                        />
                      </svg>
                      {itemCount} items
                    </span>
                  </div>
                </div>

                {/* Earning and action */}
                <div className="p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        Order Total
                      </span>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">
                        {"\u20B9"}
                        {order.total}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        Delivery Earning
                      </span>
                      <p className="text-2xl font-bold text-emerald-600">
                        {"\u20B9"}
                        {earning}
                      </p>
                    </div>
                  </div>

                  {accepted ? (
                    <Link
                      href="/active"
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-100 py-3 text-center font-semibold text-emerald-700 transition-colors hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50"
                    >
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      Accepted &mdash; Go to Active Delivery
                    </Link>
                  ) : (
                    <button
                      onClick={() => handleAccept(order.id)}
                      disabled={acceptingId !== null}
                      className="w-full cursor-pointer rounded-lg bg-emerald-600 py-3 font-semibold text-white transition-colors hover:bg-emerald-700 active:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Accept
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
