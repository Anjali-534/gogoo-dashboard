"use client";
import { useEffect, useState } from "react";
import axios from "axios";
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

const STATUS_BADGE: Record<string, string> = {
  completed:   "text-green-400 bg-green-400/10 border-green-400/20",
  cancelled:   "text-red-400 bg-red-400/10 border-red-400/20",
  in_progress: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  accepted:    "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  arriving:    "text-orange-400 bg-orange-400/10 border-orange-400/20",
  searching:   "text-gray-400 bg-gray-400/10 border-gray-400/20",
};

export default function RidersPage() {
  const [riders,        setRiders]        = useState<any[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [search,        setSearch]        = useState("");
  const [selectedRider, setSelectedRider] = useState<any | null>(null);
  const [riderBookings, setRiderBookings] = useState<any[]>([]);
  const [riderBLoading, setRiderBLoading] = useState(false);

  const token = () => typeof window !== "undefined" ? localStorage.getItem("access_token") : null;

  useEffect(() => {
    axios
      .get(`${API}/gogoo/riders`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => setRiders(r.data || []))
      .catch(() => setRiders([]))
      .finally(() => setLoading(false));
  }, []);

  const openRider = async (r: any) => {
    setSelectedRider(r);
    setRiderBookings([]);
    setRiderBLoading(true);
    try {
      const res = await axios.get(`${API}/gogoo/riders/${r.id}/bookings`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      setRiderBookings(res.data?.bookings || res.data || []);
    } catch {
      setRiderBookings([]);
    } finally {
      setRiderBLoading(false);
    }
  };

  const filtered = riders.filter(r => {
    const q = search.toLowerCase();
    return !q || r.name?.toLowerCase().includes(q) || r.email?.toLowerCase().includes(q) || r.phone?.includes(q);
  });

  const downloadXLSX = () => {
    window.open(`${API}/gogoo/export/users.xlsx?token=${token()}`, "_blank");
  };

  const completed = riderBookings.filter(b => b.status === "completed").length;
  const cancelled = riderBookings.filter(b => b.status === "cancelled").length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Riders / Users</h1>
          <p className="text-gray-500 text-sm mt-0.5">{filtered.length} of {riders.length} riders</p>
        </div>
        <button
          onClick={downloadXLSX}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-xl text-sm font-semibold transition"
        >
          ⬇ Export Excel
        </button>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, email, or phone…"
          className="w-full max-w-sm bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl px-4 py-2.5 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-[#FF6B2B]"
        />
      </div>

      {loading ? (
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-10 text-center text-gray-500">
          Loading riders…
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-10 text-center text-gray-600">
          <p className="text-4xl mb-3">👤</p>
          <p className="text-white font-medium mb-1">
            {search ? "No riders match your search" : "No riders yet"}
          </p>
          <p className="text-sm">Riders are created when they sign up through the gogoo user app.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filtered.map((r: any) => (
            <div key={r.id} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-5 flex items-center gap-5">
              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold flex-shrink-0">
                {r.name?.[0]?.toUpperCase() || "R"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold">{r.name || "—"}</p>
                <p className="text-gray-500 text-xs mt-0.5">
                  {r.email || "—"} · {r.phone || "—"}
                </p>
              </div>
              <div className="text-center hidden md:block">
                <p className="text-white text-sm font-bold">⭐ {Number(r.rating || 0).toFixed(1)}</p>
                <p className="text-gray-500 text-xs">{r.total_rides || 0} rides</p>
              </div>
              <div className="text-right hidden lg:block">
                <p className="text-gray-500 text-xs">
                  Joined {r.created_at ? new Date(r.created_at).toLocaleDateString("en-IN") : "—"}
                </p>
              </div>
              <button
                onClick={() => openRider(r)}
                className="px-4 py-2 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-xl text-xs font-medium hover:bg-blue-500/20 transition flex-shrink-0"
              >
                Ride History
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Ride history drawer */}
      {selectedRider && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSelectedRider(null)} />
          <div className="relative w-full max-w-lg h-full bg-[#0F0F0F] border-l border-[#2A2A2A] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-[#0F0F0F] border-b border-[#2A2A2A] p-5 flex items-start justify-between">
              <div>
                <h2 className="text-white font-bold text-lg">{selectedRider.name}</h2>
                <p className="text-gray-400 text-xs mt-0.5">📧 {selectedRider.email || "—"}</p>
                <p className="text-gray-400 text-xs">📱 {selectedRider.phone || "—"}</p>
                <p className="text-gray-400 text-xs">
                  ⭐ {Number(selectedRider.rating || 0).toFixed(1)} · {selectedRider.total_rides || 0} rides
                </p>
              </div>
              <button onClick={() => setSelectedRider(null)} className="text-gray-500 hover:text-white text-xl mt-0.5">✕</button>
            </div>

            {/* Stats row */}
            {!riderBLoading && riderBookings.length > 0 && (
              <div className="grid grid-cols-3 gap-3 p-5 pb-2">
                <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-3 text-center">
                  <p className="text-white font-bold text-xl">{riderBookings.length}</p>
                  <p className="text-gray-500 text-xs mt-0.5">Total</p>
                </div>
                <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 text-center">
                  <p className="text-green-400 font-bold text-xl">{completed}</p>
                  <p className="text-gray-500 text-xs mt-0.5">Completed</p>
                </div>
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-center">
                  <p className="text-red-400 font-bold text-xl">{cancelled}</p>
                  <p className="text-gray-500 text-xs mt-0.5">Cancelled</p>
                </div>
              </div>
            )}

            <div className="p-5 space-y-3">
              {riderBLoading ? (
                <div className="text-gray-500 text-sm py-10 text-center">Loading ride history…</div>
              ) : riderBookings.length === 0 ? (
                <div className="text-gray-600 text-sm py-10 text-center">
                  <p className="text-3xl mb-2">🚗</p>
                  <p>No rides yet for this rider.</p>
                </div>
              ) : riderBookings.map((b: any) => (
                <div key={b.id} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full capitalize font-medium border ${STATUS_BADGE[b.status] || "text-gray-400 bg-gray-400/10 border-gray-400/20"}`}>
                      {b.status?.replace("_", " ")}
                    </span>
                    <span className="text-white font-bold text-sm">Rs.{Math.round(b.fare || 0)}</span>
                  </div>
                  <div className="space-y-1 mb-2">
                    <p className="text-gray-400 text-xs flex gap-2">
                      <span className="text-green-400 flex-shrink-0">▲</span>
                      <span>{b.pickup_address || "—"}</span>
                    </p>
                    <p className="text-gray-400 text-xs flex gap-2">
                      <span className="text-[#FF6B2B] flex-shrink-0">▼</span>
                      <span>{b.drop_address || "—"}</span>
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-gray-600 text-xs">
                      {b.created_at
                        ? new Date(b.created_at).toLocaleString("en-IN", {
                            day: "2-digit", month: "short", year: "numeric",
                            hour: "2-digit", minute: "2-digit",
                          })
                        : "—"}
                    </p>
                    {b.driver_name && (
                      <p className="text-gray-500 text-xs">🚗 {b.driver_name}</p>
                    )}
                  </div>
                  {b.status === "cancelled" && (b.cancelled_by || b.cancel_reason) && (
                    <div className="mt-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                      {b.cancelled_by && (
                        <p className="text-red-400 text-xs">
                          Cancelled by: <span className="font-semibold capitalize">{b.cancelled_by}</span>
                        </p>
                      )}
                      {b.cancel_reason && (
                        <p className="text-red-300/70 text-xs mt-0.5">{b.cancel_reason}</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
