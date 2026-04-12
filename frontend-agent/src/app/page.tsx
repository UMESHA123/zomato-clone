"use client";

import { useState, useEffect } from "react";
import { useAgent } from "@/context/AgentContext";
import { useAuth } from "@/context/AuthContext";
import StatsCards from "@/components/StatsCards";
import ChatList from "@/components/ChatList";
import ChatWindow from "@/components/ChatWindow";

export default function AgentDashboard() {
  const { isLoggedIn, loginAgent, isConnected } = useAgent();
  const { user, isLoading } = useAuth();

  // Once JWT auth succeeds, automatically initialize the socket connection
  useEffect(() => {
    if (user && !isLoggedIn) {
      loginAgent(user.name);
    }
  }, [user, isLoggedIn, loginAgent]);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!user || !isLoggedIn) {
    return <LoginScreen />;
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Top Bar */}
      <TopBar />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Stats + Chat List */}
        <div className="w-[400px] flex flex-col border-r border-gray-200 bg-white">
          <StatsCards />
          <ChatList />
        </div>

        {/* Right Panel - Chat Window */}
        <div className="flex-1 flex flex-col">
          <ChatWindow />
        </div>
      </div>
    </div>
  );
}

function LoginScreen() {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    let err: string | null;
    if (isRegister) {
      err = await register(name.trim(), email.trim(), password);
    } else {
      err = await login(email.trim(), password);
    }

    if (err) {
      setError(err);
    }
    setSubmitting(false);
  };

  const canSubmit = isRegister
    ? name.trim() && email.trim() && password
    : email.trim() && password;

  return (
    <div className="h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-white to-orange-50">
      <div className="w-full max-w-md px-6">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-2xl mb-4">
              <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              Zomato Support
            </h1>
            <p className="text-gray-500 mt-1">Agent Dashboard</p>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">
              {error}
            </div>
          )}

          {/* Login / Register Form */}
          <form onSubmit={handleSubmit}>
            {isRegister && (
              <>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all mb-4"
                  autoFocus
                />
              </>
            )}

            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="agent@zomato.com"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all mb-4"
              autoFocus={!isRegister}
            />

            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
            />

            <button
              type="submit"
              disabled={!canSubmit || submitting}
              className="w-full mt-6 py-3 bg-red-500 text-white font-semibold rounded-xl hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-red-500/25 hover:shadow-red-500/40"
            >
              {submitting
                ? "Please wait..."
                : isRegister
                ? "Create Agent Account"
                : "Sign In"}
            </button>
          </form>

          {/* Toggle login / register */}
          <p className="text-center text-sm text-gray-500 mt-6">
            {isRegister ? (
              <>
                Already have an account?{" "}
                <button
                  onClick={() => {
                    setIsRegister(false);
                    setError("");
                  }}
                  className="text-red-500 hover:text-red-600 font-medium transition-colors"
                >
                  Sign In
                </button>
              </>
            ) : (
              <>
                Need an account?{" "}
                <button
                  onClick={() => {
                    setIsRegister(true);
                    setError("");
                  }}
                  className="text-red-500 hover:text-red-600 font-medium transition-colors"
                >
                  Register
                </button>
              </>
            )}
          </p>

          <p className="text-center text-xs text-gray-400 mt-4">
            <a href="http://localhost:3000" className="hover:text-red-500 transition-colors">
              Back to Zomato
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

function TopBar() {
  const { agentName, isConnected, logoutAgent } = useAgent();
  const { logout } = useAuth();

  const handleSignOut = () => {
    logoutAgent();
    logout();
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 01.778-.332 48.294 48.294 0 005.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
            </svg>
          </div>
          <h1 className="text-lg font-bold text-gray-900">
            Zomato <span className="text-red-500">Support</span>
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <a
          href="/admin/incidents"
          className="text-sm text-gray-500 hover:text-red-500 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-50"
        >
          Admin
        </a>
        <div className="flex items-center gap-2">
          <div
            className={`w-2.5 h-2.5 rounded-full ${
              isConnected ? "bg-green-500" : "bg-red-400"
            }`}
          />
          <span className="text-sm text-gray-600">
            {agentName}
          </span>
        </div>
        <button
          onClick={handleSignOut}
          className="text-sm text-gray-500 hover:text-red-500 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-50"
        >
          Sign Out
        </button>
      </div>
    </header>
  );
}
