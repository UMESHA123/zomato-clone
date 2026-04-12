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
  { href: "/", label: "Dashboard", icon: "📊" },
  { href: "/menu", label: "Menu", icon: "📋" },
  { href: "/orders", label: "Orders", icon: "🛍️" },
  { href: "/reviews", label: "Reviews", icon: "⭐" },
];

function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pendingOrders] = useState(5);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // If on the login page, render children directly (no sidebar, no auth check)
  if (pathname === "/login") {
    return <>{children}</>;
  }

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-zinc-950">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-500 border-t-transparent" />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    router.push("/login");
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-zinc-950">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-500 border-t-transparent" />
      </div>
    );
  }

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950">
      {/* Mobile header */}
      <div className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between bg-white px-4 py-3 shadow-sm md:hidden dark:bg-zinc-900">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="text-gray-600 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white"
          aria-label="Toggle sidebar"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {sidebarOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold text-red-500">zomato</span>
          <span className="text-xs text-gray-500 dark:text-zinc-500">Restaurant</span>
        </div>
        <div className="relative">
          <span className="text-lg">🔔</span>
          {pendingOrders > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
              {pendingOrders}
            </span>
          )}
        </div>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 flex h-full w-64 flex-col border-r border-gray-200 bg-white transition-transform duration-300 dark:border-zinc-800 dark:bg-zinc-900 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0`}
      >
        {/* Logo */}
        <div className="border-b border-gray-200 px-6 py-5 dark:border-zinc-800">
          <Link href="/" className="block">
            <span className="text-xl font-bold text-red-500">zomato</span>
            <span className="mt-0.5 block text-xs text-gray-500 dark:text-zinc-500">Restaurant Partner</span>
          </Link>
        </div>

        {/* Restaurant status toggle */}
        <div className="border-b border-gray-200 px-6 py-4 dark:border-zinc-800">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex w-full items-center justify-between rounded-lg bg-gray-50 px-4 py-3 transition-colors hover:bg-gray-100 dark:bg-zinc-800 dark:hover:bg-zinc-750"
          >
            <div className="flex items-center gap-3">
              <span
                className={`inline-block h-3 w-3 rounded-full ${
                  isOpen ? "bg-green-500" : "bg-red-500"
                }`}
              />
              <span className={`text-sm font-medium ${isOpen ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                {isOpen ? "Accepting Orders" : "Restaurant Closed"}
              </span>
            </div>
            <div className={`relative h-6 w-11 rounded-full transition-colors ${isOpen ? "bg-green-500" : "bg-gray-300 dark:bg-zinc-600"}`}>
              <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${isOpen ? "translate-x-5" : "translate-x-0.5"}`} />
            </div>
          </button>
        </div>

        {/* Restaurant info */}
        <div className="border-b border-gray-200 px-6 py-4 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 text-lg dark:bg-red-900/30">
              🍽️
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-zinc-100">{user.name}</p>
              <p className="text-xs text-gray-500 dark:text-zinc-500">{user.email}</p>
            </div>
          </div>
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
                    ? "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                }`}
              >
                <span className="text-lg">{link.icon}</span>
                <span>{link.label}</span>
                {link.href === "/orders" && pendingOrders > 0 && (
                  <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                    {pendingOrders}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="border-t border-gray-200 px-6 py-4 dark:border-zinc-800">
          <button
            onClick={logout}
            className="flex w-full items-center gap-2 rounded-lg px-4 py-2.5 text-sm text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-900 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign Out
          </button>
          <a
            href="http://localhost:3000"
            className="mt-1 flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-900 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Home
          </a>
        </div>
      </aside>

      {/* Main content */}
      <main className="min-h-screen p-6 pt-20 md:ml-64 md:pt-6">
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
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <AuthenticatedLayout>{children}</AuthenticatedLayout>
        </AuthProvider>
      </body>
    </html>
  );
}
