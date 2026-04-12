"use client";

import Link from "next/link";
import { useState, useEffect, useCallback, useMemo, use } from "react";
import DeliveryMap from "@/components/DeliveryMapLoader";
import type { DriverLocationInfo } from "@/components/DeliveryMap";
import useUserLocation from "@/hooks/useUserLocation";
import { useApp } from "@/context/AppContext";

// Default locations used when order has no geo data; customer comes from browser geolocation
const DEFAULT_RESTAURANT_LOCATION = { lat: 12.9716, lng: 77.6412 };
const DEFAULT_DRIVER_START = { lat: 12.9600, lng: 77.6430 };

const steps = [
  { key: "confirmed", label: "Order Confirmed", icon: "\u2713" },
  { key: "preparing", label: "Preparing", icon: "\uD83D\uDC68\u200D\uD83C\uDF73" },
  { key: "picked_up", label: "Picked Up", icon: "\uD83D\uDCE6" },
  { key: "on_the_way", label: "On the Way", icon: "\uD83C\uDFCD\uFE0F" },
  { key: "delivered", label: "Delivered", icon: "\uD83C\uDF89" },
];

// Driver name comes from order.driverName when available

function statusToMapStep(status: string): number {
  switch (status) {
    case "confirmed": return 0;
    case "preparing": return 1;
    case "picked_up": return 2;
    case "on_the_way": return 3;
    case "delivered": return 4;
    default: return 0;
  }
}

function statusToStepIdx(status: string): number {
  const idx = steps.findIndex((s) => s.key === status);
  return idx >= 0 ? idx : 0;
}

export default function OrderTrackingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const userLocation = useUserLocation();
  const { getOrder } = useApp();
  const [driverInfo, setDriverInfo] = useState<DriverLocationInfo | null>(null);

  // Get order from context
  const order = getOrder(id);

  // Driver name from API order data, fallback to "Delivery Partner"
  const driverName = order?.restaurant ? (order as unknown as { driverName?: string }).driverName || "Delivery Partner" : "Delivery Partner";

  const currentStatusIdx = order ? statusToStepIdx(order.status) : 0;
  const isDelivered = currentStatusIdx >= steps.length - 1;
  const showMap = currentStatusIdx >= 2 && !isDelivered;

  // Build LOCATIONS with live customer position from browser geolocation
  const LOCATIONS = useMemo(() => ({
    restaurant: DEFAULT_RESTAURANT_LOCATION,
    driverStart: DEFAULT_DRIVER_START,
    customer: { lat: userLocation.lat, lng: userLocation.lng },
  }), [userLocation.lat, userLocation.lng]);

  const handleDriverUpdate = useCallback((info: DriverLocationInfo) => {
    setDriverInfo(info);
  }, []);

  // Compute ETA
  const eta = useMemo(() => {
    if (isDelivered) return "Delivered!";
    if (driverInfo) return `~${driverInfo.etaMinutes} min`;
    if (currentStatusIdx >= 3) return "~8 min";
    if (currentStatusIdx >= 2) return "~15 min";
    if (currentStatusIdx >= 1) return "~25 min";
    return "~30 min";
  }, [currentStatusIdx, isDelivered, driverInfo]);

  // Generate step times based on when order was placed
  const stepTimes = useMemo(() => {
    if (!order) return steps.map(() => "");
    return steps.map((_, idx) => {
      if (idx > currentStatusIdx) return "";
      // Derive approximate times
      const offsets = [0, 2, 12, 15, 25];
      const base = new Date();
      base.setMinutes(base.getMinutes() - (steps.length - 1 - idx) * 3);
      return base.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
    });
  }, [order, currentStatusIdx]);

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-6xl">📋</p>
        <h2 className="mt-4 text-xl font-bold text-gray-800 dark:text-zinc-200">Order not found</h2>
        <p className="mt-2 text-gray-500 dark:text-zinc-500">This order does not exist or has expired.</p>
        <Link
          href="/orders"
          className="mt-6 rounded-lg bg-red-500 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-600"
        >
          View All Orders
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Back link */}
      <Link href="/orders" className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-zinc-500 dark:hover:text-zinc-300">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to orders
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-zinc-100">Track Order</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-zinc-500">{order.id} &middot; Placed at {order.placedAt}</p>
        </div>
        {!isDelivered && (
          <div className="flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 dark:bg-blue-900/20">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-blue-600" />
            </span>
            <span className="text-sm font-semibold text-blue-700 dark:text-blue-400">
              ETA: {eta}
            </span>
          </div>
        )}
      </div>

      {/* Delivery address from geolocation */}
      <div className="mt-4 flex items-center gap-2 rounded-lg bg-gray-50 px-4 py-2.5 text-sm dark:bg-zinc-800/50">
        <span className="text-red-500">📍</span>
        <span className="text-gray-600 dark:text-zinc-400">Delivering to:</span>
        <span className="font-medium text-gray-900 dark:text-zinc-100">
          {userLocation.loading ? "Detecting your location..." : userLocation.address}
        </span>
        {userLocation.error && (
          <span className="text-xs text-orange-500">(using default location)</span>
        )}
      </div>

      {/* Live Map */}
      {showMap && (
        <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 shadow-sm dark:border-zinc-800">
          <DeliveryMap
            restaurant={LOCATIONS.restaurant}
            customer={LOCATIONS.customer}
            driverStart={LOCATIONS.driverStart}
            currentStep={statusToMapStep(order.status)}
            simulateMovement={true}
            onDriverLocationUpdate={handleDriverUpdate}
            className="h-72 md:h-96"
          />
          {/* Live location details */}
          {driverInfo && (
            <div className="border-t border-gray-200 bg-white px-5 py-3 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-blue-600" />
                  </span>
                  <span className="text-sm font-semibold text-gray-800 dark:text-zinc-200">
                    {driverName} is {driverInfo.distanceRemainingKm} km away
                  </span>
                </div>
                <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                  ~{driverInfo.etaMinutes} min
                </span>
              </div>
              <div className="mt-1.5 flex items-center gap-4 text-[11px] text-gray-400 dark:text-gray-500">
                <span>📍 {driverInfo.position.lat.toFixed(4)}, {driverInfo.position.lng.toFixed(4)}</span>
                <span>⚡ {driverInfo.speedKmh} km/h</span>
                <span className="ml-auto font-medium text-blue-500">{driverInfo.progressPercent}% of the way</span>
              </div>
              {/* Progress */}
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-zinc-700">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300"
                  style={{ width: `${driverInfo.progressPercent}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Delivered celebration */}
      {isDelivered && (
        <div className="mt-6 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 p-6 text-center dark:from-green-900/20 dark:to-emerald-900/20">
          <p className="text-4xl">🎉</p>
          <h2 className="mt-2 text-xl font-bold text-green-700 dark:text-green-400">Order Delivered!</h2>
          <p className="mt-1 text-sm text-green-600 dark:text-green-500">Enjoy your meal!</p>
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Status Timeline */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="mb-4 font-semibold text-gray-900 dark:text-zinc-100">Order Status</h2>
            <div className="space-y-0">
              {steps.map((step, index) => {
                const isComplete = index < currentStatusIdx;
                const isCurrent = index === currentStatusIdx;
                return (
                  <div key={step.key} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-full text-lg transition-all duration-500 ${
                        isComplete
                          ? "bg-green-500 text-white"
                          : isCurrent
                          ? "bg-red-500 text-white shadow-lg shadow-red-200 dark:shadow-red-900/30"
                          : "bg-gray-100 text-gray-400 dark:bg-zinc-800"
                      }`}>
                        {isComplete ? (
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <span>{step.icon}</span>
                        )}
                      </div>
                      {index < steps.length - 1 && (
                        <div className={`my-1 h-8 w-0.5 ${isComplete ? "bg-green-500" : "bg-gray-200 dark:bg-zinc-700"}`} />
                      )}
                    </div>
                    <div className="pt-2">
                      <p className={`text-sm font-semibold ${
                        isComplete ? "text-green-600 dark:text-green-400" : isCurrent ? "text-gray-900 dark:text-zinc-100" : "text-gray-400 dark:text-zinc-600"
                      }`}>
                        {step.label}
                      </p>
                      {(isComplete || isCurrent) && stepTimes[index] && (
                        <p className="text-xs text-gray-500 dark:text-zinc-500">{stepTimes[index]}</p>
                      )}
                      {isCurrent && step.key === "on_the_way" && (
                        <p className="mt-1 text-xs text-blue-600 dark:text-blue-400">
                          Your delivery partner is on the way!
                        </p>
                      )}
                      {isCurrent && step.key === "preparing" && (
                        <p className="mt-1 text-xs text-orange-600 dark:text-orange-400">
                          Restaurant is preparing your food
                        </p>
                      )}
                      {isCurrent && step.key === "confirmed" && (
                        <p className="mt-1 text-xs text-blue-600 dark:text-blue-400">
                          Your order has been confirmed
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Delivery Partner Card */}
          {currentStatusIdx >= 2 && (
            <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-zinc-100">Delivery Partner</h3>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-xl dark:bg-blue-900/30">
                    🏍️
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-zinc-100">{driverName}</p>
                    <div className="flex items-center gap-1">
                      <svg className="h-3.5 w-3.5 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                      {(order as unknown as { driverRating?: number }).driverRating && (
                        <span className="text-xs text-gray-500 dark:text-zinc-500">{(order as unknown as { driverRating?: number }).driverRating}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-gray-600 transition-colors hover:bg-gray-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </button>
                  <button
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500 text-white transition-colors hover:bg-green-600"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Order Summary sidebar */}
        <div>
          <div className="sticky top-24 space-y-4">
            <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 text-lg dark:bg-red-900/30">🏪</div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-zinc-100">{order.restaurant}</h3>
                  <p className="text-xs text-gray-500 dark:text-zinc-500">{order.restaurantAddress}</p>
                </div>
              </div>

              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-500">Items</h4>
              <div className="mt-2 space-y-2">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span className="text-gray-700 dark:text-zinc-300">{item.name} x{item.quantity}</span>
                    <span className="text-gray-500 dark:text-zinc-500">{"\u20B9"}{item.price}</span>
                  </div>
                ))}
              </div>

              <div className="mt-4 space-y-2 border-t border-gray-100 pt-4 text-sm dark:border-zinc-800">
                <div className="flex justify-between text-gray-600 dark:text-zinc-400">
                  <span>Subtotal</span>
                  <span>{"\u20B9"}{order.subtotal}</span>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between text-green-600 dark:text-green-400">
                    <span>Discount</span>
                    <span>-{"\u20B9"}{order.discount}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-600 dark:text-zinc-400">
                  <span>Delivery</span>
                  <span className={order.deliveryFee === 0 ? "text-green-600 dark:text-green-400" : ""}>
                    {order.deliveryFee === 0 ? "FREE" : `\u20B9${order.deliveryFee}`}
                  </span>
                </div>
                <div className="flex justify-between text-gray-600 dark:text-zinc-400">
                  <span>GST & Charges</span>
                  <span>{"\u20B9"}{order.taxes}</span>
                </div>
                <div className="flex justify-between border-t border-gray-100 pt-2 font-bold text-gray-900 dark:border-zinc-800 dark:text-zinc-100">
                  <span>Total</span>
                  <span>{"\u20B9"}{order.total}</span>
                </div>
              </div>
            </div>

            {/* Help */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-zinc-100">Need help?</h3>
              <div className="mt-3 space-y-2">
                <button className="w-full rounded-lg border border-gray-200 px-4 py-2 text-left text-sm text-gray-600 transition-colors hover:bg-gray-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800">
                  Report an issue with this order
                </button>
                <button className="w-full rounded-lg border border-gray-200 px-4 py-2 text-left text-sm text-gray-600 transition-colors hover:bg-gray-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800">
                  Cancel order
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
