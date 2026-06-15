"use client";
import { useEffect, useState } from "react";
import axios from "axios";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

function StatCard({ icon, label, value, sub, color }: any) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
      <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center text-lg mb-3`}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-gray-500 text-xs mt-1">{label}</p>
      {sub && <p className="text-gray-400 text-xs mt-0.5">{sub}</p>}
    </div>
  );
}

function BarChart({ data, color = "#FF6B2B", label }: { data: { label: string; value: number }[]; color?: string; label: string }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div>
      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">{label}</p>
      <div className="flex items-end gap-2 h-28">
        {data.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <span className="text-xs text-gray-500 font-medium">{d.value}</span>
            <div
              className="w-full rounded-t-lg transition-all"
              style={{ height: `${Math.max((d.value / max) * 100, 4)}%`, backgroundColor: color, minHeight: 4 }}
            />
            <span className="text-xs text-gray-400 truncate w-full text-center">{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DonutChart({ segments, size = 120 }: { segments: { label: string; value: number; color: string }[]; size?: number }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  let cumulative = 0;
  const r = 40;
  const cx = size / 2;
  const cy = size / 2;

  const paths = segments.map(seg => {
    const pct = seg.value / total;
    const startAngle = cumulative * 2 * Math.PI - Math.PI / 2;
    const endAngle = (cumulative + pct) * 2 * Math.PI - Math.PI / 2;
    cumulative += pct;
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const largeArc = pct > 0.5 ? 1 : 0;
    return { d: `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`, color: seg.color, label: seg.label, value: seg.value };
  });

  return (
    <div className="flex items-center gap-6">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {paths.map((p, i) => <path key={i} d={p.d} fill={p.color} opacity={0.85} />)}
        <circle cx={cx} cy={cy} r={24} fill="white" />
        <text x={cx} y={cy + 4} textAnchor="middle" fontSize="11" fontWeight="700" fill="#111">{total}</text>
      </svg>
      <div className="flex flex-col gap-2">
        {segments.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
            <span className="text-xs text-gray-600">{s.label}</span>
            <span className="text-xs font-bold text-gray-900 ml-auto">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const [stats,    setStats]    = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [drivers,  setDrivers]  = useState<any[]>([]);
  const [riders,   setRiders]   = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);

  const token = () => localStorage.getItem("access_token");

  useEffect(() => {
    const h = { Authorization: `Bearer ${token()}` };
    Promise.all([
      axios.get(`${API}/gogoo/analytics`,  { headers: h }).catch(() => ({ data: {} })),
      axios.get(`${API}/gogoo/bookings`,   { headers: h }).catch(() => ({ data: [] })),
      axios.get(`${API}/gogoo/drivers`,    { headers: h }).catch(() => ({ data: [] })),
      axios.get(`${API}/gogoo/riders`,     { headers: h }).catch(() => ({ data: [] })),
      axios.get(`${API}/gogoo/payments`,   { headers: h }).catch(() => ({ data: [] })),
    ]).then(([s, b, d, r, p]) => {
      setStats(s.data);
      setBookings(b.data || []);
      setDrivers(d.data || []);
      setRiders(r.data || []);
      setPayments(p.data || []);
      setLoading(false);
    });
  }, []);

  const totalRevenue    = payments.filter(p => p.status === "completed").reduce((s, p) => s + Number(p.amount || 0), 0);
  const platformFee     = payments.filter(p => p.status === "completed").reduce((s, p) => s + Number(p.platform_fee || 0), 0);
  const completedTrips  = bookings.filter(b => b.status === "completed").length;
  const cancelledTrips  = bookings.filter(b => b.status === "cancelled").length;
  const activeTrips     = bookings.filter(b => ["searching","accepted","arriving","in_progress"].includes(b.status)).length;
  const conversionRate  = bookings.length ? Math.round((completedTrips / bookings.length) * 100) : 0;
  const verifiedDrivers = drivers.filter(d => d.is_verified).length;
  const onlineDrivers   = drivers.filter(d => d.is_online).length;
  const avgRating       = drivers.length ? (drivers.reduce((s, d) => s + Number(d.rating || 0), 0) / drivers.length).toFixed(1) : "—";

  const statusSegments = [
    { label: "Completed",   value: completedTrips, color: "#10B981" },
    { label: "Searching",   value: bookings.filter(b => b.status === "searching").length,   color: "#F59E0B" },
    { label: "In Progress", value: bookings.filter(b => b.status === "in_progress").length, color: "#3B82F6" },
    { label: "Cancelled",   value: cancelledTrips, color: "#EF4444" },
  ].filter(s => s.value > 0);

  const categorySegments = [
    { label: "Cab",       value: drivers.filter(d => d.vehicle_category === "cab").length,       color: "#3B82F6" },
    { label: "Truck",     value: drivers.filter(d => d.vehicle_category === "truck").length,     color: "#FF6B2B" },
    { label: "Ambulance", value: drivers.filter(d => d.vehicle_category === "ambulance").length, color: "#EF4444" },
  ].filter(s => s.value > 0);

  const dailyData = (stats?.daily_bookings || []).map((d: any) => ({ label: d.day, value: d.count }));

  const serviceCount: Record<string, number> = {};
  bookings.forEach(b => {
    const s = b.service_name || "Unknown";
    serviceCount[s] = (serviceCount[s] || 0) + 1;
  });
  const serviceData = Object.entries(serviceCount)
    .sort((a, b) => b[1] - a[1]).slice(0, 7)
    .map(([label, value]) => ({ label, value }));

  const revenueByDay: Record<string, number> = {};
  payments.forEach(p => {
    if (p.status !== "completed") return;
    const day = new Date(p.created_at).toLocaleDateString("en-IN", { weekday: "short" });
    revenueByDay[day] = (revenueByDay[day] || 0) + Number(p.amount || 0);
  });
  const revenueData = Object.entries(revenueByDay).map(([label, value]) => ({ label, value: Math.round(value) }));

  const riderActivity: Record<string, number> = {};
  bookings.forEach(b => { if (b.rider_name) riderActivity[b.rider_name] = (riderActivity[b.rider_name] || 0) + 1; });
  const topRiders = Object.entries(riderActivity).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const topDrivers = [...drivers].sort((a, b) => (b.total_rides || 0) - (a.total_rides || 0)).slice(0, 5);

  const recentRiders = [...riders].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-4xl mb-3">📊</div>
          <p className="text-gray-500">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-500 text-sm mt-0.5">Full platform overview — live data</p>
      </div>

      {/* KPI Row 1 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard icon="📋" label="Total Bookings"  value={bookings.length}                                                                        color="bg-blue-50"   />
        <StatCard icon="✅" label="Completed Trips" value={completedTrips}                                                                         color="bg-green-50"  />
        <StatCard icon="🔄" label="Active Now"      value={activeTrips}                                                                            color="bg-yellow-50" />
        <StatCard icon="❌" label="Cancelled"       value={cancelledTrips}                                                                         color="bg-red-50"    />
        <StatCard icon="₹" label="Total Revenue"   value={`₹${Math.round(totalRevenue).toLocaleString()}`}                                        color="bg-orange-50" />
        <StatCard icon="💰" label="Platform Fees"  value={`₹${Math.round(platformFee).toLocaleString()}`}                                         color="bg-purple-50" />
      </div>

      {/* KPI Row 2 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon="🚗" label="Total Drivers"     value={drivers.length}                                                                       color="bg-orange-50" />
        <StatCard icon="✔"  label="Verified Drivers"  value={verifiedDrivers}                                                                      color="bg-green-50"  />
        <StatCard icon="🟢" label="Online Now"        value={onlineDrivers}                                                                        color="bg-green-50"  />
        <StatCard icon="⭐" label="Avg Driver Rating" value={avgRating}                                                                            color="bg-yellow-50" />
        <StatCard icon="👤" label="Total Riders"      value={riders.length}                                                                        color="bg-blue-50"   />
        <StatCard icon="📈" label="Conversion Rate"   value={`${conversionRate}%`}            sub="booked → completed"                            color="bg-indigo-50" />
        <StatCard icon="💳" label="Paid Trips"        value={payments.filter(p=>p.status==="completed").length}                                    color="bg-green-50"  />
        <StatCard icon="🏧" label="Driver Earnings"   value={`₹${Math.round(payments.reduce((s,p)=>s+Number(p.driver_earnings||0),0)).toLocaleString()}`} color="bg-teal-50" />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm col-span-2">
          <h2 className="text-gray-900 font-bold mb-4">Bookings — Last 7 Days</h2>
          {dailyData.length > 0
            ? <BarChart data={dailyData} color="#FF6B2B" label="Daily booking count" />
            : <p className="text-gray-400 text-sm text-center py-8">No data yet</p>}
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <h2 className="text-gray-900 font-bold mb-4">Booking Status</h2>
          {statusSegments.length > 0
            ? <DonutChart segments={statusSegments} />
            : <p className="text-gray-400 text-sm text-center py-8">No bookings yet</p>}
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm col-span-2">
          <h2 className="text-gray-900 font-bold mb-4">Revenue by Day</h2>
          {revenueData.length > 0
            ? <BarChart data={revenueData} color="#10B981" label="Revenue (₹)" />
            : <p className="text-gray-400 text-sm text-center py-8">No payment data yet</p>}
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <h2 className="text-gray-900 font-bold mb-4">Driver Fleet</h2>
          {categorySegments.length > 0
            ? <DonutChart segments={categorySegments} />
            : <p className="text-gray-400 text-sm text-center py-8">No drivers yet</p>}
        </div>
      </div>

      {/* Bookings by service */}
      {serviceData.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <h2 className="text-gray-900 font-bold mb-4">Bookings by Service Type</h2>
          <BarChart data={serviceData} color="#3B82F6" label="Number of bookings" />
        </div>
      )}

      {/* Tables Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

        {/* Top Riders */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-gray-900 font-bold">Top Riders</h2>
              <p className="text-gray-400 text-xs mt-0.5">By number of bookings</p>
            </div>
            <a href="/dashboard/users" className="text-xs text-[#FF6B2B] font-semibold hover:underline">View all →</a>
          </div>
          {topRiders.length === 0
            ? <p className="text-gray-400 text-sm text-center py-8">No data</p>
            : topRiders.map(([name, count], i) => (
              <div key={name} className="px-5 py-3 flex items-center gap-3 border-b border-gray-50">
                <span className="text-xs font-bold text-gray-400 w-5">#{i+1}</span>
                <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold">
                  {name[0]?.toUpperCase()}
                </div>
                <span className="flex-1 text-gray-900 text-sm font-medium truncate">{name}</span>
                <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold">{count} trips</span>
              </div>
            ))
          }
        </div>

        {/* Top Drivers */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-gray-900 font-bold">Top Drivers</h2>
              <p className="text-gray-400 text-xs mt-0.5">By total rides</p>
            </div>
            <a href="/dashboard/drivers" className="text-xs text-[#FF6B2B] font-semibold hover:underline">View all →</a>
          </div>
          {topDrivers.length === 0
            ? <p className="text-gray-400 text-sm text-center py-8">No data</p>
            : topDrivers.map((d, i) => (
              <div key={d.id} className="px-5 py-3 flex items-center gap-3 border-b border-gray-50">
                <span className="text-xs font-bold text-gray-400 w-5">#{i+1}</span>
                <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 text-xs font-bold">
                  {d.name?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-gray-900 text-sm font-medium truncate">{d.name}</p>
                  <p className="text-gray-400 text-xs capitalize">{d.vehicle_category}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-orange-600">{d.total_rides} rides</p>
                  <p className="text-xs text-gray-400">⭐ {Number(d.rating||0).toFixed(1)}</p>
                </div>
              </div>
            ))
          }
        </div>

        {/* Recent Signups */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-gray-900 font-bold">Recent Signups</h2>
              <p className="text-gray-400 text-xs mt-0.5">Latest riders joined</p>
            </div>
            <a href="/dashboard/users" className="text-xs text-[#FF6B2B] font-semibold hover:underline">View all →</a>
          </div>
          {recentRiders.length === 0
            ? <p className="text-gray-400 text-sm text-center py-8">No riders yet</p>
            : recentRiders.map(r => (
              <div key={r.id} className="px-5 py-3 flex items-center gap-3 border-b border-gray-50">
                <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-xs font-bold">
                  {r.name?.[0]?.toUpperCase() || "R"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-gray-900 text-sm font-medium truncate">{r.name || "—"}</p>
                  <p className="text-gray-400 text-xs truncate">{r.email || r.phone || "—"}</p>
                </div>
                <p className="text-xs text-gray-400 flex-shrink-0">
                  {r.created_at ? new Date(r.created_at).toLocaleDateString("en-IN",{day:"numeric",month:"short"}) : "—"}
                </p>
              </div>
            ))
          }
        </div>
      </div>

      {/* Recent Bookings Table */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-gray-900 font-bold">Recent Bookings</h2>
            <p className="text-gray-400 text-xs mt-0.5">Last 10 bookings with full details</p>
          </div>
          <a href="/dashboard/bookings" className="text-xs text-[#FF6B2B] font-semibold hover:underline">View all →</a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {["Rider","Service","Pickup","Drop","Fare","Status","Time"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {bookings.slice(0,10).map(b => (
                <tr key={b.id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3 text-sm text-gray-900 font-medium">{b.rider_name||"—"}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">{b.service_name||"—"}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 max-w-[120px] truncate">{b.pickup_address||"—"}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 max-w-[120px] truncate">{b.drop_address||"—"}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                    {b.final_fare ? `₹${b.final_fare}` : b.estimated_fare ? `~₹${b.estimated_fare}` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold capitalize ${
                      b.status==="completed"   ? "bg-green-100 text-green-700"  :
                      b.status==="cancelled"   ? "bg-red-100 text-red-700"      :
                      b.status==="searching"   ? "bg-yellow-100 text-yellow-700":
                      b.status==="in_progress" ? "bg-blue-100 text-blue-700"    :
                      "bg-gray-100 text-gray-600"
                    }`}>{b.status?.replace("_"," ")}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {b.created_at ? new Date(b.created_at).toLocaleString("en-IN",{dateStyle:"short",timeStyle:"short"}) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}