"use client";

import { useAgent } from "@/context/AgentContext";

export default function StatsCards() {
  const { stats } = useAgent();

  const cards = [
    {
      label: "Waiting",
      value: stats.totalWaiting,
      color: "text-amber-600",
      bg: "bg-amber-50",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: "Active",
      value: stats.totalActive,
      color: "text-green-600",
      bg: "bg-green-50",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
        </svg>
      ),
    },
    {
      label: "AI Chats",
      value: stats.totalAI,
      color: "text-blue-600",
      bg: "bg-blue-50",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
        </svg>
      ),
    },
    {
      label: "Resolved",
      value: stats.resolvedToday,
      color: "text-gray-600",
      bg: "bg-gray-50",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-2 p-4 border-b border-gray-100">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`${card.bg} rounded-xl p-3 text-center`}
        >
          <div className={`${card.color} flex items-center justify-center mb-1`}>
            {card.icon}
          </div>
          <div className={`text-xl font-bold ${card.color}`}>
            {card.value}
          </div>
          <div className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">
            {card.label}
          </div>
        </div>
      ))}
    </div>
  );
}
