"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { io, type Socket } from "socket.io-client";

const CHAT_SERVICE_URL =
  process.env.NEXT_PUBLIC_CHAT_SERVICE_URL || "http://localhost:8087";

export type ChatStatus = "idle" | "ai" | "waiting" | "active" | "closed";

export interface ChatMessage {
  _id: string;
  sender: "customer" | "ai" | "agent" | "system";
  senderName: string;
  content: string;
  timestamp: string;
}

interface UseChatSocket {
  status: ChatStatus;
  chatId: string | null;
  messages: ChatMessage[];
  isConnected: boolean;
  isTyping: boolean;
  agentName: string | null;
  startChat: (customerName: string, customerEmail?: string) => void;
  sendMessage: (content: string) => void;
  sendTyping: () => void;
  endChat: () => void;
  resetChat: () => void;
}

export function useChatSocket(): UseChatSocket {
  const [status, setStatus] = useState<ChatStatus>("idle");
  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [agentName, setAgentName] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cleanup = useCallback(() => {
    socketRef.current?.disconnect();
    socketRef.current = null;
    setIsConnected(false);
  }, []);

  const startChat = useCallback(
    (customerName: string, customerEmail?: string) => {
      if (socketRef.current) return;

      const s = io(CHAT_SERVICE_URL, {
        transports: ["websocket", "polling"],
      });

      s.on("connect", () => {
        setIsConnected(true);
        s.emit("chat:create", { customerName, customerEmail });
      });

      s.on("disconnect", () => setIsConnected(false));

      s.on("chat:created", (data: { chatId: string; status: string }) => {
        setChatId(data.chatId);
        setStatus(data.status as ChatStatus);
      });

      s.on("chat:message", (data: { chatId: string; message: ChatMessage }) => {
        setMessages((prev) => [...prev, data.message]);
        setIsTyping(false);
      });

      s.on(
        "chat:status",
        (data: { chatId: string; status: string; agentName?: string }) => {
          setStatus(data.status as ChatStatus);
          if (data.agentName) setAgentName(data.agentName);
        }
      );

      s.on(
        "chat:typing",
        (data: { chatId: string; sender: string }) => {
          if (data.sender === "ai" || data.sender === "agent") {
            setIsTyping(true);
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 4000);
          }
        }
      );

      s.on("chat:error", (data: { message: string }) => {
        console.error("Chat error:", data.message);
      });

      socketRef.current = s;
    },
    []
  );

  const sendMessage = useCallback(
    (content: string) => {
      if (!socketRef.current || !chatId || !content.trim()) return;
      socketRef.current.emit("chat:message", { chatId, content: content.trim() });
    },
    [chatId]
  );

  const sendTyping = useCallback(() => {
    if (!socketRef.current || !chatId) return;
    socketRef.current.emit("chat:typing", { chatId });
  }, [chatId]);

  const endChat = useCallback(() => {
    if (!socketRef.current || !chatId) return;
    socketRef.current.emit("chat:end", { chatId });
    setStatus("closed");
  }, [chatId]);

  const resetChat = useCallback(() => {
    cleanup();
    setStatus("idle");
    setChatId(null);
    setMessages([]);
    setAgentName(null);
    setIsTyping(false);
  }, [cleanup]);

  useEffect(() => {
    return () => {
      cleanup();
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [cleanup]);

  return {
    status,
    chatId,
    messages,
    isConnected,
    isTyping,
    agentName,
    startChat,
    sendMessage,
    sendTyping,
    endChat,
    resetChat,
  };
}
