"use client";
import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { Search, Download, RefreshCw, X, Phone } from "lucide-react";
import Pagination from "../../../components/Pagination";

const API = process.env.NEXT_PUBLIC_API_URL || "https://gogobackend-production.up.railway.app";
const PER_PAGE = 50;

const STATUS_BADGE: Record<string, string> = {
  scheduled:   "bg-sky-100 text-sky-800",
  searching:   "bg-yellow-100 text-yellow-800",
  accepted:    "bg-blue-100 text-blue-800",
  arriving:    "bg-purple-100 text-purple-800",
  in_progress: "bg-green-100 text-green-700",
  completed:   "bg-green-100 text-green-700",
  cancelled:   "bg-red-100 text-red-700",
};

const fmtDuration = (seconds: number) => {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  return mins < 60 ? `${mins}m ${seconds % 60}s` : `${Math.floor(mins / 60)}h ${mins % 60}m`;
};

const SOURCE_BADGE: Record<string, string> = {
  app:     "bg-indigo-100 text-indigo-800",
  website: "bg-teal-100 text-teal-800",
};

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" });

export default function BookingsPage() {
  const [bookings,  setBookings]  = useState<any[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [filter,    setFilter]    = useState("all");
  const [search,    setSearch]    = useState("");
  const [dateRange, setDateRange] = useState("all");
  const [serviceF,  setServiceF]  = useState("all");
  const [page,      setPage]      = useState(1);
  const [selected,  setSelected]  = useState<any | null>(null);

  const token = () => (typeof window !== "undefined" ? localStorage.getItem("access_token") : "");

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    const params = filter !== "all" ? `?status=${filter}` : "";
    const res = await axios.get(`${API}/gogoo/bookings${params}`, {
      headers: { Authorization: `Bearer ${token()}` },
    }).catch(() => ({ data: [] }));
    setBookings(res.data || []);
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    fetchBookings();
    const iv = setInterval(fetchBookings, 10000);
    return () => clearInterval(iv);
  }, [fetchBookings]);

  useEffect(() => { setPage(1); }, [filter, search, dateRange, serviceF]);

  const isInRange = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    if (dateRange === "today") {
      return d.toDateString() === now.toDateString();
    }
    if (dateRange === "week") {
      const diff = (now.getTime() - d.getTime()) / 86400000;
      return diff <= 7;
    }
    if (dateRange === "month") {
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }
    return true;
  };

  const filtered = bookings.filter(b => {
    const q = search.toLowerCase();
    const matchQ = !q || b.id?.toLowerCase().includes(q) ||
      b.rider_name?.toLowerCase().includes(q) ||
      b.driver_name?.toLowerCase().includes(q) ||
      b.pickup_address?.toLowerCase().includes(q) ||
      b.drop_address?.toLowerCase().includes(q);
    const matchSvc = serviceF === "all" || (b.service_name || "").toLowerCase().includes(serviceF);
    return matchQ && matchSvc && isInRange(b.created_at);
  });

  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const exportCSV = () => {
    const rows = [
      ["ID","Rider","Driver","Service","Pickup","Drop","Fare","Status","Source","Date"],
      ...filtered.map(b => [
        b.id, b.rider_name, b.driver_name || "",
        b.service_name, b.pickup_address, b.drop_address,
        b.final_fare || b.estimated_fare || "",
        b.status, b.source === "website" ? "Website" : "App", b.created_at,
      ]),
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `bookings-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    toast.success("Exported to CSV");
  };

  const services = [...new Set(bookings.map(b => b.service_name).filter(Boolean))];

  return (
    <div>
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-sm text-gray-400">{filtered.length} bookings</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchBookings}
            className="p-2 hover:bg-gray-100 rounded-xl transition text-gray-400">
            <RefreshCw size={16} />
          </button>
          <button onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition">
            <Download size={15} /> Export CSV
          </button>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-5">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[220px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search booking ID, rider, driver, address…"
              className="w-full pl-9 pr-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-orange-400 transition"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X size={13} />
              </button>
            )}
          </div>

          {/* Date */}
          <select value={dateRange} onChange={e => setDateRange(e.target.value)}
            className="px-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-orange-400 text-gray-700">
            <option value="all">All time</option>
            <option value="today">Today</option>
            <option value="week">Last 7 days</option>
            <option value="month">This month</option>
          </select>

          {/* Service */}
          <select value={serviceF} onChange={e => setServiceF(e.target.value)}
            className="px-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-orange-400 text-gray-700">
            <option value="all">All services</option>
            {services.map(s => <option key={s} value={s.toLowerCase()}>{s}</option>)}
          </select>

          {/* Status */}
          <div className="flex gap-1 bg-gray-50 border border-gray-200 rounded-xl p-1">
            {["all","scheduled","searching","in_progress","completed","cancelled"].map(s => (
              <button key={s} onClick={() => setFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition capitalize ${
                  filter === s ? "bg-orange-500 text-white shadow-sm" : "text-gray-500 hover:text-gray-900"
                }`}>
                {s === "all" ? "All" : s.replace("_"," ")}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {["Booking ID","Rider","Driver","Service","Route","Fare","Status","Source","Date"].map(h => (
                  <th key={h} className="px-5 py-3.5 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 9 }).map((_, j) => (
                      <td key={j} className="px-5 py-4">
                        <div className="h-3 bg-gray-100 rounded w-3/4" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : paged.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-16 text-center">
                    <div className="text-4xl mb-3">📭</div>
                    <p className="text-base font-semibold text-gray-900 mb-1">No bookings found</p>
                    <p className="text-sm text-gray-400">Try adjusting your filters</p>
                  </td>
                </tr>
              ) : paged.map(b => (
                <tr key={b.id}
                  className="hover:bg-orange-50/30 cursor-pointer transition"
                  onClick={() => setSelected(b)}>
                  <td className="px-5 py-4 text-xs font-mono text-gray-400">{b.id?.slice(0,8)}…</td>
                  <td className="px-5 py-4 text-sm font-medium text-gray-900">{b.rider_name || "—"}</td>
                  <td className="px-5 py-4 text-sm text-gray-600">{b.driver_name || "—"}</td>
                  <td className="px-5 py-4 text-xs text-gray-500">{b.service_name || "—"}</td>
                  <td className="px-5 py-4">
                    <p className="text-xs text-gray-700 truncate max-w-[150px]">📍 {b.pickup_address}</p>
                    <p className="text-xs text-gray-400 truncate max-w-[150px]">→ {b.drop_address}</p>
                  </td>
                  <td className="px-5 py-4 text-sm font-bold text-gray-900">
                    {b.final_fare ? `₹${b.final_fare}` : b.estimated_fare ? `~₹${b.estimated_fare}` : "—"}
                  </td>
                  <td className="px-5 py-4">
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full capitalize ${STATUS_BADGE[b.status] || "bg-gray-100 text-gray-600"}`}>
                      {b.status?.replace("_"," ")}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${SOURCE_BADGE[b.source] || "bg-indigo-100 text-indigo-800"}`}>
                      {b.source === "website" ? "Website" : "App"}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-xs text-gray-400">{fmtTime(b.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} total={filtered.length} perPage={PER_PAGE} onChange={setPage} />
      </div>

      {/* ── Detail Side Panel ── */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setSelected(null)} />
          <div className="relative w-full max-w-md h-full bg-white shadow-2xl overflow-y-auto flex flex-col">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Booking</p>
                  <p className="text-xs font-mono text-gray-500">{selected.id}</p>
                </div>
                <button onClick={() => setSelected(null)} className="p-2 hover:bg-gray-100 rounded-xl transition">
                  <X size={18} className="text-gray-500" />
                </button>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <span className={`text-xs font-bold px-3 py-1.5 rounded-full capitalize ${STATUS_BADGE[selected.status] || "bg-gray-100 text-gray-600"}`}>
                  {selected.status?.replace("_"," ")}
                </span>
                <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${SOURCE_BADGE[selected.source] || "bg-indigo-100 text-indigo-800"}`}>
                  {selected.source === "website" ? "Website" : "App"}
                </span>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 p-6 space-y-5">
              {/* Rider & Driver */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Rider</p>
                  <p className="text-sm font-semibold text-gray-900">{selected.rider_name || "—"}</p>
                  {selected.rider_phone && (
                    <a href={`tel:${selected.rider_phone}`}
                      className="flex items-center gap-1 text-xs text-orange-500 mt-1">
                      <Phone size={11} />{selected.rider_phone}
                    </a>
                  )}
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Driver</p>
                  <p className="text-sm font-semibold text-gray-900">{selected.driver_name || "Not assigned"}</p>
                  {selected.driver_phone && (
                    <a href={`tel:${selected.driver_phone}`}
                      className="flex items-center gap-1 text-xs text-orange-500 mt-1">
                      <Phone size={11} />{selected.driver_phone}
                    </a>
                  )}
                </div>
              </div>

              {/* Route */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500 mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Pickup</p>
                    <p className="text-sm text-gray-800 mt-0.5">{selected.pickup_address || "—"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-500 mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Drop</p>
                    <p className="text-sm text-gray-800 mt-0.5">{selected.drop_address || "—"}</p>
                  </div>
                </div>
              </div>

              {/* Service & fare */}
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">Fare Breakdown</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Service</span>
                    <span className="font-medium text-gray-900">{selected.service_name || "—"}</span>
                  </div>
                  {selected.distance_km && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Distance</span>
                      <span className="font-medium text-gray-900">{Number(selected.distance_km).toFixed(1)} km</span>
                    </div>
                  )}
                  {selected.estimated_fare && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Estimated Fare</span>
                      <span className="font-medium text-gray-900">₹{selected.estimated_fare}</span>
                    </div>
                  )}
                  {selected.final_fare && (
                    <>
                      <div className="border-t border-gray-200 my-2" />
                      <div className="flex justify-between">
                        <span className="font-semibold text-gray-900">Total Fare</span>
                        <span className="font-bold text-lg text-gray-900">₹{selected.final_fare}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400">bogie Commission (20%)</span>
                        <span className="text-orange-500 font-semibold">₹{Math.round(selected.final_fare * 0.2)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400">Driver Earnings (80%)</span>
                        <span className="text-green-600 font-semibold">₹{Math.round(selected.final_fare * 0.8)}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Scheduled ride info */}
              {selected.is_scheduled && selected.scheduled_at && (
                <div className="bg-sky-50 border border-sky-100 rounded-xl p-4">
                  <p className="text-[11px] font-bold text-sky-500 uppercase tracking-wider mb-1">Scheduled Pickup</p>
                  <p className="text-sm text-sky-800 font-semibold">{fmtTime(selected.scheduled_at)}</p>
                  {selected.status === "scheduled" && (
                    <p className="text-xs text-sky-500 mt-1">Not yet dispatched — driver matching starts ~15 min before pickup</p>
                  )}
                </div>
              )}

              {/* Ambulance details — shown when service is ambulance */}
              {(selected.service_category === "ambulance" || (selected.service_slug || "").startsWith("ambulance")) && (
                <div className="mt-4 p-3 bg-green-50 rounded-xl border border-green-200">
                  <p className="text-xs font-bold text-green-700 uppercase tracking-wider mb-2">
                    Ambulance Details
                  </p>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Type</span>
                      <span className="font-semibold">
                        {selected.is_free_ambulance ? "🆓 Free (NGO)" : "💰 Paid"}
                      </span>
                    </div>
                    {selected.hospital_name && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Hospital</span>
                        <span className="font-semibold">{selected.hospital_name}</span>
                      </div>
                    )}
                    {selected.ambulance_sub_type && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Ambulance Type</span>
                        <span className="font-semibold uppercase">{selected.ambulance_sub_type}</span>
                      </div>
                    )}
                    {selected.patient_name && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Patient</span>
                        <span className="font-semibold">{selected.patient_name}</span>
                      </div>
                    )}
                    {selected.purpose_type && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Purpose</span>
                        <span className="font-semibold capitalize">{selected.purpose_type.replace("_", " ")}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-500">Commission</span>
                      <span className="font-semibold text-green-600">₹0 (Zero)</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Meta */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Booked at</span>
                  <span className="text-gray-900 font-medium">{fmtTime(selected.created_at)}</span>
                </div>
                {selected.payment_method && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Payment</span>
                    <span className="text-gray-900 font-medium uppercase">{selected.payment_method}</span>
                  </div>
                )}
                {selected.otp_verified !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">OTP Verified</span>
                    <span className={selected.otp_verified ? "text-green-600 font-semibold" : "text-red-500 font-semibold"}>
                      {selected.otp_verified ? "✓ Yes" : "✗ No"}
                    </span>
                  </div>
                )}
              </div>

              {/* Cancel reason */}
              {selected.status === "cancelled" && (
                <div className="bg-red-50 border border-red-100 rounded-xl p-4 space-y-2">
                  {selected.cancel_reason && (
                    <div>
                      <p className="text-[11px] font-bold text-red-400 uppercase tracking-wider mb-1">Cancellation Reason</p>
                      <p className="text-sm text-red-700">{selected.cancel_reason}</p>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-red-400">Cancelled by</span>
                    <span className="font-semibold text-red-700 capitalize">{selected.cancelled_by || "—"}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-red-400">Cancellation fee</span>
                    <span className="font-semibold text-red-700">
                      {selected.cancellation_fee > 0 ? `₹${selected.cancellation_fee}` : "Free"}
                    </span>
                  </div>
                  {selected.accepted_at && selected.cancelled_at && (
                    <div className="flex justify-between text-sm">
                      <span className="text-red-400">Time from accept to cancel</span>
                      <span className="font-semibold text-red-700">
                        {fmtDuration(Math.round((new Date(selected.cancelled_at).getTime() - new Date(selected.accepted_at).getTime()) / 1000))}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
