"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
const TOKEN_KEY = "zomato_restaurant_token";
const USER_KEY = "zomato_restaurant_user";

export const CUISINE_TYPES = [
  "INDIAN",
  "CHINESE",
  "ITALIAN",
  "MEXICAN",
  "THAI",
  "JAPANESE",
  "AMERICAN",
  "MEDITERRANEAN",
  "KOREAN",
  "FRENCH",
  "OTHER",
] as const;

export type CuisineType = (typeof CUISINE_TYPES)[number];

interface User {
  userId: string;
  name: string;
  email: string;
  role: string;
}

export interface RestaurantRegistrationData {
  name: string;
  email: string;
  password: string;
  address: string;
  phone?: string;
  cuisineType: CuisineType;
  description?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RestaurantRegistrationData) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const hasStoredSession =
    typeof window !== "undefined" &&
    Boolean(localStorage.getItem(TOKEN_KEY) && localStorage.getItem(USER_KEY));
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(hasStoredSession);

  const ensureRestaurantProfile = useCallback(
    async (
      authUser: User,
      details?: {
        address?: string;
        phone?: string;
        cuisineType?: CuisineType;
        description?: string;
      }
    ) => {
      const ownerId = authUser.userId;
      const existingRes = await fetch(`${API_BASE}/api/restaurants/owner/${ownerId}`);

      if (!existingRes.ok) {
        throw new Error("Failed to verify restaurant profile.");
      }

      const existingRestaurants = await existingRes.json();
      if (Array.isArray(existingRestaurants) && existingRestaurants.length > 0) {
        return existingRestaurants[0];
      }

      const createRes = await fetch(`${API_BASE}/api/restaurants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: authUser.name,
          email: authUser.email,
          phone: details?.phone || "",
          address: details?.address || "Please update your restaurant address",
          description:
            details?.description || `${authUser.name} is now live on Zomato.`,
          cuisineType: details?.cuisineType || "INDIAN",
          ownerId: Number(ownerId),
          openingTime: "10:00",
          closingTime: "22:00",
        }),
      });

      if (!createRes.ok) {
        const errorData = await createRes.json().catch(() => null);
        throw new Error(
          errorData?.error || "Failed to create restaurant profile."
        );
      }

      return createRes.json();
    },
    []
  );

  // On mount, check localStorage for existing token and validate it
  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    const storedUser = localStorage.getItem(USER_KEY);

    if (storedToken && storedUser) {
      fetch(`${API_BASE}/api/users/me`, {
        headers: { Authorization: `Bearer ${storedToken}` },
      })
        .then((res) => {
          if (!res.ok) throw new Error("Token invalid");
          return res.json();
        })
        .then((data: User) => {
          if (data.role !== "RESTAURANT_OWNER") {
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
            setToken(null);
            setUser(null);
          } else {
            ensureRestaurantProfile(data)
              .catch((error) => {
                console.error("Failed to ensure restaurant profile:", error);
              })
              .finally(() => {
                setToken(storedToken);
                setUser(data);
                localStorage.setItem(USER_KEY, JSON.stringify(data));
              });
          }
        })
        .catch(() => {
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(USER_KEY);
          setToken(null);
          setUser(null);
        })
        .finally(() => setIsLoading(false));
    }
  }, [ensureRestaurantProfile]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch(`${API_BASE}/api/users/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => null);
      throw new Error(errorData?.message || "Login failed. Please check your credentials.");
    }

    const data = await res.json();

    if (data.role !== "RESTAURANT_OWNER") {
      throw new Error("Access denied. Restaurant owner account required.");
    }

    localStorage.setItem(TOKEN_KEY, data.token);
    const nextUser = {
      userId: data.userId,
      name: data.name,
      email: data.email,
      role: data.role,
    };

    await ensureRestaurantProfile(nextUser);

    localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    setToken(data.token);
    setUser(nextUser);
  }, [ensureRestaurantProfile]);

  const register = useCallback(
    async (formData: RestaurantRegistrationData) => {
      const res = await fetch(`${API_BASE}/api/users/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          phone: formData.phone || "",
          role: "RESTAURANT_OWNER",
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(
          errorData?.message || "Registration failed. Please try again."
        );
      }

      const data = await res.json();

      const nextUser = {
        userId: data.userId,
        name: data.name,
        email: data.email,
        role: data.role,
      };

      await ensureRestaurantProfile(nextUser, {
        address: formData.address,
        phone: formData.phone,
        cuisineType: formData.cuisineType,
        description: formData.description,
      });

      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
      setToken(data.token);
      setUser(nextUser);
    },
    [ensureRestaurantProfile]
  );

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
