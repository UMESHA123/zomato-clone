import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-zinc-950">
      {/* Hero */}
      <header className="relative overflow-hidden bg-gradient-to-br from-red-600 via-red-500 to-orange-500 text-white">
        {/* Decorative background circles */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-white/5 animate-float" />
          <div className="absolute -bottom-32 -left-32 h-[500px] w-[500px] rounded-full bg-white/5" style={{ animationDelay: "1s" }} />
          <div className="absolute top-1/2 left-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/5 animate-pulse-soft" />
        </div>

        <nav className="relative mx-auto flex max-w-7xl items-center justify-between px-6 py-5 sm:px-8">
          <h1 className="text-3xl font-extrabold tracking-tight animate-fade-in">zomato</h1>
          <Link
            href="/restaurants"
            className="rounded-full border border-white/30 px-5 py-2 text-sm font-semibold backdrop-blur-sm transition-all hover:bg-white hover:text-red-500 animate-fade-in"
          >
            Order Now
          </Link>
        </nav>

        <div className="relative flex flex-col items-center justify-center px-6 pb-28 pt-20 text-center sm:px-8 sm:pb-32 sm:pt-24">
          <h2 className="max-w-3xl text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl animate-hero-text">
            Discover the best food & drinks
          </h2>
          <p className="mt-5 max-w-lg text-lg text-red-100/90 sm:text-xl animate-hero-text" style={{ animationDelay: "0.15s" }}>
            Order from your favorite restaurants and get it delivered to your doorstep
          </p>

          {/* Search CTA */}
          <Link
            href="/restaurants"
            className="mt-8 flex items-center gap-3 rounded-2xl bg-white px-6 py-4 shadow-2xl shadow-red-900/30 transition-all hover:shadow-xl hover:-translate-y-0.5 animate-hero-text sm:px-8"
            style={{ animationDelay: "0.3s" }}
          >
            <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span className="text-sm text-gray-400 sm:text-base">Search for restaurant, cuisine or a dish...</span>
            <span className="hidden rounded-lg bg-red-500 px-3 py-1 text-xs font-bold text-white sm:inline">Search</span>
          </Link>

          {/* Quick stats */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-8 text-red-100/80 animate-fade-in" style={{ animationDelay: "0.5s" }}>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-white">500+</span>
              <span className="text-sm">Restaurants</span>
            </div>
            <div className="h-6 w-px bg-white/20" />
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-white">30 min</span>
              <span className="text-sm">Avg. Delivery</span>
            </div>
            <div className="h-6 w-px bg-white/20" />
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-white">4.5</span>
              <svg className="h-4 w-4 text-yellow-300" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              <span className="text-sm">Avg. Rating</span>
            </div>
          </div>
        </div>

        {/* Wave separator */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" className="block w-full h-[40px] sm:h-[60px]">
            <path d="M0 60L48 53.3C96 46.7 192 33.3 288 28.3C384 23.3 480 26.7 576 31.7C672 36.7 768 43.3 864 45C960 46.7 1056 43.3 1152 38.3C1248 33.3 1344 26.7 1392 23.3L1440 20V60H0Z" className="fill-white dark:fill-zinc-950" />
          </svg>
        </div>
      </header>

      {/* Three portals */}
      <section className="mx-auto w-full max-w-7xl px-6 py-16 sm:px-8 sm:py-20">
        <h3 className="text-center text-2xl font-bold text-zinc-900 dark:text-zinc-100 animate-fade-in-up sm:text-3xl">
          Choose your portal
        </h3>
        <p className="mt-3 text-center text-zinc-500 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
          Select how you&apos;d like to use Zomato
        </p>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 sm:gap-8 lg:grid-cols-3">
          {/* Customer */}
          <Link
            href="/restaurants"
            className="card-hover group relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-900 animate-stagger-1"
          >
            <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-red-50 transition-all group-hover:scale-150 dark:bg-red-900/10" />
            <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 text-2xl text-white shadow-lg shadow-red-500/25 transition-transform group-hover:scale-110 group-hover:rotate-3">
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.87c1.355 0 2.697.055 4.024.165C17.155 8.51 18 9.473 18 10.608v2.513m-3-4.87v-1.5m-6 1.5v-1.5m12 9.75l-1.5.75a3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0L3 16.5m15-3.38a48.474 48.474 0 00-6-.37c-2.032 0-4.034.126-6 .37m12 0c.39.049.777.102 1.163.16 1.07.16 1.837 1.094 1.837 2.175v5.17c0 .62-.504 1.124-1.125 1.124H4.125A1.125 1.125 0 013 20.625v-5.17c0-1.08.768-2.014 1.837-2.174A47.78 47.78 0 016 13.12M16.5 3.75V7.5" />
              </svg>
            </div>
            <h4 className="relative mt-6 text-xl font-bold text-zinc-900 transition-colors group-hover:text-red-500 dark:text-zinc-100">
              Order Food
            </h4>
            <p className="relative mt-2 text-sm leading-relaxed text-zinc-500">
              Browse restaurants, add to cart, track your orders in real-time
            </p>
            <div className="relative mt-6 flex items-center gap-2 text-sm font-semibold text-red-500">
              Browse Restaurants
              <svg className="h-4 w-4 transition-transform group-hover:translate-x-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </div>
          </Link>

          {/* Restaurant */}
          <Link
            href="/dashboard"
            className="card-hover group relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-900 animate-stagger-2"
          >
            <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-orange-50 transition-all group-hover:scale-150 dark:bg-orange-900/10" />
            <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 text-2xl text-white shadow-lg shadow-orange-500/25 transition-transform group-hover:scale-110 group-hover:rotate-3">
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016A3.001 3.001 0 0021 9.349m-18 0V7.875C3 6.839 3.839 6 4.875 6h14.25C20.161 6 21 6.839 21 7.875v1.474" />
              </svg>
            </div>
            <h4 className="relative mt-6 text-xl font-bold text-zinc-900 transition-colors group-hover:text-orange-500 dark:text-zinc-100">
              Restaurant Partner
            </h4>
            <p className="relative mt-2 text-sm leading-relaxed text-zinc-500">
              Manage your menu, handle orders, view reviews and analytics
            </p>
            <div className="relative mt-6 flex items-center gap-2 text-sm font-semibold text-orange-500">
              Open Dashboard
              <svg className="h-4 w-4 transition-transform group-hover:translate-x-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </div>
          </Link>

          {/* Delivery */}
          <Link
            href="/deliveries"
            className="card-hover group relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-900 animate-stagger-3 sm:col-span-2 lg:col-span-1"
          >
            <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-emerald-50 transition-all group-hover:scale-150 dark:bg-emerald-900/10" />
            <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 text-2xl text-white shadow-lg shadow-emerald-500/25 transition-transform group-hover:scale-110 group-hover:rotate-3">
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
              </svg>
            </div>
            <h4 className="relative mt-6 text-xl font-bold text-zinc-900 transition-colors group-hover:text-emerald-500 dark:text-zinc-100">
              Delivery Partner
            </h4>
            <p className="relative mt-2 text-sm leading-relaxed text-zinc-500">
              Accept deliveries, navigate routes, track your earnings
            </p>
            <div className="relative mt-6 flex items-center gap-2 text-sm font-semibold text-emerald-500">
              Start Delivering
              <svg className="h-4 w-4 transition-transform group-hover:translate-x-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </div>
          </Link>
        </div>
      </section>

      {/* Features highlight */}
      <section className="border-t border-zinc-100 bg-zinc-50/50 dark:border-zinc-900 dark:bg-zinc-900/50">
        <div className="mx-auto max-w-7xl px-6 py-16 sm:px-8 sm:py-20">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z", title: "Fast Delivery", desc: "Get food at your doorstep in 30 mins" },
              { icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z", title: "Safe & Hygienic", desc: "Best practices followed for safety" },
              { icon: "M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z", title: "Easy Ordering", desc: "Browse, add to cart, and checkout easily" },
              { icon: "M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z", title: "Live Tracking", desc: "Track your order in real-time on map" },
            ].map((feature, i) => (
              <div key={i} className={`flex gap-4 animate-stagger-${i + 1}`}>
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-red-100 dark:bg-red-900/20">
                  <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={feature.icon} />
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold text-zinc-900 dark:text-zinc-100">{feature.title}</h4>
                  <p className="mt-1 text-sm text-zinc-500">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-zinc-200 py-8 text-center dark:border-zinc-800">
        <p className="text-sm text-zinc-500">
          <span className="font-bold text-gradient">zomato</span>
          {" "}&mdash; Microservice Architecture Demo
        </p>
      </footer>
    </div>
  );
}
