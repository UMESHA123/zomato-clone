"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import { io, Socket } from "socket.io-client";

const CHAT_SERVICE_URL =
  process.env.NEXT_PUBLIC_CHAT_SERVICE_URL || "http://localhost:8087";

export interface ChatMessage {
  _id: string;
  sender: "customer" | "ai" | "agent" | "system";
  senderName: string;
  content: string;
  timestamp: string;
}

export interface ChatSession {
  _id: string;
  customerName: string;
  customerEmail: string;
  status: "ai" | "waiting" | "active" | "closed";
  agentId: string | null;
  agentName: string | null;
  subject: string;
  lastMessage: string;
  unreadAgentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ChatStats {
  totalActive: number;
  totalWaiting: number;
  totalAI: number;
  resolvedToday: number;
  totalToday: number;
}

interface AgentContextType {
  socket: Socket | null;
  isConnected: boolean;
  agentName: string;
  setAgentName: (name: string) => void;
  isLoggedIn: boolean;
  loginAgent: (name: string) => void;
  logoutAgent: () => void;
  chats: ChatSession[];
  activeChat: string | null;
  setActiveChat: (chatId: string | null) => void;
  messages: Record<string, ChatMessage[]>;
  stats: ChatStats;
  acceptChat: (chatId: string) => void;
  sendMessage: (chatId: string, content: string) => void;
  closeChat: (chatId: string) => void;
  sendTyping: (chatId: string) => void;
  typingIndicator: Record<string, boolean>;
  refreshChats: () => void;
  refreshStats: () => void;
}

const AgentContext = createContext<AgentContextType | null>(null);

export function AgentProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [agentName, setAgentName] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({});
  const [stats, setStats] = useState<ChatStats>({
    totalActive: 0,
    totalWaiting: 0,
    totalAI: 0,
    resolvedToday: 0,
    totalToday: 0,
  });
  const [typingIndicator, setTypingIndicator] = useState<
    Record<string, boolean>
  >({});
  const socketRef = useRef<Socket | null>(null);

  const refreshStats = useCallback(async () => {
    try {
      const res = await fetch(`${CHAT_SERVICE_URL}/api/chat/chats/stats`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    }
  }, []);

  const refreshChats = useCallback(async () => {
    try {
      const [waitingRes, activeRes, closedRes] = await Promise.all([
        fetch(`${CHAT_SERVICE_URL}/api/chat/chats?status=waiting`),
        fetch(`${CHAT_SERVICE_URL}/api/chat/chats?status=active`),
        fetch(
          `${CHAT_SERVICE_URL}/api/chat/chats?status=closed&limit=20`
        ),
      ]);
      const [waiting, active, closed] = await Promise.all([
        waitingRes.json(),
        activeRes.json(),
        closedRes.json(),
      ]);
      const all = [
        ...(waiting.chats || []),
        ...(active.chats || []),
        ...(closed.chats || []),
      ];
      setChats(all);
    } catch (err) {
      console.error("Failed to fetch chats:", err);
    }
  }, []);

  const loginAgent = useCallback(
    (name: string) => {
      setAgentName(name);
      setIsLoggedIn(true);

      const s = io(CHAT_SERVICE_URL, {
        transports: ["websocket", "polling"],
      });

      s.on("connect", () => {
        setIsConnected(true);
        s.emit("agent:join", {
          agentId: `agent_${Date.now()}`,
          agentName: name,
        });
      });

      s.on("disconnect", () => setIsConnected(false));

      s.on("agent:waiting-chats", (waitingChats: ChatSession[]) => {
        setChats((prev) => {
          const existingIds = new Set(prev.map((c) => c._id));
          const newChats = waitingChats.filter(
            (c) => !existingIds.has(c._id)
          );
          return [...newChats, ...prev];
        });
      });

      s.on("agent:new-chat", (chat: ChatSession) => {
        setChats((prev) => {
          const exists = prev.find((c) => c._id === chat._id);
          if (exists) {
            return prev.map((c) =>
              c._id === chat._id ? { ...c, ...chat } : c
            );
          }
          return [chat, ...prev];
        });
        refreshStats();
      });

      s.on(
        "agent:chat-accepted",
        (data: { chatId: string; agentName: string }) => {
          setChats((prev) =>
            prev.map((c) =>
              c._id === data.chatId
                ? { ...c, status: "active" as const, agentName: data.agentName }
                : c
            )
          );
          refreshStats();
        }
      );

      s.on(
        "agent:chat-updated",
        (data: {
          chatId: string;
          status?: string;
          lastMessage?: string;
        }) => {
          setChats((prev) =>
            prev.map((c) =>
              c._id === data.chatId
                ? {
                    ...c,
                    ...(data.status && { status: data.status as ChatSession["status"] }),
                    ...(data.lastMessage && { lastMessage: data.lastMessage }),
                  }
                : c
            )
          );
          refreshStats();
        }
      );

      s.on(
        "chat:message",
        (data: { chatId: string; message: ChatMessage }) => {
          setMessages((prev) => ({
            ...prev,
            [data.chatId]: [...(prev[data.chatId] || []), data.message],
          }));
          setChats((prev) =>
            prev.map((c) =>
              c._id === data.chatId
                ? { ...c, lastMessage: data.message.content }
                : c
            )
          );
          setTypingIndicator((prev) => ({ ...prev, [data.chatId]: false }));
        }
      );

      s.on(
        "chat:status",
        (data: { chatId: string; status: string; agentName?: string }) => {
          setChats((prev) =>
            prev.map((c) =>
              c._id === data.chatId
                ? {
                    ...c,
                    status: data.status as ChatSession["status"],
                    ...(data.agentName && { agentName: data.agentName }),
                  }
                : c
            )
          );
          refreshStats();
        }
      );

      s.on(
        "chat:typing",
        (data: { chatId: string; sender: string }) => {
          if (data.sender === "customer") {
            setTypingIndicator((prev) => ({ ...prev, [data.chatId]: true }));
            setTimeout(() => {
              setTypingIndicator((prev) => ({
                ...prev,
                [data.chatId]: false,
              }));
            }, 3000);
          }
        }
      );

      socketRef.current = s;
      setSocket(s);

      refreshChats();
      refreshStats();
    },
    [refreshChats, refreshStats]
  );

  const logoutAgent = useCallback(() => {
    socketRef.current?.disconnect();
    setSocket(null);
    setIsConnected(false);
    setIsLoggedIn(false);
    setAgentName("");
    setChats([]);
    setMessages({});
    setActiveChat(null);
  }, []);

  const acceptChat = useCallback(
    (chatId: string) => {
      socketRef.current?.emit("agent:accept", { chatId });

      // Load existing messages
      fetch(`${CHAT_SERVICE_URL}/api/chat/chats/${chatId}/messages`)
        .then((res) => res.json())
        .then((msgs) => {
          setMessages((prev) => ({ ...prev, [chatId]: msgs }));
        })
        .catch(console.error);

      setActiveChat(chatId);
    },
    []
  );

  const sendMessage = useCallback(
    (chatId: string, content: string) => {
      socketRef.current?.emit("agent:message", { chatId, content });
    },
    []
  );

  const closeChat = useCallback(
    (chatId: string) => {
      socketRef.current?.emit("agent:close", { chatId });
      if (activeChat === chatId) setActiveChat(null);
    },
    [activeChat]
  );

  const sendTyping = useCallback((chatId: string) => {
    socketRef.current?.emit("agent:typing", { chatId });
  }, []);

  // Load messages when active chat changes
  useEffect(() => {
    if (activeChat && !messages[activeChat]) {
      fetch(`${CHAT_SERVICE_URL}/api/chat/chats/${activeChat}/messages`)
        .then((res) => res.json())
        .then((msgs) => {
          setMessages((prev) => ({ ...prev, [activeChat]: msgs }));
        })
        .catch(console.error);
    }
  }, [activeChat, messages]);

  // Periodic refresh
  useEffect(() => {
    if (!isLoggedIn) return;
    const interval = setInterval(() => {
      refreshStats();
      refreshChats();
    }, 15000);
    return () => clearInterval(interval);
  }, [isLoggedIn, refreshStats, refreshChats]);

  useEffect(() => {
    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  return (
    <AgentContext.Provider
      value={{
        socket,
        isConnected,
        agentName,
        setAgentName,
        isLoggedIn,
        loginAgent,
        logoutAgent,
        chats,
        activeChat,
        setActiveChat,
        messages,
        stats,
        acceptChat,
        sendMessage,
        closeChat,
        sendTyping,
        typingIndicator,
        refreshChats,
        refreshStats,
      }}
    >
      {children}
    </AgentContext.Provider>
  );
}

export function useAgent() {
  const ctx = useContext(AgentContext);
  if (!ctx) throw new Error("useAgent must be used within AgentProvider");
  return ctx;
}
