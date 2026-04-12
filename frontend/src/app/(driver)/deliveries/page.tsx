"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { delivery as deliveryApi, type Delivery } from "@/services/api";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Toast } from "@/components/ui/Toast";

function TimerBar({ duration }: { duration: number }) {
  const [width, setWidth] = useState(100);

  useEffect(() => {
    const interval = setInterval(() => {
      setWidth((prev) => {
        if (prev <= 0) {
          clearInterval(interval);
          return 0;
        }
        return prev - 100 / (duration / 100);
      });
    }, 100);
    return () => clearInterval(interval);
  }, [duration]);

  return (
    <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
      <div
        className="h-full rounded-full bg-emerald-500 transition-all duration-100 ease-linear"
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

export default function DeliveriesPage() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acceptedIds, setAcceptedIds] = useState<Set<string>>(new Set());
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDeliveries = useCallback(async () => {
    setError(null);
    try {
      const data = await deliveryApi.available();
      setDeliveries(data);
    } catch {
      setError("Failed to load deliveries. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDeliveries();
    // Auto-refresh every 15 seconds
    const interval = setInterval(async () => {
      setRefreshing(true);
      try {
        const data = await deliveryApi.available();
        setDeliveries(data);
      } catch { /* silent */ }
      setRefreshing(false);
    }, 15000);
    return () => clearInterval(interval);
  }, [fetchDeliveries]);

  const handleAccept = useCallback(async (id: string) => {
    setAcceptedIds((prev) => new Set(prev).add(id));
    setToast({ message: "Delivery accepted!", type: "success" });

    try {
      await deliveryApi.accept(id);
    } catch { /* optimistic update */ }

    setTimeout(() => {
      setRemovingIds((prev) => new Set(prev).add(id));
      setTimeout(() => {
        setDeliveries((prev) => prev.filter((d) => d.id !== id));
        setRemovingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        setAcceptedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }, 500);
    }, 1500);
  }, []);

  const availableDeliveries = deliveries.filter((d) => !removingIds.has(d.id));

  if (error && !loading) return <ErrorState message={error} onRetry={fetchDeliveries} />;

  return (
    <div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Available Deliveries
          </h1>
          {!loading && (
            <span className="inline-flex items-center rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
              {availableDeliveries.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <svg
            className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Auto-refreshing
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && availableDeliveries.length === 0 && (
        <EmptyState
          icon="📦"
          title="No deliveries available right now"
          description="Stay online and we'll notify you when new delivery requests come in!"
        />
      )}

      {/* Deliveries Grid */}
      {!loading && availableDeliveries.length > 0 && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {availableDeliveries.map((delivery) => {
            const accepted = acceptedIds.has(delivery.id);
            const removing = removingIds.has(delivery.id);

            return (
              <div
                key={delivery.id}
                className={`overflow-hidden rounded-xl bg-white shadow-sm transition-all duration-500 dark:bg-gray-900 ${
                  removing ? "scale-95 opacity-0" : "scale-100 opacity-100"
                }`}
              >
                {/* Restaurant section */}
                <div className="border-b border-gray-100 p-5 dark:border-gray-800">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{delivery.restaurantName}</h3>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{delivery.restaurantAddress}</p>
                    </div>
                    <span className="text-xs text-gray-400 dark:text-gray-500">{delivery.orderNumber}</span>
                  </div>
                </div>

                {/* Delivery details */}
                <div className="border-b border-gray-100 p-5 dark:border-gray-800">
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 text-sm">📍</span>
                    <div>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{delivery.customerAddress}</p>
                      <p className="mt-0.5 text-xs text-gray-400">Deliver to {delivery.customerName}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-4">
                    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                      {delivery.distance}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                      {delivery.estimatedTime}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                      {delivery.items.reduce((acc, i) => acc + i.quantity, 0)} items
                    </span>
                  </div>
                </div>

                {/* Earning and action */}
                <div className="p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Delivery Earning</span>
                    <span className="text-2xl font-bold text-emerald-600">{"\u20B9"}{delivery.earning}</span>
                  </div>

                  {accepted ? (
                    <Link
                      href="/deliveries/active"
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-100 py-3 text-center font-semibold text-emerald-700 transition-colors hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Accepted &mdash; Go to Active Delivery
                    </Link>
                  ) : (
                    <button
                      onClick={() => handleAccept(delivery.id)}
                      className="w-full cursor-pointer rounded-lg bg-emerald-600 py-3 font-semibold text-white transition-colors hover:bg-emerald-700 active:bg-emerald-800"
                    >
                      Accept
                    </button>
                  )}

                  <TimerBar duration={30000} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
