"use client";

import { useEffect, useState } from "react";

interface ToastProps {
  message: string;
  type?: "success" | "error" | "info";
  onClose: () => void;
  duration?: number;
}

const colors = {
  success: "bg-emerald-600",
  error: "bg-red-600",
  info: "bg-blue-600",
};

const icons = {
  success: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  error: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  info: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

export function Toast({ message, type = "success", onClose, duration = 3000 }: ToastProps) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const exitTimer = setTimeout(() => setExiting(true), duration - 300);
    const closeTimer = setTimeout(onClose, duration);
    return () => {
      clearTimeout(exitTimer);
      clearTimeout(closeTimer);
    };
  }, [onClose, duration]);

  return (
    <div
      className={`fixed right-4 top-4 z-[100] flex items-center gap-3 rounded-xl ${colors[type]} px-5 py-3.5 text-white shadow-2xl transition-all duration-300 ${
        exiting ? "translate-x-[120%] opacity-0" : "animate-fade-in-down"
      }`}
    >
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20">
        {icons[type]}
      </div>
      <span className="text-sm font-medium">{message}</span>
      <button
        onClick={() => { setExiting(true); setTimeout(onClose, 300); }}
        className="ml-2 rounded-lg p-1 transition-colors hover:bg-white/20"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
