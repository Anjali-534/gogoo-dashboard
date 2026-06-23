"use client";
import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import Link from "next/link";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  Car, Users, BookOpen, TrendingUp, XCircle, CheckCircle,
  Activity, Clock, RefreshCw, ArrowUpRight,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "https://gogobackend-production.up.railway.app";

const isToday = (d: Date) => {
  const n = new Date();
  return d.getDate() === n.getDate() && d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
};

const fmtINR = (v: number) => `₹${Math.round(v).toLocaleString("en-IN")}`;
const fmtTime = (iso: string) => {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

const STATUS_COLOR: Record<string, string> = {
  completed: "#10B981", cancelled: "#EF4444",
  in_progress: "#FF6B2B", searching: "#F59E0B",
  accepted: "#3B82F6", arriving: "#8B5CF6",
};

const STATUS_BADGE: Record<string, string> = {
  completed:   "bg-green-50 text-green-700",
  cancelled:   "bg-red-50 text-red-700",
  in_progress: "bg-orange-50 text-orange-700",
  searching:   "bg-yellow-50 text-yellow-700",
  accepted:    "bg-blue-50 text-blue-700",
  arriving:    "bg-purple-50 text-purple-700",
};

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 animate-pulse">
      <div className="h-3 bg-gray-100 rounded w-1/2 mb-4" />
      <div className="h-8 bg-gray-100 rounded w-1/3 mb-2" />
      <div className="h-2 bg-gray-100 rounded w-2/3" />
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, color, bg }: any) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-start gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${bg}`}>
        <Icon size={18} className={color} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
        <p className="text-2xl font-extrabold text-gray-900 leading-none">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

export default function OverviewPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [drivers,  setDrivers]  = useState<any[]>([]);
  const [riders,   setRiders]   = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading]   = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const token = () => (typeof window !== "undefined" ? localStorage.getItem("access_token") : "");

  const fetchAll = useCallback(async () => {
    const h = { Authorization: `Bearer ${token()}` };
    try {
      const [b, d, r, p, a] = await Promise.all([
        axios.get(`${API}/gogoo/bookings`,  { headers: h }).catch(() => ({ data: [] })),
        axios.get(`${API}/gogoo/drivers`,   { headers: h }).catch(() => ({ data: [] })),
        axios.get(`${API}/gogoo/riders`,    { headers: h }).catch(() => ({ data: [] })),
        axios.get(`${API}/gogoo/payments`,  { headers: h }).catch(() => ({ data: [] })),
        axios.get(`${API}/gogoo/analytics`, { headers: h }).catch(() => ({ data: {} })),
      ]);
      setBookings(b.data || []);
      setDrivers(d.data  || []);
      setRiders(r.data   || []);
      setPayments(p.data || []);
      setAnalytics(a.data);
      setLastRefresh(new Date());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const iv = setInterval(fetchAll, 15000);
    return () => clearInterval(iv);
  }, [fetchAll]);

  // ── Computed stats ──────────────────────────────────────────
  const todayBookings  = bookings.filter(b => isToday(new Date(b.created_at)));
  const activeBookings = bookings.filter(b => ["searching","accepted","arriving","in_progress"].includes(b.status));
  const todayRevenue   = (analytics?.today_revenue != null)
    ? Number(analytics.today_revenue)
    : payments
        .filter(p => p.status === "completed" && isToday(new Date(p.created_at)))
        .reduce((s, p) => s + Number(p.amount || 0), 0);
  const todayCancelled = todayBookings.filter(b => b.status === "cancelled").length;
  const onlineDrivers  = drivers.filter(d => d.is_online).length;
  const avgRating      = drivers.length
    ? (drivers.reduce((s, d) => s + Number(d.rating || 0), 0) / drivers.length).toFixed(1)
    : "—";

  // ── Hourly chart data ──────────────────────────────────────
  const hourlyData = Array.from({ length: 24 }, (_, h) => ({
    hour: `${h}:00`,
    count: bookings.filter(b => {
      const d = new Date(b.created_at);
      return isToday(d) && d.getHours() === h;
    }).length,
  }));

  // ── Service split ─────────────────────────────────────────
  const serviceCounts: Record<string, number> = {};
  bookings.forEach(b => {
    const s = b.service_name || "Unknown";
    serviceCounts[s] = (serviceCounts[s] || 0) + 1;
  });
  const serviceData = Object.entries(serviceCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, value]) => ({
      name,
      value,
      color: name.toLowerCase().includes("truck") ? "#3B82F6"
           : name.toLowerCase().includes("ambulance") ? "#EF4444"
           : "#FF6B2B",
    }));

  // ── Revenue last 7 days ────────────────────────────────────
  const days7: Record<string, number> = {};
  const dayLabels: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const label = d.toLocaleDateString("en-IN", { weekday: "short" });
    days7[label] = 0;
    dayLabels.push(label);
  }
  payments.filter(p => p.status === "completed").forEach(p => {
    const d = new Date(p.created_at);
    const diff = (Date.now() - d.getTime()) / 86400000;
    if (diff <= 7) {
      const label = d.toLocaleDateString("en-IN", { weekday: "short" });
      if (label in days7) days7[label] += Number(p.amount || 0);
    }
  });
  const revenueData = dayLabels.map(l => ({ day: l, revenue: Math.round(days7[l]) }));

  // ── Booking status pie ─────────────────────────────────────
  const statusCounts: Record<string, number> = {};
  bookings.forEach(b => { statusCounts[b.status] = (statusCounts[b.status] || 0) + 1; });
  const statusData = Object.entries(statusCounts)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name, value, color: STATUS_COLOR[name] || "#9CA3AF" }));

  // ── Daily from analytics ───────────────────────────────────
  const dailyData: { day: string; count: number }[] = analytics?.daily_bookings || [];

  // ── Activity feed ──────────────────────────────────────────
  const feed = [...bookings]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 20)
    .map(b => ({
      id: b.id,
      text: b.status === "completed"
        ? `Ride completed${b.rider_name ? " — " + b.rider_name : ""} — ${b.final_fare ? fmtINR(b.final_fare) : ""}`
        : b.status === "cancelled"
        ? `Booking cancelled${b.rider_name ? " — " + b.rider_name : ""}`
        : b.status === "searching"
        ? `New booking${b.rider_name ? " — " + b.rider_name : ""}${b.service_name ? " (" + b.service_name + ")" : ""}`
        : b.status === "in_progress"
        ? `Ride in progress${b.driver_name ? " — " + b.driver_name : ""}`
        : `Booking ${b.status?.replace("_", " ")}`,
      time: b.created_at,
      dot: STATUS_COLOR[b.status] || "#9CA3AF",
    }));

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  const CUSTOM_TOOLTIP = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white border border-gray-100 rounded-xl shadow-lg px-3 py-2 text-xs">
        <p className="font-semibold text-gray-700 mb-1">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ color: p.color || "#FF6B2B" }}>
            {p.name}: <span className="font-bold">{p.value}</span>
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Refresh badge */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">
          Last updated {lastRefresh.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </p>
        <button onClick={fetchAll}
          className="flex items-center gap-2 text-xs text-gray-500 hover:text-orange-500 transition font-medium">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* ── Row 1: Live stats (6 cards) ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard icon={Activity}      label="Active Rides"    value={activeBookings.length}          color="text-orange-500"  bg="bg-orange-50" />
        <StatCard icon={Car}           label="Drivers Online"  value={onlineDrivers}                  color="text-green-500"   bg="bg-green-50"  />
        <StatCard icon={BookOpen}      label="Bookings Today"  value={analytics?.today_bookings ?? todayBookings.length} color="text-blue-500"    bg="bg-blue-50"   />
        <StatCard icon={TrendingUp}    label="Revenue Today"   value={fmtINR(todayRevenue)}           color="text-orange-500"  bg="bg-orange-50" />
        <StatCard icon={XCircle}       label="Cancelled Today" value={todayCancelled}                 color="text-red-500"     bg="bg-red-50"    />
        <StatCard icon={CheckCircle}   label="Avg Rating"      value={avgRating}                      color="text-yellow-500"  bg="bg-yellow-50" />
      </div>

      {/* ── Row 2: KPI cards (4 large) ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Bookings", value: bookings.length, sub: `${bookings.filter(b=>b.status==="completed").length} completed`, color: "text-blue-600", bg: "bg-blue-50", icon: BookOpen },
          { label: "Total Revenue",  value: fmtINR(analytics?.total_revenue != null ? Number(analytics.total_revenue) : payments.filter(p=>p.status==="completed").reduce((s,p)=>s+Number(p.amount||0),0)), sub: `${analytics?.total_bookings ?? bookings.filter(b=>b.status==="completed").length} completed trips`, color: "text-orange-600", bg: "bg-orange-50", icon: TrendingUp },
          { label: "Total Drivers",  value: drivers.length, sub: `${onlineDrivers} online now`, color: "text-green-600", bg: "bg-green-50", icon: Car },
          { label: "Total Riders",   value: riders.length,  sub: `${riders.filter(r=>isToday(new Date(r.created_at||0))).length} new today`, color: "text-purple-600", bg: "bg-purple-50", icon: Users },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${c.bg}`}>
              <c.icon size={18} className={c.color} />
            </div>
            <p className="text-3xl font-extrabold text-gray-900 mb-1">{c.value}</p>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{c.label}</p>
            <p className="text-xs text-gray-400 mt-1">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Row 3: Charts ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Bookings Today by Hour */}
        <div className="col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-base font-bold text-gray-900">Bookings Today by Hour</h3>
              <p className="text-xs text-gray-400 mt-0.5">{todayBookings.length} bookings so far</p>
            </div>
            <Clock size={16} className="text-gray-300" />
          </div>
          {todayBookings.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-gray-300 text-sm">No bookings yet today</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={hourlyData} margin={{ left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F5F5F5" />
                <XAxis dataKey="hour" tick={{ fontSize: 10, fill: "#9CA3AF" }} interval={2} />
                <YAxis tick={{ fontSize: 10, fill: "#9CA3AF" }} allowDecimals={false} />
                <Tooltip content={<CUSTOM_TOOLTIP />} />
                <Bar dataKey="count" fill="#FF6B2B" radius={[4, 4, 0, 0]} name="Bookings" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Service Split */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-base font-bold text-gray-900 mb-5">Service Split</h3>
          {serviceData.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-gray-300 text-sm">No data yet</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie data={serviceData} cx="50%" cy="50%" innerRadius={45} outerRadius={65} dataKey="value" paddingAngle={2}>
                    {serviceData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip content={<CUSTOM_TOOLTIP />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-3">
                {serviceData.map((s, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                      <span className="text-gray-600 truncate max-w-[120px]">{s.name}</span>
                    </div>
                    <span className="font-bold text-gray-900">{s.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Row 4: Revenue + Status ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Revenue Last 7 Days */}
        <div className="col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-base font-bold text-gray-900 mb-5">Revenue — Last 7 Days</h3>
          {revenueData.every(d => d.revenue === 0) ? (
            <div className="flex items-center justify-center h-40 text-gray-300 text-sm">No payment data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={revenueData} margin={{ left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F5F5F5" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#9CA3AF" }} />
                <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} tickFormatter={v => `₹${v}`} />
                <Tooltip content={<CUSTOM_TOOLTIP />} />
                <Bar dataKey="revenue" fill="#10B981" radius={[4, 4, 0, 0]} name="Revenue (₹)" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Booking Status */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-base font-bold text-gray-900 mb-5">Booking Status</h3>
          {statusData.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-gray-300 text-sm">No bookings yet</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={45} outerRadius={65} dataKey="value" paddingAngle={2}>
                    {statusData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip content={<CUSTOM_TOOLTIP />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-3">
                {statusData.map((s, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                      <span className="text-gray-600 capitalize">{s.name.replace("_", " ")}</span>
                    </div>
                    <span className="font-bold text-gray-900">{s.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Row 5: Recent Bookings + Activity Feed ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Recent Bookings */}
        <div className="col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-gray-900">Recent Bookings</h3>
              <p className="text-xs text-gray-400 mt-0.5">Last 10 bookings</p>
            </div>
            <Link href="/dashboard/bookings"
              className="text-xs text-orange-500 font-semibold hover:underline flex items-center gap-1">
              View all <ArrowUpRight size={12} />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {["Rider","Service","Fare","Status","Time"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {bookings.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-400 text-sm">No bookings yet</td></tr>
                ) : bookings.slice(0, 10).map(b => (
                  <tr key={b.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{b.rider_name || "—"}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{b.service_name || "—"}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                      {b.final_fare ? `₹${b.final_fare}` : b.estimated_fare ? `~₹${b.estimated_fare}` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[11px] font-bold px-2 py-1 rounded-full capitalize ${STATUS_BADGE[b.status] || "bg-gray-100 text-gray-600"}`}>
                        {b.status?.replace("_"," ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">{fmtTime(b.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Live Activity Feed */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-base font-bold text-gray-900">Live Activity</h3>
            <p className="text-xs text-gray-400 mt-0.5">Auto-refreshes every 15s</p>
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: 340 }}>
            {feed.length === 0 ? (
              <div className="flex items-center justify-center py-10 text-gray-400 text-sm">No activity yet</div>
            ) : feed.map((item, i) => (
              <div key={item.id + i} className="px-5 py-3 border-b border-gray-50 flex items-start gap-3">
                <span className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: item.dot }} />
                <div className="min-w-0">
                  <p className="text-xs text-gray-700 leading-relaxed">{item.text}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">{fmtTime(item.time)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Row 6: Quick Actions ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Emergency Broadcast", href: "/dashboard/notifications", color: "bg-red-500 text-white", icon: "📢" },
          { label: "Manage Drivers", href: "/dashboard/drivers", color: "bg-orange-500 text-white", icon: "🚗" },
          { label: "View Analytics", href: "/dashboard/analytics", color: "bg-blue-500 text-white", icon: "📊" },
          { label: "Settings", href: "/dashboard/settings", color: "bg-gray-800 text-white", icon: "⚙️" },
        ].map(a => (
          <Link key={a.href} href={a.href}
            className={`flex items-center gap-3 px-5 py-4 rounded-2xl font-semibold text-sm transition hover:opacity-90 ${a.color}`}>
            <span className="text-xl">{a.icon}</span>
            {a.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
