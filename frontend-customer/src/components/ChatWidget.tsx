"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { io, Socket } from "socket.io-client";

const CHAT_SERVICE_URL =
  process.env.NEXT_PUBLIC_CHAT_SERVICE_URL || "http://localhost:8087";
const CHAT_STORAGE_KEY = "zomato_customer_chat_session";

interface Message {
  _id: string;
  sender: "customer" | "ai" | "agent" | "system";
  senderName: string;
  content: string;
  timestamp: string;
}

type ChatStatus = "idle" | "ai" | "waiting" | "active" | "closed";

interface StoredChatSession {
  chatId?: string;
  customerName?: string;
  status?: ChatStatus;
  messages?: Message[];
}

function saveSession(data: StoredChatSession) {
  if (!data.chatId) {
    localStorage.removeItem(CHAT_STORAGE_KEY);
    return;
  }
  localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(data));
}

function loadSession(): StoredChatSession | null {
  const stored = localStorage.getItem(CHAT_STORAGE_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored) as StoredChatSession;
  } catch {
    localStorage.removeItem(CHAT_STORAGE_KEY);
    return null;
  }
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [status, setStatus] = useState<ChatStatus>("idle");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [chatId, setChatId] = useState<string | null>(null);
  const [agentName, setAgentName] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [showNameForm, setShowNameForm] = useState(true);

  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isOpenRef = useRef(isOpen);
  // Refs to allow socket handlers to read current state without recreating the callback
  const chatIdRef = useRef(chatId);
  const statusRef = useRef(status);
  const messagesRef = useRef(messages);
  const nameRef = useRef(nameInput);

  // Keep refs in sync
  useEffect(() => { isOpenRef.current = isOpen; }, [isOpen]);
  useEffect(() => { chatIdRef.current = chatId; }, [chatId]);
  useEffect(() => { statusRef.current = status; }, [status]);
  useEffect(() => { messagesRef.current = messages; }, [messages]);
  useEffect(() => { nameRef.current = nameInput; }, [nameInput]);

  const scrollToBottom = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const isNearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    if (isNearBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, scrollToBottom]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen, showNameForm]);

  // Stable function: persist session using refs (no state dependencies)
  const persistNow = useCallback(
    (overrides: Partial<StoredChatSession> = {}) => {
      const data: StoredChatSession = {
        chatId: overrides.chatId ?? chatIdRef.current ?? undefined,
        customerName: overrides.customerName ?? nameRef.current,
        status: overrides.status ?? statusRef.current,
        messages: overrides.messages ?? messagesRef.current,
      };
      saveSession(data);
    },
    [] // stable — uses refs
  );

  // Stable function: create socket and wire up event handlers
  const connectSocket = useCallback(
    (customerName: string, existingChatId?: string) => {
      // Disconnect existing socket before creating new one
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }

      const s = io(CHAT_SERVICE_URL, { transports: ["websocket", "polling"] });

      s.on("connect", () => {
        if (existingChatId) {
          s.emit("chat:rejoin", { chatId: existingChatId });
        } else {
          s.emit("chat:create", { customerName });
        }
      });

      s.on("chat:created", (data: { chatId: string; status: string }) => {
        setChatId(data.chatId);
        setStatus(data.status as ChatStatus);
        // Use setTimeout(0) so refs are updated by React before we persist
        setTimeout(() => {
          persistNow({ chatId: data.chatId, customerName, status: data.status as ChatStatus });
        }, 0);
      });

      s.on("chat:rejoined", (data: { chatId: string; status: string; agentName?: string }) => {
        setChatId(data.chatId);
        setStatus(data.status as ChatStatus);
        if (data.agentName) setAgentName(data.agentName);
        setTimeout(() => {
          persistNow({ chatId: data.chatId, customerName, status: data.status as ChatStatus });
        }, 0);
      });

      s.on("chat:message", (data: { chatId: string; message: Message }) => {
        setMessages((prev) => {
          if (prev.some((msg) => msg._id === data.message._id)) {
            return prev;
          }
          const nextMessages = [...prev, data.message];
          // Persist after state update via ref
          setTimeout(() => {
            persistNow({ chatId: data.chatId, customerName, messages: nextMessages });
          }, 0);
          return nextMessages;
        });
        setIsTyping(false);
        if (!isOpenRef.current) setHasNewMessage(true);
      });

      s.on(
        "chat:status",
        (data: { chatId: string; status: string; agentName?: string }) => {
          setStatus(data.status as ChatStatus);
          if (data.agentName) setAgentName(data.agentName);
          setTimeout(() => {
            persistNow({ chatId: data.chatId, customerName, status: data.status as ChatStatus });
          }, 0);
        }
      );

      s.on("chat:typing", () => {
        setIsTyping(true);
        setTimeout(() => setIsTyping(false), 3000);
      });

      s.on("disconnect", () => {});

      socketRef.current = s;
    },
    [persistNow] // persistNow is stable (uses refs)
  );

  const handleStartChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) return;
    setShowNameForm(false);
    connectSocket(nameInput.trim());
  };

  const handleSend = () => {
    const text = input.trim();
    if (!text || !chatId || status === "closed") return;
    socketRef.current?.emit("chat:message", { chatId, content: text });
    setInput("");
    inputRef.current?.focus();
  };

  const handleEndChat = () => {
    if (chatId) socketRef.current?.emit("chat:end", { chatId });
    setStatus("closed");
    persistNow({ status: "closed" });
  };

  const handleNewChat = () => {
    socketRef.current?.disconnect();
    socketRef.current = null;
    setMessages([]);
    setChatId(null);
    setStatus("idle");
    setAgentName("");
    setShowNameForm(true);
    setInput("");
    localStorage.removeItem(CHAT_STORAGE_KEY);
  };

  const toggleOpen = () => {
    setIsOpen((prev) => !prev);
    if (!isOpen) setHasNewMessage(false);
  };

  // Restore session from localStorage on mount (runs only once)
  useEffect(() => {
    const parsed = loadSession();
    if (!parsed?.chatId || !parsed.customerName) return;

    setNameInput(parsed.customerName);
    setShowNameForm(false);
    setChatId(parsed.chatId);
    setStatus(parsed.status || "idle");

    if (Array.isArray(parsed.messages) && parsed.messages.length > 0) {
      setMessages(parsed.messages);
    }

    // For closed chats: show the conversation read-only, fetch latest messages, no socket
    if (parsed.status === "closed") {
      fetch(`${CHAT_SERVICE_URL}/api/chat/chats/${parsed.chatId}/messages`)
        .then((res) => {
          if (!res.ok) throw new Error("Failed to restore messages");
          return res.json();
        })
        .then((data: Message[]) => {
          if (Array.isArray(data) && data.length > 0) {
            setMessages(data);
            saveSession({ ...parsed, messages: data });
          }
        })
        .catch(() => {});
      return; // Don't connect socket for closed chats
    }

    // For active/waiting/ai chats: fetch latest messages and reconnect socket
    fetch(`${CHAT_SERVICE_URL}/api/chat/chats/${parsed.chatId}/messages`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to restore messages");
        return res.json();
      })
      .then((data: Message[]) => {
        const nextMessages = Array.isArray(data) ? data : [];
        if (nextMessages.length > 0) {
          setMessages(nextMessages);
        }
      })
      .catch(() => {});

    connectSocket(parsed.customerName, parsed.chatId);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally empty — mount only

  // Cleanup socket on unmount
  useEffect(() => {
    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  const statusLabel =
    status === "ai"
      ? "Chatting with AI"
      : status === "waiting"
      ? "Connecting to agent..."
      : status === "active"
      ? `Connected to ${agentName}`
      : status === "closed"
      ? "Chat ended"
      : "";

  const statusColor =
    status === "ai"
      ? "bg-blue-500"
      : status === "waiting"
      ? "bg-amber-500"
      : status === "active"
      ? "bg-green-500"
      : "bg-gray-400";

  return (
    <>
      {/* Chat Window */}
      {isOpen && (
        <div
          className="fixed bottom-24 right-6 w-[calc(100vw-3rem)] sm:w-[380px] max-h-[calc(100vh-7rem)] h-[560px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden z-50"
          style={{
            animation: "slideUp 0.3s ease-out",
          }}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-red-500 to-red-600 p-4 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                  <svg
                    className="w-5 h-5 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 01.778-.332 48.294 48.294 0 005.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-white font-bold text-sm">
                    Zomato Support
                  </h3>
                  {status !== "idle" && (
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span
                        className={`w-2 h-2 rounded-full ${statusColor} ${
                          status === "waiting" ? "animate-pulse" : ""
                        }`}
                      />
                      <span className="text-white/80 text-xs">
                        {statusLabel}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                {status !== "idle" && status !== "closed" && (
                  <button
                    onClick={handleEndChat}
                    className="text-white/60 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-all"
                    title="End chat"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5.636 5.636a9 9 0 1012.728 0M12 3v9"
                      />
                    </svg>
                  </button>
                )}
                <button
                  onClick={toggleOpen}
                  className="text-white/60 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-all"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Body */}
          {showNameForm ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
                <svg
                  className="w-8 h-8 text-red-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">
                Hi there!
              </h3>
              <p className="text-sm text-gray-500 text-center mb-6">
                Our AI assistant Zomi is ready to help. Enter your name to
                start.
              </p>
              <form onSubmit={handleStartChat} className="w-full">
                <input
                  ref={inputRef}
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="Your name"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent mb-3"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={!nameInput.trim()}
                  className="w-full py-3 bg-red-500 text-white text-sm font-semibold rounded-xl hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  Start Chat
                </button>
              </form>
            </div>
          ) : (
            <>
              {/* Messages */}
              <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 chat-scroll">
                {messages.map((msg) => (
                  <MessageBubble key={msg._id} message={msg} />
                ))}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                      <div className="flex gap-1.5">
                        <span
                          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: "0ms" }}
                        />
                        <span
                          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: "150ms" }}
                        />
                        <span
                          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: "300ms" }}
                        />
                      </div>
                    </div>
                  </div>
                )}
                {status === "waiting" && (
                  <div className="flex justify-center">
                    <div className="flex items-center gap-2 bg-amber-50 text-amber-700 text-xs px-4 py-2 rounded-full border border-amber-200">
                      <svg
                        className="w-3.5 h-3.5 animate-spin"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                      Finding an available agent...
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              {status !== "closed" ? (
                <div className="border-t border-gray-200 p-3 bg-white shrink-0">
                  <div className="flex items-center gap-2">
                    <input
                      ref={inputRef}
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSend()}
                      placeholder={
                        status === "waiting"
                          ? "Waiting for agent..."
                          : "Type a message..."
                      }
                      disabled={status === "waiting" || status === "idle"}
                      className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all disabled:bg-gray-50 disabled:text-gray-400"
                    />
                    <button
                      onClick={handleSend}
                      disabled={
                        !input.trim() ||
                        status === "waiting" ||
                        status === "idle"
                      }
                      className="p-2.5 bg-red-500 text-white rounded-xl hover:bg-red-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                        />
                      </svg>
                    </button>
                  </div>
                  {status === "ai" && (
                    <p className="text-[10px] text-gray-400 mt-2 text-center">
                      Type{" "}
                      <span className="font-medium text-gray-500">
                        &quot;connect to an agent&quot;
                      </span>{" "}
                      to speak with a human
                    </p>
                  )}
                </div>
              ) : (
                <div className="border-t border-gray-200 p-4 bg-white text-center shrink-0">
                  <div className="flex items-center justify-center gap-2 text-green-600 mb-3">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm font-medium">Chat resolved</p>
                  </div>
                  <button
                    onClick={handleNewChat}
                    className="text-sm font-medium text-red-500 hover:text-red-600 px-4 py-2 rounded-lg hover:bg-red-50 transition-all"
                  >
                    Start New Chat
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={toggleOpen}
        className="fixed bottom-6 right-6 w-14 h-14 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center z-50 group"
        style={{
          boxShadow: "0 4px 24px rgba(226, 55, 68, 0.4)",
        }}
      >
        {isOpen ? (
          <svg
            className="w-6 h-6 transition-transform"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        ) : (
          <>
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 01.778-.332 48.294 48.294 0 005.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"
              />
            </svg>
            {hasNewMessage && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-amber-400 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm animate-bounce">
                !
              </span>
            )}
          </>
        )}
      </button>

      <style jsx global>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isCustomer = message.sender === "customer";
  const isSystem = message.sender === "system";
  const isAI = message.sender === "ai";

  if (isSystem) {
    return (
      <div className="flex justify-center">
        <span className="text-xs text-gray-400 bg-white px-3 py-1.5 rounded-full border border-gray-100">
          {message.content}
        </span>
      </div>
    );
  }

  const time = new Date(message.timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (isCustomer) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%]">
          <div className="bg-red-500 text-white px-4 py-2.5 rounded-2xl rounded-br-md shadow-sm">
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
          </div>
          <span className="text-[10px] text-gray-400 mt-0.5 block text-right">
            {time}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[80%]">
        <div className="flex items-center gap-1.5 mb-1">
          {isAI ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
              Zomi AI
            </span>
          ) : (
            <span className="text-[10px] font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-100">
              {message.senderName}
            </span>
          )}
        </div>
        <div
          className={`px-4 py-2.5 rounded-2xl rounded-bl-md shadow-sm ${
            isAI
              ? "bg-white border border-blue-100"
              : "bg-white border border-green-100"
          }`}
        >
          <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
            {message.content}
          </p>
        </div>
        <span className="text-[10px] text-gray-400 mt-0.5 block">{time}</span>
      </div>
    </div>
  );
}
