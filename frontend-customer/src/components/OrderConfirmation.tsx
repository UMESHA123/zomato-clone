"use client";

interface OrderConfirmationProps {
  orderId: string;
  restaurantName: string;
  estimatedTime: string;
  onDismiss: () => void;
}

export default function OrderConfirmation({
  orderId,
  restaurantName,
  estimatedTime,
  onDismiss,
}: OrderConfirmationProps) {
  return (
    <div className="mb-6 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 p-5 text-white shadow-md">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold">Order Placed Successfully!</h2>
            <p className="mt-1 text-sm text-white/90">
              Order #{orderId} from {restaurantName}
            </p>
            <p className="mt-0.5 text-sm text-white/80">
              Estimated delivery: {estimatedTime}
            </p>
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="shrink-0 rounded-lg p-1 transition-colors hover:bg-white/20"
          aria-label="Dismiss"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
