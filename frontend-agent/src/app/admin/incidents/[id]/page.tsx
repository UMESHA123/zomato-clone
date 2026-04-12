"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { useParams } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

interface Message {
  _id: string;
  chatId: string;
  sender: "customer" | "ai" | "agent" | "system";
  senderName: string;
  content: string;
  timestamp: string;
}

interface IncidentDetail {
  _id: string;
  customerName: string;
  customerEmail: string;
  agentId: string | null;
  agentName: string | null;
  status: "ai" | "waiting" | "active" | "closed";
  subject: string;
  lastMessage: string;
  resolution: string | null;
  tags: string[];
  orderId: string | null;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  messages: Message[];
}

const statusColors: Record<string, { label: string; color: string; bg: string }> = {
  ai: { label: "AI", color: "text-blue-700", bg: "bg-blue-100" },
  waiting: { label: "Waiting", color: "text-amber-700", bg: "bg-amber-100" },
  active: { label: "Active", color: "text-green-700", bg: "bg-green-100" },
  closed: { label: "Closed", color: "text-gray-700", bg: "bg-gray-200" },
};

const resolutionLabels: Record<string, string> = {
  ai_resolved: "AI Resolved",
  agent_resolved: "Agent Resolved",
  customer_left: "Customer Left",
  auto_closed: "Auto Closed",
};

const senderStyles: Record<string, { align: string; bubble: string; name: string }> = {
  customer: { align: "justify-start", bubble: "bg-white border border-gray-200", name: "text-gray-700" },
  ai: { align: "justify-start", bubble: "bg-blue-50 border border-blue-200", name: "text-blue-700" },
  agent: { align: "justify-end", bubble: "bg-red-500 text-white", name: "text-red-600" },
  system: { align: "justify-center", bubble: "bg-gray-100 text-gray-500 text-xs italic", name: "text-gray-400" },
};

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

function durationBetween(start: string, end: string): string {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return `${hrs}h ${remainingMins}m`;
}

export default function IncidentDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { token } = useAuth();
  const [incident, setIncident] = useState<IncidentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchIncident = useCallback(async () => {
    if (!token || !id) return;
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/chat/incidents/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch incident");
      const data = await res.json();
      setIncident(data);
    } catch (err: any) {
      setError(err.message || "Failed to load incident");
    } finally {
      setLoading(false);
    }
  }, [token, id]);

  useEffect(() => {
    fetchIncident();
  }, [fetchIncident]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [incident?.messages]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="border-b border-gray-200 bg-white px-6 py-4">
          <Link href="/admin/incidents" className="text-sm text-gray-500 hover:text-red-500">&larr; Back to Incidents</Link>
        </header>
        <div className="mx-auto max-w-5xl px-6 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-6 w-48 rounded bg-gray-200" />
            <div className="h-4 w-64 rounded bg-gray-200" />
            <div className="mt-8 h-96 rounded-xl bg-white" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !incident) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="border-b border-gray-200 bg-white px-6 py-4">
          <Link href="/admin/incidents" className="text-sm text-gray-500 hover:text-red-500">&larr; Back to Incidents</Link>
        </header>
        <div className="py-16 text-center">
          <p className="text-red-500">{error || "Incident not found"}</p>
          <button onClick={fetchIncident} className="mt-4 rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const sc = statusColors[incident.status] || statusColors.closed;
  const messages = incident.messages || [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin/incidents" className="text-sm text-gray-500 hover:text-red-500 transition-colors">
              &larr; Back to Incidents
            </Link>
            <div className="h-5 w-px bg-gray-300" />
            <h1 className="text-lg font-bold text-gray-900">Incident Detail</h1>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${sc.color} ${sc.bg}`}>
            {sc.label}
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-6">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left column - Chat transcript */}
          <div className="lg:col-span-2">
            <div className="rounded-xl bg-white shadow-sm">
              <div className="border-b border-gray-200 px-5 py-3">
                <h2 className="font-semibold text-gray-900">Conversation ({messages.length} messages)</h2>
              </div>

              <div className="max-h-[600px] overflow-y-auto p-5 space-y-4">
                {messages.length === 0 ? (
                  <p className="py-8 text-center text-sm text-gray-500">No messages in this incident</p>
                ) : (
                  messages.map((msg) => {
                    const style = senderStyles[msg.sender] || senderStyles.system;
                    const isSystem = msg.sender === "system";

                    if (isSystem) {
                      return (
                        <div key={msg._id} className="flex justify-center">
                          <div className="rounded-lg bg-gray-100 px-4 py-2 text-xs italic text-gray-500">
                            {msg.content}
                            <span className="ml-2 text-gray-400">{formatTime(msg.timestamp)}</span>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={msg._id} className={`flex ${style.align}`}>
                        <div className="max-w-[75%]">
                          <p className={`mb-1 text-xs font-medium ${style.name}`}>
                            {msg.senderName}
                            {msg.sender === "ai" && " (AI)"}
                          </p>
                          <div className={`rounded-xl px-4 py-2.5 ${style.bubble}`}>
                            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                          </div>
                          <p className="mt-1 text-xs text-gray-400">{formatTime(msg.timestamp)}</p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>
          </div>

          {/* Right column - Incident details */}
          <div className="space-y-4">
            {/* Customer Info */}
            <div className="rounded-xl bg-white p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-900">Customer</h3>
              <div className="mt-3 space-y-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-red-400 to-orange-400 text-sm font-bold text-white">
                    {incident.customerName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{incident.customerName}</p>
                    <p className="text-xs text-gray-500">{incident.customerEmail}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Incident Info */}
            <div className="rounded-xl bg-white p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-900">Incident Details</h3>
              <div className="mt-3 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Subject</span>
                  <span className="text-right font-medium text-gray-900">{incident.subject}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Status</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${sc.color} ${sc.bg}`}>
                    {sc.label}
                  </span>
                </div>
                {incident.resolution && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Resolution</span>
                    <span className="font-medium text-gray-900">
                      {resolutionLabels[incident.resolution] || incident.resolution}
                    </span>
                  </div>
                )}
                {incident.orderId && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Related Order</span>
                    <span className="font-medium text-blue-600">{incident.orderId}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">Messages</span>
                  <span className="font-medium text-gray-900">{incident.messageCount || messages.length}</span>
                </div>
              </div>
            </div>

            {/* Agent Info */}
            {incident.agentName && (
              <div className="rounded-xl bg-white p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-900">Assigned Agent</h3>
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-xs font-bold text-red-600">
                    {incident.agentName.charAt(0).toUpperCase()}
                  </div>
                  <p className="font-medium text-gray-900">{incident.agentName}</p>
                </div>
              </div>
            )}

            {/* Tags */}
            {incident.tags && incident.tags.length > 0 && (
              <div className="rounded-xl bg-white p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-900">Tags</h3>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {incident.tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Timeline */}
            <div className="rounded-xl bg-white p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-900">Timeline</h3>
              <div className="mt-3 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                  <div>
                    <p className="text-xs font-medium text-gray-900">Created</p>
                    <p className="text-xs text-gray-500">{formatDateTime(incident.createdAt)}</p>
                  </div>
                </div>
                {incident.updatedAt !== incident.createdAt && (
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-amber-500" />
                    <div>
                      <p className="text-xs font-medium text-gray-900">Last Updated</p>
                      <p className="text-xs text-gray-500">{formatDateTime(incident.updatedAt)}</p>
                    </div>
                  </div>
                )}
                {incident.closedAt && (
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-green-500" />
                    <div>
                      <p className="text-xs font-medium text-gray-900">Closed</p>
                      <p className="text-xs text-gray-500">{formatDateTime(incident.closedAt)}</p>
                      <p className="text-xs text-gray-400">
                        Duration: {durationBetween(incident.createdAt, incident.closedAt)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
