"use client";

import { useState } from "react";
import { useAgent, type ChatSession } from "@/context/AgentContext";

type Filter = "all" | "waiting" | "active" | "closed";

export default function ChatList() {
  const { chats, activeChat, setActiveChat, acceptChat } = useAgent();
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = chats.filter((c) => {
    if (filter === "all") return c.status !== "ai";
    return c.status === filter;
  });

  const waitingCount = chats.filter((c) => c.status === "waiting").length;
  const activeCount = chats.filter((c) => c.status === "active").length;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Filter Tabs */}
      <div className="flex border-b border-gray-100 px-2">
        {(
          [
            { key: "all", label: "All" },
            { key: "waiting", label: "Waiting", count: waitingCount },
            { key: "active", label: "Active", count: activeCount },
            { key: "closed", label: "Resolved" },
          ] as { key: Filter; label: string; count?: number }[]
        ).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`flex-1 py-3 text-xs font-medium border-b-2 transition-all relative ${
              filter === tab.key
                ? "text-red-500 border-red-500"
                : "text-gray-400 border-transparent hover:text-gray-600"
            }`}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className="ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-500 rounded-full">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto chat-scroll">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-400">
            <svg className="w-10 h-10 mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
            </svg>
            <span className="text-sm">No chats here</span>
          </div>
        ) : (
          filtered.map((chat) => (
            <ChatListItem
              key={chat._id}
              chat={chat}
              isActive={activeChat === chat._id}
              onClick={() => {
                if (chat.status === "waiting") {
                  acceptChat(chat._id);
                } else {
                  setActiveChat(chat._id);
                }
              }}
            />
          ))
        )}
      </div>
    </div>
  );
}

function ChatListItem({
  chat,
  isActive,
  onClick,
}: {
  chat: ChatSession;
  isActive: boolean;
  onClick: () => void;
}) {
  const timeAgo = getTimeAgo(chat.updatedAt);

  const statusConfig = {
    waiting: { label: "Waiting", color: "bg-amber-100 text-amber-700", dot: "bg-amber-500" },
    active: { label: "Active", color: "bg-green-100 text-green-700", dot: "bg-green-500" },
    closed: { label: "Resolved", color: "bg-gray-100 text-gray-500", dot: "bg-gray-400" },
    ai: { label: "AI", color: "bg-blue-100 text-blue-700", dot: "bg-blue-500" },
  };

  const status = statusConfig[chat.status];

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 border-b border-gray-50 transition-all hover:bg-gray-50 ${
        isActive ? "bg-red-50 border-l-4 border-l-red-500" : ""
      } ${chat.status === "waiting" ? "bg-amber-50/50" : ""}`}
    >
      <div className="flex items-start justify-between mb-1">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-400 to-orange-400 flex items-center justify-center text-white text-sm font-bold shrink-0">
            {chat.customerName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-900 leading-tight">
              {chat.customerName}
            </h4>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${status.color}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                {status.label}
              </span>
              {chat.status === "waiting" && (
                <span className="text-[10px] text-amber-600 font-medium">
                  — Click to accept
                </span>
              )}
            </div>
          </div>
        </div>
        <span className="text-[10px] text-gray-400 shrink-0">{timeAgo}</span>
      </div>
      <p className="text-xs text-gray-500 truncate mt-1 pl-10">
        {chat.lastMessage || "No messages yet"}
      </p>
    </button>
  );
}

function getTimeAgo(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = Math.floor((now - date) / 1000);

  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
