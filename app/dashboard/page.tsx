"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export default function LoginPage() {
  const router = useRouter();
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await axios.post(`${API}/auth/login`, { email, password });
      if (!res.data.access_token) throw new Error("No token");
      localStorage.setItem("access_token", res.data.access_token);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.error || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#FF6B2B] mb-4 shadow-lg">
            <span className="text-white font-black text-2xl">G</span>
          </div>
          <h1 className="text-gray-900 font-bold text-2xl">gogoo</h1>
          <p className="text-gray-400 text-sm mt-1">Operations Dashboard</p>
        </div>

        {/* Card */}
        <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm space-y-5">
          <div>
            <h2 className="text-gray-900 font-bold text-lg">Sign in</h2>
            <p className="text-gray-400 text-sm mt-0.5">Enter your admin credentials</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-gray-600 text-xs font-semibold mb-1.5 block uppercase tracking-wide">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm focus:outline-none focus:border-[#FF6B2B] focus:ring-2 focus:ring-[#FF6B2B]/10 transition"
                placeholder="admin@gogoo.in"
                required
              />
            </div>

            <div>
              <label className="text-gray-600 text-xs font-semibold mb-1.5 block uppercase tracking-wide">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm focus:outline-none focus:border-[#FF6B2B] focus:ring-2 focus:ring-[#FF6B2B]/10 transition"
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <p className="text-red-600 text-sm font-medium">⚠ {error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#FF6B2B] hover:bg-[#e85e22] text-white font-bold py-3 rounded-xl transition disabled:opacity-50 shadow-sm"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                  </svg>
                  Signing in...
                </span>
              ) : "Sign In →"}
            </button>
          </form>
        </div>

        <p className="text-center text-gray-400 text-xs mt-6">
          gogoo Logistics · A Unit of Aggarwal Publicity & Marketing Pvt. Ltd.
        </p>
      </div>
    </div>
  );
}