/**
 * Centralized API service layer.
 * All frontend API calls MUST go through this module.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

/* ───────── Types ───────── */

export interface User {
  id: number;
  name: string;
  email: string;
  role: "CUSTOMER" | "RESTAURANT" | "DELIVERY" | "ADMIN";
  phone?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Restaurant {
  id: number;
  name: string;
  description?: string;
  address: string;
  phone?: string;
  email?: string;
  cuisineType: string;
  rating: number;
  reviewCount: number;
  imageUrl?: string;
  isActive: boolean;
  openingTime?: string;
  closingTime?: string;
  ownerId: number;
  latitude?: number;
  longitude?: number;
  deliveryTime?: string;
  priceRange?: string;
  createdAt: string;
}

export interface MenuItem {
  id: number;
  name: string;
  description?: string;
  price: number;
  category: string;
  imageUrl?: string;
  isAvailable: boolean;
  isVeg: boolean;
  isBestseller: boolean;
  rating?: number;
  restaurantId: number;
}

export interface Review {
  id: number;
  userId: number;
  userName: string;
  rating: number;
  comment: string;
  reply?: string;
  restaurantId: number;
  createdAt: string;
}

export interface OrderItem {
  id?: number;
  menuItemId: number;
  name: string;
  price: number;
  quantity: number;
  isVeg: boolean;
}

export interface Order {
  id: number;
  orderNumber: string;
  customerId: number;
  restaurantId: number;
  restaurantName: string;
  restaurantAddress: string;
  deliveryAddress: string;
  deliveryLatitude?: number;
  deliveryLongitude?: number;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  discount: number;
  taxes: number;
  total: number;
  status: string;
  paymentStatus: string;
  paymentMethod?: string;
  couponCode?: string;
  driverId?: number;
  driverName?: string;
  estimatedDeliveryTime?: string;
  actualDeliveryTime?: string;
  rating?: number;
  feedback?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Delivery {
  id: string;
  orderId: string;
  orderNumber: string;
  restaurantName: string;
  restaurantAddress: string;
  restaurantLocation?: { lat: number; lng: number };
  customerName: string;
  customerAddress: string;
  customerLocation?: { lat: number; lng: number };
  driverId?: string;
  driverName?: string;
  driverLocation?: { lat: number; lng: number };
  items: { name: string; quantity: number }[];
  total: number;
  earning: number;
  distance: string;
  estimatedTime: string;
  status: string;
  createdAt: string;
  pickedUpAt?: string;
  deliveredAt?: string;
  rating?: number;
}

export interface DeliveryStats {
  todayEarnings: number;
  todayDeliveries: number;
  weekEarnings: number;
  weekDeliveries: number;
  avgRating: number;
  totalDeliveries: number;
}

export interface RestaurantStats {
  todayRevenue: number;
  todayOrders: number;
  avgRating: number;
  reviewCount: number;
  avgPrepTime: number;
  revenueChange: number;
  orderChange: number;
}

export interface ChatIncident {
  id: string;
  customerName: string;
  customerEmail?: string;
  agentId?: string;
  agentName?: string;
  status: "ai" | "waiting" | "active" | "closed";
  subject: string;
  lastMessage?: string;
  resolution?: string;
  tags?: string[];
  orderId?: string;
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
  messageCount?: number;
}

export interface ChatMessage {
  id: string;
  chatId: string;
  sender: "customer" | "ai" | "agent" | "system";
  senderName: string;
  content: string;
  timestamp: string;
}

export interface IncidentStats {
  total: number;
  active: number;
  waiting: number;
  aiHandled: number;
  closed: number;
  aiResolutionRate: number;
  avgResponseTime: number;
  avgResolutionTime: number;
}

/* ───────── HTTP helpers ───────── */

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("zomato_token");
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new ApiError(res.status, body || `HTTP ${res.status}`);
  }

  // Handle 204 No Content
  if (res.status === 204) return undefined as T;

  return res.json();
}

/* ───────── Auth ───────── */

export const auth = {
  register(data: { name: string; email: string; password: string; role: string; phone?: string }) {
    return request<AuthResponse>("/api/users/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  login(data: { email: string; password: string }) {
    return request<AuthResponse>("/api/users/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  me() {
    return request<User>("/api/users/auth/me");
  },

  updateProfile(data: Partial<User>) {
    return request<User>("/api/users/auth/me", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  saveToken(token: string) {
    localStorage.setItem("zomato_token", token);
  },

  saveUser(user: User) {
    localStorage.setItem("zomato_user", JSON.stringify(user));
  },

  getStoredUser(): User | null {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem("zomato_user");
    return raw ? JSON.parse(raw) : null;
  },

  logout() {
    localStorage.removeItem("zomato_token");
    localStorage.removeItem("zomato_user");
  },

  isLoggedIn(): boolean {
    return !!getToken();
  },
};

/* ───────── Restaurants ───────── */

export const restaurants = {
  list(params?: { cuisine?: string; sort?: string; search?: string; page?: number; size?: number }) {
    const query = new URLSearchParams();
    if (params?.cuisine) query.set("cuisine", params.cuisine);
    if (params?.sort) query.set("sort", params.sort);
    if (params?.search) query.set("search", params.search);
    if (params?.page != null) query.set("page", String(params.page));
    if (params?.size != null) query.set("size", String(params.size));
    const qs = query.toString();
    return request<Restaurant[]>(`/api/restaurants${qs ? `?${qs}` : ""}`);
  },

  get(id: number | string) {
    return request<Restaurant>(`/api/restaurants/${id}`);
  },

  getMenu(id: number | string) {
    return request<MenuItem[]>(`/api/restaurants/${id}/menu`);
  },

  getReviews(id: number | string) {
    return request<Review[]>(`/api/restaurants/${id}/reviews`);
  },

  addReview(id: number | string, data: { rating: number; comment: string }) {
    return request<Review>(`/api/restaurants/${id}/reviews`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // Restaurant owner endpoints
  getOwnerRestaurant() {
    return request<Restaurant>("/api/restaurants/owner/me");
  },

  getOwnerStats() {
    return request<RestaurantStats>("/api/restaurants/owner/me/stats");
  },

  create(data: Partial<Restaurant>) {
    return request<Restaurant>("/api/restaurants", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  update(id: number | string, data: Partial<Restaurant>) {
    return request<Restaurant>(`/api/restaurants/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  addMenuItem(restaurantId: number | string, data: Partial<MenuItem>) {
    return request<MenuItem>(`/api/restaurants/${restaurantId}/menu`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  updateMenuItem(restaurantId: number | string, itemId: number | string, data: Partial<MenuItem>) {
    return request<MenuItem>(`/api/restaurants/${restaurantId}/menu/${itemId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  deleteMenuItem(restaurantId: number | string, itemId: number | string) {
    return request<void>(`/api/restaurants/${restaurantId}/menu/${itemId}`, {
      method: "DELETE",
    });
  },
};

/* ───────── Orders ───────── */

export const orders = {
  place(data: {
    restaurantId: number;
    restaurantName: string;
    restaurantAddress: string;
    deliveryAddress: string;
    deliveryLatitude?: number;
    deliveryLongitude?: number;
    items: { menuItemId: number; name: string; price: number; quantity: number; isVeg: boolean }[];
    couponCode?: string;
    paymentMethod?: string;
  }) {
    return request<Order>("/api/orders", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  myOrders(params?: { status?: string; page?: number; size?: number }) {
    const query = new URLSearchParams();
    if (params?.status) query.set("status", params.status);
    if (params?.page != null) query.set("page", String(params.page));
    if (params?.size != null) query.set("size", String(params.size));
    const qs = query.toString();
    return request<Order[]>(`/api/orders/my${qs ? `?${qs}` : ""}`);
  },

  get(id: number | string) {
    return request<Order>(`/api/orders/${id}`);
  },

  updateStatus(id: number | string, status: string) {
    return request<Order>(`/api/orders/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    });
  },

  cancel(id: number | string) {
    return request<Order>(`/api/orders/${id}/cancel`, { method: "PUT" });
  },

  rate(id: number | string, data: { rating: number; feedback?: string }) {
    return request<Order>(`/api/orders/${id}/rate`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  // Restaurant endpoints
  restaurantActive() {
    return request<Order[]>("/api/orders/restaurant/active");
  },

  restaurantHistory(params?: { page?: number; size?: number }) {
    const query = new URLSearchParams();
    if (params?.page != null) query.set("page", String(params.page));
    if (params?.size != null) query.set("size", String(params.size));
    const qs = query.toString();
    return request<Order[]>(`/api/orders/restaurant/history${qs ? `?${qs}` : ""}`);
  },
};

/* ───────── Delivery ───────── */

export const delivery = {
  available() {
    return request<Delivery[]>("/api/delivery/available");
  },

  accept(id: string) {
    return request<Delivery>(`/api/delivery/${id}/accept`, { method: "POST" });
  },

  active() {
    return request<Delivery>("/api/delivery/active");
  },

  updateStatus(id: string, status: string) {
    return request<Delivery>(`/api/delivery/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    });
  },

  updateLocation(id: string, location: { lat: number; lng: number }) {
    return request<void>(`/api/delivery/${id}/location`, {
      method: "PUT",
      body: JSON.stringify(location),
    });
  },

  history(params?: { period?: string; page?: number; size?: number }) {
    const query = new URLSearchParams();
    if (params?.period) query.set("period", params.period);
    if (params?.page != null) query.set("page", String(params.page));
    if (params?.size != null) query.set("size", String(params.size));
    const qs = query.toString();
    return request<Delivery[]>(`/api/delivery/history${qs ? `?${qs}` : ""}`);
  },

  stats() {
    return request<DeliveryStats>("/api/delivery/stats");
  },
};

/* ───────── Chat / Incidents ───────── */

export const chat = {
  listChats(params?: { status?: string }) {
    const query = new URLSearchParams();
    if (params?.status) query.set("status", params.status);
    const qs = query.toString();
    return request<ChatIncident[]>(`/api/chat/chats${qs ? `?${qs}` : ""}`);
  },

  getChat(id: string) {
    return request<ChatIncident>(`/api/chat/chats/${id}`);
  },

  getChatMessages(id: string) {
    return request<ChatMessage[]>(`/api/chat/chats/${id}/messages`);
  },

  chatStats() {
    return request<IncidentStats>("/api/chat/chats/stats");
  },

  closeChat(id: string, resolution?: string) {
    return request<ChatIncident>(`/api/chat/chats/${id}/close`, {
      method: "PUT",
      body: JSON.stringify({ resolution }),
    });
  },

  // Admin incident endpoints
  listIncidents(params?: { status?: string; resolution?: string; agentId?: string; from?: string; to?: string; search?: string; page?: number; size?: number }) {
    const query = new URLSearchParams();
    if (params?.status) query.set("status", params.status);
    if (params?.resolution) query.set("resolution", params.resolution);
    if (params?.agentId) query.set("agentId", params.agentId);
    if (params?.from) query.set("from", params.from);
    if (params?.to) query.set("to", params.to);
    if (params?.search) query.set("search", params.search);
    if (params?.page != null) query.set("page", String(params.page));
    if (params?.size != null) query.set("size", String(params.size));
    const qs = query.toString();
    return request<ChatIncident[]>(`/api/chat/incidents${qs ? `?${qs}` : ""}`);
  },

  getIncident(id: string) {
    return request<ChatIncident & { messages: ChatMessage[] }>(`/api/chat/incidents/${id}`);
  },

  incidentStats() {
    return request<IncidentStats>("/api/chat/incidents/stats");
  },
};

/* ───────── Payments ───────── */

export const payments = {
  initiate(data: { orderId: number; amount: number; method: string }) {
    return request<{ id: number; status: string; transactionId?: string }>("/api/payments", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  get(id: number | string) {
    return request<{ id: number; orderId: number; amount: number; method: string; status: string }>(`/api/payments/${id}`);
  },
};

export { ApiError };
