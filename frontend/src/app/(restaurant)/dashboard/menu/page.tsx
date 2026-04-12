"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { restaurants as restaurantsApi, type MenuItem, type Restaurant } from "@/services/api";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Toast } from "@/components/ui/Toast";

interface MenuFormData {
  name: string;
  description: string;
  price: string;
  category: string;
  isVeg: boolean;
  isBestseller: boolean;
  isAvailable: boolean;
}

const emptyForm: MenuFormData = {
  name: "",
  description: "",
  price: "",
  category: "",
  isVeg: false,
  isBestseller: false,
  isAvailable: true,
};

export default function MenuManagementPage() {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [formData, setFormData] = useState<MenuFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rest = await restaurantsApi.getOwnerRestaurant();
      setRestaurant(rest);
      const items = await restaurantsApi.getMenu(rest.id);
      setMenuItems(items);
    } catch {
      setError("Failed to load menu. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const categories = useMemo(() => {
    const cats = new Set(menuItems.map((i) => i.category));
    return ["All", ...Array.from(cats)];
  }, [menuItems]);

  const filtered = useMemo(() => {
    if (activeCategory === "All") return menuItems;
    return menuItems.filter((i) => i.category === activeCategory);
  }, [menuItems, activeCategory]);

  const openAddForm = () => {
    setEditingItem(null);
    setFormData(emptyForm);
    setShowForm(true);
  };

  const openEditForm = (item: MenuItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description || "",
      price: String(item.price),
      category: item.category,
      isVeg: item.isVeg,
      isBestseller: item.isBestseller,
      isAvailable: item.isAvailable,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!restaurant || !formData.name || !formData.price || !formData.category) return;
    setSaving(true);
    try {
      const data = {
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        category: formData.category,
        isVeg: formData.isVeg,
        isBestseller: formData.isBestseller,
        isAvailable: formData.isAvailable,
      };

      if (editingItem) {
        const updated = await restaurantsApi.updateMenuItem(restaurant.id, editingItem.id, data);
        setMenuItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
        setToast({ message: "Item updated successfully", type: "success" });
      } else {
        const created = await restaurantsApi.addMenuItem(restaurant.id, data);
        setMenuItems((prev) => [...prev, created]);
        setToast({ message: "Item added successfully", type: "success" });
      }
      setShowForm(false);
      setFormData(emptyForm);
      setEditingItem(null);
    } catch {
      setToast({ message: "Failed to save item", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: MenuItem) => {
    if (!restaurant || !confirm(`Delete "${item.name}"?`)) return;
    try {
      await restaurantsApi.deleteMenuItem(restaurant.id, item.id);
      setMenuItems((prev) => prev.filter((i) => i.id !== item.id));
      setToast({ message: "Item deleted", type: "success" });
    } catch {
      setToast({ message: "Failed to delete item", type: "error" });
    }
  };

  const toggleAvailability = async (item: MenuItem) => {
    if (!restaurant) return;
    try {
      const updated = await restaurantsApi.updateMenuItem(restaurant.id, item.id, {
        isAvailable: !item.isAvailable,
      });
      setMenuItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
    } catch {
      setMenuItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, isAvailable: !i.isAvailable } : i))
      );
    }
  };

  if (error && !loading) return <ErrorState message={error} onRetry={fetchData} />;

  return (
    <div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-zinc-100">Menu Management</h1>
        <button
          onClick={openAddForm}
          className="rounded-lg bg-red-500 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-600"
        >
          + Add Item
        </button>
      </div>

      {/* Categories */}
      <div className="mt-4 flex flex-wrap gap-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
              activeCategory === cat
                ? "border-red-500 bg-red-500 text-white"
                : "border-gray-300 text-gray-600 dark:border-zinc-700 dark:text-zinc-400"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="mt-6 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 rounded-xl border border-gray-200 p-4 dark:border-zinc-800">
              <Skeleton className="h-5 w-5 rounded" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-1/3" />
                <Skeleton className="h-4 w-1/4" />
              </div>
              <Skeleton className="h-6 w-12" />
            </div>
          ))}
        </div>
      )}

      {/* Menu items */}
      {!loading && filtered.length === 0 && (
        <EmptyState
          icon="📋"
          title="No menu items"
          description="Add your first menu item to start receiving orders"
          actionLabel="Add Item"
          onAction={openAddForm}
        />
      )}

      {!loading && filtered.length > 0 && (
        <div className="mt-6 divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
          {filtered.map((item) => (
            <div key={item.id} className={`flex items-center gap-4 p-4 ${!item.isAvailable ? "opacity-50" : ""}`}>
              <div className={`flex h-5 w-5 items-center justify-center rounded-sm border ${item.isVeg ? "border-green-600" : "border-red-600"}`}>
                <div className={`h-2.5 w-2.5 rounded-full ${item.isVeg ? "bg-green-600" : "bg-red-600"}`} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900 dark:text-zinc-100">{item.name}</h3>
                  {item.isBestseller && (
                    <span className="rounded bg-yellow-100 px-1.5 py-0.5 text-[10px] font-bold text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                      BESTSELLER
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 dark:text-zinc-500">{"\u20B9"}{item.price} &middot; {item.category}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleAvailability(item)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    item.isAvailable ? "bg-green-500" : "bg-gray-300 dark:bg-zinc-600"
                  }`}
                >
                  <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${item.isAvailable ? "translate-x-6" : "translate-x-1"}`} />
                </button>
                <button
                  onClick={() => openEditForm(item)}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(item)}
                  className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 dark:border-red-900/50 dark:hover:bg-red-900/20"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-zinc-900">
            <h2 className="text-lg font-bold text-gray-900 dark:text-zinc-100">
              {editingItem ? "Edit Item" : "Add New Item"}
            </h2>
            <div className="mt-4 space-y-3">
              <input
                type="text"
                placeholder="Item name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-red-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
              />
              <textarea
                placeholder="Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-red-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  placeholder="Price"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-red-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                />
                <input
                  type="text"
                  placeholder="Category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-red-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                />
              </div>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-zinc-300">
                  <input type="checkbox" checked={formData.isVeg} onChange={(e) => setFormData({ ...formData, isVeg: e.target.checked })} className="rounded" />
                  Vegetarian
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-zinc-300">
                  <input type="checkbox" checked={formData.isBestseller} onChange={(e) => setFormData({ ...formData, isBestseller: e.target.checked })} className="rounded" />
                  Bestseller
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-zinc-300">
                  <input type="checkbox" checked={formData.isAvailable} onChange={(e) => setFormData({ ...formData, isAvailable: e.target.checked })} className="rounded" />
                  Available
                </label>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => { setShowForm(false); setEditingItem(null); }}
                className="rounded-lg border border-gray-300 px-5 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !formData.name || !formData.price || !formData.category}
                className="rounded-lg bg-red-500 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-600 disabled:opacity-60"
              >
                {saving ? "Saving..." : editingItem ? "Update" : "Add Item"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
