"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
const MENU_CATEGORIES = [
  "APPETIZERS",
  "MAIN_COURSE",
  "DESSERTS",
  "BEVERAGES",
  "SIDES",
  "SPECIALS",
] as const;

interface Restaurant {
  id: number;
  name: string;
  address: string;
}

interface MenuItem {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  isAvailable: boolean;
}

export default function MenuPage() {
  const { user } = useAuth();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState({
    name: "",
    description: "",
    price: "",
    category: "MAIN_COURSE",
  });

  useEffect(() => {
    async function loadData() {
      if (!user?.userId) {
        setLoading(false);
        return;
      }

      try {
        const ownerRes = await fetch(`${API_BASE}/api/restaurants/owner/${user.userId}`);
        if (!ownerRes.ok) {
          throw new Error("Failed to load restaurant profile.");
        }

        const restaurants: Restaurant[] = await ownerRes.json();
        const activeRestaurant = restaurants[0];

        if (!activeRestaurant) {
          setRestaurant(null);
          setMenu([]);
          return;
        }

        setRestaurant(activeRestaurant);

        const menuRes = await fetch(`${API_BASE}/api/restaurants/${activeRestaurant.id}/menu`);
        if (!menuRes.ok) {
          throw new Error("Failed to load menu items.");
        }

        const menuItems: MenuItem[] = await menuRes.json();
        setMenu(menuItems);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      } finally {
        setLoading(false);
      }
    }

    void loadData();
  }, [user?.userId]);

  const sortedMenu = useMemo(
    () =>
      [...menu].sort((a, b) => {
        if (a.isAvailable !== b.isAvailable) {
          return a.isAvailable ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      }),
    [menu]
  );

  const toggleAvailability = async (itemId: number) => {
    if (!restaurant) return;

    try {
      const res = await fetch(
        `${API_BASE}/api/restaurants/${restaurant.id}/menu/${itemId}/toggle`,
        { method: "PATCH" }
      );

      if (!res.ok) {
        throw new Error("Failed to update availability.");
      }

      const updated: MenuItem = await res.json();
      setMenu((prev) => prev.map((item) => (item.id === itemId ? updated : item)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update item.");
    }
  };

  const deleteItem = async (itemId: number) => {
    if (!restaurant) return;

    try {
      const res = await fetch(`${API_BASE}/api/restaurants/${restaurant.id}/menu/${itemId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to delete menu item.");
      }

      setMenu((prev) => prev.filter((item) => item.id !== itemId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete item.");
    }
  };

  const addItem = async () => {
    if (!restaurant || !newItem.name.trim() || !newItem.price) return;

    setSaving(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE}/api/restaurants/${restaurant.id}/menu`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newItem.name.trim(),
          description: newItem.description.trim(),
          price: Number(newItem.price),
          category: newItem.category,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to save menu item.");
      }

      const created: MenuItem = await res.json();
      setMenu((prev) => [...prev, created]);
      setNewItem({ name: "", description: "", price: "", category: "MAIN_COURSE" });
      setShowAddForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save item.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="py-16 text-center text-gray-500 dark:text-zinc-500">Loading menu...</div>;
  }

  if (!restaurant) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
        Your restaurant profile is still being prepared. Sign out and sign back in once registration completes, or create a fresh restaurant account with full details.
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-zinc-100">Menu Management</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-zinc-500">
            {restaurant.name} · {menu.filter((item) => item.isAvailable).length} available items
          </p>
        </div>
        <button
          onClick={() => setShowAddForm((prev) => !prev)}
          className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-600"
        >
          + Add Item
        </button>
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}

      {showAddForm && (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="font-semibold text-gray-900 dark:text-zinc-100">Add New Item</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <input
              type="text"
              placeholder="Item name"
              value={newItem.name}
              onChange={(e) => setNewItem((prev) => ({ ...prev, name: e.target.value }))}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 focus:border-red-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
            />
            <input
              type="number"
              placeholder="Price"
              value={newItem.price}
              onChange={(e) => setNewItem((prev) => ({ ...prev, price: e.target.value }))}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 focus:border-red-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
            />
            <textarea
              placeholder="Description"
              value={newItem.description}
              onChange={(e) => setNewItem((prev) => ({ ...prev, description: e.target.value }))}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 focus:border-red-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 sm:col-span-2"
            />
            <select
              value={newItem.category}
              onChange={(e) => setNewItem((prev) => ({ ...prev, category: e.target.value }))}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 focus:border-red-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
            >
              {MENU_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={addItem}
              disabled={saving}
              className="rounded-lg bg-green-500 px-4 py-2 text-sm font-semibold text-white hover:bg-green-600 disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Item"}
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="mt-6 space-y-3">
        {sortedMenu.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center text-gray-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-500">
            No menu items yet. Add your first dish and it will become visible to customers.
          </div>
        ) : (
          sortedMenu.map((item) => (
            <div
              key={item.id}
              className={`rounded-xl border bg-white p-4 transition-shadow hover:shadow-sm dark:bg-zinc-900 ${
                item.isAvailable ? "border-gray-200 dark:border-zinc-800" : "border-gray-200 opacity-70 dark:border-zinc-800"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-gray-900 dark:text-zinc-100">{item.name}</h3>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-zinc-800 dark:text-zinc-400">
                      {item.category.replace(/_/g, " ")}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-500 dark:text-zinc-500">{item.description || "No description added yet."}</p>
                  <p className="mt-2 font-semibold text-gray-800 dark:text-zinc-200">₹{item.price}</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleAvailability(item.id)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                      item.isAvailable
                        ? "bg-green-50 text-green-600 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400"
                        : "bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400"
                    }`}
                  >
                    {item.isAvailable ? "Available" : "Unavailable"}
                  </button>
                  <button
                    onClick={() => deleteItem(item.id)}
                    className="rounded-lg px-3 py-1.5 text-xs font-semibold text-gray-500 transition-colors hover:bg-red-50 hover:text-red-500 dark:text-zinc-400 dark:hover:bg-red-900/20"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
