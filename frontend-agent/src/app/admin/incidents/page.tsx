"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

interface Incident {
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
}

interface IncidentStats {
  total: number;
  today: number;
  thisWeek: number;
  thisMonth: number;
  active: number;
  waiting: number;
  closed: number;
  aiResolved: number;
  agentResolved: number;
  aiResolutionRate: number;
  avgResolutionMinutes: number;
  commonTags: { tag: string; count: number }[];
}

const statusColors: Record<string, { label: string; color: string; bg: string }> = {
  ai: { label: "AI", color: "text-blue-600", bg: "bg-blue-50" },
  waiting: { label: "Waiting", color: "text-amber-600", bg: "bg-amber-50" },
  active: { label: "Active", color: "text-green-600", bg: "bg-green-50" },
  closed: { label: "Closed", color: "text-gray-600", bg: "bg-gray-100" },
};

const resolutionLabels: Record<string, string> = {
  ai_resolved: "AI Resolved",
  agent_resolved: "Agent Resolved",
  customer_left: "Customer Left",
  auto_closed: "Auto Closed",
};

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function IncidentsPage() {
  const { token, user } = useAuth();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [stats, setStats] = useState<IncidentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [resolutionFilter, setResolutionFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  const fetchStats = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/chat/incidents/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setStats(await res.json());
      }
    } catch {
      // Stats are not critical
    }
  }, [token]);

  const fetchIncidents = useCallback(async () => {
    if (!token) return;
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), size: String(pageSize) });
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (resolutionFilter !== "all") params.set("resolution", resolutionFilter);
      if (search.trim()) params.set("search", search.trim());

      const res = await fetch(`${API_BASE}/api/chat/incidents?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch incidents");
      const data = await res.json();
      setIncidents(data.incidents || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 0);
    } catch (err: any) {
      setError(err.message || "Failed to load incidents");
    } finally {
      setLoading(false);
    }
  }, [token, page, statusFilter, resolutionFilter, search]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    setLoading(true);
    fetchIncidents();
  }, [fetchIncidents]);

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-500">Please sign in to access admin panel.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-sm text-gray-500 hover:text-red-500 transition-colors">
              &larr; Back to Dashboard
            </Link>
            <div className="h-5 w-px bg-gray-300" />
            <h1 className="text-xl font-bold text-gray-900">Incident Management</h1>
          </div>
          <p className="text-sm text-gray-500">{total} total incidents</p>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-6">
        {/* Stats Cards */}
        {stats && (
          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-gray-500">Total Today</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{stats.today}</p>
            </div>
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-gray-500">This Week</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{stats.thisWeek}</p>
            </div>
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-amber-600">Waiting</p>
              <p className="mt-1 text-2xl font-bold text-amber-600">{stats.waiting}</p>
            </div>
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-green-600">Active</p>
              <p className="mt-1 text-2xl font-bold text-green-600">{stats.active}</p>
            </div>
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-blue-600">AI Resolution Rate</p>
              <p className="mt-1 text-2xl font-bold text-blue-600">{Math.round(stats.aiResolutionRate)}%</p>
            </div>
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-gray-500">Avg Resolution</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{Math.round(stats.avgResolutionMinutes)}m</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search by customer name, email, or subject..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm text-gray-900 focus:border-red-400 focus:outline-none"
            />
          </div>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-red-400 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="ai">AI</option>
            <option value="waiting">Waiting</option>
            <option value="active">Active</option>
            <option value="closed">Closed</option>
          </select>

          {/* Resolution filter */}
          <select
            value={resolutionFilter}
            onChange={(e) => { setResolutionFilter(e.target.value); setPage(0); }}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-red-400 focus:outline-none"
          >
            <option value="all">All Resolutions</option>
            <option value="ai_resolved">AI Resolved</option>
            <option value="agent_resolved">Agent Resolved</option>
            <option value="customer_left">Customer Left</option>
            <option value="auto_closed">Auto Closed</option>
          </select>
        </div>

        {/* Loading state */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="animate-pulse rounded-xl bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gray-200" />
                  <div className="flex-1">
                    <div className="h-4 w-32 rounded bg-gray-200" />
                    <div className="mt-2 h-3 w-48 rounded bg-gray-200" />
                  </div>
                  <div className="h-6 w-16 rounded-full bg-gray-200" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="py-16 text-center">
            <p className="text-red-500">{error}</p>
            <button onClick={fetchIncidents} className="mt-4 rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600">
              Retry
            </button>
          </div>
        ) : incidents.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-4xl">📋</p>
            <p className="mt-3 text-lg font-medium text-gray-600">No incidents found</p>
            <p className="mt-1 text-sm text-gray-500">
              {search || statusFilter !== "all" || resolutionFilter !== "all"
                ? "Try adjusting your filters"
                : "Incidents will appear here when customers start chats"}
            </p>
          </div>
        ) : (
          <>
            {/* Incident List */}
            <div className="space-y-2">
              {incidents.map((incident) => {
                const sc = statusColors[incident.status] || statusColors.closed;
                return (
                  <Link
                    key={incident._id}
                    href={`/admin/incidents/${incident._id}`}
                    className="block rounded-xl bg-white p-5 shadow-sm transition-all hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 min-w-0">
                        {/* Avatar */}
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-red-400 to-orange-400 text-sm font-bold text-white">
                          {incident.customerName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-gray-900">{incident.customerName}</p>
                            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${sc.color} ${sc.bg}`}>
                              {sc.label}
                            </span>
                            {incident.resolution && (
                              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                                {resolutionLabels[incident.resolution] || incident.resolution}
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 text-xs text-gray-500">{incident.customerEmail}</p>
                          <p className="mt-1 text-sm text-gray-600">{incident.subject}</p>
                          {incident.lastMessage && (
                            <p className="mt-1 truncate text-xs text-gray-400">{incident.lastMessage}</p>
                          )}
                          {/* Tags */}
                          {incident.tags && incident.tags.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {incident.tags.map((tag) => (
                                <span key={tag} className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <p className="text-xs text-gray-400">{timeAgo(incident.updatedAt)}</p>
                        {incident.agentName && (
                          <p className="text-xs text-gray-500">Agent: {incident.agentName}</p>
                        )}
                        {incident.messageCount > 0 && (
                          <p className="text-xs text-gray-400">{incident.messageCount} messages</p>
                        )}
                        {incident.orderId && (
                          <p className="text-xs text-blue-500">Order: {incident.orderId}</p>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  Showing {page * pageSize + 1}-{Math.min((page + 1) * pageSize, total)} of {total}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Common Tags Section */}
        {stats && stats.commonTags && stats.commonTags.length > 0 && (
          <div className="mt-8 rounded-xl bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900">Common Issues</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {stats.commonTags.map((t) => (
                <span
                  key={t.tag}
                  className="rounded-full border border-gray-200 px-3 py-1 text-sm text-gray-700"
                >
                  {t.tag} <span className="ml-1 text-xs text-gray-400">({t.count})</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
