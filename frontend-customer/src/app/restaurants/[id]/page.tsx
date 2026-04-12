"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";
import { useApp } from "@/context/AppContext";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

interface RestaurantDetail {
  id: number;
  name: string;
  description: string;
  address: string;
  phone?: string;
  cuisineType: string | null;
  rating: number;
  openingTime?: string;
  closingTime?: string;
}

interface MenuItem {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  isAvailable: boolean;
}

function formatLabel(value: string | null | undefined) {
  return value ? value.replace(/_/g, " ") : "Restaurant";
}

export default function RestaurantPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { addToCart, removeFromCart, getCartQuantity, cartRestaurant, cartItemCount } = useApp();
  const [restaurant, setRestaurant] = useState<RestaurantDetail | null>(null);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadRestaurant() {
      try {
        const [restaurantRes, menuRes] = await Promise.all([
          fetch(`${API_BASE}/api/restaurants/${id}`),
          fetch(`${API_BASE}/api/restaurants/${id}/menu?available=true`),
        ]);

        if (!restaurantRes.ok) {
          throw new Error("Restaurant not found.");
        }

        if (!menuRes.ok) {
          throw new Error("Failed to load menu.");
        }

        const [restaurantData, menuData] = await Promise.all([
          restaurantRes.json(),
          menuRes.json(),
        ]);

        setRestaurant(restaurantData);
        setMenu(Array.isArray(menuData) ? menuData : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      } finally {
        setLoading(false);
      }
    }

    void loadRestaurant();
  }, [id]);

  const groupedMenu = useMemo(() => {
    return menu.reduce<Record<string, MenuItem[]>>((acc, item) => {
      const key = item.category || "SPECIALS";
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});
  }, [menu]);

  if (loading) {
    return <div className="py-20 text-center text-gray-500 dark:text-zinc-500">Loading restaurant...</div>;
  }

  if (error || !restaurant) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
        {error || "Restaurant not found."}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="bg-gradient-to-br from-red-50 via-orange-50 to-amber-100 p-8 dark:from-red-950/60 dark:via-orange-950/40 dark:to-amber-950/40">
          <Link href="/" className="text-sm font-medium text-red-500 hover:text-red-600">
            ← Back to restaurants
          </Link>
          <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-500">
                {formatLabel(restaurant.cuisineType)}
              </p>
              <h1 className="mt-2 text-3xl font-bold text-gray-900 dark:text-zinc-100">{restaurant.name}</h1>
              <p className="mt-3 max-w-3xl text-sm text-gray-600 dark:text-zinc-400">
                {restaurant.description || "This restaurant is newly onboarded and updating its profile."}
              </p>
            </div>
            <div className="rounded-2xl bg-white/90 px-4 py-3 shadow-sm dark:bg-zinc-900/90">
              <p className="text-xs uppercase tracking-wide text-gray-400 dark:text-zinc-500">Rating</p>
              <p className="text-2xl font-bold text-green-700 dark:text-green-400">{(restaurant.rating || 0).toFixed(1)}</p>
            </div>
          </div>

          <div className="mt-6 grid gap-3 text-sm text-gray-600 dark:text-zinc-400 md:grid-cols-3">
            <div className="rounded-2xl bg-white/70 p-4 dark:bg-zinc-900/60">
              <p className="font-semibold text-gray-900 dark:text-zinc-100">Address</p>
              <p className="mt-1">{restaurant.address}</p>
            </div>
            <div className="rounded-2xl bg-white/70 p-4 dark:bg-zinc-900/60">
              <p className="font-semibold text-gray-900 dark:text-zinc-100">Hours</p>
              <p className="mt-1">
                {restaurant.openingTime && restaurant.closingTime
                  ? `${restaurant.openingTime} - ${restaurant.closingTime}`
                  : "Hours will be updated soon"}
              </p>
            </div>
            <div className="rounded-2xl bg-white/70 p-4 dark:bg-zinc-900/60">
              <p className="font-semibold text-gray-900 dark:text-zinc-100">Contact</p>
              <p className="mt-1">{restaurant.phone || "Phone number not added yet"}</p>
            </div>
          </div>
        </div>
      </div>

      {cartRestaurant?.id === String(restaurant.id) && cartItemCount > 0 && (
        <div className="rounded-2xl border border-green-200 bg-green-50 px-5 py-4 text-sm text-green-800 dark:border-green-900/60 dark:bg-green-950/40 dark:text-green-300">
          {cartItemCount} item(s) in your cart from this restaurant.{" "}
          <Link href="/cart" className="font-semibold underline">
            Review cart
          </Link>
        </div>
      )}

      {menu.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center text-gray-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-500">
          This restaurant has not published its menu yet.
        </div>
      ) : (
        Object.entries(groupedMenu).map(([category, items]) => (
          <section key={category}>
            <h2 className="text-xl font-bold text-gray-900 dark:text-zinc-100">{formatLabel(category)}</h2>
            <div className="mt-4 space-y-4">
              {items.map((item) => {
                const quantity = getCartQuantity(String(item.id));

                return (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="max-w-2xl">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-zinc-100">{item.name}</h3>
                        <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">
                          {item.description || "Freshly prepared and served hot."}
                        </p>
                        <p className="mt-3 font-semibold text-gray-900 dark:text-zinc-100">₹{item.price}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        {quantity > 0 ? (
                          <>
                            <button
                              onClick={() => removeFromCart(String(item.id))}
                              className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 dark:border-zinc-700 dark:text-zinc-200"
                            >
                              -
                            </button>
                            <span className="min-w-8 text-center text-sm font-semibold text-gray-900 dark:text-zinc-100">
                              {quantity}
                            </span>
                            <button
                              onClick={() =>
                                addToCart(
                                  {
                                    id: String(item.id),
                                    name: item.name,
                                    price: item.price,
                                    veg: true,
                                    description: item.description,
                                  },
                                  {
                                    id: String(restaurant.id),
                                    name: restaurant.name,
                                    address: restaurant.address,
                                    deliveryTime: "30-40 min",
                                  }
                                )
                              }
                              className="rounded-lg bg-red-500 px-3 py-2 text-sm font-semibold text-white hover:bg-red-600"
                            >
                              +
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() =>
                              addToCart(
                                {
                                  id: String(item.id),
                                  name: item.name,
                                  price: item.price,
                                  veg: true,
                                  description: item.description,
                                },
                                {
                                  id: String(restaurant.id),
                                  name: restaurant.name,
                                  address: restaurant.address,
                                  deliveryTime: "30-40 min",
                                }
                              )
                            }
                            className="rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-600"
                          >
                            Add to cart
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
