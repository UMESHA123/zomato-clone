"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

const TOKEN_KEY = "zomato_agent_token";
const USER_KEY = "zomato_agent_user";

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
  login: (email: string, password: string) => Promise<string | null>;
  register: (
    name: string,
    email: string,
    password: string
  ) => Promise<string | null>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On mount, check localStorage for existing token and validate it
  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    const storedUser = localStorage.getItem(USER_KEY);

    if (storedToken && storedUser) {
      // Validate the token via GET /api/users/me
      fetch(`${API_BASE_URL}/api/users/me`, {
        headers: { Authorization: `Bearer ${storedToken}` },
      })
        .then((res) => {
          if (!res.ok) throw new Error("Token invalid");
          return res.json();
        })
        .then((data: AuthUser) => {
          if (data.role !== "AGENT") {
            // Token is valid but user is not an agent — clear it
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
            setUser(null);
            setToken(null);
          } else {
            setUser(data);
            setToken(storedToken);
          }
        })
        .catch(() => {
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(USER_KEY);
          setUser(null);
          setToken(null);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(
    async (email: string, password: string): Promise<string | null> => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/users/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => null);
          return errData?.message || "Login failed. Please check your credentials.";
        }

        const data = await res.json();

        if (data.role !== "AGENT") {
          return "Access denied. Agent account required.";
        }

        localStorage.setItem(TOKEN_KEY, data.token);
        localStorage.setItem(
          USER_KEY,
          JSON.stringify({
            userId: data.userId,
            name: data.name,
            email: data.email,
            role: data.role,
          })
        );

        setToken(data.token);
        setUser({
          userId: data.userId,
          name: data.name,
          email: data.email,
          role: data.role,
        });

        return null; // no error
      } catch {
        return "Network error. Please try again.";
      }
    },
    []
  );

  const register = useCallback(
    async (
      name: string,
      email: string,
      password: string
    ): Promise<string | null> => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/users/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password, role: "AGENT" }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => null);
          return errData?.message || "Registration failed. Please try again.";
        }

        const data = await res.json();

        localStorage.setItem(TOKEN_KEY, data.token);
        localStorage.setItem(
          USER_KEY,
          JSON.stringify({
            userId: data.userId,
            name: data.name,
            email: data.email,
            role: data.role,
          })
        );

        setToken(data.token);
        setUser({
          userId: data.userId,
          name: data.name,
          email: data.email,
          role: data.role,
        });

        return null; // no error
      } catch {
        return "Network error. Please try again.";
      }
    },
    []
  );

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
    setToken(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, token, isLoading, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
