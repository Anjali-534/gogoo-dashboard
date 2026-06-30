"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";

const API = process.env.NEXT_PUBLIC_API_URL || "https://gogobackend-production.up.railway.app";

const COLORS = {
  orange: "#FF6B2B", blue: "#3B82F6", green: "#10B981",
  red: "#EF4444", purple: "#8B5CF6", yellow: "#F59E0B",
};

function KPI({ label, value, sub, color = "text-gray-900" }: any) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">{label}</p>
      <p className={`text-2xl font-extrabold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

const CHART_TOOLTIP = ({ active, payload, label }: any) => {
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

const TIME_FILTERS = ["Today", "This Week", "This Month", "All Time"] as const;
type TimeFilter = typeof TIME_FILTERS[number];

export default function AnalyticsPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [drivers,  setDrivers]  = useState<any[]>([]);
  const [riders,   setRiders]   = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [analytics,setAnalytics]= useState<any>(null);
  const [loading,  setLoading]  = useState(true);
  const [timeF,    setTimeF]    = useState<TimeFilter>("This Month");
  const [mainTab,  setMainTab]  = useState<"platform" | "app">("platform");

  const token = () => localStorage.getItem("access_token");

  useEffect(() => {
    const h = { Authorization: `Bearer ${token()}` };
    Promise.all([
      axios.get(`${API}/gogoo/analytics`, { headers: h }).catch(() => ({ data: {} })),
      axios.get(`${API}/gogoo/bookings`,  { headers: h }).catch(() => ({ data: [] })),
      axios.get(`${API}/gogoo/drivers`,   { headers: h }).catch(() => ({ data: [] })),
      axios.get(`${API}/gogoo/riders`,    { headers: h }).catch(() => ({ data: [] })),
      axios.get(`${API}/gogoo/payments`,  { headers: h }).catch(() => ({ data: [] })),
    ]).then(([a, b, d, r, p]) => {
      setAnalytics(a.data);
      setBookings(b.data || []);
      setDrivers(d.data  || []);
      setRiders(r.data   || []);
      setPayments(p.data || []);
      setLoading(false);
    });
  }, []);

  const inRange = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    if (timeF === "Today") return d.toDateString() === now.toDateString();
    if (timeF === "This Week") return (now.getTime() - d.getTime()) < 7 * 86400000;
    if (timeF === "This Month") return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    return true;
  };

  const filtBookings = bookings.filter(b => inRange(b.created_at));
  const filtPayments = payments.filter(p => inRange(p.created_at));

  const completed   = filtBookings.filter(b => b.status === "completed").length;
  const cancelled   = filtBookings.filter(b => b.status === "cancelled").length;
  const active      = filtBookings.filter(b => ["searching","accepted","arriving","in_progress"].includes(b.status)).length;
  const convRate    = filtBookings.length ? Math.round((completed / filtBookings.length) * 100) : 0;
  const revenue     = filtPayments.filter(p=>p.status==="completed").reduce((s,p)=>s+Number(p.amount||0),0);
  const commission  = filtPayments.filter(p=>p.status==="completed").reduce((s,p)=>s+Number(p.platform_fee||0),0);
  const verifiedD   = drivers.filter(d => d.is_verified).length;
  const onlineD     = drivers.filter(d => d.is_online).length;
  const avgRating   = drivers.length ? (drivers.reduce((s,d)=>s+Number(d.rating||0),0)/drivers.length).toFixed(1) : "—";

  // ── Bookings by day ──────────────────────────────────────
  const dailyBookings: Record<string, number> = {};
  const driverSignups: Record<string, number> = {};
  const riderSignups:  Record<string, number> = {};
  const revenueByDay:  Record<string, number> = {};

  filtBookings.forEach(b => {
    const d = new Date(b.created_at).toLocaleDateString("en-IN",{day:"numeric",month:"short"});
    dailyBookings[d] = (dailyBookings[d]||0) + 1;
  });
  drivers.filter(d=>d.created_at && inRange(d.created_at)).forEach(d => {
    const key = new Date(d.created_at).toLocaleDateString("en-IN",{day:"numeric",month:"short"});
    driverSignups[key] = (driverSignups[key]||0) + 1;
  });
  riders.filter(r=>r.created_at && inRange(r.created_at)).forEach(r => {
    const key = new Date(r.created_at).toLocaleDateString("en-IN",{day:"numeric",month:"short"});
    riderSignups[key] = (riderSignups[key]||0) + 1;
  });
  filtPayments.filter(p=>p.status==="completed").forEach(p => {
    const key = new Date(p.created_at).toLocaleDateString("en-IN",{day:"numeric",month:"short"});
    revenueByDay[key] = (revenueByDay[key]||0) + Number(p.amount||0);
  });

  const keys = [...new Set([...Object.keys(dailyBookings),...Object.keys(revenueByDay)])].sort((a,b)=>new Date(a).getTime()-new Date(b).getTime());
  const trendData = keys.map(k => ({
    day: k,
    bookings: dailyBookings[k] || 0,
    revenue: Math.round(revenueByDay[k] || 0),
  }));

  // ── Status pie ───────────────────────────────────────────
  const statusPie = [
    { name:"Completed",   value: completed, color: COLORS.green  },
    { name:"Cancelled",   value: cancelled, color: COLORS.red    },
    { name:"Active",      value: active,    color: COLORS.orange  },
  ].filter(s=>s.value>0);

  // ── Fleet pie ────────────────────────────────────────────
  const fleetPie = [
    { name:"Cab",       value: drivers.filter(d=>d.vehicle_category==="cab").length,       color: COLORS.orange },
    { name:"Truck",     value: drivers.filter(d=>d.vehicle_category==="truck").length,     color: COLORS.blue   },
    { name:"Ambulance", value: drivers.filter(d=>d.vehicle_category==="ambulance").length, color: COLORS.red    },
  ].filter(s=>s.value>0);

  // ── Service breakdown ────────────────────────────────────
  const svcMap: Record<string,number> = {};
  filtBookings.forEach(b => { const s=b.service_name||"Unknown"; svcMap[s]=(svcMap[s]||0)+1; });
  const svcData = Object.entries(svcMap).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([name,value])=>({ name, value }));

  // ── Top drivers / riders ─────────────────────────────────
  const topDrivers = [...drivers].sort((a,b)=>(b.total_rides||0)-(a.total_rides||0)).slice(0,8);
  const riderActivity: Record<string,number> = {};
  bookings.forEach(b => { if (b.rider_name) riderActivity[b.rider_name]=(riderActivity[b.rider_name]||0)+1; });
  const topRiders = Object.entries(riderActivity).sort((a,b)=>b[1]-a[1]).slice(0,8);

  // ── Driver signups chart ─────────────────────────────────
  const signupKeys = [...new Set([...Object.keys(driverSignups),...Object.keys(riderSignups)])].sort();
  const signupData = signupKeys.map(k=>({day:k, drivers: driverSignups[k]||0, riders: riderSignups[k]||0}));

  // ── App Analytics derived stats ──────────────────────────
  const allSvcMap: Record<string,number> = {};
  bookings.forEach(b => { const s = b.service_name||"Unknown"; allSvcMap[s]=(allSvcMap[s]||0)+1; });
  const mostPopularService = Object.entries(allSvcMap).sort((a,b)=>b[1]-a[1])[0]?.[0] ?? "—";

  const hourCounts: Record<number,number> = {};
  bookings.forEach(b => {
    const h = new Date(b.created_at).getHours();
    hourCounts[h] = (hourCounts[h]||0) + 1;
  });
  const peakHourEntry = Object.entries(hourCounts).sort((a,b)=>Number(b[1])-Number(a[1]))[0];
  const peakHour = peakHourEntry ? `${peakHourEntry[0]}:00–${Number(peakHourEntry[0])+1}:00` : "—";

  const areaCount: Record<string,number> = {};
  bookings.forEach(b => {
    if (b.pickup_address) {
      const area = b.pickup_address.split(",")[0]?.trim() || b.pickup_address;
      areaCount[area] = (areaCount[area]||0) + 1;
    }
  });
  const topPickupArea = Object.entries(areaCount).sort((a,b)=>b[1]-a[1])[0]?.[0] ?? "—";

  const svcChartData = Object.entries(allSvcMap)
    .sort((a,b)=>b[1]-a[1])
    .slice(0,6)
    .map(([name,count]) => ({ name, count }));

  const appStarted   = analytics?.app_bookings_started   ?? 0;
  const appCompleted = analytics?.app_bookings_completed ?? 0;
  const appRate      = analytics?.app_completion_rate    ?? 0;
  const appUsers     = analytics?.app_users_today        ?? 0;
  const appCrashes   = analytics?.app_crashes_today      ?? 0;

  const funnelSteps = [
    { label: "App Opened",       value: appUsers,     color: "#3B82F6" },
    { label: "Booking Started",  value: appStarted,   color: "#8B5CF6" },
    { label: "Vehicle Selected", value: 0,            color: "#F59E0B" },
    { label: "Review",           value: 0,            color: "#10B981" },
    { label: "Completed",        value: appCompleted, color: "#10B981" },
  ];

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({length:8}).map((_,i)=><div key={i} className="h-24 bg-gray-100 rounded-2xl"/>)}
        </div>
        <div className="h-64 bg-gray-100 rounded-2xl"/>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Main tab nav ── */}
      <div className="flex items-center gap-2">
        {(["platform", "app"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setMainTab(tab)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
              mainTab === tab
                ? "bg-orange-500 text-white shadow-sm"
                : "bg-white border border-gray-100 text-gray-500 hover:text-gray-900"
            }`}
          >
            {tab === "platform" ? "📊 Platform Analytics" : "📱 App Analytics"}
          </button>
        ))}
      </div>

      {/* ══════════════ PLATFORM ANALYTICS ══════════════ */}
      {mainTab === "platform" && (
        <>
          {/* Time filter */}
          <div className="flex items-center gap-2 bg-white border border-gray-100 shadow-sm rounded-2xl p-1 w-fit">
            {TIME_FILTERS.map(f => (
              <button key={f} onClick={() => setTimeF(f)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
                  timeF === f ? "bg-orange-500 text-white shadow-sm" : "text-gray-500 hover:text-gray-900"
                }`}>
                {f}
              </button>
            ))}
          </div>

          {/* ── KPI Row 1 ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <KPI label="Total Bookings"   value={filtBookings.length}                  />
            <KPI label="Completed"        value={completed}    color="text-green-600"  />
            <KPI label="Cancelled"        value={cancelled}    color="text-red-500"    />
            <KPI label="Active Now"       value={active}       color="text-orange-500" />
            <KPI label="Conversion Rate"  value={`${convRate}%`}                       />
            <KPI label="Total Revenue"    value={`₹${Math.round(revenue).toLocaleString("en-IN")}`} color="text-orange-500" />
          </div>

          {/* ── KPI Row 2 ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KPI label="Platform Commission" value={`₹${Math.round(commission).toLocaleString("en-IN")}`} color="text-orange-500" />
            <KPI label="Total Drivers"     value={drivers.length}   />
            <KPI label="Verified Drivers"  value={verifiedD}        color="text-green-600" />
            <KPI label="Online Now"        value={onlineD}          color="text-green-600" />
            <KPI label="Avg Driver Rating" value={`⭐ ${avgRating}`} />
            <KPI label="Total Riders"      value={riders.length}    />
            <KPI label="Paid Trips"        value={filtPayments.filter(p=>p.status==="completed").length} />
            <KPI label="Driver Earnings"   value={`₹${Math.round(filtPayments.reduce((s,p)=>s+Number(p.driver_earnings||0),0)).toLocaleString("en-IN")}`} color="text-green-600" />
          </div>

          {/* ── Trend Chart ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-base font-bold text-gray-900 mb-5">Bookings & Revenue Trend</h3>
            {trendData.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-gray-300 text-sm">No data for this period</div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={trendData} margin={{ left:-10 }}>
                  <defs>
                    <linearGradient id="bookGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={COLORS.orange} stopOpacity={0.15}/>
                      <stop offset="95%" stopColor={COLORS.orange} stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={COLORS.green} stopOpacity={0.15}/>
                      <stop offset="95%" stopColor={COLORS.green} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F5F5F5" />
                  <XAxis dataKey="day" tick={{ fontSize:11, fill:"#9CA3AF" }} />
                  <YAxis yAxisId="b" tick={{ fontSize:11, fill:"#9CA3AF" }} allowDecimals={false} />
                  <YAxis yAxisId="r" orientation="right" tick={{ fontSize:11, fill:"#9CA3AF" }} tickFormatter={v=>`₹${v}`} />
                  <Tooltip content={<CHART_TOOLTIP />} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize:12 }} />
                  <Area yAxisId="b" type="monotone" dataKey="bookings" stroke={COLORS.orange} strokeWidth={2} fill="url(#bookGrad)" name="Bookings" />
                  <Area yAxisId="r" type="monotone" dataKey="revenue"  stroke={COLORS.green}  strokeWidth={2} fill="url(#revGrad)"  name="Revenue (₹)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* ── Donut charts row ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="text-sm font-bold text-gray-900 mb-5">Booking Status</h3>
              {statusPie.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-gray-300 text-sm">No data</div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={140}>
                    <PieChart>
                      <Pie data={statusPie} cx="50%" cy="50%" innerRadius={45} outerRadius={65} dataKey="value" paddingAngle={2}>
                        {statusPie.map((e,i)=><Cell key={i} fill={e.color}/>)}
                      </Pie>
                      <Tooltip content={<CHART_TOOLTIP />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-1.5 mt-3">
                    {statusPie.map((s,i)=>(
                      <div key={i} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full" style={{backgroundColor:s.color}}/>
                          <span className="text-gray-600">{s.name}</span>
                        </div>
                        <span className="font-bold text-gray-900">{s.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="text-sm font-bold text-gray-900 mb-5">Driver Fleet</h3>
              {fleetPie.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-gray-300 text-sm">No drivers</div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={140}>
                    <PieChart>
                      <Pie data={fleetPie} cx="50%" cy="50%" innerRadius={45} outerRadius={65} dataKey="value" paddingAngle={2}>
                        {fleetPie.map((e,i)=><Cell key={i} fill={e.color}/>)}
                      </Pie>
                      <Tooltip content={<CHART_TOOLTIP />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-1.5 mt-3">
                    {fleetPie.map((s,i)=>(
                      <div key={i} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full" style={{backgroundColor:s.color}}/>
                          <span className="text-gray-600">{s.name}</span>
                        </div>
                        <span className="font-bold text-gray-900">{s.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="text-sm font-bold text-gray-900 mb-5">Bookings by Service</h3>
              {svcData.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-gray-300 text-sm">No data</div>
              ) : (
                <div className="space-y-2">
                  {svcData.map((s,i)=>{
                    const max = svcData[0]?.value || 1;
                    return (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-xs text-gray-600 w-24 truncate flex-shrink-0">{s.name}</span>
                        <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-5 bg-orange-500 rounded-full" style={{width:`${(s.value/max)*100}%`}}/>
                        </div>
                        <span className="text-xs font-bold text-gray-900 w-6 text-right">{s.value}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── Signups chart ── */}
          {signupData.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="text-base font-bold text-gray-900 mb-5">New Signups (Drivers & Riders)</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={signupData} margin={{left:-10}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F5F5F5"/>
                  <XAxis dataKey="day" tick={{fontSize:11,fill:"#9CA3AF"}}/>
                  <YAxis tick={{fontSize:11,fill:"#9CA3AF"}} allowDecimals={false}/>
                  <Tooltip content={<CHART_TOOLTIP/>}/>
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{fontSize:12}}/>
                  <Bar dataKey="drivers" fill={COLORS.orange} radius={[4,4,0,0]} name="Drivers"/>
                  <Bar dataKey="riders"  fill={COLORS.blue}   radius={[4,4,0,0]} name="Riders"/>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* ── Top Tables ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="text-sm font-bold text-gray-900">Top Drivers by Rides</h3>
              </div>
              {topDrivers.length === 0 ? (
                <div className="px-5 py-8 text-center text-gray-400 text-sm">No drivers yet</div>
              ) : topDrivers.map((d,i)=>(
                <div key={d.id} className="px-5 py-3 border-b border-gray-50 flex items-center gap-3">
                  <span className="text-xs font-bold text-gray-400 w-5">#{i+1}</span>
                  <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 text-xs font-bold">
                    {d.name?.[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{d.name}</p>
                    <p className="text-xs text-gray-400 capitalize">{d.vehicle_category}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-orange-500">{d.total_rides} rides</p>
                    <p className="text-xs text-gray-400">⭐ {Number(d.rating||0).toFixed(1)}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="text-sm font-bold text-gray-900">Most Active Riders</h3>
              </div>
              {topRiders.length === 0 ? (
                <div className="px-5 py-8 text-center text-gray-400 text-sm">No activity yet</div>
              ) : topRiders.map(([name,count],i)=>(
                <div key={name} className="px-5 py-3 border-b border-gray-50 flex items-center gap-3">
                  <span className="text-xs font-bold text-gray-400 w-5">#{i+1}</span>
                  <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold">
                    {name[0]?.toUpperCase()}
                  </div>
                  <span className="flex-1 text-sm font-semibold text-gray-900 truncate">{name}</span>
                  <span className="text-xs font-bold bg-blue-50 text-blue-600 px-2 py-1 rounded-full">{count} trips</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ══════════════ APP ANALYTICS ══════════════ */}
      {mainTab === "app" && (
        <div className="space-y-6">
          {/* Section 1: KPI cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { emoji: "📱", label: "App Users Today",    value: appUsers,     color: "text-blue-600"  },
              { emoji: "🚗", label: "Bookings Started",   value: appStarted,   color: "text-blue-600"  },
              { emoji: "✅", label: "Bookings Completed", value: appCompleted, color: "text-green-600" },
              { emoji: "❌", label: "Bookings Cancelled", value: analytics?.app_bookings_cancelled ?? 0, color: "text-red-500" },
              { emoji: "💥", label: "Crashes Today",      value: appCrashes,   color: "text-red-500"   },
            ].map(({ emoji, label, value, color }) => (
              <div key={label} className="bg-white rounded-2xl border border-blue-100 shadow-sm p-5">
                <p className="text-2xl mb-2">{emoji}</p>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
                <p className={`text-2xl font-extrabold ${color}`}>{value}</p>
              </div>
            ))}
            <div className="bg-white rounded-2xl border border-blue-100 shadow-sm p-5">
              <p className="text-2xl mb-2">⭐</p>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Completion Rate</p>
              <p className={`text-2xl font-extrabold ${
                appRate >= 70 ? "text-green-600" : appRate >= 50 ? "text-yellow-600" : "text-red-500"
              }`}>
                {appRate.toFixed(1)}%
              </p>
            </div>
          </div>

          {/* Section 1b: Derived insights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-blue-100 shadow-sm p-5">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Most Popular Service</p>
              <p className="text-xl font-bold text-blue-600">{mostPopularService}</p>
            </div>
            <div className="bg-white rounded-2xl border border-blue-100 shadow-sm p-5">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Peak Booking Hour</p>
              <p className="text-xl font-bold text-blue-600">{peakHour}</p>
            </div>
            <div className="bg-white rounded-2xl border border-blue-100 shadow-sm p-5">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Top Pickup Area</p>
              <p className="text-xl font-bold text-blue-600 truncate">{topPickupArea}</p>
            </div>
          </div>

          {/* Section 2: Bookings by Service Type bar chart */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-base font-bold text-gray-900 mb-5">Bookings by Service Type</h3>
            {svcChartData.length === 0 ? (
              <div className="flex items-center justify-center h-40 text-gray-300 text-sm">No booking data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={svcChartData} margin={{ left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F5F5F5" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#9CA3AF" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} allowDecimals={false} />
                  <Tooltip content={<CHART_TOOLTIP />} />
                  <Bar dataKey="count" fill={COLORS.blue} radius={[4, 4, 0, 0]} name="Bookings" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Section 3: Booking Funnel */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-base font-bold text-gray-900 mb-5">Booking Funnel</h3>
            <div className="space-y-3">
              {funnelSteps.map((step, i) => {
                const max = funnelSteps[0]?.value || 1;
                const widthPct = max > 0 && step.value > 0 ? Math.max((step.value / max) * 100, 6) : 0;
                const prevVal = funnelSteps[i - 1]?.value;
                const dropOff = i > 0 && prevVal != null && prevVal > 0
                  ? Math.round((step.value / prevVal) * 100)
                  : null;
                return (
                  <div key={step.label} className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-36 flex-shrink-0">{step.label}</span>
                    <div className="flex-1 h-8 bg-gray-100 rounded-lg overflow-hidden">
                      <div
                        className="h-8 rounded-lg flex items-center px-3 transition-all duration-500"
                        style={{ width: `${widthPct}%`, backgroundColor: step.color }}
                      >
                        {step.value > 0 && (
                          <span className="text-white text-xs font-bold whitespace-nowrap">{step.value}</span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs font-bold text-gray-700 w-10 text-right">{step.value}</span>
                    {dropOff !== null && (
                      <span className="text-[10px] text-gray-400 w-12">{dropOff}% kept</span>
                    )}
                  </div>
                );
              })}
            </div>
            {funnelSteps.every(s => s.value === 0) && (
              <p className="text-xs text-gray-400 text-center mt-4">
                Funnel data populates once Firebase Analytics events are being tracked in the app
              </p>
            )}
          </div>

          {/* Section 4: Firebase Console link */}
          <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
            <p className="text-sm font-semibold text-blue-700 mb-1">🔥 Firebase Console</p>
            <p className="text-xs text-blue-600 mb-3">
              View detailed crash reports, user flows, retention and more in Firebase Console
            </p>
            <a
              href="https://console.firebase.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Open Firebase Console →
            </a>
          </div>

          {/* Section 5: Crashlytics */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900">💥 Crash Reports</h3>
                <p className="text-xs text-gray-400 mt-0.5">Powered by Firebase Crashlytics</p>
              </div>
              <a
                href="https://console.firebase.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-500 font-semibold hover:text-blue-700"
              >
                View in Firebase →
              </a>
            </div>
            <div className="px-6 py-8 text-center">
              {appCrashes === 0 ? (
                <p className="text-gray-400 text-sm">No crashes recorded 🎉</p>
              ) : (
                <p className="text-red-500 font-bold text-lg">{appCrashes} crashes today</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
