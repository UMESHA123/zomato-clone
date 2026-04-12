"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";

export default function CartPage() {
  const router = useRouter();
  const { cart, cartRestaurant, updateQuantity, removeFromCart, clearCart, cartSubtotal, placeOrder } = useApp();
  const [couponCode, setCouponCode] = useState("");
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponError, setCouponError] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [discount, setDiscount] = useState(0);

  const deliveryFee = cartSubtotal > 500 ? 0 : 40;
  const taxes = Math.round((cartSubtotal - discount) * 0.05);
  const total = cartSubtotal - discount + deliveryFee + taxes;

  const handleCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponError("");
    setCouponLoading(true);
    try {
      const res = await fetch(`http://localhost:8080/api/payments/coupons/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponCode.trim(), subtotal: cartSubtotal }),
      });
      if (res.ok) {
        const data = await res.json();
        setCouponApplied(true);
        setDiscount(data.discount || Math.min(cartSubtotal * 0.2, 100));
      } else {
        setCouponError("Invalid coupon code");
      }
    } catch {
      setCouponError("Could not validate coupon. Please try again.");
    } finally {
      setCouponLoading(false);
    }
  };

  const handleCheckout = async () => {
    setPlacing(true);
    try {
      const order = await placeOrder(discount);
      if (order) {
        router.push(`/orders/${order.id}`);
      }
    } finally {
      setPlacing(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center animate-fade-in">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gray-100 dark:bg-zinc-800">
          <svg className="h-12 w-12 text-gray-300 dark:text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
          </svg>
        </div>
        <h2 className="mt-6 text-xl font-bold text-gray-800 dark:text-zinc-200">Your cart is empty</h2>
        <p className="mt-2 text-sm text-gray-500 dark:text-zinc-500">Add items from a restaurant to get started</p>
        <Link
          href="/restaurants"
          className="btn-press mt-6 rounded-xl bg-red-500 px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-red-500/25 transition-all hover:bg-red-600 hover:shadow-xl"
        >
          Browse Restaurants
        </Link>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-zinc-100 sm:text-3xl">Your Cart</h1>

      <div className="mt-6 grid gap-8 lg:grid-cols-3">
        {/* Cart items */}
        <div className="lg:col-span-2">
          {/* Restaurant info */}
          <div className="flex items-center justify-between rounded-t-2xl border border-gray-200 bg-white px-5 py-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-orange-500 shadow-sm">
                <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35" />
                </svg>
              </div>
              <div>
                <h2 className="font-semibold text-gray-900 dark:text-zinc-100">{cartRestaurant?.name}</h2>
                <p className="text-xs text-gray-500 dark:text-zinc-500">{cartRestaurant?.address}</p>
              </div>
            </div>
            <button
              onClick={clearCart}
              className="btn-press rounded-lg px-3 py-1.5 text-xs font-medium text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-950/30"
            >
              Clear Cart
            </button>
          </div>

          {/* Items */}
          <div className="divide-y divide-gray-100 border-x border-b border-gray-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
            {cart.map((cartItem) => (
              <div key={cartItem.menuItem.id} className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-gray-50/50 dark:hover:bg-zinc-800/30">
                {/* Veg/Non-veg indicator */}
                <div className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border ${cartItem.menuItem.veg ? "border-green-600" : "border-red-600"}`}>
                  <div className={`h-2.5 w-2.5 rounded-full ${cartItem.menuItem.veg ? "bg-green-600" : "bg-red-600"}`} />
                </div>
                {/* Item details */}
                <div className="flex-1 min-w-0">
                  <p className="truncate font-medium text-gray-800 dark:text-zinc-200">{cartItem.menuItem.name}</p>
                  <p className="mt-0.5 text-sm text-gray-500 dark:text-zinc-400">{"\u20B9"}{cartItem.menuItem.price}</p>
                </div>
                {/* Quantity controls */}
                <div className="flex items-center overflow-hidden rounded-xl border border-green-600">
                  <button
                    onClick={() => removeFromCart(cartItem.menuItem.id)}
                    className="btn-press px-3 py-1.5 text-sm font-bold text-green-600 transition-colors hover:bg-green-50 dark:hover:bg-green-900/20"
                  >
                    -
                  </button>
                  <span className="min-w-[28px] text-center text-sm font-bold text-green-600">
                    {cartItem.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(cartItem.menuItem.id, cartItem.quantity + 1)}
                    className="btn-press px-3 py-1.5 text-sm font-bold text-green-600 transition-colors hover:bg-green-50 dark:hover:bg-green-900/20"
                  >
                    +
                  </button>
                </div>
                {/* Line total */}
                <p className="w-16 text-right text-sm font-semibold text-gray-800 dark:text-zinc-200">
                  {"\u20B9"}{cartItem.menuItem.price * cartItem.quantity}
                </p>
              </div>
            ))}
          </div>

          {/* Add more items link */}
          <div className="rounded-b-2xl border-x border-b border-gray-200 bg-white px-5 py-3 dark:border-zinc-800 dark:bg-zinc-900">
            <Link href={`/restaurants/${cartRestaurant?.id}`} className="flex items-center gap-1.5 text-sm font-medium text-red-500 transition-colors hover:text-red-600">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add more items
            </Link>
          </div>

          {/* Coupon */}
          <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-zinc-200">
              <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              Apply Coupon
            </h3>
            {couponApplied ? (
              <div className="mt-3 flex items-center justify-between rounded-xl bg-green-50 px-4 py-3 dark:bg-green-900/20 animate-scale-in">
                <div>
                  <p className="text-sm font-semibold text-green-700 dark:text-green-400">{couponCode.toUpperCase()} applied!</p>
                  <p className="text-xs text-green-600 dark:text-green-500">You save {"\u20B9"}{discount}</p>
                </div>
                <button onClick={() => { setCouponApplied(false); setCouponCode(""); setDiscount(0); }} className="btn-press rounded-lg px-3 py-1 text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30">
                  Remove
                </button>
              </div>
            ) : (
              <>
                <div className="mt-3 flex gap-2">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    placeholder="Enter coupon code"
                    className="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-700 placeholder:text-gray-400 focus:border-red-400 focus:outline-none focus:ring-1 focus:ring-red-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                  />
                  <button
                    onClick={handleCoupon}
                    disabled={couponLoading}
                    className="btn-press rounded-xl bg-red-500 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-600 disabled:opacity-60"
                  >
                    {couponLoading ? "..." : "Apply"}
                  </button>
                </div>
                {couponError && (
                  <p className="mt-2 text-xs text-red-500 animate-fade-in-down">{couponError}</p>
                )}
              </>
            )}
          </div>
        </div>

        {/* Bill summary */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 rounded-2xl border border-gray-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="flex items-center gap-2 font-semibold text-gray-800 dark:text-zinc-200">
              <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
              </svg>
              Bill Details
            </h3>
            <div className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between text-gray-600 dark:text-zinc-400">
                <span>Item Total</span>
                <span>{"\u20B9"}{cartSubtotal}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-green-600 dark:text-green-400 animate-fade-in">
                  <span>Coupon Discount</span>
                  <span>-{"\u20B9"}{discount}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-600 dark:text-zinc-400">
                <span>Delivery Fee</span>
                <span>
                  {deliveryFee === 0 ? (
                    <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      FREE
                    </span>
                  ) : (
                    <>{"\u20B9"}{deliveryFee}</>
                  )}
                </span>
              </div>
              <div className="flex justify-between text-gray-600 dark:text-zinc-400">
                <span>GST & Charges</span>
                <span>{"\u20B9"}{taxes}</span>
              </div>
              <div className="border-t border-dashed border-gray-200 pt-3 dark:border-zinc-700">
                <div className="flex justify-between text-base font-bold text-gray-900 dark:text-zinc-100">
                  <span>TO PAY</span>
                  <span>{"\u20B9"}{total}</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleCheckout}
              disabled={placing}
              className="btn-press mt-6 w-full rounded-xl bg-gradient-to-r from-red-500 to-red-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-red-500/25 transition-all hover:shadow-xl disabled:opacity-60"
            >
              {placing ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Placing Order...
                </span>
              ) : (
                `Place Order \u2022 \u20B9${total}`
              )}
            </button>

            {deliveryFee === 0 && (
              <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-green-600 dark:text-green-400 animate-fade-in">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
                Free delivery on orders above {"\u20B9"}500
              </div>
            )}

            {deliveryFee > 0 && (
              <p className="mt-3 text-center text-xs text-gray-400 dark:text-zinc-600">
                Add {"\u20B9"}{500 - cartSubtotal + discount} more for free delivery
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
