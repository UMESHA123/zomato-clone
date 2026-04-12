"use client";

import Link from "next/link";
import { useState, useCallback, useMemo, useEffect } from "react";
import DeliveryMap from "@/components/DeliveryMapLoader";
import type { DriverLocationInfo } from "@/components/DeliveryMap";
import useUserLocation from "@/hooks/useUserLocation";
import { delivery as deliveryApi, type Delivery } from "@/services/api";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Toast } from "@/components/ui/Toast";

const steps = [
  { key: "ASSIGNED", label: "Order Accepted" },
  { key: "REACHED", label: "Reached Restaurant" },
  { key: "PICKED_UP", label: "Picked Up" },
  { key: "ON_THE_WAY", label: "On the Way" },
  { key: "DELIVERED", label: "Delivered" },
] as const;

// Default locations when delivery has no geo data
const DEFAULT_RESTAURANT = { lat: 12.9716, lng: 77.6412 };
const DEFAULT_DRIVER_START = { lat: 12.9780, lng: 77.6350 };

function statusToStepIdx(status: string): number {
  const map: Record<string, number> = {
    ASSIGNED: 0,
    REACHED: 1,
    PICKED_UP: 2,
    ON_THE_WAY: 3,
    DELIVERED: 4,
  };
  return map[status] ?? 0;
}

function statusToMapStep(status: string): number {
  const map: Record<string, number> = {
    ASSIGNED: 0,
    REACHED: 1,
    PICKED_UP: 2,
    ON_THE_WAY: 3,
    DELIVERED: 4,
  };
  return map[status] ?? 0;
}

export default function ActiveDeliveryPage() {
  const userLocation = useUserLocation();
  const [activeDelivery, setActiveDelivery] = useState<Delivery | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [driverInfo, setDriverInfo] = useState<DriverLocationInfo | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const fetchActive = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await deliveryApi.active();
      setActiveDelivery(data);
      if (data) {
        setCurrentStep(statusToStepIdx(data.status));
      }
    } catch {
      setError("Failed to load active delivery.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActive();
  }, [fetchActive]);

  const LOCATIONS = useMemo(() => ({
    restaurant: activeDelivery?.restaurantLocation || DEFAULT_RESTAURANT,
    driverStart: DEFAULT_DRIVER_START,
    customer: activeDelivery?.customerLocation || { lat: userLocation.lat, lng: userLocation.lng },
  }), [activeDelivery, userLocation.lat, userLocation.lng]);

  const handleDriverUpdate = useCallback((info: DriverLocationInfo) => {
    setDriverInfo(info);
  }, []);

  const advanceStep = useCallback(async () => {
    if (!activeDelivery) return;
    const nextStatuses = ["REACHED", "PICKED_UP", "ON_THE_WAY", "DELIVERED"];
    if (currentStep >= nextStatuses.length) return;

    const nextStatus = nextStatuses[currentStep];
    try {
      await deliveryApi.updateStatus(activeDelivery.id, nextStatus);
      setCurrentStep((prev) => prev + 1);
      setActiveDelivery((prev) => prev ? { ...prev, status: nextStatus } : prev);
      setToast({ message: `Status updated to ${steps[currentStep + 1]?.label}`, type: "success" });
    } catch {
      setToast({ message: "Failed to update status", type: "error" });
    }
  }, [activeDelivery, currentStep]);

  const isDelivered = currentStep >= steps.length - 1;
  const showMap = currentStep >= 2 && !isDelivered;

  const eta = useMemo(() => {
    if (isDelivered) return "Delivered!";
    if (driverInfo) return `~${driverInfo.etaMinutes} min`;
    if (currentStep >= 3) return "~8 min";
    if (currentStep >= 2) return "~12 min";
    return "~20 min";
  }, [currentStep, isDelivered, driverInfo]);

  const nextActionLabel = useMemo(() => {
    const labels = ["Reached Restaurant", "Pick Up Order", "Start Delivery", "Complete Delivery"];
    return currentStep < labels.length ? labels[currentStep] : null;
  }, [currentStep]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  if (error) return <ErrorState message={error} onRetry={fetchActive} />;

  if (!activeDelivery) {
    return (
      <EmptyState
        icon="🏍️"
        title="No active delivery"
        description="Accept a delivery request to start delivering"
        actionLabel="View Available Deliveries"
        actionHref="/deliveries"
      />
    );
  }

  return (
    <div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/deliveries" className="mb-2 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-zinc-500">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Active Delivery</h1>
          <p className="mt-1 text-sm text-gray-500">{activeDelivery.orderNumber}</p>
        </div>
        {!isDelivered && (
          <div className="rounded-full bg-blue-50 px-4 py-2 dark:bg-blue-900/20">
            <span className="text-sm font-semibold text-blue-700 dark:text-blue-400">ETA: {eta}</span>
          </div>
        )}
      </div>

      {/* Map */}
      {showMap && (
        <div className="mb-6 overflow-hidden rounded-xl border border-gray-200 shadow-sm dark:border-zinc-800">
          <DeliveryMap
            restaurant={LOCATIONS.restaurant}
            customer={LOCATIONS.customer}
            driverStart={LOCATIONS.driverStart}
            currentStep={statusToMapStep(activeDelivery.status)}
            simulateMovement={true}
            onDriverLocationUpdate={handleDriverUpdate}
            className="h-72 md:h-96"
          />
          {driverInfo && (
            <div className="border-t border-gray-200 bg-white px-5 py-3 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-zinc-400">{driverInfo.distanceRemainingKm} km remaining</span>
                <span className="font-bold text-blue-600">~{driverInfo.etaMinutes} min</span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-zinc-700">
                <div className="h-full rounded-full bg-blue-500 transition-all duration-300" style={{ width: `${driverInfo.progressPercent}%` }} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Delivered celebration */}
      {isDelivered && (
        <div className="mb-6 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 p-6 text-center dark:from-green-900/20 dark:to-emerald-900/20">
          <p className="text-4xl">🎉</p>
          <h2 className="mt-2 text-xl font-bold text-green-700 dark:text-green-400">Delivery Complete!</h2>
          <p className="mt-1 text-sm text-green-600">Earning: {"\u20B9"}{activeDelivery.earning}</p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Status + Action */}
        <div className="lg:col-span-2 space-y-4">
          {/* Timeline */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="mb-4 font-semibold text-gray-900 dark:text-zinc-100">Delivery Progress</h2>
            <div className="space-y-0">
              {steps.map((step, index) => {
                const isComplete = index < currentStep;
                const isCurrent = index === currentStep;
                return (
                  <div key={step.key} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm transition-all ${
                        isComplete ? "bg-green-500 text-white" : isCurrent ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-400 dark:bg-zinc-800"
                      }`}>
                        {isComplete ? (
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <span>{index + 1}</span>
                        )}
                      </div>
                      {index < steps.length - 1 && (
                        <div className={`my-1 h-6 w-0.5 ${isComplete ? "bg-green-500" : "bg-gray-200 dark:bg-zinc-700"}`} />
                      )}
                    </div>
                    <div className="pt-1">
                      <p className={`text-sm font-semibold ${
                        isComplete ? "text-green-600" : isCurrent ? "text-gray-900 dark:text-zinc-100" : "text-gray-400"
                      }`}>
                        {step.label}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action button */}
          {!isDelivered && nextActionLabel && (
            <button
              onClick={advanceStep}
              className="w-full rounded-xl bg-emerald-600 py-4 text-lg font-bold text-white transition-colors hover:bg-emerald-700"
            >
              {nextActionLabel}
            </button>
          )}

          {isDelivered && (
            <Link
              href="/deliveries"
              className="block w-full rounded-xl border border-gray-200 py-4 text-center text-lg font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Back to Deliveries
            </Link>
          )}
        </div>

        {/* Order details */}
        <div>
          <div className="sticky top-24 space-y-4">
            <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <h3 className="font-semibold text-gray-900 dark:text-zinc-100">Order Details</h3>
              <div className="mt-3 space-y-3">
                <div>
                  <p className="text-xs text-gray-500">Restaurant</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-zinc-100">{activeDelivery.restaurantName}</p>
                  <p className="text-xs text-gray-400">{activeDelivery.restaurantAddress}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Customer</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-zinc-100">{activeDelivery.customerName}</p>
                  <p className="text-xs text-gray-400">{activeDelivery.customerAddress}</p>
                </div>
                <hr className="border-gray-100 dark:border-zinc-800" />
                <div>
                  <p className="text-xs text-gray-500">Items</p>
                  {activeDelivery.items.map((item, i) => (
                    <p key={i} className="text-sm text-gray-700 dark:text-zinc-300">{item.name} x{item.quantity}</p>
                  ))}
                </div>
                <hr className="border-gray-100 dark:border-zinc-800" />
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Order Total</span>
                  <span className="font-bold text-gray-900 dark:text-zinc-100">{"\u20B9"}{activeDelivery.total}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Your Earning</span>
                  <span className="font-bold text-emerald-600">{"\u20B9"}{activeDelivery.earning}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
