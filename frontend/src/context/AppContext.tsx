"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { auth as authApi, orders as ordersApi, type User, type Order as ApiOrder, ApiError } from "@/services/api";

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
  rating?: number;
}

interface AppContextType {
  // Auth
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, role: string) => Promise<void>;
  logout: () => void;
  authLoading: boolean;

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
  placeOrder: (discount: number) => Promise<Order | null>;
  getOrder: (orderId: string) => Order | undefined;
  refreshOrders: () => Promise<void>;
  ordersLoading: boolean;
}

const AppContext = createContext<AppContextType | null>(null);

/* ───────── Provider ───────── */

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartRestaurant, setCartRestaurant] = useState<CartRestaurant | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  // Restore user session on mount
  useEffect(() => {
    const stored = authApi.getStoredUser();
    if (stored && authApi.isLoggedIn()) {
      setUser(stored);
      // Verify token is still valid
      authApi.me().then((u) => {
        setUser(u);
        authApi.saveUser(u);
      }).catch(() => {
        authApi.logout();
        setUser(null);
      }).finally(() => setAuthLoading(false));
    } else {
      setAuthLoading(false);
    }
  }, []);

  // Fetch orders when user logs in
  useEffect(() => {
    if (user && user.role === "CUSTOMER") {
      refreshOrders();
    }
  }, [user]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login({ email, password });
    authApi.saveToken(res.token);
    authApi.saveUser(res.user);
    setUser(res.user);
  }, []);

  const register = useCallback(async (name: string, email: string, password: string, role: string) => {
    const res = await authApi.register({ name, email, password, role });
    authApi.saveToken(res.token);
    authApi.saveUser(res.user);
    setUser(res.user);
  }, []);

  const logout = useCallback(() => {
    authApi.logout();
    setUser(null);
    setOrders([]);
    setCart([]);
    setCartRestaurant(null);
  }, []);

  const addToCart = useCallback((item: CartMenuItem, restaurant: CartRestaurant) => {
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

  const refreshOrders = useCallback(async () => {
    if (!authApi.isLoggedIn()) return;
    setOrdersLoading(true);
    try {
      const apiOrders = await ordersApi.myOrders();
      const mapped: Order[] = apiOrders.map((o) => ({
        id: o.orderNumber,
        restaurantId: String(o.restaurantId),
        restaurant: o.restaurantName,
        restaurantAddress: o.restaurantAddress,
        items: o.items.map((i) => ({ name: i.name, quantity: i.quantity, price: i.price })),
        subtotal: o.subtotal,
        deliveryFee: o.deliveryFee,
        discount: o.discount,
        taxes: o.taxes,
        total: o.total,
        status: o.status.toLowerCase() as Order["status"],
        date: new Date(o.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }),
        placedAt: new Date(o.createdAt).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true }),
        rating: o.rating ?? undefined,
      }));
      setOrders(mapped);
    } catch (e) {
      // If API fails, keep existing local orders
      if (e instanceof ApiError && e.status === 401) {
        authApi.logout();
        setUser(null);
      }
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  const placeOrder = useCallback(
    async (discount: number): Promise<Order | null> => {
      if (cart.length === 0 || !cartRestaurant) return null;

      const subtotal = cart.reduce((s, c) => s + c.menuItem.price * c.quantity, 0);
      const deliveryFee = subtotal > 500 ? 0 : 40;
      const taxes = Math.round((subtotal - discount) * 0.05);
      const total = subtotal - discount + deliveryFee + taxes;

      // Try to place via API
      if (authApi.isLoggedIn()) {
        try {
          const apiOrder = await ordersApi.place({
            restaurantId: Number(cartRestaurant.id),
            restaurantName: cartRestaurant.name,
            restaurantAddress: cartRestaurant.address,
            deliveryAddress: "Customer delivery address",
            items: cart.map((c) => ({
              menuItemId: Number(c.menuItem.id),
              name: c.menuItem.name,
              price: c.menuItem.price,
              quantity: c.quantity,
              isVeg: c.menuItem.veg,
            })),
            paymentMethod: "COD",
          });

          const order: Order = {
            id: apiOrder.orderNumber,
            restaurantId: String(apiOrder.restaurantId),
            restaurant: apiOrder.restaurantName,
            restaurantAddress: apiOrder.restaurantAddress,
            items: apiOrder.items.map((i) => ({ name: i.name, quantity: i.quantity, price: i.price })),
            subtotal: apiOrder.subtotal,
            deliveryFee: apiOrder.deliveryFee,
            discount: apiOrder.discount,
            taxes: apiOrder.taxes,
            total: apiOrder.total,
            status: apiOrder.status.toLowerCase() as Order["status"],
            date: new Date(apiOrder.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }),
            placedAt: new Date(apiOrder.createdAt).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true }),
          };

          setOrders((prev) => [order, ...prev]);
          setCart([]);
          setCartRestaurant(null);
          return order;
        } catch {
          // Fall through to local order if API fails
        }
      }

      // Local fallback for when API is not available
      const now = new Date();
      const timeStr = now.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
      const dateStr = `Today, ${timeStr}`;

      const order: Order = {
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
      };

      setOrders((prev) => [order, ...prev]);
      setCart([]);
      setCartRestaurant(null);

      // Simulate status progression (only for local orders)
      const statusFlow: Order["status"][] = ["preparing", "picked_up", "on_the_way", "delivered"];
      statusFlow.forEach((status, idx) => {
        setTimeout(() => {
          setOrders((prev) =>
            prev.map((o) => (o.id === order.id ? { ...o, status } : o))
          );
        }, (idx + 1) * 15000);
      });

      return order;
    },
    [cart, cartRestaurant, orders.length]
  );

  const getOrder = useCallback(
    (orderId: string) => orders.find((o) => o.id === orderId),
    [orders]
  );

  return (
    <AppContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        authLoading,
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
        refreshOrders,
        ordersLoading,
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
