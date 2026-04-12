"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";

type PaymentMethod = "cod" | "upi" | "card";

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, cartRestaurant, cartSubtotal, placeOrder } = useApp();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cod");
  const [upiId, setUpiId] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
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

  const handlePlaceOrder = async () => {
    setPlacing(true);
    try {
      const order = await placeOrder(discount, paymentMethod);
      if (order) {
        router.push(`/orders/${order.id}`);
      }
    } finally {
      setPlacing(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-6xl">🛒</p>
        <h2 className="mt-4 text-xl font-bold text-gray-800 dark:text-zinc-200">Your cart is empty</h2>
        <p className="mt-2 text-gray-500 dark:text-zinc-500">Add items from a restaurant to get started</p>
        <Link
          href="/"
          className="mt-6 rounded-lg bg-red-500 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-600"
        >
          Browse Restaurants
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link href="/cart" className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-zinc-500 dark:hover:text-zinc-300">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to cart
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 dark:text-zinc-100">Checkout</h1>

      <div className="mt-6 grid gap-8 lg:grid-cols-3">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Summary */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 text-lg dark:bg-red-900/30">
                🏪
              </div>
              <div>
                <h2 className="font-semibold text-gray-900 dark:text-zinc-100">{cartRestaurant?.name}</h2>
                <p className="text-xs text-gray-500 dark:text-zinc-500">{cartRestaurant?.address}</p>
              </div>
            </div>
            <div className="space-y-2 border-t border-gray-100 pt-3 dark:border-zinc-800">
              {cart.map((cartItem) => (
                <div key={cartItem.menuItem.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className={`flex h-4 w-4 items-center justify-center rounded-sm border ${cartItem.menuItem.veg ? "border-green-600" : "border-red-600"}`}>
                      <div className={`h-2 w-2 rounded-full ${cartItem.menuItem.veg ? "bg-green-600" : "bg-red-600"}`} />
                    </div>
                    <span className="text-gray-700 dark:text-zinc-300">{cartItem.menuItem.name} x{cartItem.quantity}</span>
                  </div>
                  <span className="text-gray-600 dark:text-zinc-400">{"\u20B9"}{cartItem.menuItem.price * cartItem.quantity}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Delivery Address */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-zinc-200">Delivery Address</h3>
            <div className="mt-3 flex items-start gap-3 rounded-lg bg-gray-50 px-4 py-3 dark:bg-zinc-800/50">
              <svg className="mt-0.5 h-5 w-5 text-red-500 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
              </svg>
              <div>
                <p className="font-medium text-gray-900 dark:text-zinc-100">Delivery Address</p>
                <p className="mt-0.5 text-sm text-gray-500 dark:text-zinc-500">Your current location</p>
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-zinc-200">Payment Method</h3>
            <div className="mt-4 space-y-3">
              {/* Cash on Delivery */}
              <label
                className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition-colors ${
                  paymentMethod === "cod"
                    ? "border-red-500 bg-red-50 dark:border-red-500 dark:bg-red-900/20"
                    : "border-gray-200 hover:border-gray-300 dark:border-zinc-700 dark:hover:border-zinc-600"
                }`}
              >
                <input
                  type="radio"
                  name="payment"
                  value="cod"
                  checked={paymentMethod === "cod"}
                  onChange={() => setPaymentMethod("cod")}
                  className="h-4 w-4 accent-red-500"
                />
                <div className="flex items-center gap-2">
                  <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span className="text-sm font-medium text-gray-800 dark:text-zinc-200">Cash on Delivery</span>
                </div>
              </label>

              {/* UPI */}
              <div>
                <label
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition-colors ${
                    paymentMethod === "upi"
                      ? "border-red-500 bg-red-50 dark:border-red-500 dark:bg-red-900/20"
                      : "border-gray-200 hover:border-gray-300 dark:border-zinc-700 dark:hover:border-zinc-600"
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    value="upi"
                    checked={paymentMethod === "upi"}
                    onChange={() => setPaymentMethod("upi")}
                    className="h-4 w-4 accent-red-500"
                  />
                  <div className="flex items-center gap-2">
                    <svg className="h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <span className="text-sm font-medium text-gray-800 dark:text-zinc-200">UPI</span>
                  </div>
                </label>
                {paymentMethod === "upi" && (
                  <div className="mt-3 pl-7">
                    <input
                      type="text"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      placeholder="Enter UPI ID (e.g., name@upi)"
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:border-red-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                    />
                  </div>
                )}
              </div>

              {/* Credit/Debit Card */}
              <div>
                <label
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition-colors ${
                    paymentMethod === "card"
                      ? "border-red-500 bg-red-50 dark:border-red-500 dark:bg-red-900/20"
                      : "border-gray-200 hover:border-gray-300 dark:border-zinc-700 dark:hover:border-zinc-600"
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    value="card"
                    checked={paymentMethod === "card"}
                    onChange={() => setPaymentMethod("card")}
                    className="h-4 w-4 accent-red-500"
                  />
                  <div className="flex items-center gap-2">
                    <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                    <span className="text-sm font-medium text-gray-800 dark:text-zinc-200">Credit / Debit Card</span>
                  </div>
                </label>
                {paymentMethod === "card" && (
                  <div className="mt-3 space-y-3 pl-7">
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      placeholder="Card Number"
                      maxLength={19}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:border-red-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                    />
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        placeholder="MM/YY"
                        maxLength={5}
                        className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:border-red-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                      />
                      <input
                        type="text"
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value)}
                        placeholder="CVV"
                        maxLength={4}
                        className="w-24 rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:border-red-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Coupon */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-zinc-200">Apply Coupon</h3>
            {couponApplied ? (
              <div className="mt-3 flex items-center justify-between rounded-lg bg-green-50 px-4 py-3 dark:bg-green-900/20">
                <div>
                  <p className="text-sm font-semibold text-green-700 dark:text-green-400">{couponCode.toUpperCase()} applied!</p>
                  <p className="text-xs text-green-600 dark:text-green-500">You save {"\u20B9"}{discount}</p>
                </div>
                <button onClick={() => { setCouponApplied(false); setCouponCode(""); setDiscount(0); }} className="text-xs text-red-500 hover:underline">
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
                    className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:border-red-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                  />
                  <button
                    onClick={handleCoupon}
                    disabled={couponLoading}
                    className="rounded-lg bg-red-500 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-600 disabled:opacity-60"
                  >
                    {couponLoading ? "..." : "Apply"}
                  </button>
                </div>
                {couponError && (
                  <p className="mt-2 text-xs text-red-500">{couponError}</p>
                )}
              </>
            )}
          </div>
        </div>

        {/* Right column - Bill summary */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 rounded-xl border border-gray-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="font-semibold text-gray-800 dark:text-zinc-200">Bill Details</h3>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between text-gray-600 dark:text-zinc-400">
                <span>Item Total</span>
                <span>{"\u20B9"}{cartSubtotal}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-green-600 dark:text-green-400">
                  <span>Coupon Discount</span>
                  <span>-{"\u20B9"}{discount}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-600 dark:text-zinc-400">
                <span>Delivery Fee</span>
                <span>
                  {deliveryFee === 0 ? (
                    <span className="text-green-600 dark:text-green-400">FREE</span>
                  ) : (
                    <>{"\u20B9"}{deliveryFee}</>
                  )}
                </span>
              </div>
              <div className="flex justify-between text-gray-600 dark:text-zinc-400">
                <span>GST & Charges</span>
                <span>{"\u20B9"}{taxes}</span>
              </div>
              <div className="border-t border-gray-200 pt-3 dark:border-zinc-700">
                <div className="flex justify-between font-bold text-gray-900 dark:text-zinc-100">
                  <span>TO PAY</span>
                  <span>{"\u20B9"}{total}</span>
                </div>
              </div>
            </div>

            <button
              onClick={handlePlaceOrder}
              disabled={placing}
              className="mt-6 w-full rounded-lg bg-red-500 py-3 text-sm font-bold text-white transition-colors hover:bg-red-600 disabled:opacity-60"
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
                `Place Order - \u20B9${total}`
              )}
            </button>

            {deliveryFee === 0 && (
              <p className="mt-3 text-center text-xs text-green-600 dark:text-green-400">
                Yay! Free delivery on orders above {"\u20B9"}500
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
