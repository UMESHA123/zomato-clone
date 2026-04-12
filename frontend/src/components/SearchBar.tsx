"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { restaurants as restaurantsApi, type Restaurant } from "@/services/api";

const RECENT_SEARCHES_KEY = "zomato_recent_searches";
const MAX_RECENT = 5;

const popularCuisines = [
  { label: "Indian", value: "INDIAN" },
  { label: "Chinese", value: "CHINESE" },
  { label: "Italian", value: "ITALIAN" },
  { label: "Fast Food", value: "FAST_FOOD" },
  { label: "Desserts", value: "DESSERTS" },
  { label: "Healthy", value: "HEALTHY" },
];

function getRecentSearches(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveRecentSearch(query: string) {
  const recent = getRecentSearches().filter((s) => s !== query);
  recent.unshift(query);
  localStorage.setItem(
    RECENT_SEARCHES_KEY,
    JSON.stringify(recent.slice(0, MAX_RECENT))
  );
}

function removeRecentSearch(query: string) {
  const recent = getRecentSearches().filter((s) => s !== query);
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(recent));
}

export default function SearchBar({ className }: { className?: string }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<Restaurant[]>([]);
  const [searching, setSearching] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [highlightIndex, setHighlightIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  // Load recent searches on mount
  useEffect(() => {
    setRecentSearches(getRecentSearches());
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.trim().length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await restaurantsApi.list({ search: query.trim(), size: 5 });
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  // Reset highlight when results change
  useEffect(() => {
    setHighlightIndex(-1);
  }, [results, query]);

  const navigateToSearch = useCallback(
    (searchQuery: string) => {
      if (!searchQuery.trim()) return;
      saveRecentSearch(searchQuery.trim());
      setRecentSearches(getRecentSearches());
      setOpen(false);
      setQuery("");
      router.push(`/restaurants?search=${encodeURIComponent(searchQuery.trim())}`);
    },
    [router]
  );

  const navigateToRestaurant = useCallback(
    (restaurant: Restaurant) => {
      saveRecentSearch(restaurant.name);
      setRecentSearches(getRecentSearches());
      setOpen(false);
      setQuery("");
      router.push(`/restaurants/${restaurant.id}`);
    },
    [router]
  );

  const navigateToCuisine = useCallback(
    (cuisine: string) => {
      setOpen(false);
      setQuery("");
      router.push(`/restaurants?cuisine=${cuisine}`);
    },
    [router]
  );

  const handleRemoveRecent = useCallback(
    (e: React.MouseEvent, search: string) => {
      e.stopPropagation();
      removeRecentSearch(search);
      setRecentSearches(getRecentSearches());
    },
    []
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const totalItems = results.length;

      if (e.key === "Escape") {
        setOpen(false);
        inputRef.current?.blur();
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightIndex((prev) =>
          prev < totalItems - 1 ? prev + 1 : 0
        );
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightIndex((prev) =>
          prev > 0 ? prev - 1 : totalItems - 1
        );
        return;
      }

      if (e.key === "Enter") {
        e.preventDefault();
        if (highlightIndex >= 0 && highlightIndex < results.length) {
          navigateToRestaurant(results[highlightIndex]);
        } else {
          navigateToSearch(query);
        }
        return;
      }
    },
    [results, highlightIndex, query, navigateToRestaurant, navigateToSearch]
  );

  const showDropdown = open;
  const hasQuery = query.trim().length >= 2;
  const showResults = hasQuery && results.length > 0;
  const showNoResults = hasQuery && !searching && results.length === 0;
  const showSuggestions = !hasQuery;

  return (
    <div ref={containerRef} className={`relative ${className || ""}`}>
      {/* Input */}
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search for restaurant, cuisine or a dish"
          className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-10 text-sm text-gray-700 placeholder:text-gray-400 focus:border-red-400 focus:outline-none focus:ring-1 focus:ring-red-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
        />
        {query && (
          <button
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300"
            aria-label="Clear search"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-[70vh] overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
          {/* Searching indicator */}
          {searching && (
            <div className="flex items-center gap-2 px-4 py-3 text-sm text-gray-500 dark:text-zinc-400">
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Searching...
            </div>
          )}

          {/* Search results */}
          {showResults && !searching && (
            <div>
              <div className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
                Restaurants
              </div>
              {results.map((restaurant, index) => (
                <button
                  key={restaurant.id}
                  onClick={() => navigateToRestaurant(restaurant)}
                  onMouseEnter={() => setHighlightIndex(index)}
                  className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
                    highlightIndex === index
                      ? "bg-red-50 dark:bg-red-950/20"
                      : "hover:bg-gray-50 dark:hover:bg-zinc-800"
                  }`}
                >
                  {/* Restaurant icon/image */}
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-orange-50 dark:bg-orange-900/20">
                    {restaurant.imageUrl ? (
                      <img
                        src={restaurant.imageUrl}
                        alt=""
                        className="h-10 w-10 rounded-lg object-cover"
                      />
                    ) : (
                      <span className="text-lg">🍽️</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium text-gray-900 dark:text-zinc-100">
                        {restaurant.name}
                      </span>
                      {restaurant.rating > 0 && (
                        <span
                          className={`flex items-center gap-0.5 rounded px-1 py-0.5 text-[10px] font-bold text-white ${
                            restaurant.rating >= 4.0
                              ? "bg-green-600"
                              : "bg-yellow-500"
                          }`}
                        >
                          {restaurant.rating.toFixed(1)}
                          <svg className="h-2 w-2" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                          </svg>
                        </span>
                      )}
                    </div>
                    <p className="truncate text-xs text-gray-500 dark:text-zinc-400">
                      {restaurant.cuisineType?.replace(/_/g, " ")}
                      {restaurant.deliveryTime &&
                        ` · ${restaurant.deliveryTime}`}
                    </p>
                  </div>
                  <svg
                    className="h-4 w-4 flex-shrink-0 text-gray-300 dark:text-zinc-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ))}
              {/* Search all link */}
              <button
                onClick={() => navigateToSearch(query)}
                className="flex w-full items-center gap-2 border-t border-gray-100 px-4 py-3 text-sm font-medium text-red-500 transition-colors hover:bg-red-50 dark:border-zinc-800 dark:hover:bg-red-950/20"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                See all results for &quot;{query}&quot;
              </button>
            </div>
          )}

          {/* No results */}
          {showNoResults && (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-gray-500 dark:text-zinc-400">
                No restaurants found for &quot;{query}&quot;
              </p>
              <p className="mt-1 text-xs text-gray-400 dark:text-zinc-500">
                Try a different spelling or browse by cuisine below
              </p>
            </div>
          )}

          {/* Suggestions (shown when no query) */}
          {showSuggestions && (
            <div>
              {/* Recent searches */}
              {recentSearches.length > 0 && (
                <div>
                  <div className="flex items-center justify-between px-4 py-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
                      Recent Searches
                    </span>
                  </div>
                  {recentSearches.map((search) => (
                    <button
                      key={search}
                      onClick={() => navigateToSearch(search)}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-gray-50 dark:hover:bg-zinc-800"
                    >
                      <svg
                        className="h-4 w-4 flex-shrink-0 text-gray-400 dark:text-zinc-500"
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
                      <span className="flex-1 truncate text-sm text-gray-700 dark:text-zinc-300">
                        {search}
                      </span>
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => handleRemoveRecent(e, search)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleRemoveRecent(e as unknown as React.MouseEvent, search);
                        }}
                        className="text-gray-400 hover:text-red-500 dark:text-zinc-500 dark:hover:text-red-400"
                        aria-label={`Remove ${search} from recent`}
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Popular cuisines */}
              <div
                className={
                  recentSearches.length > 0
                    ? "border-t border-gray-100 dark:border-zinc-800"
                    : ""
                }
              >
                <div className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
                  Popular Cuisines
                </div>
                <div className="flex flex-wrap gap-2 px-4 pb-3">
                  {popularCuisines.map((cuisine) => (
                    <button
                      key={cuisine.value}
                      onClick={() => navigateToCuisine(cuisine.value)}
                      className="rounded-full border border-gray-200 px-3 py-1.5 text-sm text-gray-600 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-500 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-red-800 dark:hover:bg-red-950/20 dark:hover:text-red-400"
                    >
                      {cuisine.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
