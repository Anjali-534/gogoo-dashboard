"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const res = await axios.post(`${API}/auth/login`, { email, password });
      localStorage.setItem("access_token", res.data.access_token);
      router.push("/dashboard");
    } catch {
      setError("Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-2">
            <img src="/logo.png" style={{ height: 60 }} />
            
          </div>
          <p className="text-gray-500 text-sm mt-2">Admin Dashboard</p>
        </div>

        <form onSubmit={handleLogin} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-8 space-y-4">
          <div>
            <label className="text-gray-400 text-xs font-medium mb-1.5 block">EMAIL</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              className="w-full bg-[#111] border border-[#2A2A2A] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#FF6B2B] transition"
              placeholder="admin@gogoo.in"
            />
          </div>
          <div>
            <label className="text-gray-400 text-xs font-medium mb-1.5 block">PASSWORD</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              className="w-full bg-[#111] border border-[#2A2A2A] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#FF6B2B] transition"
              placeholder="••••••••"
            />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit" disabled={loading}
            className="w-full bg-[#FF6B2B] hover:bg-[#e85e22] text-white font-semibold py-3 rounded-xl transition disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
