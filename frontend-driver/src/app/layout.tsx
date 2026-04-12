"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider, useAuth } from "@/context/AuthContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const navLinks = [
  { href: "/", label: "Available", icon: "\u{1F4E6}" },
  { href: "/active", label: "Active Delivery", icon: "\u{1F697}" },
  { href: "/history", label: "History", icon: "\u{1F4DC}" },
];

function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading, logout } = useAuth();
  const [isOnline, setIsOnline] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [todayEarnings] = useState(482);
  const [todayDeliveries] = useState(8);

  // Redirect to /login if not authenticated (skip for /login page itself)
  useEffect(() => {
    if (!isLoading && !user && pathname !== "/login") {
      router.replace("/login");
    }
  }, [isLoading, user, pathname, router]);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  const isActive = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(href);
  };

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  // For /login page, render without the sidebar layout
  if (pathname === "/login") {
    return <>{children}</>;
  }

  // Not authenticated and not on login page — will redirect, show nothing
  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Mobile header */}
      <div className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between bg-gray-900 px-4 py-3 md:hidden">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="text-gray-300 hover:text-white focus:outline-none"
          aria-label="Toggle sidebar"
        >
          <svg
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            {sidebarOpen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold text-red-500">Zomato</span>
          <span className="text-xs text-gray-500">Delivery</span>
        </div>
        <button
          onClick={() => setIsOnline(!isOnline)}
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            isOnline
              ? "bg-emerald-600 text-white"
              : "bg-gray-600 text-gray-300"
          }`}
        >
          {isOnline ? "Online" : "Offline"}
        </button>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 flex h-full w-64 flex-col bg-gray-900 transition-transform duration-300 ease-in-out dark:bg-gray-950 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0`}
      >
        {/* Logo */}
        <div className="border-b border-gray-800 px-6 py-5">
          <Link href="/" className="block">
            <span className="text-xl font-bold text-red-500">Zomato</span>
            <span className="mt-0.5 block text-xs text-gray-500">
              Delivery Partner
            </span>
          </Link>
        </div>

        {/* Driver info */}
        <div className="border-b border-gray-800 px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 text-sm font-semibold text-white">
              {user.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">
                {user.name}
              </p>
              <p className="truncate text-xs text-gray-500">{user.email}</p>
            </div>
          </div>
        </div>

        {/* Online/Offline Toggle */}
        <div className="border-b border-gray-800 px-6 py-4">
          <button
            onClick={() => setIsOnline(!isOnline)}
            className="flex w-full items-center justify-between rounded-lg bg-gray-800 px-4 py-3 transition-colors hover:bg-gray-750"
          >
            <div className="flex items-center gap-3">
              <span
                className={`inline-block h-3 w-3 rounded-full ${
                  isOnline ? "bg-emerald-400" : "bg-gray-500"
                }`}
              />
              <span
                className={`text-sm font-medium ${
                  isOnline ? "text-emerald-400" : "text-gray-400"
                }`}
              >
                {isOnline ? "Online" : "Offline"}
              </span>
            </div>
            <div
              className={`relative h-6 w-11 rounded-full transition-colors ${
                isOnline ? "bg-emerald-600" : "bg-gray-600"
              }`}
            >
              <div
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  isOnline ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </div>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navLinks.map((link) => {
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                  active
                    ? "border-l-4 border-red-500 bg-gray-800 text-white"
                    : "border-l-4 border-transparent text-gray-400 hover:bg-gray-800 hover:text-white"
                }`}
              >
                <span className="text-lg">{link.icon}</span>
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom section */}
        <div className="border-t border-gray-800 px-6 py-4">
          {/* Today's earnings */}
          <div className="mb-4 rounded-lg bg-gray-800 p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
              Today&apos;s Earnings
            </p>
            <p className="mt-1 text-2xl font-bold text-emerald-400">
              {"\u20B9"}
              {todayEarnings}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              {todayDeliveries} deliveries completed
            </p>
          </div>

          {/* Logout button */}
          <button
            onClick={handleLogout}
            className="mb-2 flex w-full items-center gap-2 rounded-lg px-4 py-2.5 text-sm text-gray-400 transition-colors hover:bg-gray-800 hover:text-red-400"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            Logout
          </button>

          {/* Back to Home */}
          <a
            href="http://localhost:3000"
            className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Back to Home
          </a>
        </div>
      </aside>

      {/* Main content */}
      <main className="min-h-screen bg-gray-50 p-6 pt-20 md:ml-64 md:pt-6 dark:bg-gray-950">
        {children}
      </main>
    </div>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <AuthenticatedLayout>{children}</AuthenticatedLayout>
        </AuthProvider>
      </body>
    </html>
  );
}
