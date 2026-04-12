"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";

const API_BASE = "http://localhost:8080";

/* ───────── Types ───────── */

export interface AuthUser {
  userId: string;
  name: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType | null>(null);

/* ───────── Provider ───────── */

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On mount, check localStorage for existing token and validate it
  useEffect(() => {
    const storedToken = localStorage.getItem("zomato_token");
    const storedUser = localStorage.getItem("zomato_user");

    if (storedToken) {
      setToken(storedToken);

      // Validate the token against the API
      fetch(`${API_BASE}/api/users/me`, {
        headers: { Authorization: `Bearer ${storedToken}` },
      })
        .then((res) => {
          if (!res.ok) throw new Error("Token invalid");
          return res.json();
        })
        .then((data: AuthUser) => {
          setUser(data);
          localStorage.setItem("zomato_user", JSON.stringify(data));
        })
        .catch(() => {
          // Token is invalid or API is unreachable — try cached user
          if (storedUser) {
            try {
              setUser(JSON.parse(storedUser));
            } catch {
              // Corrupted data, clear everything
              localStorage.removeItem("zomato_token");
              localStorage.removeItem("zomato_user");
              setToken(null);
              setUser(null);
            }
          } else {
            localStorage.removeItem("zomato_token");
            localStorage.removeItem("zomato_user");
            setToken(null);
            setUser(null);
          }
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch(`${API_BASE}/api/users/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => null);
      throw new Error(
        errorData?.message || errorData?.error || `Login failed (${res.status})`
      );
    }

    const data = await res.json();
    const { token: newToken, userId, name, email: userEmail, role } = data;
    const authUser: AuthUser = { userId, name, email: userEmail, role };

    localStorage.setItem("zomato_token", newToken);
    localStorage.setItem("zomato_user", JSON.stringify(authUser));
    setToken(newToken);
    setUser(authUser);
  }, []);

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      const res = await fetch(`${API_BASE}/api/users/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role: "CUSTOMER" }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(
          errorData?.message ||
            errorData?.error ||
            `Registration failed (${res.status})`
        );
      }

      const data = await res.json();
      const { token: newToken, userId, name: userName, email: userEmail, role } = data;
      const authUser: AuthUser = { userId, name: userName, email: userEmail, role };

      localStorage.setItem("zomato_token", newToken);
      localStorage.setItem("zomato_user", JSON.stringify(authUser));
      setToken(newToken);
      setUser(authUser);
    },
    []
  );

  const logout = useCallback(() => {
    localStorage.removeItem("zomato_token");
    localStorage.removeItem("zomato_user");
    setToken(null);
    setUser(null);
  }, []);

  const authFetch = useCallback(
    async (url: string, options: RequestInit = {}): Promise<Response> => {
      const currentToken = localStorage.getItem("zomato_token");
      const headers = new Headers(options.headers);
      if (currentToken) {
        headers.set("Authorization", `Bearer ${currentToken}`);
      }
      return fetch(url, { ...options, headers });
    },
    []
  );

  return (
    <AuthContext.Provider
      value={{ user, token, isLoading, login, register, logout, authFetch }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/* ───────── Hook ───────── */

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
