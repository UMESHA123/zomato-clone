"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";

const API_BASE = "http://localhost:8080";

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem("zomato_token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: "Bearer " + token } : {}),
  };
}

/* ───────── Types ───────── */

export interface CartMenuItem {
  id: string;
  name: string;
  price: number;
  veg: boolean;
  description?: string;
}

export interface CartItem {
  menuItem: CartMenuItem;
  quantity: number;
}

export interface CartRestaurant {
  id: string;
  name: string;
  address: string;
  deliveryTime: string;
}

export interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  restaurantId: string;
  restaurant: string;
  restaurantAddress: string;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  discount: number;
  taxes: number;
  total: number;
  status: "confirmed" | "preparing" | "picked_up" | "on_the_way" | "delivered" | "cancelled";
  date: string;
  placedAt: string;
  paymentMethod: string;
  rating?: number;
}

interface AppContextType {
  // Cart
  cart: CartItem[];
  cartRestaurant: CartRestaurant | null;
  addToCart: (item: CartMenuItem, restaurant: CartRestaurant) => void;
  removeFromCart: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  getCartQuantity: (itemId: string) => number;
  cartItemCount: number;
  cartSubtotal: number;

  // Orders
  orders: Order[];
  placeOrder: (discount: number, paymentMethod: string) => Promise<Order | null>;
  getOrder: (orderId: string) => Order | undefined;
  fetchOrder: (orderId: string) => Promise<Order | null>;
  refreshOrders: () => Promise<void>;
  updateOrderInState: (order: Order) => void;

  // Order confirmation
  orderJustPlaced: string | null;
  clearOrderJustPlaced: () => void;
}

const AppContext = createContext<AppContextType | null>(null);

/* ───────── Provider ───────── */

export function AppProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartRestaurant, setCartRestaurant] = useState<CartRestaurant | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderJustPlaced, setOrderJustPlaced] = useState<string | null>(null);

  const addToCart = useCallback((item: CartMenuItem, restaurant: CartRestaurant) => {
    // If switching restaurant, clear cart
    if (cartRestaurant && cartRestaurant.id !== restaurant.id) {
      setCart([{ menuItem: item, quantity: 1 }]);
      setCartRestaurant(restaurant);
      return;
    }

    if (!cartRestaurant) {
      setCartRestaurant(restaurant);
    }

    setCart((prev) => {
      const existing = prev.find((c) => c.menuItem.id === item.id);
      if (existing) {
        return prev.map((c) =>
          c.menuItem.id === item.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [...prev, { menuItem: item, quantity: 1 }];
    });
  }, [cartRestaurant]);

  const removeFromCart = useCallback((itemId: string) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.menuItem.id === itemId);
      if (existing && existing.quantity > 1) {
        return prev.map((c) =>
          c.menuItem.id === itemId ? { ...c, quantity: c.quantity - 1 } : c
        );
      }
      const next = prev.filter((c) => c.menuItem.id !== itemId);
      if (next.length === 0) setCartRestaurant(null);
      return next;
    });
  }, []);

  const updateQuantity = useCallback((itemId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart((prev) => {
        const next = prev.filter((c) => c.menuItem.id !== itemId);
        if (next.length === 0) setCartRestaurant(null);
        return next;
      });
      return;
    }
    setCart((prev) =>
      prev.map((c) => (c.menuItem.id === itemId ? { ...c, quantity } : c))
    );
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    setCartRestaurant(null);
  }, []);

  const getCartQuantity = useCallback(
    (itemId: string) => cart.find((c) => c.menuItem.id === itemId)?.quantity ?? 0,
    [cart]
  );

  const cartItemCount = cart.reduce((sum, c) => sum + c.quantity, 0);
  const cartSubtotal = cart.reduce((sum, c) => sum + c.menuItem.price * c.quantity, 0);

  const placeOrder = useCallback(
    async (discount: number, paymentMethod: string): Promise<Order | null> => {
      if (cart.length === 0 || !cartRestaurant) return null;

      const subtotal = cart.reduce((s, c) => s + c.menuItem.price * c.quantity, 0);
      const deliveryFee = subtotal > 500 ? 0 : 40;
      const taxes = Math.round((subtotal - discount) * 0.05);
      const total = subtotal - discount + deliveryFee + taxes;

      const payload = {
        restaurantId: cartRestaurant.id,
        restaurant: cartRestaurant.name,
        restaurantAddress: cartRestaurant.address,
        items: cart.map((c) => ({
          name: c.menuItem.name,
          quantity: c.quantity,
          price: c.menuItem.price * c.quantity,
        })),
        subtotal,
        deliveryFee,
        discount,
        taxes,
        total,
        paymentMethod,
        customerName: user?.name || "Customer",
      };

      try {
        const res = await fetch(`${API_BASE}/api/orders`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          throw new Error(`Order creation failed: ${res.status}`);
        }

        const serverOrder: Order = await res.json();

        setOrders((prev) => [serverOrder, ...prev]);
        setCart([]);
        setCartRestaurant(null);
        setOrderJustPlaced(serverOrder.id);

        return serverOrder;
      } catch (err) {
        console.error("Failed to place order via API, falling back to local:", err);

        // Fallback to local order creation so the app still works without the API
        const now = new Date();
        const timeStr = now.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
        const dateStr = `Today, ${timeStr}`;

        const localOrder: Order = {
          id: `ORD-${1000 + orders.length + Math.floor(Math.random() * 9000)}`,
          restaurantId: cartRestaurant.id,
          restaurant: cartRestaurant.name,
          restaurantAddress: cartRestaurant.address,
          items: cart.map((c) => ({
            name: c.menuItem.name,
            quantity: c.quantity,
            price: c.menuItem.price * c.quantity,
          })),
          subtotal,
          deliveryFee,
          discount,
          taxes,
          total,
          status: "confirmed",
          date: dateStr,
          placedAt: timeStr,
          paymentMethod,
        };

        setOrders((prev) => [localOrder, ...prev]);
        setCart([]);
        setCartRestaurant(null);
        setOrderJustPlaced(localOrder.id);

        return localOrder;
      }
    },
    [cart, cartRestaurant, orders.length, user]
  );

  const getOrder = useCallback(
    (orderId: string) => orders.find((o) => o.id === orderId),
    [orders]
  );

  const fetchOrder = useCallback(async (orderId: string): Promise<Order | null> => {
    try {
      const res = await fetch(`${API_BASE}/api/orders/${orderId}`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) return null;
      const order: Order = await res.json();

      // Update the order in local state
      setOrders((prev) => {
        const idx = prev.findIndex((o) => o.id === order.id);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = order;
          return updated;
        }
        return [order, ...prev];
      });

      return order;
    } catch (err) {
      console.error("Failed to fetch order:", err);
      return null;
    }
  }, []);

  const refreshOrders = useCallback(async (): Promise<void> => {
    try {
      const res = await fetch(`${API_BASE}/api/orders`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) return;
      const fetched: Order[] = await res.json();
      setOrders(fetched);
    } catch (err) {
      console.error("Failed to refresh orders:", err);
    }
  }, []);

  const updateOrderInState = useCallback((order: Order) => {
    setOrders((prev) => {
      const idx = prev.findIndex((o) => o.id === order.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = order;
        return updated;
      }
      return [order, ...prev];
    });
  }, []);

  const clearOrderJustPlaced = useCallback(() => {
    setOrderJustPlaced(null);
  }, []);

  return (
    <AppContext.Provider
      value={{
        cart,
        cartRestaurant,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        getCartQuantity,
        cartItemCount,
        cartSubtotal,
        orders,
        placeOrder,
        getOrder,
        fetchOrder,
        refreshOrders,
        updateOrderInState,
        orderJustPlaced,
        clearOrderJustPlaced,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

/* ───────── Hook ───────── */

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
