"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useApp } from "@/context/AppContext";
import ChatWidget from "@/components/ChatWidget";
import SearchBar from "@/components/SearchBar";

const navLinks = [
  {
    href: "/restaurants",
    label: "Restaurants",
    icon: "M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016A3.001 3.001 0 0021 9.349m-18 0V7.875C3 6.839 3.839 6 4.875 6h14.25C20.161 6 21 6.839 21 7.875v1.474",
  },
  {
    href: "/orders",
    label: "My Orders",
    icon: "M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25",
  },
  {
    href: "/cart",
    label: "Cart",
    icon: "M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z",
  },
];

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { cartItemCount: cartCount, user } = useApp();

  // Track scroll for header shadow
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950">
      {/* Header */}
      <header
        className={`glass fixed top-0 left-0 right-0 z-50 border-b transition-all duration-300 ${
          scrolled
            ? "border-gray-200/80 shadow-lg shadow-black/[0.04] dark:border-zinc-800/80"
            : "border-transparent shadow-none"
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          {/* Logo */}
          <Link href="/" className="group flex items-center gap-2">
            <span className="text-2xl font-extrabold text-gradient transition-transform group-hover:scale-105">
              zomato
            </span>
          </Link>

          {/* Search bar - hidden on mobile */}
          <SearchBar className="hidden max-w-md flex-1 px-8 md:block" />

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => {
              const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`btn-press relative flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
                    isActive
                      ? "bg-red-50 text-red-500 dark:bg-red-950/30"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                  }`}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={link.icon} />
                  </svg>
                  {link.label}
                  {link.href === "/cart" && cartCount > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-bold text-white animate-bounce-in">
                      {cartCount}
                    </span>
                  )}
                  {isActive && (
                    <span className="absolute -bottom-3 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-red-500" />
                  )}
                </Link>
              );
            })}

            {/* User avatar */}
            {user && (
              <div className="ml-2 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-orange-500 text-xs font-bold text-white">
                {user.name?.charAt(0).toUpperCase() || "U"}
              </div>
            )}
          </nav>

          {/* Mobile hamburger */}
          <button
            className="btn-press relative rounded-xl p-2 text-gray-600 hover:bg-gray-100 md:hidden dark:text-zinc-400 dark:hover:bg-zinc-800"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            {cartCount > 0 && !menuOpen && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                {cartCount}
              </span>
            )}
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile search */}
        <div className="border-t border-gray-100/50 px-4 py-2 md:hidden dark:border-zinc-800/50">
          <SearchBar />
        </div>

        {/* Mobile nav dropdown */}
        <div
          className={`overflow-hidden border-t border-gray-100/50 bg-white/95 backdrop-blur-lg transition-all duration-300 ease-in-out md:hidden dark:border-zinc-800/50 dark:bg-zinc-900/95 ${
            menuOpen ? "max-h-80 opacity-100" : "max-h-0 opacity-0 border-t-0"
          }`}
        >
          <div className="px-4 pb-4 pt-2">
            {user && (
              <div className="mb-3 flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-3 dark:bg-zinc-800">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-orange-500 text-sm font-bold text-white">
                  {user.name?.charAt(0).toUpperCase() || "U"}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-zinc-100">{user.name}</p>
                  <p className="text-xs text-gray-500 dark:text-zinc-500">{user.email}</p>
                </div>
              </div>
            )}
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-red-50 text-red-500 dark:bg-red-950/30"
                      : "text-gray-600 hover:bg-gray-50 dark:text-zinc-400 dark:hover:bg-zinc-800"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={link.icon} />
                    </svg>
                    {link.label}
                  </div>
                  {link.href === "/cart" && cartCount > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-bold text-white">
                      {cartCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-7xl px-4 pt-32 pb-8 sm:px-6 md:pt-24">
        {children}
      </main>

      {/* Chat Support Widget */}
      <ChatWidget />
    </div>
  );
}
