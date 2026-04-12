"use client";

import Link from "next/link";
import { useState, useMemo, use, useRef, useEffect, useCallback } from "react";
import { useApp } from "@/context/AppContext";
import { restaurants as restaurantsApi, type Restaurant, type MenuItem as ApiMenuItem, type Review as ApiReview } from "@/services/api";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";

/* ───────── Component ───────── */

export default function RestaurantPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { addToCart: ctxAddToCart, removeFromCart, getCartQuantity, cartItemCount, cartSubtotal: cartTotal } = useApp();

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menu, setMenu] = useState<ApiMenuItem[]>([]);
  const [reviews, setReviews] = useState<ApiReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vegOnly, setVegOnly] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [addedItemId, setAddedItemId] = useState<number | null>(null);
  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [restaurantData, menuData, reviewData] = await Promise.all([
        restaurantsApi.get(id),
        restaurantsApi.getMenu(id),
        restaurantsApi.getReviews(id),
      ]);
      setRestaurant(restaurantData);
      setMenu(menuData);
      setReviews(reviewData);
    } catch {
      setError("Failed to load restaurant details. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Derive categories from menu
  const categories = useMemo(() => {
    const cats: string[] = [];
    menu.forEach((item) => {
      if (!cats.includes(item.category)) cats.push(item.category);
    });
    return cats;
  }, [menu]);

  // Set initial active category
  useEffect(() => {
    if (categories.length > 0 && !activeCategory) {
      setActiveCategory(categories[0]);
    }
  }, [categories, activeCategory]);

  // Filtered menu
  const filteredMenu = useMemo(() => {
    return vegOnly ? menu.filter((item) => item.isVeg) : menu;
  }, [menu, vegOnly]);

  // Grouped by category
  const groupedMenu = useMemo(() => {
    const groups: Record<string, ApiMenuItem[]> = {};
    filteredMenu.forEach((item) => {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    });
    return groups;
  }, [filteredMenu]);

  // Cart helper with animation
  const addToCart = (item: ApiMenuItem) => {
    if (!restaurant) return;
    ctxAddToCart(
      { id: String(item.id), name: item.name, price: item.price, veg: item.isVeg, description: item.description },
      { id: String(restaurant.id), name: restaurant.name, address: restaurant.address, deliveryTime: restaurant.deliveryTime || "30-40 min" }
    );
    setAddedItemId(item.id);
    setTimeout(() => setAddedItemId(null), 500);
  };

  // Rating distribution
  const ratingDist = useMemo(() => {
    const dist = [0, 0, 0, 0, 0];
    reviews.forEach((r) => dist[r.rating - 1]++);
    return dist.reverse();
  }, [reviews]);

  const avgRating = useMemo(() => {
    if (reviews.length === 0) return restaurant?.rating || 0;
    return reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
  }, [reviews, restaurant]);

  // Scroll to category
  const scrollToCategory = (cat: string) => {
    setActiveCategory(cat);
    categoryRefs.current[cat]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Loading state
  if (loading) {
    return (
      <div className="animate-fade-in">
        <Skeleton className="h-56 w-full rounded-2xl skeleton-shimmer" />
        <div className="mt-5 space-y-3">
          <Skeleton className="h-8 w-1/2 skeleton-shimmer" />
          <Skeleton className="h-4 w-1/3 skeleton-shimmer" />
          <Skeleton className="h-4 w-1/4 skeleton-shimmer" />
        </div>
        <hr className="my-6 border-gray-200 dark:border-zinc-800" />
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-4 rounded-2xl border border-gray-200 p-5 dark:border-zinc-800">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-3/4 skeleton-shimmer" />
                <Skeleton className="h-4 w-1/4 skeleton-shimmer" />
                <Skeleton className="h-12 w-full skeleton-shimmer" />
              </div>
              <Skeleton className="h-28 w-28 rounded-xl skeleton-shimmer" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return <ErrorState message={error} onRetry={fetchData} />;
  }

  // Not found
  if (!restaurant) {
    return (
      <EmptyState
        icon="🍽️"
        title="Restaurant not found"
        description="The restaurant you are looking for does not exist."
        actionLabel="Browse Restaurants"
        actionHref="/restaurants"
      />
    );
  }

  const displayedReviews = showAllReviews ? reviews : reviews.slice(0, 3);

  return (
    <div className="animate-fade-in">
      {/* Breadcrumb */}
      <div className="mb-4 flex items-center gap-2 text-sm text-gray-500 dark:text-zinc-500">
        <Link href="/restaurants" className="transition-colors hover:text-red-500">Restaurants</Link>
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-gray-800 dark:text-zinc-200">{restaurant.name}</span>
      </div>

      {/* Hero Banner */}
      <div className="relative h-52 overflow-hidden rounded-2xl bg-gradient-to-br from-orange-100 to-red-100 dark:from-orange-900/20 dark:to-red-900/20 sm:h-64">
        {restaurant.imageUrl ? (
          <img src={restaurant.imageUrl} alt={restaurant.name} className="h-full w-full rounded-2xl object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <svg className="h-24 w-24 text-red-200/50 dark:text-red-900/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={0.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.87c1.355 0 2.697.055 4.024.165C17.155 8.51 18 9.473 18 10.608v2.513m-3-4.87v-1.5m-6 1.5v-1.5m12 9.75l-1.5.75a3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0L3 16.5m15-3.38a48.474 48.474 0 00-6-.37c-2.032 0-4.034.126-6 .37m12 0c.39.049.777.102 1.163.16 1.07.16 1.837 1.094 1.837 2.175v5.17c0 .62-.504 1.124-1.125 1.124H4.125A1.125 1.125 0 013 20.625v-5.17c0-1.08.768-2.014 1.837-2.174A47.78 47.78 0 016 13.12M16.5 3.75V7.5" />
            </svg>
          </div>
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-black/30 via-transparent to-transparent" />
      </div>

      {/* Restaurant Info */}
      <div className="mt-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-zinc-100 sm:text-3xl">{restaurant.name}</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-zinc-500">{restaurant.cuisineType?.replace(/_/g, " ")}</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-sm text-gray-400 dark:text-zinc-600">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {restaurant.address}
            </p>
          </div>
          <div className="flex gap-3">
            {restaurant.rating > 0 && (
              <div className="flex flex-col items-center rounded-2xl border border-gray-200 px-5 py-3 dark:border-zinc-800">
                <span className={`flex items-center gap-1 text-xl font-bold ${restaurant.rating >= 4.0 ? "text-green-600" : "text-yellow-500"}`}>
                  {restaurant.rating.toFixed(1)}
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                </span>
                <span className="text-[11px] text-gray-500 dark:text-zinc-500">{restaurant.reviewCount?.toLocaleString() || 0} ratings</span>
              </div>
            )}
          </div>
        </div>

        {/* Info pills */}
        <div className="mt-4 flex flex-wrap gap-2">
          {restaurant.deliveryTime && (
            <div className="flex items-center gap-1.5 rounded-xl bg-gray-100 px-3 py-2 text-xs font-medium text-gray-700 dark:bg-zinc-800 dark:text-zinc-300">
              <svg className="h-3.5 w-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {restaurant.deliveryTime}
            </div>
          )}
          {restaurant.priceRange && (
            <div className="flex items-center gap-1.5 rounded-xl bg-gray-100 px-3 py-2 text-xs font-medium text-gray-700 dark:bg-zinc-800 dark:text-zinc-300">
              <svg className="h-3.5 w-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {"\u20B9"}{restaurant.priceRange} for two
            </div>
          )}
          {restaurant.openingTime && restaurant.closingTime && (
            <div className="flex items-center gap-1.5 rounded-xl bg-gray-100 px-3 py-2 text-xs font-medium text-gray-700 dark:bg-zinc-800 dark:text-zinc-300">
              <svg className="h-3.5 w-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              {restaurant.openingTime} - {restaurant.closingTime}
            </div>
          )}
        </div>
      </div>

      <hr className="my-6 border-gray-200 dark:border-zinc-800" />

      {/* Menu Section */}
      <div className="grid gap-8 lg:grid-cols-4">
        {/* Sticky category sidebar */}
        <div className="hidden lg:block">
          <div className="sticky top-24">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-500">Menu</h3>
            <nav className="space-y-1">
              {Object.keys(groupedMenu).map((cat) => (
                <button
                  key={cat}
                  onClick={() => scrollToCategory(cat)}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                    activeCategory === cat
                      ? "bg-red-50 text-red-600 shadow-sm dark:bg-red-900/20 dark:text-red-400"
                      : "text-gray-600 hover:bg-gray-50 dark:text-zinc-400 dark:hover:bg-zinc-800"
                  }`}
                >
                  {cat}
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-400 dark:bg-zinc-800 dark:text-zinc-600">{groupedMenu[cat].length}</span>
                </button>
              ))}
            </nav>

            {/* Veg toggle */}
            <div className="mt-6 flex items-center gap-3 rounded-2xl border border-gray-200 px-4 py-3 dark:border-zinc-800">
              <div className="flex h-5 w-5 items-center justify-center rounded border border-green-600">
                <div className="h-2.5 w-2.5 rounded-full bg-green-600" />
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-zinc-300">Veg Only</span>
              <button
                onClick={() => setVegOnly(!vegOnly)}
                className={`relative ml-auto inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  vegOnly ? "bg-green-500" : "bg-gray-300 dark:bg-zinc-600"
                }`}
              >
                <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${vegOnly ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Menu items */}
        <div className="lg:col-span-3">
          {/* Mobile category pills */}
          <div className="mb-4 flex items-center gap-3 lg:hidden">
            <div className="flex flex-1 gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {Object.keys(groupedMenu).map((cat) => (
                <button
                  key={cat}
                  onClick={() => scrollToCategory(cat)}
                  className={`btn-press shrink-0 rounded-xl border px-3 py-2 text-xs font-medium transition-all ${
                    activeCategory === cat
                      ? "border-red-500 bg-red-500 text-white shadow-sm"
                      : "border-gray-300 text-gray-600 dark:border-zinc-700 dark:text-zinc-400"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <button
              onClick={() => setVegOnly(!vegOnly)}
              className={`btn-press flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-all ${
                vegOnly
                  ? "border-green-500 bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400"
                  : "border-gray-300 text-gray-600 dark:border-zinc-700 dark:text-zinc-400"
              }`}
            >
              <div className="flex h-3.5 w-3.5 items-center justify-center rounded-sm border border-green-600">
                <div className="h-2 w-2 rounded-full bg-green-600" />
              </div>
              Veg
            </button>
          </div>

          {/* Menu empty state */}
          {menu.length === 0 && (
            <EmptyState
              icon="📋"
              title="No menu items yet"
              description="This restaurant hasn't added any menu items"
            />
          )}

          {/* Menu groups */}
          {Object.entries(groupedMenu).map(([category, items]) => (
            <div
              key={category}
              ref={(el) => { categoryRefs.current[category] = el; }}
              className="mb-8 scroll-mt-28"
            >
              <h2 className="mb-3 text-lg font-bold text-gray-900 dark:text-zinc-100">
                {category}
                <span className="ml-2 text-sm font-normal text-gray-400 dark:text-zinc-600">({items.length})</span>
              </h2>

              <div className="divide-y divide-gray-100 rounded-2xl border border-gray-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
                {items.map((item) => {
                  const qty = getCartQuantity(String(item.id));
                  const justAdded = addedItemId === item.id;
                  return (
                    <div key={item.id} className="flex gap-4 p-4 transition-colors hover:bg-gray-50/50 sm:p-5 dark:hover:bg-zinc-800/30">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div className={`flex h-4 w-4 items-center justify-center rounded-sm border ${item.isVeg ? "border-green-600" : "border-red-600"}`}>
                            <div className={`h-2 w-2 rounded-full ${item.isVeg ? "bg-green-600" : "bg-red-600"}`} />
                          </div>
                          {item.isBestseller && (
                            <span className="flex items-center gap-1 rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                              <svg className="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                              </svg>
                              BESTSELLER
                            </span>
                          )}
                        </div>
                        <h3 className="mt-1.5 font-semibold text-gray-900 dark:text-zinc-100">{item.name}</h3>
                        <p className="mt-0.5 text-sm font-semibold text-gray-800 dark:text-zinc-200">{"\u20B9"}{item.price}</p>
                        {item.rating != null && item.rating > 0 && (
                          <div className="mt-1.5 flex items-center gap-1">
                            <div className="flex gap-0.5">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <svg key={star} className={`h-3 w-3 ${star <= Math.round(item.rating!) ? "text-yellow-400" : "text-gray-200 dark:text-zinc-700"}`} fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                </svg>
                              ))}
                            </div>
                            <span className="text-xs font-medium text-gray-500 dark:text-zinc-500">{item.rating.toFixed(1)}</span>
                          </div>
                        )}
                        {item.description && (
                          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-gray-500 dark:text-zinc-500">{item.description}</p>
                        )}
                      </div>

                      <div className="flex flex-col items-center">
                        <div className={`h-24 w-24 overflow-hidden rounded-xl bg-gray-100 dark:bg-zinc-800 sm:h-28 sm:w-28 ${justAdded ? "animate-cart-pop" : ""}`}>
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full items-center justify-center">
                              <svg className="h-8 w-8 text-gray-300 dark:text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={0.8}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.87c1.355 0 2.697.055 4.024.165C17.155 8.51 18 9.473 18 10.608v2.513m-3-4.87v-1.5m-6 1.5v-1.5m12 9.75l-1.5.75a3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0L3 16.5" />
                              </svg>
                            </div>
                          )}
                        </div>
                        {!item.isAvailable ? (
                          <span className="-mt-4 rounded-xl border border-gray-200 bg-gray-100 px-6 py-1.5 text-sm font-bold text-gray-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-600">
                            N/A
                          </span>
                        ) : qty === 0 ? (
                          <button
                            onClick={() => addToCart(item)}
                            className="btn-press -mt-4 rounded-xl border-2 border-green-600/20 bg-white px-6 py-1.5 text-sm font-bold text-green-600 shadow-md transition-all hover:bg-green-50 hover:shadow-lg active:scale-95 dark:border-green-800/30 dark:bg-zinc-900 dark:text-green-400 dark:hover:bg-green-900/20"
                          >
                            ADD
                          </button>
                        ) : (
                          <div className={`-mt-4 flex items-center gap-0 overflow-hidden rounded-xl bg-green-600 shadow-md shadow-green-600/20 ${justAdded ? "animate-cart-pop" : ""}`}>
                            <button
                              onClick={() => removeFromCart(String(item.id))}
                              className="btn-press px-3 py-1.5 text-sm font-bold text-white transition-colors hover:bg-green-700"
                            >
                              -
                            </button>
                            <span className="min-w-[28px] text-center text-sm font-bold text-white">{qty}</span>
                            <button
                              onClick={() => addToCart(item)}
                              className="btn-press px-3 py-1.5 text-sm font-bold text-white transition-colors hover:bg-green-700"
                            >
                              +
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {filteredMenu.length === 0 && menu.length > 0 && (
            <EmptyState icon="🥬" title="No veg items found" description="Try turning off the veg filter" />
          )}

          {/* Reviews Section */}
          <div className="mt-4 mb-8">
            <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-zinc-100">
              <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              Ratings & Reviews
            </h2>

            {reviews.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
                <svg className="mx-auto h-12 w-12 text-gray-200 dark:text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p className="mt-3 text-gray-500 dark:text-zinc-500">No reviews yet. Be the first to review!</p>
              </div>
            ) : (
              <>
                {/* Rating overview */}
                <div className="mt-4 flex flex-wrap gap-6 rounded-2xl border border-gray-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="flex flex-col items-center justify-center">
                    <span className="text-4xl font-bold text-gray-900 dark:text-zinc-100">{avgRating.toFixed(1)}</span>
                    <div className="mt-1 flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <svg key={star} className={`h-4 w-4 ${star <= Math.round(avgRating) ? "text-yellow-400" : "text-gray-200 dark:text-zinc-700"}`} fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                      ))}
                    </div>
                    <span className="mt-1 text-xs text-gray-500 dark:text-zinc-500">{reviews.length} reviews</span>
                  </div>

                  <div className="flex-1 space-y-2">
                    {[5, 4, 3, 2, 1].map((star, idx) => (
                      <div key={star} className="flex items-center gap-2">
                        <span className="w-3 text-xs font-medium text-gray-600 dark:text-zinc-400">{star}</span>
                        <svg className="h-3 w-3 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-zinc-800">
                          <div
                            className="h-full rounded-full bg-yellow-400 transition-all duration-700"
                            style={{ width: `${(ratingDist[idx] / reviews.length) * 100}%` }}
                          />
                        </div>
                        <span className="w-6 text-right text-xs text-gray-400 dark:text-zinc-600">{ratingDist[idx]}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Individual reviews */}
                <div className="mt-4 space-y-3">
                  {displayedReviews.map((review) => (
                    <div key={review.id} className="rounded-2xl border border-gray-200 bg-white p-4 transition-colors hover:border-gray-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-orange-500 text-sm font-bold text-white">
                            {review.userName?.charAt(0) || "?"}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900 dark:text-zinc-100">{review.userName}</p>
                            <div className="mt-0.5 flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <svg key={star} className={`h-3 w-3 ${star <= review.rating ? "text-yellow-400" : "text-gray-200 dark:text-zinc-700"}`} fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                </svg>
                              ))}
                            </div>
                          </div>
                        </div>
                        <span className="text-xs text-gray-400 dark:text-zinc-600">
                          {new Date(review.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-relaxed text-gray-600 dark:text-zinc-400">{review.comment}</p>
                      {review.reply && (
                        <div className="mt-3 rounded-xl bg-gray-50 p-3 dark:bg-zinc-800">
                          <p className="flex items-center gap-1 text-xs font-semibold text-gray-700 dark:text-zinc-300">
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                            </svg>
                            Restaurant Reply
                          </p>
                          <p className="mt-1 text-sm text-gray-600 dark:text-zinc-400">{review.reply}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {reviews.length > 3 && (
                  <button
                    onClick={() => setShowAllReviews(!showAllReviews)}
                    className="btn-press mt-3 w-full rounded-xl border border-gray-200 py-3 text-sm font-semibold text-red-500 transition-all hover:bg-red-50 hover:border-red-200 dark:border-zinc-800 dark:hover:bg-red-900/10"
                  >
                    {showAllReviews ? "Show Less" : `View All ${reviews.length} Reviews`}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Sticky cart bar */}
      {cartItemCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 animate-slide-up">
          <div className="border-t border-gray-200 bg-white/95 shadow-[0_-8px_30px_-10px_rgba(0,0,0,0.12)] backdrop-blur-lg dark:border-zinc-800 dark:bg-zinc-900/95">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100 dark:bg-green-900/30">
                  <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-zinc-100">
                    {cartItemCount} {cartItemCount === 1 ? "item" : "items"} added
                  </p>
                  <p className="text-xs text-gray-500 dark:text-zinc-500">from {restaurant.name}</p>
                </div>
              </div>
              <Link
                href="/cart"
                className="btn-press flex items-center gap-2 rounded-xl bg-green-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-green-600/25 transition-all hover:bg-green-700 hover:shadow-xl"
              >
                View Cart &middot; {"\u20B9"}{cartTotal}
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
