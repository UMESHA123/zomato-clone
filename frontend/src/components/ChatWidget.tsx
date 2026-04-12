"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useChatSocket, type ChatMessage, type ChatStatus } from "@/hooks/useChatSocket";
import { useApp, type Order } from "@/context/AppContext";

/* ─── Quick prompt helpers ─── */

interface QuickPrompt {
  label: string;
  message: string;
  icon: string; // SVG path
  color: string; // tailwind text color
  orderId?: string;
}

function generateQuickPrompts(orders: Order[]): QuickPrompt[] {
  const prompts: QuickPrompt[] = [];

  // Active orders get priority prompts
  const activeOrders = orders.filter((o) =>
    ["confirmed", "preparing", "picked_up", "on_the_way"].includes(o.status)
  );
  const recentDelivered = orders
    .filter((o) => o.status === "delivered")
    .slice(0, 2);

  for (const order of activeOrders.slice(0, 2)) {
    const itemSummary =
      order.items.length === 1
        ? order.items[0].name
        : `${order.items[0].name} +${order.items.length - 1} more`;

    prompts.push({
      label: `Where is my order?`,
      message: `Where is my order #${order.id}? I ordered ${itemSummary} from ${order.restaurant}. Current status shows "${order.status.replace(/_/g, " ")}".`,
      icon: "M15 10.5a3 3 0 11-6 0 3 3 0 016 0z M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z",
      color: "text-blue-500",
      orderId: order.id,
    });
  }

  for (const order of recentDelivered) {
    prompts.push({
      label: `Issue with order #${order.id}`,
      message: `I have an issue with my delivered order #${order.id} from ${order.restaurant} (${"\u20B9"}${order.total}). Items: ${order.items.map((i) => `${i.name} x${i.quantity}`).join(", ")}.`,
      icon: "M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z",
      color: "text-amber-500",
      orderId: order.id,
    });
  }

  // Generic prompts
  prompts.push({
    label: "Food quality issue",
    message: "I received my order but I have a concern about the food quality.",
    icon: "M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.87c1.355 0 2.697.055 4.024.165C17.155 8.51 18 9.473 18 10.608v2.513m-3-4.87v-1.5m-6 1.5v-1.5m12 9.75l-1.5.75a3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0L3 16.5",
    color: "text-red-500",
  });

  prompts.push({
    label: "Missing items in order",
    message: "My order was delivered but some items are missing from the delivery.",
    icon: "M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z",
    color: "text-orange-500",
  });

  prompts.push({
    label: "Payment or refund issue",
    message: "I need help with a payment issue — I was charged but need to discuss a refund.",
    icon: "M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z",
    color: "text-purple-500",
  });

  prompts.push({
    label: "Something else",
    message: "Hi, I need help with something.",
    icon: "M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z",
    color: "text-gray-500",
  });

  return prompts;
}

/* ─── Main Widget ─── */

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [messageInput, setMessageInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { user, orders } = useApp();

  const {
    status,
    messages,
    isTyping,
    agentName,
    startChat,
    sendMessage,
    sendTyping,
    endChat,
    resetChat,
  } = useChatSocket();

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, scrollToBottom]);

  useEffect(() => {
    if (isOpen && status !== "idle") {
      inputRef.current?.focus();
    }
  }, [isOpen, status]);

  // Auto-start chat for logged-in user with a quick prompt
  const handleQuickPrompt = (prompt: QuickPrompt) => {
    const name = user?.name || nameInput.trim() || "Customer";
    const email = user?.email;
    startChat(name, email);
    // Small delay so socket connects before sending message
    setTimeout(() => {
      sendMessage(prompt.message);
    }, 500);
  };

  const handleStartChat = (e: React.FormEvent) => {
    e.preventDefault();
    const name = user?.name || nameInput.trim();
    if (!name) return;
    startChat(name, user?.email);
  };

  const handleStartChatLoggedIn = () => {
    if (!user) return;
    startChat(user.name, user.email);
  };

  const handleSend = () => {
    if (!messageInput.trim() || status === "closed") return;
    sendMessage(messageInput);
    setMessageInput("");
    inputRef.current?.focus();
  };

  const handleNewChat = () => {
    resetChat();
    setNameInput("");
    setMessageInput("");
  };

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-red-500 text-white shadow-lg shadow-red-500/30 transition-all hover:bg-red-600 hover:shadow-xl hover:shadow-red-500/40 hover:scale-105 active:scale-95"
          aria-label="Open support chat"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 01.778-.332 48.294 48.294 0 005.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
          </svg>
        </button>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 flex w-[400px] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl sm:bottom-6 sm:right-6 max-sm:inset-4 max-sm:w-auto dark:border-zinc-800 dark:bg-zinc-900">
          {/* Header */}
          <ChatHeader
            status={status}
            agentName={agentName}
            onClose={() => setIsOpen(false)}
            onEnd={status !== "idle" && status !== "closed" ? endChat : undefined}
          />

          {/* Body */}
          <div className="flex-1 overflow-y-auto" style={{ height: 420 }}>
            {status === "idle" ? (
              user ? (
                <SupportHome
                  user={user}
                  orders={orders}
                  onQuickPrompt={handleQuickPrompt}
                  onStartFreeChat={handleStartChatLoggedIn}
                />
              ) : (
                <StartForm
                  nameInput={nameInput}
                  setNameInput={setNameInput}
                  onSubmit={handleStartChat}
                />
              )
            ) : (
              <MessagesList
                messages={messages}
                isTyping={isTyping}
                messagesEndRef={messagesEndRef}
              />
            )}
          </div>

          {/* Input */}
          {status !== "idle" && (
            <ChatInput
              status={status}
              messageInput={messageInput}
              setMessageInput={setMessageInput}
              inputRef={inputRef}
              onSend={handleSend}
              onTyping={sendTyping}
              onNewChat={handleNewChat}
            />
          )}
        </div>
      )}
    </>
  );
}

/* ─── Support Home (Logged-in users) ─── */

function SupportHome({
  user,
  orders,
  onQuickPrompt,
  onStartFreeChat,
}: {
  user: { name: string; email: string };
  orders: Order[];
  onQuickPrompt: (prompt: QuickPrompt) => void;
  onStartFreeChat: () => void;
}) {
  const quickPrompts = generateQuickPrompts(orders);
  const activeOrders = orders.filter((o) =>
    ["confirmed", "preparing", "picked_up", "on_the_way"].includes(o.status)
  );

  const statusLabels: Record<string, string> = {
    confirmed: "Confirmed",
    preparing: "Being Prepared",
    picked_up: "Picked Up",
    on_the_way: "On the Way",
    delivered: "Delivered",
    cancelled: "Cancelled",
  };

  return (
    <div className="flex flex-col p-4">
      {/* Greeting */}
      <div className="mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-orange-500 text-sm font-bold text-white">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h4 className="text-base font-bold text-gray-900 dark:text-zinc-100">
              Hi, {user.name.split(" ")[0]}!
            </h4>
            <p className="text-xs text-gray-500 dark:text-zinc-500">How can we help you today?</p>
          </div>
        </div>
      </div>

      {/* Active orders section */}
      {activeOrders.length > 0 && (
        <div className="mb-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-zinc-600">
            Active Orders
          </p>
          <div className="space-y-2">
            {activeOrders.slice(0, 2).map((order) => (
              <div
                key={order.id}
                className="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-zinc-700 dark:bg-zinc-800"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm dark:bg-zinc-700">
                      <svg className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-800 dark:text-zinc-200">{order.restaurant}</p>
                      <p className="text-[10px] text-gray-500 dark:text-zinc-500">#{order.id}</p>
                    </div>
                  </div>
                  <span className="flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500" />
                    {statusLabels[order.status] || order.status}
                  </span>
                </div>
                <p className="mt-1.5 text-[11px] text-gray-500 dark:text-zinc-500">
                  {order.items.map((i) => `${i.name} x${i.quantity}`).join(", ")}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick prompts */}
      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-zinc-600">
          What do you need help with?
        </p>
        <div className="space-y-1.5">
          {quickPrompts.map((prompt, i) => (
            <button
              key={i}
              onClick={() => onQuickPrompt(prompt)}
              className="btn-press flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-left transition-all hover:border-red-200 hover:bg-red-50/50 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:border-red-900/50 dark:hover:bg-red-950/20"
            >
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-50 dark:bg-zinc-700 ${prompt.color}`}>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={prompt.icon} />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-800 dark:text-zinc-200">{prompt.label}</p>
                {prompt.orderId && (
                  <p className="truncate text-[10px] text-gray-400 dark:text-zinc-500">Order #{prompt.orderId}</p>
                )}
              </div>
              <svg className="h-4 w-4 shrink-0 text-gray-300 dark:text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ))}
        </div>
      </div>

      {/* Or start a free-form chat */}
      <button
        onClick={onStartFreeChat}
        className="btn-press mt-4 w-full rounded-xl bg-red-500 py-2.5 text-sm font-semibold text-white shadow-lg shadow-red-500/20 transition-all hover:bg-red-600"
      >
        Start a Conversation
      </button>
      <p className="mt-2 text-center text-[10px] text-gray-400 dark:text-zinc-600">
        Chat with Zomi (AI) or get connected to a support agent
      </p>
    </div>
  );
}

/* ─── Header ─── */

function ChatHeader({
  status,
  agentName,
  onClose,
  onEnd,
}: {
  status: ChatStatus;
  agentName: string | null;
  onClose: () => void;
  onEnd?: () => void;
}) {
  return (
    <div className="flex items-center justify-between bg-gradient-to-r from-red-500 to-red-600 px-4 py-3 text-white shrink-0">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 01.778-.332 48.294 48.294 0 005.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-semibold">Zomato Support</h3>
          <StatusLine status={status} agentName={agentName} />
        </div>
      </div>
      <div className="flex items-center gap-1">
        {onEnd && (
          <button
            onClick={onEnd}
            className="rounded-lg p-1.5 text-white/70 transition-colors hover:bg-white/20 hover:text-white"
            title="End chat"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.636 5.636a9 9 0 1012.728 0M12 3v9" />
            </svg>
          </button>
        )}
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-white/70 transition-colors hover:bg-white/20 hover:text-white"
          title="Minimize"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function StatusLine({ status, agentName }: { status: ChatStatus; agentName: string | null }) {
  if (status === "idle") return <p className="text-[11px] text-white/70">We typically reply instantly</p>;
  if (status === "ai") return <p className="text-[11px] text-white/70">Chatting with Zomi (AI)</p>;
  if (status === "waiting")
    return (
      <p className="text-[11px] text-white/70 flex items-center gap-1">
        <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-amber-300" />
        Connecting to agent...
      </p>
    );
  if (status === "active")
    return (
      <p className="text-[11px] text-white/70 flex items-center gap-1">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-400" />
        {agentName || "Agent"}
      </p>
    );
  return <p className="text-[11px] text-white/70">Chat ended</p>;
}

/* ─── Start Form (Not logged in) ─── */

function StartForm({
  nameInput,
  setNameInput,
  onSubmit,
}: {
  nameInput: string;
  setNameInput: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center p-6">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 dark:bg-red-900/20">
          <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
          </svg>
        </div>
        <h4 className="text-lg font-bold text-gray-900 dark:text-zinc-100">Hi there!</h4>
        <p className="mt-1 text-sm text-gray-500 dark:text-zinc-500">
          Chat with Zomi, our AI assistant, or get connected to a support agent.
        </p>
        <p className="mt-2 text-xs text-gray-400 dark:text-zinc-600">
          Log in for a faster experience with order-specific help.
        </p>
      </div>

      <form onSubmit={onSubmit} className="w-full space-y-3">
        <div>
          <label htmlFor="chat-name" className="block text-xs font-medium text-gray-600 dark:text-zinc-400 mb-1">
            Your name
          </label>
          <input
            id="chat-name"
            type="text"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            placeholder="Enter your name"
            className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-400/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
            autoFocus
          />
        </div>
        <button
          type="submit"
          disabled={!nameInput.trim()}
          className="btn-press w-full rounded-xl bg-red-500 py-2.5 text-sm font-semibold text-white transition-all hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-40 shadow-lg shadow-red-500/20"
        >
          Start Chat
        </button>
      </form>
    </div>
  );
}

/* ─── Messages List ─── */

function MessagesList({
  messages,
  isTyping,
  messagesEndRef,
}: {
  messages: ChatMessage[];
  isTyping: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div className="flex flex-col gap-3 p-4">
      {messages.map((msg) => (
        <MessageBubble key={msg._id} message={msg} />
      ))}
      {isTyping && <TypingIndicator />}
      <div ref={messagesEndRef} />
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isCustomer = message.sender === "customer";
  const isSystem = message.sender === "system";
  const isAI = message.sender === "ai";

  if (isSystem) {
    return (
      <div className="flex justify-center animate-fade-in">
        <p className="rounded-full bg-gray-100 px-4 py-1.5 text-[11px] text-gray-500 text-center max-w-[85%] dark:bg-zinc-800 dark:text-zinc-500">
          {message.content}
        </p>
      </div>
    );
  }

  const time = new Date(message.timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (isCustomer) {
    return (
      <div className="flex justify-end animate-fade-in">
        <div className="max-w-[80%]">
          <div className="rounded-2xl rounded-br-md bg-red-500 px-4 py-2.5 text-sm text-white shadow-sm">
            <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
          </div>
          <p className="mt-0.5 text-right text-[10px] text-gray-400 dark:text-zinc-600 pr-1">{time}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start gap-2 animate-fade-in">
      <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100 dark:bg-zinc-800">
        {isAI ? (
          <svg className="h-3.5 w-3.5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
        ) : (
          <svg className="h-3.5 w-3.5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
          </svg>
        )}
      </div>
      <div className="max-w-[80%]">
        <div className="flex items-center gap-1.5 mb-0.5 pl-1">
          <span className="text-[11px] font-medium text-gray-600 dark:text-zinc-400">{message.senderName}</span>
          {isAI && (
            <span className="rounded bg-blue-100 px-1 py-px text-[9px] font-semibold text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">AI</span>
          )}
        </div>
        <div
          className={`rounded-2xl rounded-bl-md px-4 py-2.5 text-sm shadow-sm ${
            isAI
              ? "border border-blue-100 bg-blue-50/60 text-gray-800 dark:border-blue-900/30 dark:bg-blue-950/30 dark:text-zinc-200"
              : "border border-gray-200 bg-white text-gray-800 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
          }`}
        >
          <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
        </div>
        <p className="mt-0.5 text-[10px] text-gray-400 dark:text-zinc-600 pl-1">{time}</p>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-2 pl-9 animate-fade-in">
      <div className="flex gap-1 rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
        <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 dark:bg-zinc-500" style={{ animationDelay: "0ms" }} />
        <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 dark:bg-zinc-500" style={{ animationDelay: "150ms" }} />
        <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 dark:bg-zinc-500" style={{ animationDelay: "300ms" }} />
      </div>
    </div>
  );
}

/* ─── Input Area ─── */

function ChatInput({
  status,
  messageInput,
  setMessageInput,
  inputRef,
  onSend,
  onTyping,
  onNewChat,
}: {
  status: ChatStatus;
  messageInput: string;
  setMessageInput: (v: string) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onSend: () => void;
  onTyping: () => void;
  onNewChat: () => void;
}) {
  if (status === "closed") {
    return (
      <div className="border-t border-gray-200 p-4 text-center shrink-0 dark:border-zinc-800">
        <p className="mb-3 text-xs text-gray-400 dark:text-zinc-600">This conversation has ended</p>
        <button
          onClick={onNewChat}
          className="btn-press rounded-xl bg-red-500 px-6 py-2 text-sm font-semibold text-white transition-all hover:bg-red-600 shadow-lg shadow-red-500/20"
        >
          Start New Chat
        </button>
      </div>
    );
  }

  if (status === "waiting") {
    return (
      <div className="border-t border-gray-200 p-4 shrink-0 dark:border-zinc-800">
        <div className="flex items-center justify-center gap-2 text-sm text-amber-600 dark:text-amber-400">
          <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Waiting for an agent to join...
        </div>
      </div>
    );
  }

  return (
    <div className="border-t border-gray-200 p-3 shrink-0 dark:border-zinc-800">
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          value={messageInput}
          onChange={(e) => {
            setMessageInput(e.target.value);
            onTyping();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
          placeholder="Type a message..."
          className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-400/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
        />
        <button
          onClick={onSend}
          disabled={!messageInput.trim()}
          className="btn-press flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500 text-white transition-all hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-40 shadow-lg shadow-red-500/20"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
          </svg>
        </button>
      </div>
      <p className="mt-1.5 text-center text-[10px] text-gray-300 dark:text-zinc-700">
        Powered by Zomato Support
      </p>
    </div>
  );
}
