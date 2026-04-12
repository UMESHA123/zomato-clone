"use client";

import { useState, useRef, useEffect } from "react";
import { useAgent, type ChatMessage } from "@/context/AgentContext";

export default function ChatWindow() {
  const {
    activeChat,
    chats,
    messages,
    sendMessage,
    closeChat,
    sendTyping,
    typingIndicator,
    setActiveChat,
  } = useAgent();
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const chat = chats.find((c) => c._id === activeChat);
  const chatMessages = activeChat ? messages[activeChat] || [] : [];
  const isTyping = activeChat ? typingIndicator[activeChat] : false;

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const isNearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    if (isNearBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, isTyping]);

  useEffect(() => {
    if (activeChat) inputRef.current?.focus();
  }, [activeChat]);

  if (!activeChat || !chat) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-10 h-10 text-gray-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 01.778-.332 48.294 48.294 0 005.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-400">
            Select a conversation
          </h3>
          <p className="text-sm text-gray-300 mt-1">
            Pick a chat from the left panel to start responding
          </p>
        </div>
      </div>
    );
  }

  const handleSend = () => {
    const text = input.trim();
    if (!text || chat.status === "closed") return;
    sendMessage(activeChat, text);
    setInput("");
    inputRef.current?.focus();
  };

  const handleTyping = () => {
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    sendTyping(activeChat);
    typingTimeoutRef.current = setTimeout(() => {}, 2000);
  };

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Chat Header */}
      <div className="h-16 border-b border-gray-200 flex items-center justify-between px-6 shrink-0 bg-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-400 to-orange-400 flex items-center justify-center text-white font-bold">
            {chat.customerName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{chat.customerName}</h3>
            <div className="flex items-center gap-2">
              {chat.customerEmail && (
                <span className="text-xs text-gray-400">{chat.customerEmail}</span>
              )}
              <span
                className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${
                  chat.status === "active"
                    ? "bg-green-100 text-green-700"
                    : chat.status === "closed"
                    ? "bg-gray-100 text-gray-500"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                {chat.status === "active"
                  ? "Active"
                  : chat.status === "closed"
                  ? "Resolved"
                  : "Waiting"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {chat.status === "active" && (
            <button
              onClick={() => closeChat(activeChat)}
              className="flex items-center gap-1.5 text-sm text-green-600 hover:text-green-700 bg-green-50 hover:bg-green-100 px-4 py-2 rounded-lg transition-all font-medium"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Resolve
            </button>
          )}
          <button
            onClick={() => setActiveChat(null)}
            className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100 transition-all"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-6 space-y-4 chat-scroll bg-gray-50">
        {chatMessages.map((msg) => (
          <MessageBubble key={msg._id} message={msg} />
        ))}
        {isTyping && (
          <div className="flex items-center gap-2 px-4">
            <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm">
              <div className="flex gap-1.5">
                <span className="typing-dot w-2 h-2 bg-gray-400 rounded-full" />
                <span className="typing-dot w-2 h-2 bg-gray-400 rounded-full" />
                <span className="typing-dot w-2 h-2 bg-gray-400 rounded-full" />
              </div>
            </div>
            <span className="text-xs text-gray-400">Customer typing...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      {chat.status === "active" ? (
        <div className="border-t border-gray-200 p-4 bg-white shrink-0">
          <div className="flex items-center gap-3">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                handleTyping();
              }}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Type your message..."
              className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="p-3 bg-red-500 text-white rounded-xl hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-red-500/20"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            </button>
          </div>
        </div>
      ) : chat.status === "closed" ? (
        <div className="border-t border-gray-200 p-4 bg-gray-50 text-center shrink-0">
          <p className="text-sm text-gray-400">This chat has been resolved</p>
        </div>
      ) : null}
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isAgent = message.sender === "agent";
  const isSystem = message.sender === "system";
  const isAI = message.sender === "ai";

  if (isSystem) {
    return (
      <div className="flex justify-center">
        <div className="bg-gray-100 text-gray-500 text-xs px-4 py-2 rounded-full max-w-md text-center">
          {message.content}
        </div>
      </div>
    );
  }

  const time = new Date(message.timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (isAgent) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[70%]">
          <div className="bg-red-500 text-white px-4 py-3 rounded-2xl rounded-br-md shadow-sm">
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
          </div>
          <div className="flex justify-end items-center gap-1 mt-1 px-1">
            <span className="text-[10px] text-gray-400">{time}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[70%]">
        <div className="flex items-center gap-1.5 mb-1 px-1">
          <span className="text-xs font-medium text-gray-600">
            {message.senderName}
          </span>
          {isAI && (
            <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-medium">
              AI
            </span>
          )}
        </div>
        <div
          className={`px-4 py-3 rounded-2xl rounded-bl-md shadow-sm ${
            isAI
              ? "bg-blue-50 border border-blue-100"
              : "bg-white border border-gray-200"
          }`}
        >
          <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
            {message.content}
          </p>
        </div>
        <span className="text-[10px] text-gray-400 px-1 mt-1 block">
          {time}
        </span>
      </div>
    </div>
  );
}
