"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { Search, Download, X, RefreshCw } from "lucide-react";
import Pagination from "../../../components/Pagination";

const API = process.env.NEXT_PUBLIC_API_URL || "https://gogobackend-production.up.railway.app";
const PER_PAGE = 50;

const STATUS_BADGE: Record<string, string> = {
  completed:   "bg-green-100 text-green-700",
  cancelled:   "bg-red-100 text-red-700",
  in_progress: "bg-orange-100 text-orange-700",
  accepted:    "bg-blue-100 text-blue-700",
  arriving:    "bg-purple-100 text-purple-700",
  searching:   "bg-yellow-100 text-yellow-700",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("en-IN", { day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" });
}

export default function RidersPage() {
  const [riders,        setRiders]        = useState<any[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [search,        setSearch]        = useState("");
  const [page,          setPage]          = useState(1);
  const [selectedRider, setSelectedRider] = useState<any | null>(null);
  const [riderBookings, setRiderBookings] = useState<any[]>([]);
  const [riderBLoading, setRiderBLoading] = useState(false);

  const token = () => typeof window !== "undefined" ? localStorage.getItem("access_token") : null;

  const fetchRiders = async () => {
    const res = await axios.get(`${API}/gogoo/riders`, {
      headers: { Authorization: `Bearer ${token()}` },
    }).catch(() => ({ data: [] }));
    setRiders(res.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchRiders(); }, []);
  useEffect(() => { setPage(1); }, [search]);

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
    } finally { setRiderBLoading(false); }
  };

  const filtered = riders.filter(r => {
    const q = search.toLowerCase();
    return !q || r.name?.toLowerCase().includes(q) ||
      r.email?.toLowerCase().includes(q) || r.phone?.includes(q);
  });

  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const downloadXLSX = () => {
    window.open(`${API}/gogoo/export/users.xlsx?token=${token()}`, "_blank");
    toast.success("Downloading Excel file…");
  };

  const isToday = (iso: string) => {
    if (!iso) return false;
    const d = new Date(iso);
    const n = new Date();
    return d.toDateString() === n.toDateString();
  };
  const isThisWeek = (iso: string) => {
    if (!iso) return false;
    return (Date.now() - new Date(iso).getTime()) < 7 * 86400000;
  };

  const completed  = riderBookings.filter(b => b.status === "completed").length;
  const cancelled  = riderBookings.filter(b => b.status === "cancelled").length;
  const totalSpent = riderBookings
    .filter(b => b.status === "completed")
    .reduce((s, b) => s + Number(b.fare || 0), 0);

  return (
    <div className="space-y-5">
      {/* ── Stats bar ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Riders",   value: riders.length },
          { label: "Active Today",   value: riders.filter(r => isToday(r.last_active || r.updated_at || r.created_at)).length },
          { label: "New This Week",  value: riders.filter(r => isThisWeek(r.created_at)).length },
          { label: "Avg Rating",     value: riders.length
            ? (riders.reduce((s,r) => s + Number(r.rating||0), 0) / riders.length).toFixed(1) + " ⭐"
            : "—" },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
            <p className="text-2xl font-extrabold text-gray-900">{c.value}</p>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mt-1">{c.label}</p>
          </div>
        ))}
      </div>

      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search name, email, phone…"
              className="pl-9 pr-9 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-orange-400 transition w-64" />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                <X size={13} />
              </button>
            )}
          </div>
          <button onClick={fetchRiders} className="p-2 hover:bg-gray-100 rounded-xl text-gray-400">
            <RefreshCw size={16} />
          </button>
        </div>
        <button onClick={downloadXLSX}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition">
          <Download size={15} /> Export Excel
        </button>
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {["Rider","Email","Phone","Total Rides","Rating","Joined","Actions"].map(h => (
                  <th key={h} className="px-5 py-3.5 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-5 py-4"><div className="h-3 bg-gray-100 rounded w-3/4" /></td>
                    ))}
                  </tr>
                ))
              ) : paged.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center">
                    <p className="text-4xl mb-3">👤</p>
                    <p className="text-base font-semibold text-gray-900 mb-1">
                      {search ? "No riders match your search" : "No riders yet"}
                    </p>
                    <p className="text-sm text-gray-400">Riders appear after signing up through the bogie app</p>
                  </td>
                </tr>
              ) : paged.map(r => (
                <tr key={r.id} className="hover:bg-gray-50 transition">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm flex-shrink-0">
                        {r.name?.[0]?.toUpperCase() || "R"}
                      </div>
                      <span className="text-sm font-semibold text-gray-900">{r.name || "—"}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-600">{r.email || "—"}</td>
                  <td className="px-5 py-4 text-sm text-gray-600">{r.phone || "—"}</td>
                  <td className="px-5 py-4 text-sm text-gray-700">{r.total_rides || 0}</td>
                  <td className="px-5 py-4 text-sm font-semibold text-gray-900">⭐ {Number(r.rating||0).toFixed(1)}</td>
                  <td className="px-5 py-4 text-xs text-gray-400">
                    {r.created_at ? new Date(r.created_at).toLocaleDateString("en-IN") : "—"}
                  </td>
                  <td className="px-5 py-4">
                    <button onClick={() => openRider(r)}
                      className="px-3 py-1.5 text-xs font-semibold bg-blue-50 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-100 transition">
                      Ride History
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} total={filtered.length} perPage={PER_PAGE} onChange={setPage} />
      </div>

      {/* ── Ride History Drawer ── */}
      {selectedRider && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setSelectedRider(null)} />
          <div className="relative w-full max-w-lg h-full bg-white shadow-2xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-5 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                    {selectedRider.name?.[0]?.toUpperCase() || "R"}
                  </div>
                  <div>
                    <p className="text-base font-bold text-gray-900">{selectedRider.name}</p>
                    <p className="text-xs text-gray-400">{selectedRider.email || selectedRider.phone || "—"}</p>
                  </div>
                </div>
                <div className="flex gap-3 text-xs text-gray-500 ml-12">
                  <span>⭐ {Number(selectedRider.rating||0).toFixed(1)}</span>
                  <span>· {selectedRider.total_rides || 0} rides</span>
                  <span>· Joined {selectedRider.created_at ? new Date(selectedRider.created_at).toLocaleDateString("en-IN",{month:"short",year:"numeric"}) : "—"}</span>
                </div>
              </div>
              <button onClick={() => setSelectedRider(null)} className="p-2 hover:bg-gray-100 rounded-xl">
                <X size={18} className="text-gray-500" />
              </button>
            </div>

            {/* Stats */}
            {!riderBLoading && riderBookings.length > 0 && (
              <div className="grid grid-cols-4 gap-3 px-6 py-4 border-b border-gray-100">
                {[
                  { label: "Total", value: riderBookings.length, color: "text-gray-900" },
                  { label: "Completed", value: completed, color: "text-green-600" },
                  { label: "Cancelled", value: cancelled, color: "text-red-500" },
                  { label: "Spent", value: `₹${Math.round(totalSpent).toLocaleString("en-IN")}`, color: "text-orange-500" },
                ].map(s => (
                  <div key={s.label} className="text-center">
                    <p className={`text-lg font-extrabold ${s.color}`}>{s.value}</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Bookings list */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {riderBLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="animate-pulse bg-gray-50 rounded-xl p-4 h-20" />
                ))
              ) : riderBookings.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-3xl mb-2">🚗</p>
                  <p className="text-sm text-gray-400">No rides yet for this rider</p>
                </div>
              ) : riderBookings.map(b => (
                <div key={b.id} className="border border-gray-100 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[11px] font-bold px-2 py-1 rounded-full capitalize ${STATUS_BADGE[b.status] || "bg-gray-100 text-gray-600"}`}>
                      {b.status?.replace("_"," ")}
                    </span>
                    <span className="text-sm font-bold text-gray-900">₹{Math.round(b.fare||0)}</span>
                  </div>
                  <p className="text-xs text-gray-600 truncate">● {b.pickup_address || "—"}</p>
                  <p className="text-xs text-gray-400 truncate mt-0.5">● {b.drop_address || "—"}</p>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-[11px] text-gray-400">{b.created_at ? fmtDate(b.created_at) : "—"}</p>
                    {b.driver_name && <p className="text-[11px] text-gray-400">🚗 {b.driver_name}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
