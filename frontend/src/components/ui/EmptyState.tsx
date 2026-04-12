"use client";

import Link from "next/link";

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}

export function EmptyState({ icon = "📋", title, description, actionLabel, actionHref, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-100 dark:bg-zinc-800">
        <p className="text-4xl">{icon}</p>
      </div>
      <p className="mt-4 text-lg font-semibold text-gray-700 dark:text-zinc-300">{title}</p>
      {description && (
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-gray-400 dark:text-zinc-600">{description}</p>
      )}
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="btn-press mt-5 inline-block rounded-xl bg-red-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-red-500/20 transition-all hover:bg-red-600 hover:shadow-xl"
        >
          {actionLabel}
        </Link>
      )}
      {actionLabel && onAction && !actionHref && (
        <button
          onClick={onAction}
          className="btn-press mt-5 rounded-xl bg-red-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-red-500/20 transition-all hover:bg-red-600 hover:shadow-xl"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
