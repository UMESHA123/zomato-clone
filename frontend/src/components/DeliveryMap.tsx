"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

export interface LatLng {
  lat: number;
  lng: number;
}

export interface DriverLocationInfo {
  position: LatLng;
  heading: number;
  speedKmh: number;
  distanceRemainingKm: number;
  etaMinutes: number;
  progressPercent: number;
  streetName: string;
}

interface DeliveryMapProps {
  restaurant: LatLng;
  customer: LatLng;
  driverStart: LatLng;
  /** 0=Accepted, 1=Reached, 2=PickedUp, 3=OnTheWay, 4=Delivered */
  currentStep: number;
  simulateMovement?: boolean;
  onDriverLocationUpdate?: (info: DriverLocationInfo) => void;
  className?: string;
}

// --- SVG bike icon that accepts rotation ---

function createBikeIcon(heading: number): L.DivIcon {
  return L.divIcon({
    html: `
      <div style="position:relative;width:52px;height:52px;">
        <div style="position:absolute;inset:-4px;border-radius:50%;background:rgba(59,130,246,0.2);animation:driverPulse 2s ease-in-out infinite;"></div>
        <div style="width:52px;height:52px;border-radius:50%;background:white;border:3px solid #2563EB;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px rgba(37,99,235,0.4);position:relative;overflow:hidden;">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" style="transform:rotate(${heading - 90}deg);transition:transform 0.3s ease;">
            <!-- Delivery scooter / motorbike -->
            <path d="M19 13c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3zm0 4.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" fill="#2563EB"/>
            <path d="M5 13c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3zm0 4.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" fill="#2563EB"/>
            <path d="M17 5H14V7H17L18.5 12H15.5L13.3 8.6C13.1 8.2 12.7 8 12.2 8H7V10H11.8L14 13.4C14.2 13.7 14.5 14 15 14H19.3L20 16H22L20.2 10.2L17 5Z" fill="#1D4ED8"/>
            <path d="M10 14H6.5L5 11H2V13H3.8L5.8 17H8C8 15.3 9.3 14 10 14Z" fill="#1D4ED8"/>
            <rect x="6" y="4" width="5" height="2.5" rx="1" fill="#EF4444"/>
            <rect x="7" y="3" width="3" height="1.5" rx="0.5" fill="#EF4444"/>
          </svg>
        </div>
        <div style="position:absolute;top:-2px;right:-2px;width:14px;height:14px;border-radius:50%;background:#22C55E;border:2px solid white;"></div>
      </div>
      <style>
        @keyframes driverPulse {
          0%, 100% { transform: scale(1); opacity: 0.4; }
          50% { transform: scale(1.4); opacity: 0; }
        }
      </style>`,
    className: "",
    iconSize: [52, 52],
    iconAnchor: [26, 26],
  });
}

function svgIcon(svg: string, size: [number, number]): L.DivIcon {
  return L.divIcon({
    html: svg,
    className: "",
    iconSize: size,
    iconAnchor: [size[0] / 2, size[1] / 2],
  });
}

const restaurantIcon = svgIcon(
  `<div style="width:42px;height:42px;border-radius:50%;background:#EF4444;border:3px solid white;display:flex;align-items:center;justify-content:center;font-size:20px;box-shadow:0 3px 10px rgba(239,68,68,0.4);">
    <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z"/></svg>
  </div>`,
  [42, 42]
);

const customerIcon = svgIcon(
  `<div style="position:relative;">
    <div style="width:42px;height:42px;border-radius:50%;background:#10B981;border:3px solid white;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 10px rgba(16,185,129,0.4);">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
    </div>
    <div style="position:absolute;left:50%;bottom:-6px;transform:translateX(-50%);width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:8px solid #10B981;"></div>
  </div>`,
  [42, 50]
);

// --- Helpers ---

function interpolate(from: LatLng, to: LatLng, t: number): LatLng {
  return {
    lat: from.lat + (to.lat - from.lat) * t,
    lng: from.lng + (to.lng - from.lng) * t,
  };
}

function bearing(from: LatLng, to: LatLng): number {
  const dLng = ((to.lng - from.lng) * Math.PI) / 180;
  const lat1 = (from.lat * Math.PI) / 180;
  const lat2 = (to.lat * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * sinLng * sinLng;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function routeDistanceKm(points: LatLng[], fromIdx: number): number {
  let d = 0;
  for (let i = fromIdx; i < points.length - 1; i++) {
    d += haversineKm(points[i], points[i + 1]);
  }
  return d;
}

// Reverse geocode with Nominatim (free, no key)
let geocodeCache: Record<string, string> = {};
let lastGeocodeTime = 0;

async function reverseGeocode(pos: LatLng): Promise<string> {
  const key = `${pos.lat.toFixed(4)},${pos.lng.toFixed(4)}`;
  if (geocodeCache[key]) return geocodeCache[key];

  // Nominatim rate limit: 1 req/sec
  const now = Date.now();
  if (now - lastGeocodeTime < 2000) return geocodeCache[Object.keys(geocodeCache).pop() ?? ""] ?? "Fetching location...";
  lastGeocodeTime = now;

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${pos.lat}&lon=${pos.lng}&format=json&zoom=17`,
      { headers: { "User-Agent": "ZomatoCloneDemo/1.0" } }
    );
    const data = await res.json();
    const addr = data.address;
    const name = addr?.road || addr?.neighbourhood || addr?.suburb || addr?.city_district || data.display_name?.split(",")[0] || "Unknown";
    const area = addr?.suburb || addr?.neighbourhood || addr?.city_district || "";
    const street = area && area !== name ? `${name}, ${area}` : name;
    geocodeCache[key] = street;
    return street;
  } catch {
    return "Unknown location";
  }
}

// Fetch route from OSRM (free, no key)
async function fetchRoute(from: LatLng, to: LatLng): Promise<LatLng[]> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.routes?.[0]?.geometry?.coordinates) {
      return data.routes[0].geometry.coordinates.map(
        (c: [number, number]) => ({ lat: c[1], lng: c[0] })
      );
    }
  } catch { /* fallback below */ }
  const mid = { lat: (from.lat + to.lat) / 2 + 0.002, lng: (from.lng + to.lng) / 2 - 0.002 };
  const pts: LatLng[] = [];
  for (let i = 0; i <= 60; i++) {
    const t = i / 60;
    pts.push(interpolate(interpolate(from, mid, t), interpolate(mid, to, t), t));
  }
  return pts;
}

// --- Sub-components ---

function FitBounds({ points }: { points: LatLng[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length < 2) return;
    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng]));
    map.fitBounds(bounds, { padding: [50, 50] });
  }, [map, points]);
  return null;
}

function DriverMarker({ position, heading: h }: { position: LatLng; heading: number }) {
  const icon = useMemo(() => createBikeIcon(h), [h]);
  return <Marker position={[position.lat, position.lng]} icon={icon} zIndexOffset={1000} />;
}

// --- Main component ---

export default function DeliveryMap({
  restaurant,
  customer,
  driverStart,
  currentStep,
  simulateMovement = true,
  onDriverLocationUpdate,
  className = "",
}: DeliveryMapProps) {
  const [routePoints, setRoutePoints] = useState<LatLng[]>([]);
  const [totalRouteKm, setTotalRouteKm] = useState(0);
  const [driverPos, setDriverPos] = useState<LatLng>(driverStart);
  const [driverHeading, setDriverHeading] = useState(0);
  const [progress, setProgress] = useState(0);
  const [streetName, setStreetName] = useState("Locating...");
  const animRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const prevPosRef = useRef<LatLng>(driverStart);
  const geocodeIntervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const routeOrigin = currentStep < 2 ? driverStart : restaurant;
  const routeDest = currentStep < 2 ? restaurant : customer;

  // Fetch route
  useEffect(() => {
    let cancelled = false;
    fetchRoute(routeOrigin, routeDest).then((pts) => {
      if (!cancelled && pts.length > 1) {
        setRoutePoints(pts);
        setTotalRouteKm(routeDistanceKm(pts, 0));
        setProgress(0);
        setDriverPos(routeOrigin);
        prevPosRef.current = routeOrigin;
        lastTimeRef.current = 0;
      }
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]);

  // Periodically reverse-geocode driver position
  useEffect(() => {
    if (!(currentStep > 0 && currentStep < 4)) return;
    const doGeocode = () => {
      reverseGeocode(driverPos).then(setStreetName);
    };
    doGeocode();
    geocodeIntervalRef.current = setInterval(doGeocode, 3000);
    return () => clearInterval(geocodeIntervalRef.current);
  }, [currentStep, driverPos]);

  // Animate driver
  const animate = useCallback(
    (time: number) => {
      if (!simulateMovement || routePoints.length < 2) return;
      if (lastTimeRef.current === 0) lastTimeRef.current = time;
      const delta = time - lastTimeRef.current;
      lastTimeRef.current = time;

      setProgress((prev) => {
        const speed = 1 / 30000;
        const next = Math.min(prev + delta * speed, 1);

        const totalPts = routePoints.length - 1;
        const exactIdx = next * totalPts;
        const idx = Math.floor(exactIdx);
        const frac = exactIdx - idx;
        const from = routePoints[Math.min(idx, totalPts)];
        const to = routePoints[Math.min(idx + 1, totalPts)];
        const pos = interpolate(from, to, frac);

        // Heading
        const prevP = prevPosRef.current;
        if (haversineKm(prevP, pos) > 0.001) {
          const h = bearing(prevP, pos);
          setDriverHeading(h);
          prevPosRef.current = pos;
        }

        setDriverPos(pos);

        // Compute live info
        const remainKm = totalRouteKm * (1 - next);
        const avgSpeedKmh = 25;
        const etaMin = (remainKm / avgSpeedKmh) * 60;
        const simSpeedKmh = (totalRouteKm / 30) * 3600; // simulated speed

        onDriverLocationUpdate?.({
          position: pos,
          heading: bearing(prevP, pos),
          speedKmh: Math.round(simSpeedKmh > 60 ? 28 + Math.random() * 8 : simSpeedKmh),
          distanceRemainingKm: Math.round(remainKm * 10) / 10,
          etaMinutes: Math.max(1, Math.round(etaMin)),
          progressPercent: Math.round(next * 100),
          streetName: "",
        });

        return next;
      });

      animRef.current = requestAnimationFrame(animate);
    },
    [simulateMovement, routePoints, onDriverLocationUpdate, totalRouteKm]
  );

  useEffect(() => {
    if (!simulateMovement || routePoints.length < 2) return;
    lastTimeRef.current = 0;
    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [animate, simulateMovement, routePoints]);

  const center = useMemo<LatLng>(
    () => ({ lat: (restaurant.lat + customer.lat) / 2, lng: (restaurant.lng + customer.lng) / 2 }),
    [restaurant, customer]
  );

  const polylinePositions = useMemo(
    () => routePoints.map((p) => [p.lat, p.lng] as [number, number]),
    [routePoints]
  );

  // Covered portion of route (gray/done) vs remaining (red)
  const coveredIdx = Math.floor(progress * Math.max(routePoints.length - 1, 0));
  const coveredPositions = useMemo(
    () => routePoints.slice(0, coveredIdx + 1).map((p) => [p.lat, p.lng] as [number, number]),
    [routePoints, coveredIdx]
  );

  const showDriver = currentStep > 0 && currentStep < 4;
  const distRemain = totalRouteKm * (1 - progress);
  const etaMin = Math.max(1, Math.round((distRemain / 25) * 60));

  return (
    <div className={`relative ${className}`}>
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={14}
        className="h-full w-full z-0"
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <FitBounds points={[restaurant, customer, ...(showDriver ? [driverPos] : [])]} />

        {/* Full route (red) */}
        {polylinePositions.length > 1 && (
          <>
            <Polyline positions={polylinePositions} pathOptions={{ color: "#00000015", weight: 10 }} />
            <Polyline positions={polylinePositions} pathOptions={{ color: "#EF4444", weight: 5, lineCap: "round", lineJoin: "round", dashArray: "1 8" }} />
          </>
        )}

        {/* Covered route (solid blue) */}
        {coveredPositions.length > 1 && (
          <Polyline positions={coveredPositions} pathOptions={{ color: "#2563EB", weight: 5, lineCap: "round", lineJoin: "round" }} />
        )}

        {/* Restaurant marker */}
        <Marker position={[restaurant.lat, restaurant.lng]} icon={restaurantIcon} />

        {/* Customer marker */}
        <Marker position={[customer.lat, customer.lng]} icon={customerIcon} />

        {/* Driver marker with bike icon */}
        {showDriver && <DriverMarker position={driverPos} heading={driverHeading} />}
      </MapContainer>

      {/* Live info overlay */}
      {showDriver && (
        <div className="absolute bottom-3 left-3 right-3 z-[1000] rounded-xl bg-white/95 shadow-lg backdrop-blur dark:bg-zinc-900/95">
          {/* Driver info row */}
          <div className="flex items-center gap-3 px-4 pt-3 pb-2">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="#2563EB">
                <path d="M19 13c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3zm0 4.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
                <path d="M5 13c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3zm0 4.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
                <path d="M17 5H14V7H17L18.5 12H15.5L13.3 8.6C13.1 8.2 12.7 8 12.2 8H7V10H11.8L14 13.4C14.2 13.7 14.5 14 15 14H19.3L20 16H22L20.2 10.2L17 5Z"/>
                <path d="M10 14H6.5L5 11H2V13H3.8L5.8 17H8C8 15.3 9.3 14 10 14Z"/>
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-gray-800 dark:text-zinc-200">
                {currentStep < 2 ? "Heading to restaurant" : "On the way to you"}
              </p>
              <p className="truncate text-xs text-gray-500 dark:text-zinc-400">
                {streetName}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-bold text-blue-600 dark:text-blue-400">{etaMin} min</p>
              <p className="text-[10px] text-gray-400 dark:text-zinc-500">{distRemain.toFixed(1)} km left</p>
            </div>
          </div>

          {/* Stats row */}
          <div className="flex items-center justify-between border-t border-gray-100 px-4 py-2 dark:border-zinc-800">
            <div className="flex items-center gap-4 text-[11px]">
              <span className="flex items-center gap-1 text-gray-500 dark:text-zinc-400">
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                {Math.round(25 + Math.random() * 8)} km/h
              </span>
              <span className="flex items-center gap-1 text-gray-500 dark:text-zinc-400">
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
                {Math.round(driverHeading)}° {headingToCompass(driverHeading)}
              </span>
            </div>
            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
              {Math.round(progress * 100)}%
            </span>
          </div>

          {/* Progress bar */}
          <div className="h-1.5 w-full overflow-hidden rounded-b-xl bg-gray-200 dark:bg-zinc-700">
            <div
              className="h-full rounded-r-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-200"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Attribution */}
      <div className="absolute top-2 right-2 z-[1000] rounded bg-white/80 px-1.5 py-0.5 text-[10px] text-gray-400">
        &copy; OpenStreetMap
      </div>
    </div>
  );
}

function headingToCompass(deg: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(deg / 45) % 8];
}
