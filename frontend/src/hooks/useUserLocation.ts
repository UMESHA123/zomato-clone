"use client";

import { useEffect, useState, useRef } from "react";

export interface UserLocation {
  lat: number;
  lng: number;
  accuracy: number;
  address: string;
  loading: boolean;
  error: string | null;
}

const FALLBACK = { lat: 12.9116, lng: 77.6474 }; // HSR Layout, Bangalore

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=18&addressdetails=1`,
      { headers: { "User-Agent": "ZomatoCloneDemo/1.0" } }
    );
    const data = await res.json();
    const a = data.address;
    const parts: string[] = [];
    if (a?.road) parts.push(a.road);
    if (a?.neighbourhood || a?.suburb) parts.push(a.neighbourhood || a.suburb);
    if (a?.city || a?.town || a?.city_district) parts.push(a.city || a.town || a.city_district);
    return parts.length > 0 ? parts.join(", ") : data.display_name?.split(",").slice(0, 3).join(",") || "Your Location";
  } catch {
    return "Your Location";
  }
}

export default function useUserLocation(): UserLocation {
  const [location, setLocation] = useState<UserLocation>({
    lat: FALLBACK.lat,
    lng: FALLBACK.lng,
    accuracy: 0,
    address: "Detecting your location...",
    loading: true,
    error: null,
  });
  const watchRef = useRef<number | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocation((prev) => ({
        ...prev,
        loading: false,
        error: "Geolocation not supported",
        address: "HSR Layout, Bangalore (default)",
      }));
      return;
    }

    const onSuccess = (pos: GeolocationPosition) => {
      const { latitude, longitude, accuracy } = pos.coords;
      setLocation((prev) => ({
        ...prev,
        lat: latitude,
        lng: longitude,
        accuracy,
        loading: false,
        error: null,
      }));
      // Reverse geocode in background
      reverseGeocode(latitude, longitude).then((address) => {
        setLocation((prev) => ({ ...prev, address }));
      });
    };

    const onError = (err: GeolocationPositionError) => {
      setLocation((prev) => ({
        ...prev,
        loading: false,
        error: err.message,
        address: "HSR Layout, Bangalore (default)",
      }));
    };

    // Get initial position quickly
    navigator.geolocation.getCurrentPosition(onSuccess, onError, {
      enableHighAccuracy: true,
      timeout: 8000,
      maximumAge: 30000,
    });

    // Watch for updates
    watchRef.current = navigator.geolocation.watchPosition(onSuccess, onError, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 5000,
    });

    return () => {
      if (watchRef.current !== null) {
        navigator.geolocation.clearWatch(watchRef.current);
      }
    };
  }, []);

  return location;
}
