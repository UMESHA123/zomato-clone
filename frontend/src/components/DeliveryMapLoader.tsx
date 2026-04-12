"use client";

import dynamic from "next/dynamic";
import type { LatLng, DriverLocationInfo } from "./DeliveryMap";

export type { LatLng, DriverLocationInfo };

interface DeliveryMapLoaderProps {
  restaurant: LatLng;
  customer: LatLng;
  driverStart: LatLng;
  currentStep: number;
  simulateMovement?: boolean;
  onDriverLocationUpdate?: (info: DriverLocationInfo) => void;
  className?: string;
}

const DeliveryMap = dynamic(() => import("./DeliveryMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-gray-100 dark:bg-gray-800">
      <div className="flex items-center gap-2 text-gray-500">
        <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span className="text-sm">Loading map...</span>
      </div>
    </div>
  ),
});

export default function DeliveryMapLoader(props: DeliveryMapLoaderProps) {
  return <DeliveryMap {...props} />;
}
