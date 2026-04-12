"use client";
import { useEffect, useRef } from "react";

type MessageHandler = (data: { type: string; order: any }) => void;

export default function useOrderSocket(onMessage: MessageHandler) {
  const wsRef = useRef<WebSocket | null>(null);
  const handlerRef = useRef(onMessage);
  handlerRef.current = onMessage;

  useEffect(() => {
    const connect = () => {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
      const wsUrl = apiBase.replace(/^http/, "ws") + "/ws";
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handlerRef.current(data);
        } catch {}
      };

      ws.onclose = () => {
        setTimeout(connect, 3000);
      };

      ws.onerror = () => ws.close();
    };

    connect();
    return () => {
      wsRef.current?.close();
    };
  }, []);
}
