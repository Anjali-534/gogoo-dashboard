"use client";
import { useEffect, useState } from "react";
import axios from "axios";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

const STATUS_COLORS: Record<string, string> = {
  searching: "text-yellow-400 bg-yellow-400/10",
  accepted: "text-blue-400 bg-blue-400/10",
  arriving: "text-purple-400 bg-purple-400/10",
  in_progress: "text-green-400 bg-green-400/10",
  completed: "text-gray-400 bg-gray-400/10",
  cancelled: "text-red-400 bg-red-400/10",
};

export default function BookingsPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  const fetchBookings = async () => {
    setLoading(true);
    const token = localStorage.getItem("access_token");
    const params = filter !== "all" ? `?status=${filter}` : "";
    const res = await axios.get(`${API}/gogoo/bookings${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => ({ data: [] }));
    setBookings(res.data || []);
    setLoading(false);
  };
useEffect(() => {
  fetchBookings();
  // Auto-refresh every 5 seconds so new bookings appear instantly
  const interval = setInterval(fetchBookings, 5000);
  return () => clearInterval(interval);
}, [filter]);
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Bookings</h1>
          <p className="text-gray-500 text-sm mt-0.5">{bookings.length} records</p>
        </div>
        {/* Filter tabs */}
        <div className="flex gap-1 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-1">
          {["all","searching","in_progress","completed","cancelled"].map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition capitalize ${
                filter === s ? "bg-[#FF6B2B] text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              {s === "all" ? "All" : s.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#2A2A2A]">
              {["Booking", "Rider", "Driver", "Service", "Route", "Fare", "Status", "Time"].map(h => (
                <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1E1E1E]">
            {loading ? (
              <tr><td colSpan={8} className="px-5 py-10 text-center text-gray-600">Loading...</td></tr>
            ) : bookings.length === 0 ? (
              <tr><td colSpan={8} className="px-5 py-10 text-center text-gray-600">No bookings found</td></tr>
            ) : bookings.map((b: any) => (
              <tr key={b.id} className="hover:bg-[#111] transition">
                <td className="px-5 py-4 text-xs font-mono text-gray-400">{b.id?.slice(0, 8)}…</td>
                <td className="px-5 py-4 text-sm text-white">{b.rider_name}</td>
                <td className="px-5 py-4 text-sm text-gray-300">{b.driver_name || "—"}</td>
                <td className="px-5 py-4 text-sm text-gray-300">{b.service_name}</td>
                <td className="px-5 py-4">
                  <div className="text-xs text-gray-300 max-w-[160px]">
                    <p className="truncate">📍 {b.pickup_address}</p>
                    <p className="truncate text-gray-500">→ {b.drop_address}</p>
                  </div>
                </td>
                <td className="px-5 py-4 text-sm text-white font-medium">
                  {b.final_fare ? `₹${b.final_fare}` : b.estimated_fare ? `~₹${b.estimated_fare}` : "—"}
                </td>
                <td className="px-5 py-4">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium capitalize ${STATUS_COLORS[b.status]}`}>
                    {b.status?.replace("_", " ")}
                  </span>
                </td>
                <td className="px-5 py-4 text-xs text-gray-500">
                  {new Date(b.created_at).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
