"use client";

import Link from "next/link";
import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { restaurants as restaurantsApi, type Restaurant } from "@/services/api";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";

const cuisineFilters = [
  { key: "All", label: "All", icon: "M4 6h16M4 12h16M4 18h16" },
  { key: "INDIAN", label: "Indian", icon: "M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.87c1.355 0 2.697.055 4.024.165C17.155 8.51 18 9.473 18 10.608v2.513m-3-4.87v-1.5m-6 1.5v-1.5m12 9.75l-1.5.75a3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0L3 16.5m15-3.38a48.474 48.474 0 00-6-.37c-2.032 0-4.034.126-6 .37m12 0c.39.049.777.102 1.163.16 1.07.16 1.837 1.094 1.837 2.175v5.17c0 .62-.504 1.124-1.125 1.124H4.125A1.125 1.125 0 013 20.625v-5.17c0-1.08.768-2.014 1.837-2.174A47.78 47.78 0 016 13.12M16.5 3.75V7.5" },
  { key: "CHINESE", label: "Chinese", icon: "M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.87c1.355 0 2.697.055 4.024.165C17.155 8.51 18 9.473 18 10.608v2.513m-3-4.87v-1.5m-6 1.5v-1.5m12 9.75l-1.5.75a3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0L3 16.5m15-3.38a48.474 48.474 0 00-6-.37c-2.032 0-4.034.126-6 .37m12 0c.39.049.777.102 1.163.16 1.07.16 1.837 1.094 1.837 2.175v5.17c0 .62-.504 1.124-1.125 1.124H4.125A1.125 1.125 0 013 20.625v-5.17c0-1.08.768-2.014 1.837-2.174A47.78 47.78 0 016 13.12M16.5 3.75V7.5" },
  { key: "ITALIAN", label: "Italian", icon: "M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.87c1.355 0 2.697.055 4.024.165C17.155 8.51 18 9.473 18 10.608v2.513m-3-4.87v-1.5m-6 1.5v-1.5m12 9.75l-1.5.75a3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0L3 16.5m15-3.38a48.474 48.474 0 00-6-.37c-2.032 0-4.034.126-6 .37m12 0c.39.049.777.102 1.163.16 1.07.16 1.837 1.094 1.837 2.175v5.17c0 .62-.504 1.124-1.125 1.124H4.125A1.125 1.125 0 013 20.625v-5.17c0-1.08.768-2.014 1.837-2.174A47.78 47.78 0 016 13.12M16.5 3.75V7.5" },
  { key: "MEXICAN", label: "Mexican", icon: "M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.87c1.355 0 2.697.055 4.024.165C17.155 8.51 18 9.473 18 10.608v2.513m-3-4.87v-1.5m-6 1.5v-1.5m12 9.75l-1.5.75a3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0L3 16.5m15-3.38a48.474 48.474 0 00-6-.37c-2.032 0-4.034.126-6 .37m12 0c.39.049.777.102 1.163.16 1.07.16 1.837 1.094 1.837 2.175v5.17c0 .62-.504 1.124-1.125 1.124H4.125A1.125 1.125 0 013 20.625v-5.17c0-1.08.768-2.014 1.837-2.174A47.78 47.78 0 016 13.12M16.5 3.75V7.5" },
  { key: "FAST_FOOD", label: "Fast Food", icon: "M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.87c1.355 0 2.697.055 4.024.165C17.155 8.51 18 9.473 18 10.608v2.513m-3-4.87v-1.5m-6 1.5v-1.5m12 9.75l-1.5.75a3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0L3 16.5m15-3.38a48.474 48.474 0 00-6-.37c-2.032 0-4.034.126-6 .37m12 0c.39.049.777.102 1.163.16 1.07.16 1.837 1.094 1.837 2.175v5.17c0 .62-.504 1.124-1.125 1.124H4.125A1.125 1.125 0 013 20.625v-5.17c0-1.08.768-2.014 1.837-2.174A47.78 47.78 0 016 13.12M16.5 3.75V7.5" },
  { key: "DESSERTS", label: "Desserts", icon: "M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.87c1.355 0 2.697.055 4.024.165C17.155 8.51 18 9.473 18 10.608v2.513m-3-4.87v-1.5m-6 1.5v-1.5m12 9.75l-1.5.75a3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0L3 16.5m15-3.38a48.474 48.474 0 00-6-.37c-2.032 0-4.034.126-6 .37m12 0c.39.049.777.102 1.163.16 1.07.16 1.837 1.094 1.837 2.175v5.17c0 .62-.504 1.124-1.125 1.124H4.125A1.125 1.125 0 013 20.625v-5.17c0-1.08.768-2.014 1.837-2.174A47.78 47.78 0 016 13.12M16.5 3.75V7.5" },
  { key: "HEALTHY", label: "Healthy", icon: "M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.87c1.355 0 2.697.055 4.024.165C17.155 8.51 18 9.473 18 10.608v2.513m-3-4.87v-1.5m-6 1.5v-1.5m12 9.75l-1.5.75a3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0L3 16.5m15-3.38a48.474 48.474 0 00-6-.37c-2.032 0-4.034.126-6 .37m12 0c.39.049.777.102 1.163.16 1.07.16 1.837 1.094 1.837 2.175v5.17c0 .62-.504 1.124-1.125 1.124H4.125A1.125 1.125 0 013 20.625v-5.17c0-1.08.768-2.014 1.837-2.174A47.78 47.78 0 016 13.12M16.5 3.75V7.5" },
];

const cuisineKeys = cuisineFilters.map((f) => f.key);
const sortOptions = ["Relevance", "Rating", "Delivery Time", "Cost: Low to High"];

export default function RestaurantsPage() {
  return (
    <Suspense fallback={
      <div>
        <div className="h-8 w-64 rounded-lg skeleton-shimmer" />
        <div className="mt-5 flex gap-3">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-10 w-20 rounded-2xl skeleton-shimmer" />)}
        </div>
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      </div>
    }>
      <RestaurantsContent />
    </Suspense>
  );
}

function RestaurantsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlSearch = searchParams.get("search") || "";
  const urlCuisine = searchParams.get("cuisine") || "";

  const [activeCuisine, setActiveCuisine] = useState(
    urlCuisine && cuisineKeys.includes(urlCuisine) ? urlCuisine : "All"
  );
  const [sortBy, setSortBy] = useState("Relevance");
  const [searchQuery, setSearchQuery] = useState(urlSearch);
  const [restaurantList, setRestaurantList] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sync URL params to state
  useEffect(() => {
    if (urlSearch !== searchQuery) setSearchQuery(urlSearch);
    const newCuisine =
      urlCuisine && cuisineKeys.includes(urlCuisine) ? urlCuisine : "All";
    if (newCuisine !== activeCuisine) setActiveCuisine(newCuisine);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlSearch, urlCuisine]);

  const fetchRestaurants = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: { cuisine?: string; sort?: string; search?: string } = {};
      if (activeCuisine !== "All") params.cuisine = activeCuisine;
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (sortBy === "Rating") params.sort = "rating";
      else if (sortBy === "Delivery Time") params.sort = "deliveryTime";
      else if (sortBy === "Cost: Low to High") params.sort = "priceAsc";

      const data = await restaurantsApi.list(params);
      setRestaurantList(data);
    } catch {
      setError("Failed to load restaurants. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [activeCuisine, sortBy, searchQuery]);

  const clearSearch = useCallback(() => {
    setSearchQuery("");
    router.push("/restaurants");
  }, [router]);

  useEffect(() => {
    fetchRestaurants();
  }, [fetchRestaurants]);

  return (
    <div className="animate-fade-in">
      {/* Title */}
      <h1 className="text-2xl font-bold text-gray-900 dark:text-zinc-100 sm:text-3xl">
        {searchQuery
          ? `Results for "${searchQuery}"`
          : "Restaurants delivering to you"}
      </h1>

      {/* Active search banner */}
      {searchQuery && (
        <div className="mt-3 flex items-center gap-2 animate-fade-in-down">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1.5 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searchQuery}
            <button
              onClick={clearSearch}
              className="ml-1 rounded-full p-0.5 transition-colors hover:bg-red-100 dark:hover:bg-red-900/30"
              aria-label="Clear search"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </span>
        </div>
      )}

      {/* Cuisine Filters */}
      <div className="mt-5 flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {cuisineFilters.map((cuisine) => (
          <button
            key={cuisine.key}
            onClick={() => setActiveCuisine(cuisine.key)}
            className={`btn-press flex shrink-0 items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-medium transition-all ${
              activeCuisine === cuisine.key
                ? "border-red-500 bg-red-500 text-white shadow-lg shadow-red-500/25"
                : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:border-zinc-600"
            }`}
          >
            {cuisine.label}
          </button>
        ))}
      </div>

      {/* Sort + Count */}
      <div className="mt-4 flex items-center gap-3">
        <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900">
          <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
          </svg>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-transparent text-sm text-gray-700 focus:outline-none dark:text-zinc-300"
          >
            {sortOptions.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
        {!loading && (
          <span className="ml-auto text-sm text-gray-500 dark:text-zinc-500 animate-fade-in">
            {restaurantList.length} restaurant{restaurantList.length !== 1 ? "s" : ""} found
          </span>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <ErrorState message={error} onRetry={fetchRestaurants} />
      )}

      {/* Restaurant Grid */}
      {!loading && !error && restaurantList.length > 0 && (
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {restaurantList.map((restaurant, index) => (
            <Link
              key={restaurant.id}
              href={`/restaurants/${restaurant.id}`}
              className="card-hover img-zoom group overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
              style={{ animationDelay: `${index * 0.08}s` }}
            >
              {/* Image */}
              <div className="relative h-48 overflow-hidden bg-gradient-to-br from-orange-100 to-red-100 dark:from-orange-900/20 dark:to-red-900/20">
                {restaurant.imageUrl ? (
                  <img
                    src={restaurant.imageUrl}
                    alt={restaurant.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <svg className="h-16 w-16 text-red-200 dark:text-red-900/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={0.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.87c1.355 0 2.697.055 4.024.165C17.155 8.51 18 9.473 18 10.608v2.513m-3-4.87v-1.5m-6 1.5v-1.5m12 9.75l-1.5.75a3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0L3 16.5m15-3.38a48.474 48.474 0 00-6-.37c-2.032 0-4.034.126-6 .37m12 0c.39.049.777.102 1.163.16 1.07.16 1.837 1.094 1.837 2.175v5.17c0 .62-.504 1.124-1.125 1.124H4.125A1.125 1.125 0 013 20.625v-5.17c0-1.08.768-2.014 1.837-2.174A47.78 47.78 0 016 13.12M16.5 3.75V7.5" />
                    </svg>
                  </div>
                )}
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                {/* Delivery time badge */}
                {restaurant.deliveryTime && (
                  <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-lg bg-white/95 px-2.5 py-1 shadow-sm backdrop-blur-sm dark:bg-zinc-800/95">
                    <svg className="h-3.5 w-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-xs font-semibold text-gray-700 dark:text-zinc-300">{restaurant.deliveryTime}</span>
                  </div>
                )}
                {/* Rating badge on image */}
                {restaurant.rating > 0 && (
                  <div className="absolute bottom-3 right-3">
                    <span
                      className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-white shadow-sm ${
                        restaurant.rating >= 4.0 ? "bg-green-600" : restaurant.rating >= 3.0 ? "bg-yellow-500" : "bg-orange-500"
                      }`}
                    >
                      {restaurant.rating.toFixed(1)}
                      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                    </span>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-4">
                <h3 className="font-bold text-gray-900 transition-colors group-hover:text-red-500 dark:text-zinc-100">
                  {restaurant.name}
                </h3>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-500 dark:text-zinc-500">
                  {restaurant.cuisineType?.replace(/_/g, " ")}
                </p>
                {restaurant.priceRange && (
                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-sm text-gray-400 dark:text-zinc-600">
                      {"\u20B9"}{restaurant.priceRange} for two
                    </p>
                    {restaurant.reviewCount > 0 && (
                      <p className="text-xs text-gray-400 dark:text-zinc-600">
                        {restaurant.reviewCount} review{restaurant.reviewCount !== 1 ? "s" : ""}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && !error && restaurantList.length === 0 && (
        <EmptyState
          icon="🍽️"
          title="No restaurants found"
          description={searchQuery ? `No results for "${searchQuery}". Try a different search.` : "Try a different cuisine filter or check back later"}
          actionLabel={searchQuery ? "Clear Search" : undefined}
          onAction={searchQuery ? clearSearch : undefined}
        />
      )}
    </div>
  );
}
