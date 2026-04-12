"use client";

import Link from "next/link";
import { useApp } from "@/context/AppContext";

export default function CartPage() {
  const { cart, cartRestaurant, updateQuantity, removeFromCart, clearCart, cartSubtotal } = useApp();

  const deliveryFee = cartSubtotal > 500 ? 0 : 40;
  const taxes = Math.round(cartSubtotal * 0.05);
  const total = cartSubtotal + deliveryFee + taxes;

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
      <h1 className="text-2xl font-bold text-gray-900 dark:text-zinc-100">Your Cart</h1>

      <div className="mt-6 grid gap-8 lg:grid-cols-3">
        {/* Cart items */}
        <div className="lg:col-span-2">
          {/* Restaurant info */}
          <div className="flex items-center justify-between rounded-t-xl border border-gray-200 bg-white px-5 py-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 text-lg dark:bg-red-900/30">
                🏪
              </div>
              <div>
                <h2 className="font-semibold text-gray-900 dark:text-zinc-100">{cartRestaurant?.name}</h2>
                <p className="text-xs text-gray-500 dark:text-zinc-500">{cartRestaurant?.address}</p>
              </div>
            </div>
            <button
              onClick={clearCart}
              className="text-xs font-medium text-red-500 hover:underline"
            >
              Clear Cart
            </button>
          </div>

          {/* Items */}
          <div className="divide-y divide-gray-100 border-x border-b border-gray-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
            {cart.map((cartItem) => (
              <div key={cartItem.menuItem.id} className="flex items-center gap-4 px-5 py-4">
                {/* Veg/Non-veg indicator */}
                <div className={`flex h-5 w-5 items-center justify-center rounded border ${cartItem.menuItem.veg ? "border-green-600" : "border-red-600"}`}>
                  <div className={`h-2.5 w-2.5 rounded-full ${cartItem.menuItem.veg ? "bg-green-600" : "bg-red-600"}`} />
                </div>
                {/* Item details */}
                <div className="flex-1">
                  <p className="font-medium text-gray-800 dark:text-zinc-200">{cartItem.menuItem.name}</p>
                  <p className="mt-1 text-sm text-gray-600 dark:text-zinc-400">{"\u20B9"}{cartItem.menuItem.price}</p>
                </div>
                {/* Quantity controls */}
                <div className="flex items-center gap-0 rounded-lg border border-green-600">
                  <button
                    onClick={() => removeFromCart(cartItem.menuItem.id)}
                    className="px-3 py-1 text-green-600 transition-colors hover:bg-green-50 dark:hover:bg-green-900/20"
                  >
                    -
                  </button>
                  <span className="min-w-[28px] text-center text-sm font-bold text-green-600">
                    {cartItem.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(cartItem.menuItem.id, cartItem.quantity + 1)}
                    className="px-3 py-1 text-green-600 transition-colors hover:bg-green-50 dark:hover:bg-green-900/20"
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
          <div className="rounded-b-xl border-x border-b border-gray-200 bg-white px-5 py-3 dark:border-zinc-800 dark:bg-zinc-900">
            <Link href={`/restaurants/${cartRestaurant?.id}`} className="text-sm font-medium text-red-500 hover:text-red-600">
              + Add more items
            </Link>
          </div>
        </div>

        {/* Bill summary */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 rounded-xl border border-gray-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="font-semibold text-gray-800 dark:text-zinc-200">Bill Details</h3>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between text-gray-600 dark:text-zinc-400">
                <span>Item Total</span>
                <span>{"\u20B9"}{cartSubtotal}</span>
              </div>
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

            <Link
              href="/checkout"
              className="mt-6 block w-full rounded-lg bg-red-500 py-3 text-center text-sm font-bold text-white transition-colors hover:bg-red-600"
            >
              Proceed to Checkout
            </Link>

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
