"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";

const API_BASE_URL = "http://localhost:8080";
const TOKEN_KEY = "zomato_driver_token";
const USER_KEY = "zomato_driver_user";

interface User {
  userId: string;
  name: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  register: (
    name: string,
    email: string,
    password: string
  ) => Promise<{ error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On mount, check localStorage for existing token and validate it
  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    const storedUser = localStorage.getItem(USER_KEY);

    if (storedToken && storedUser) {
      // Validate the token by calling /api/users/me
      fetch(`${API_BASE_URL}/api/users/me`, {
        headers: { Authorization: `Bearer ${storedToken}` },
      })
        .then((res) => {
          if (!res.ok) throw new Error("Token invalid");
          return res.json();
        })
        .then((data: User) => {
          if (data.role !== "DRIVER") {
            // Token is valid but not a driver account — clear everything
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
            setToken(null);
            setUser(null);
          } else {
            setToken(storedToken);
            setUser(data);
            // Update stored user with fresh data
            localStorage.setItem(USER_KEY, JSON.stringify(data));
          }
        })
        .catch(() => {
          // Token is invalid or network error — clear stored data
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(USER_KEY);
          setToken(null);
          setUser(null);
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(
    async (email: string, password: string): Promise<{ error?: string }> => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/users/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => null);
          return {
            error:
              errorData?.message || `Login failed (${res.status})`,
          };
        }

        const data = await res.json();

        // Verify the user is a driver
        if (data.role !== "DRIVER") {
          return { error: "Access denied. Driver account required." };
        }

        const userData: User = {
          userId: data.userId,
          name: data.name,
          email: data.email,
          role: data.role,
        };

        localStorage.setItem(TOKEN_KEY, data.token);
        localStorage.setItem(USER_KEY, JSON.stringify(userData));
        setToken(data.token);
        setUser(userData);

        return {};
      } catch {
        return { error: "Network error. Please try again." };
      }
    },
    []
  );

  const register = useCallback(
    async (
      name: string,
      email: string,
      password: string
    ): Promise<{ error?: string }> => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/users/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password, role: "DRIVER" }),
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => null);
          return {
            error:
              errorData?.message || `Registration failed (${res.status})`,
          };
        }

        const data = await res.json();

        const userData: User = {
          userId: data.userId,
          name: data.name,
          email: data.email,
          role: data.role,
        };

        localStorage.setItem(TOKEN_KEY, data.token);
        localStorage.setItem(USER_KEY, JSON.stringify(userData));
        setToken(data.token);
        setUser(userData);

        return {};
      } catch {
        return { error: "Network error. Please try again." };
      }
    },
    []
  );

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, token, isLoading, login, register, logout }}
    >
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
