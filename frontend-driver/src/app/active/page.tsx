"use client";

import Link from "next/link";
import { useState, useCallback, useEffect } from "react";
import useOrderSocket from "../../hooks/useOrderSocket";
import { useAuth } from "../../context/AuthContext";

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

const steps = [
  { key: "picked_up", label: "Picked Up" },
  { key: "on_the_way", label: "On the Way" },
  { key: "delivered", label: "Delivered" },
] as const;

function getStepIndex(status: string): number {
  const idx = steps.findIndex((s) => s.key === status);
  return idx >= 0 ? idx : 0;
}

export default function ActiveDeliveryPage() {
  const { token } = useAuth();
  const [delivery, setDelivery] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);
  const [updating, setUpdating] = useState(false);

  // Fetch active delivery (status picked_up or on_the_way) on mount
  useEffect(() => {
    async function fetchActive() {
      try {
        if (!token) return;
        const res = await fetch(`${API_BASE}/api/orders`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data: Order[] = await res.json();
          const active = data.find(
            (o) => o.status === "picked_up" || o.status === "on_the_way"
          );
          if (active) {
            setDelivery(active);
          }
        }
      } catch (err) {
        console.error("Failed to fetch active delivery:", err);
      } finally {
        setLoading(false);
      }
    }
    if (token) {
      fetchActive();
    }
  }, [token]);

  // Listen for real-time updates via WebSocket
  useOrderSocket(
    useCallback((data: { type: string; order: Order }) => {
      if (data.type === "order_updated" || data.type === "new_order") {
        const order = data.order;
        setDelivery((prev) => {
          // If this is an update to the current delivery
          if (prev && prev.id === order.id) {
            if (order.status === "delivered") {
              setIsCompleted(true);
            }
            return order;
          }
          // If we have no active delivery and this one becomes picked_up
          if (
            !prev &&
            (order.status === "picked_up" || order.status === "on_the_way")
          ) {
            return order;
          }
          return prev;
        });
      }
    }, [])
  );

  const currentStepIndex = delivery ? getStepIndex(delivery.status) : 0;

  const handleUpdateStatus = useCallback(
    async (newStatus: string) => {
      if (!delivery || updating) return;
      setUpdating(true);
      try {
        const res = await fetch(
          `${API_BASE}/api/orders/${delivery.id}/status`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ status: newStatus }),
          }
        );
        if (res.ok) {
          const updated: Order = await res.json();
          setDelivery(updated);
          if (newStatus === "delivered") {
            setIsCompleted(true);
          }
        }
      } catch (err) {
        console.error("Failed to update status:", err);
      } finally {
        setUpdating(false);
      }
    },
    [delivery, updating, token]
  );

  const getActionButton = () => {
    if (!delivery || isCompleted) return null;
    switch (delivery.status) {
      case "picked_up":
        return {
          label: "Mark On the Way",
          nextStatus: "on_the_way",
          className: "bg-red-600 hover:bg-red-700 active:bg-red-800",
        };
      case "on_the_way":
        return {
          label: "Mark Delivered",
          nextStatus: "delivered",
          className:
            "bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800",
        };
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl bg-white py-20 text-center shadow-sm dark:bg-gray-900">
        <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-red-600" />
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Loading active delivery...
        </p>
      </div>
    );
  }

  if (!delivery) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl bg-white py-20 text-center shadow-sm dark:bg-gray-900">
        <div className="mb-4 text-6xl">{"\u{1F697}"}</div>
        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
          No active delivery
        </h3>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          No active delivery. Check available deliveries.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-red-600 px-6 py-2.5 font-semibold text-white transition-colors hover:bg-red-700"
        >
          Check Available Deliveries
        </Link>
      </div>
    );
  }

  const earning = Math.round(delivery.total * 0.1);

  if (isCompleted) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl bg-white py-20 text-center shadow-sm dark:bg-gray-900">
        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
          <svg
            className="h-10 w-10 text-emerald-600"
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
        </div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
          Delivery Completed!
        </h3>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          You earned{" "}
          <span className="font-bold text-emerald-600">
            {"\u20B9"}
            {earning}
          </span>{" "}
          for this delivery.
        </p>
        <div className="mt-6 flex gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-6 py-2.5 font-semibold text-white transition-colors hover:bg-red-700"
          >
            Find More Deliveries
          </Link>
          <Link
            href="/history"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-6 py-2.5 font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            View History
          </Link>
        </div>
      </div>
    );
  }

  const actionButton = getActionButton();

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Active Delivery
        </h1>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          In Progress
        </span>
      </div>

      {/* Progress Stepper */}
      <div className="mb-6 rounded-xl bg-white p-6 shadow-sm dark:bg-gray-900">
        {/* Desktop horizontal stepper */}
        <div className="hidden md:block">
          <div className="flex items-start justify-between">
            {steps.map((step, index) => {
              const isComplete = index < currentStepIndex;
              const isCurrent = index === currentStepIndex;
              const isFuture = index > currentStepIndex;
              return (
                <div
                  key={step.key}
                  className="flex flex-1 flex-col items-center"
                >
                  <div className="flex w-full items-center">
                    {index > 0 && (
                      <div
                        className={`h-0.5 flex-1 transition-colors duration-500 ${
                          isComplete || isCurrent
                            ? "bg-emerald-500"
                            : "border-t-2 border-dashed border-gray-300 dark:border-gray-600"
                        }`}
                      />
                    )}
                    <div
                      className={`relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full transition-all duration-500 ${
                        isComplete
                          ? "bg-emerald-500 text-white"
                          : isCurrent
                            ? "border-2 border-red-600 bg-red-50 text-red-600 dark:bg-red-900/30"
                            : "border-2 border-gray-300 bg-white text-gray-400 dark:border-gray-600 dark:bg-gray-800"
                      }`}
                    >
                      {isComplete ? (
                        <svg
                          className="h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      ) : (
                        <span className="text-sm font-bold">{index + 1}</span>
                      )}
                    </div>
                    {index < steps.length - 1 && (
                      <div
                        className={`h-0.5 flex-1 transition-colors duration-500 ${
                          isComplete
                            ? "bg-emerald-500"
                            : isFuture
                              ? "border-t-2 border-dashed border-gray-300 dark:border-gray-600"
                              : "border-t-2 border-dashed border-gray-300 dark:border-gray-600"
                        }`}
                      />
                    )}
                  </div>
                  <p
                    className={`mt-2 text-center text-xs font-medium ${
                      isComplete
                        ? "text-emerald-600"
                        : isCurrent
                          ? "text-red-600 dark:text-red-400"
                          : "text-gray-400 dark:text-gray-500"
                    }`}
                  >
                    {step.label}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Mobile vertical stepper */}
        <div className="md:hidden">
          <div className="space-y-0">
            {steps.map((step, index) => {
              const isComplete = index < currentStepIndex;
              const isCurrent = index === currentStepIndex;
              return (
                <div key={step.key} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div
                      className={`relative flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full transition-all duration-500 ${
                        isComplete
                          ? "bg-emerald-500 text-white"
                          : isCurrent
                            ? "border-2 border-red-600 bg-red-50 text-red-600 dark:bg-red-900/30"
                            : "border-2 border-gray-300 bg-white text-gray-400 dark:border-gray-600 dark:bg-gray-800"
                      }`}
                    >
                      {isComplete ? (
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      ) : (
                        <span className="text-xs font-bold">{index + 1}</span>
                      )}
                    </div>
                    {index < steps.length - 1 && (
                      <div
                        className={`my-1 h-6 w-0.5 ${
                          isComplete
                            ? "bg-emerald-500"
                            : "border-l-2 border-dashed border-gray-300 dark:border-gray-600"
                        }`}
                      />
                    )}
                  </div>
                  <p
                    className={`pt-1 text-sm font-medium ${
                      isComplete
                        ? "text-emerald-600"
                        : isCurrent
                          ? "text-red-600 dark:text-red-400"
                          : "text-gray-400 dark:text-gray-500"
                    }`}
                  >
                    {step.label}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Order Details Card */}
        <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-gray-900">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            Order Details
          </h2>
          {/* Restaurant */}
          <div className="mb-4">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-red-100 text-sm dark:bg-red-900/30">
                {"\u{1F3EA}"}
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Pickup From
                </p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {delivery.restaurant}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {delivery.restaurantAddress || "Restaurant address"}
                </p>
              </div>
            </div>
          </div>
          <div className="ml-4 flex flex-col items-start gap-0.5 py-1">
            <span className="h-1 w-1 rounded-full bg-gray-300 dark:bg-gray-600" />
            <span className="h-1 w-1 rounded-full bg-gray-300 dark:bg-gray-600" />
            <span className="h-1 w-1 rounded-full bg-gray-300 dark:bg-gray-600" />
          </div>
          {/* Customer */}
          <div className="mb-6">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm dark:bg-emerald-900/30">
                {"\u{1F4CD}"}
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Deliver To
                </p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {delivery.customerName}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Delivery address
                </p>
              </div>
            </div>
          </div>
          <hr className="mb-4 border-gray-100 dark:border-gray-800" />
          {/* Items */}
          <div className="mb-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Items
            </p>
            <ul className="space-y-2">
              {delivery.items.map((item, idx) => (
                <li
                  key={idx}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-gray-700 dark:text-gray-300">
                    {item.name}
                  </span>
                  <span className="font-medium text-gray-500 dark:text-gray-400">
                    x{item.quantity}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <hr className="mb-4 border-gray-100 dark:border-gray-800" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Order Total
              </p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {"\u20B9"}
                {delivery.total}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Your Earning
              </p>
              <p className="text-lg font-bold text-emerald-600">
                {"\u20B9"}
                {earning}
              </p>
            </div>
          </div>
        </div>

        {/* Right column: Info + Action */}
        <div className="space-y-6">
          {/* Restaurant Info Card */}
          <div className="rounded-xl bg-white p-5 shadow-sm dark:bg-gray-900">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Restaurant
            </h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  {delivery.restaurant}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {delivery.restaurantAddress || "Restaurant address"}
                </p>
              </div>
            </div>
          </div>

          {/* Customer Info Card */}
          <div className="rounded-xl bg-white p-5 shadow-sm dark:bg-gray-900">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Customer
            </h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  {delivery.customerName}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Order {delivery.id}
                </p>
              </div>
            </div>
          </div>

          {/* Delivery Info */}
          <div className="rounded-xl bg-white p-5 shadow-sm dark:bg-gray-900">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Delivery Info
            </h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  2-5 km
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Distance
                </p>
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {delivery.placedAt}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Ordered At
                </p>
              </div>
              <div>
                <p className="text-lg font-bold text-emerald-600">
                  {"\u20B9"}
                  {earning}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Earning
                </p>
              </div>
            </div>
          </div>

          {/* Action button */}
          {actionButton && (
            <button
              onClick={() => handleUpdateStatus(actionButton.nextStatus)}
              disabled={updating}
              className={`w-full cursor-pointer rounded-xl py-4 text-lg font-bold text-white shadow-sm transition-all disabled:cursor-not-allowed disabled:opacity-50 ${actionButton.className}`}
            >
              {updating ? "Updating..." : actionButton.label}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
