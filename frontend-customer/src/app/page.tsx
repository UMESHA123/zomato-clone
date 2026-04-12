"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

interface RestaurantApi {
  id: number;
  name: string;
  description: string;
  address: string;
  cuisineType: string | null;
  rating: number;
  isActive: boolean;
  openingTime?: string;
  closingTime?: string;
}

const sortOptions = ["Relevance", "Rating", "Name"];

function formatCuisine(value: string | null) {
  return value ? value.replace(/_/g, " ") : "Restaurant";
}

export default function RestaurantsPage() {
  const [restaurants, setRestaurants] = useState<RestaurantApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("Relevance");

  useEffect(() => {
    async function loadRestaurants() {
      try {
        const res = await fetch(`${API_BASE}/api/restaurants?size=100`);
        if (!res.ok) {
          throw new Error("Failed to load restaurants.");
        }

        const data = await res.json();
        setRestaurants(Array.isArray(data.content) ? data.content : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      } finally {
        setLoading(false);
      }
    }

    void loadRestaurants();
  }, []);

  const filtered = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    let list = restaurants.filter((restaurant) => restaurant.isActive);

    if (normalizedSearch) {
      list = list.filter((restaurant) =>
        [restaurant.name, restaurant.description, restaurant.address, formatCuisine(restaurant.cuisineType)]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(normalizedSearch))
      );
    }

    if (sortBy === "Rating") {
      list = [...list].sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sortBy === "Name") {
      list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    }

    return list;
  }, [restaurants, search, sortBy]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-zinc-100">Restaurants delivering to you</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-zinc-500">
            Live restaurant data from the backend
          </p>
        </div>
        <span className="rounded-full bg-red-50 px-3 py-1 text-sm font-medium text-red-600 dark:bg-red-900/20 dark:text-red-300">
          {filtered.length} restaurants
        </span>
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr,220px]">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, cuisine, or address"
          className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition-colors focus:border-red-400 focus:ring-2 focus:ring-red-400/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        />
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-700 outline-none transition-colors focus:border-red-400 focus:ring-2 focus:ring-red-400/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
        >
          {sortOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="py-20 text-center text-gray-500 dark:text-zinc-500">Loading restaurants...</div>
      ) : error ? (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-lg font-medium text-gray-600 dark:text-zinc-400">No restaurants found</p>
          <p className="mt-1 text-sm text-gray-400 dark:text-zinc-600">Try a different search term.</p>
        </div>
      ) : (
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((restaurant) => (
            <Link
              key={restaurant.id}
              href={`/restaurants/${restaurant.id}`}
              className="group overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="h-40 bg-gradient-to-br from-red-50 via-orange-50 to-amber-100 p-5 dark:from-red-950/60 dark:via-orange-950/40 dark:to-amber-950/40">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-500">
                      {formatCuisine(restaurant.cuisineType)}
                    </p>
                    <h2 className="mt-2 text-xl font-bold text-gray-900 dark:text-zinc-100">{restaurant.name}</h2>
                  </div>
                  <span className="rounded-lg bg-white/90 px-2 py-1 text-sm font-semibold text-green-700 shadow-sm dark:bg-zinc-900/90 dark:text-green-400">
                    {(restaurant.rating || 0).toFixed(1)}
                  </span>
                </div>
              </div>

              <div className="p-5">
                <p className="line-clamp-2 text-sm text-gray-500 dark:text-zinc-400">
                  {restaurant.description || "Freshly listed on Zomato."}
                </p>
                <p className="mt-3 text-sm text-gray-600 dark:text-zinc-400">{restaurant.address}</p>
                <p className="mt-2 text-xs text-gray-400 dark:text-zinc-500">
                  {restaurant.openingTime && restaurant.closingTime
                    ? `${restaurant.openingTime} - ${restaurant.closingTime}`
                    : "Open hours will be updated soon"}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
