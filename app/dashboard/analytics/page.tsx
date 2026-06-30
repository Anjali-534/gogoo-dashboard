"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import {
  BarChart, Bar, PieChart, Pie, Cell,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";

const API = process.env.NEXT_PUBLIC_API_URL || "https://gogobackend-production.up.railway.app";

const COLORS = {
  orange: "#FF6B2B", blue: "#3B82F6", green: "#10B981",
  red: "#EF4444", purple: "#8B5CF6", yellow: "#F59E0B",
};

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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
  const [bookings,  setBookings]  = useState<any[]>([]);
  const [drivers,   setDrivers]   = useState<any[]>([]);
  const [riders,    setRiders]    = useState<any[]>([]);
  const [payments,  setPayments]  = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading,   setLoading]   = useState(true);
  const [timeF,     setTimeF]     = useState<TimeFilter>("This Month");
  const [mainTab,   setMainTab]   = useState<"platform" | "app">("platform");

  // App analytics sub-data
  const [screenTimes,  setScreenTimes]  = useState<any[]>([]);
  const [geoData,      setGeoData]      = useState<any[]>([]);
  const [deviceData,   setDeviceData]   = useState<any>(null);
  const [retentionData,setRetentionData]= useState<any>(null);
  const [sessionData,  setSessionData]  = useState<any>(null);
  const [heatmapData,  setHeatmapData]  = useState<any[]>([]);
  const [funnelData,   setFunnelData]   = useState<any>(null);

  const token = () => localStorage.getItem("access_token");

  useEffect(() => {
    const h = { Authorization: `Bearer ${token()}` };
    Promise.all([
      axios.get(`${API}/gogoo/analytics`,                  { headers: h }).catch(() => ({ data: {} })),
      axios.get(`${API}/gogoo/bookings`,                   { headers: h }).catch(() => ({ data: [] })),
      axios.get(`${API}/gogoo/drivers`,                    { headers: h }).catch(() => ({ data: [] })),
      axios.get(`${API}/gogoo/riders`,                     { headers: h }).catch(() => ({ data: [] })),
      axios.get(`${API}/gogoo/payments`,                   { headers: h }).catch(() => ({ data: [] })),
      axios.get(`${API}/gogoo/analytics/screen-times`,     { headers: h }).catch(() => ({ data: [] })),
      axios.get(`${API}/gogoo/analytics/geo-distribution`, { headers: h }).catch(() => ({ data: [] })),
      axios.get(`${API}/gogoo/analytics/device-breakdown`, { headers: h }).catch(() => ({ data: null })),
      axios.get(`${API}/gogoo/analytics/retention`,        { headers: h }).catch(() => ({ data: null })),
      axios.get(`${API}/gogoo/analytics/sessions`,         { headers: h }).catch(() => ({ data: null })),
      axios.get(`${API}/gogoo/analytics/usage-heatmap`,    { headers: h }).catch(() => ({ data: [] })),
      axios.get(`${API}/gogoo/analytics/funnel`,           { headers: h }).catch(() => ({ data: null })),
    ]).then(([a, b, d, r, p, st, geo, dev, ret, sess, hmap, funnel]) => {
      setAnalytics(a.data);
      setBookings(b.data  || []);
      setDrivers(d.data   || []);
      setRiders(r.data    || []);
      setPayments(p.data  || []);
      setScreenTimes(st.data  || []);
      setGeoData(geo.data     || []);
      setDeviceData(dev.data  || null);
      setRetentionData(ret.data  || null);
      setSessionData(sess.data   || null);
      setHeatmapData(hmap.data   || []);
      setFunnelData(funnel.data  || null);
      setLoading(false);
    });
  }, []);

  const inRange = (iso: string) => {
    const d   = new Date(iso);
    const now = new Date();
    if (timeF === "Today")      return d.toDateString() === now.toDateString();
    if (timeF === "This Week")  return (now.getTime() - d.getTime()) < 7 * 86400000;
    if (timeF === "This Month") return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    return true;
  };

  const filtBookings = bookings.filter(b => inRange(b.created_at));
  const filtPayments = payments.filter(p => inRange(p.created_at));

  const completed  = filtBookings.filter(b => b.status === "completed").length;
  const cancelled  = filtBookings.filter(b => b.status === "cancelled").length;
  const active     = filtBookings.filter(b => ["searching","accepted","arriving","in_progress"].includes(b.status)).length;
  const convRate   = filtBookings.length ? Math.round((completed / filtBookings.length) * 100) : 0;
  const revenue    = filtPayments.filter(p=>p.status==="completed").reduce((s,p)=>s+Number(p.amount||0),0);
  const commission = filtPayments.filter(p=>p.status==="completed").reduce((s,p)=>s+Number(p.platform_fee||0),0);
  const verifiedD  = drivers.filter(d => d.is_verified).length;
  const onlineD    = drivers.filter(d => d.is_online).length;
  const avgRating  = drivers.length ? (drivers.reduce((s,d)=>s+Number(d.rating||0),0)/drivers.length).toFixed(1) : "—";

  const dailyBookings: Record<string,number> = {};
  const driverSignups: Record<string,number> = {};
  const riderSignups:  Record<string,number> = {};
  const revenueByDay:  Record<string,number> = {};

  filtBookings.forEach(b => {
    const d = new Date(b.created_at).toLocaleDateString("en-IN",{day:"numeric",month:"short"});
    dailyBookings[d] = (dailyBookings[d]||0) + 1;
  });
  drivers.filter(d=>d.created_at && inRange(d.created_at)).forEach(d => {
    const k = new Date(d.created_at).toLocaleDateString("en-IN",{day:"numeric",month:"short"});
    driverSignups[k] = (driverSignups[k]||0) + 1;
  });
  riders.filter(r=>r.created_at && inRange(r.created_at)).forEach(r => {
    const k = new Date(r.created_at).toLocaleDateString("en-IN",{day:"numeric",month:"short"});
    riderSignups[k] = (riderSignups[k]||0) + 1;
  });
  filtPayments.filter(p=>p.status==="completed").forEach(p => {
    const k = new Date(p.created_at).toLocaleDateString("en-IN",{day:"numeric",month:"short"});
    revenueByDay[k] = (revenueByDay[k]||0) + Number(p.amount||0);
  });

  const keys = [...new Set([...Object.keys(dailyBookings),...Object.keys(revenueByDay)])].sort((a,b)=>new Date(a).getTime()-new Date(b).getTime());
  const trendData = keys.map(k => ({ day: k, bookings: dailyBookings[k]||0, revenue: Math.round(revenueByDay[k]||0) }));

  const statusPie = [
    { name:"Completed", value: completed, color: COLORS.green  },
    { name:"Cancelled", value: cancelled, color: COLORS.red    },
    { name:"Active",    value: active,    color: COLORS.orange  },
  ].filter(s=>s.value>0);

  const fleetPie = [
    { name:"Cab",       value: drivers.filter(d=>d.vehicle_category==="cab").length,       color: COLORS.orange },
    { name:"Truck",     value: drivers.filter(d=>d.vehicle_category==="truck").length,     color: COLORS.blue   },
    { name:"Ambulance", value: drivers.filter(d=>d.vehicle_category==="ambulance").length, color: COLORS.red    },
  ].filter(s=>s.value>0);

  const svcMap: Record<string,number> = {};
  filtBookings.forEach(b => { const s=b.service_name||"Unknown"; svcMap[s]=(svcMap[s]||0)+1; });
  const svcData = Object.entries(svcMap).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([name,value])=>({ name, value }));

  const topDrivers = [...drivers].sort((a,b)=>(b.total_rides||0)-(a.total_rides||0)).slice(0,8);
  const riderActivity: Record<string,number> = {};
  bookings.forEach(b => { if (b.rider_name) riderActivity[b.rider_name]=(riderActivity[b.rider_name]||0)+1; });
  const topRiders = Object.entries(riderActivity).sort((a,b)=>b[1]-a[1]).slice(0,8);

  const signupKeys = [...new Set([...Object.keys(driverSignups),...Object.keys(riderSignups)])].sort();
  const signupData = signupKeys.map(k=>({ day:k, drivers: driverSignups[k]||0, riders: riderSignups[k]||0 }));

  // ── App Analytics derived ─────────────────────────────────────────
  const allSvcMap: Record<string,number> = {};
  bookings.forEach(b => { const s=b.service_name||"Unknown"; allSvcMap[s]=(allSvcMap[s]||0)+1; });
  const mostPopularService = Object.entries(allSvcMap).sort((a,b)=>b[1]-a[1])[0]?.[0] ?? "—";

  const hourCounts: Record<number,number> = {};
  bookings.forEach(b => { const h=new Date(b.created_at).getHours(); hourCounts[h]=(hourCounts[h]||0)+1; });
  const peakHourEntry = Object.entries(hourCounts).sort((a,b)=>Number(b[1])-Number(a[1]))[0];
  const peakHour = peakHourEntry ? `${peakHourEntry[0]}:00–${Number(peakHourEntry[0])+1}:00` : "—";

  const areaCount: Record<string,number> = {};
  bookings.forEach(b => {
    if (b.pickup_address) {
      const area = b.pickup_address.split(",")[0]?.trim() || b.pickup_address;
      areaCount[area] = (areaCount[area]||0)+1;
    }
  });
  const topPickupArea = Object.entries(areaCount).sort((a,b)=>b[1]-a[1])[0]?.[0] ?? "—";

  const svcChartData = Object.entries(allSvcMap)
    .sort((a,b)=>b[1]-a[1]).slice(0,6)
    .map(([name,count]) => ({ name, count }));

  const appStarted   = analytics?.app_bookings_started   ?? 0;
  const appCompleted = analytics?.app_bookings_completed ?? 0;
  const appRate      = analytics?.app_completion_rate    ?? 0;
  const appUsers     = analytics?.app_users_today        ?? 0;
  const appCrashes   = analytics?.app_crashes_today      ?? 0;

  // Backend funnel steps (real data) or 0
  const funnelSteps = [
    { label: "App Opened",       value: funnelData?.app_opened        ?? appUsers,     color: "#3B82F6" },
    { label: "Home Viewed",      value: funnelData?.home_viewed       ?? 0,            color: "#6366F1" },
    { label: "Service Selected", value: funnelData?.service_selected  ?? 0,            color: "#8B5CF6" },
    { label: "Vehicle Selected", value: funnelData?.vehicle_selected  ?? 0,            color: "#F59E0B" },
    { label: "Review Viewed",    value: funnelData?.review_viewed     ?? 0,            color: "#10B981" },
    { label: "Booking Confirmed",value: funnelData?.booking_confirmed ?? appStarted,   color: "#10B981" },
    { label: "Ride Completed",   value: funnelData?.ride_completed    ?? appCompleted, color: "#059669" },
  ];

  // Heatmap: build 7×24 grid
  const heatGrid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
  heatmapData.forEach(({ hour, day, events }: any) => {
    if (day >= 0 && day < 7 && hour >= 0 && hour < 24) heatGrid[day][hour] = events;
  });
  const maxHeat = Math.max(1, ...heatmapData.map((h: any) => h.events));

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
          <button key={tab} onClick={() => setMainTab(tab)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
              mainTab === tab ? "bg-orange-500 text-white shadow-sm" : "bg-white border border-gray-100 text-gray-500 hover:text-gray-900"
            }`}>
            {tab === "platform" ? "📊 Platform Analytics" : "📱 App Analytics"}
          </button>
        ))}
      </div>

      {/* ══════════════ PLATFORM ANALYTICS ══════════════ */}
      {mainTab === "platform" && (
        <>
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

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <KPI label="Total Bookings"  value={filtBookings.length} />
            <KPI label="Completed"       value={completed}   color="text-green-600" />
            <KPI label="Cancelled"       value={cancelled}   color="text-red-500" />
            <KPI label="Active Now"      value={active}      color="text-orange-500" />
            <KPI label="Conversion Rate" value={`${convRate}%`} />
            <KPI label="Total Revenue"   value={`₹${Math.round(revenue).toLocaleString("en-IN")}`} color="text-orange-500" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KPI label="Platform Commission" value={`₹${Math.round(commission).toLocaleString("en-IN")}`} color="text-orange-500" />
            <KPI label="Total Drivers"    value={drivers.length} />
            <KPI label="Verified Drivers" value={verifiedD} color="text-green-600" />
            <KPI label="Online Now"       value={onlineD}   color="text-green-600" />
            <KPI label="Avg Driver Rating" value={`⭐ ${avgRating}`} />
            <KPI label="Total Riders"     value={riders.length} />
            <KPI label="Paid Trips"       value={filtPayments.filter(p=>p.status==="completed").length} />
            <KPI label="Driver Earnings"  value={`₹${Math.round(filtPayments.reduce((s,p)=>s+Number(p.driver_earnings||0),0)).toLocaleString("en-IN")}`} color="text-green-600" />
          </div>

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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="text-sm font-bold text-gray-900 mb-5">Booking Status</h3>
              {statusPie.length === 0 ? <div className="flex items-center justify-center h-32 text-gray-300 text-sm">No data</div> : (
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
                        <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{backgroundColor:s.color}}/><span className="text-gray-600">{s.name}</span></div>
                        <span className="font-bold text-gray-900">{s.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="text-sm font-bold text-gray-900 mb-5">Driver Fleet</h3>
              {fleetPie.length === 0 ? <div className="flex items-center justify-center h-32 text-gray-300 text-sm">No drivers</div> : (
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
                        <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{backgroundColor:s.color}}/><span className="text-gray-600">{s.name}</span></div>
                        <span className="font-bold text-gray-900">{s.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="text-sm font-bold text-gray-900 mb-5">Bookings by Service</h3>
              {svcData.length === 0 ? <div className="flex items-center justify-center h-32 text-gray-300 text-sm">No data</div> : (
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100"><h3 className="text-sm font-bold text-gray-900">Top Drivers by Rides</h3></div>
              {topDrivers.length === 0 ? <div className="px-5 py-8 text-center text-gray-400 text-sm">No drivers yet</div>
              : topDrivers.map((d,i)=>(
                <div key={d.id} className="px-5 py-3 border-b border-gray-50 flex items-center gap-3">
                  <span className="text-xs font-bold text-gray-400 w-5">#{i+1}</span>
                  <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 text-xs font-bold">{d.name?.[0]?.toUpperCase()}</div>
                  <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-gray-900 truncate">{d.name}</p><p className="text-xs text-gray-400 capitalize">{d.vehicle_category}</p></div>
                  <div className="text-right"><p className="text-xs font-bold text-orange-500">{d.total_rides} rides</p><p className="text-xs text-gray-400">⭐ {Number(d.rating||0).toFixed(1)}</p></div>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100"><h3 className="text-sm font-bold text-gray-900">Most Active Riders</h3></div>
              {topRiders.length === 0 ? <div className="px-5 py-8 text-center text-gray-400 text-sm">No activity yet</div>
              : topRiders.map(([name,count],i)=>(
                <div key={name} className="px-5 py-3 border-b border-gray-50 flex items-center gap-3">
                  <span className="text-xs font-bold text-gray-400 w-5">#{i+1}</span>
                  <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold">{name[0]?.toUpperCase()}</div>
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

          {/* KPI cards */}
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
              <p className={`text-2xl font-extrabold ${appRate >= 70 ? "text-green-600" : appRate >= 50 ? "text-yellow-600" : "text-red-500"}`}>
                {appRate.toFixed(1)}%
              </p>
            </div>
          </div>

          {/* Session + Retention KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-blue-100 shadow-sm p-5">
              <p className="text-[11px] font-bold text-blue-400 uppercase tracking-wider mb-2">Sessions Today</p>
              <p className="text-2xl font-extrabold text-blue-600">{sessionData?.sessions_today ?? 0}</p>
            </div>
            <div className="bg-white rounded-2xl border border-blue-100 shadow-sm p-5">
              <p className="text-[11px] font-bold text-blue-400 uppercase tracking-wider mb-2">Avg Session</p>
              <p className="text-2xl font-extrabold text-blue-600">
                {sessionData?.avg_duration_secs ? `${Math.round(sessionData.avg_duration_secs / 60)}m ${sessionData.avg_duration_secs % 60}s` : "—"}
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-blue-100 shadow-sm p-5">
              <p className="text-[11px] font-bold text-blue-400 uppercase tracking-wider mb-2">Avg Screens/Session</p>
              <p className="text-2xl font-extrabold text-blue-600">{sessionData?.avg_screens ?? 0}</p>
            </div>
            <div className="bg-white rounded-2xl border border-blue-100 shadow-sm p-5">
              <p className="text-[11px] font-bold text-blue-400 uppercase tracking-wider mb-2">New Users Today</p>
              <p className="text-2xl font-extrabold text-green-600">{retentionData?.new_users_today ?? 0}</p>
            </div>
          </div>

          {/* Derived insights */}
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

          {/* Bookings by Service bar chart */}
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

          {/* Booking Funnel */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-base font-bold text-gray-900 mb-5">Booking Funnel</h3>
            <div className="space-y-3">
              {funnelSteps.map((step, i) => {
                const max      = funnelSteps[0]?.value || 1;
                const widthPct = max > 0 && step.value > 0 ? Math.max((step.value / max) * 100, 5) : 0;
                const prevVal  = funnelSteps[i - 1]?.value;
                const dropOff  = i > 0 && prevVal != null && prevVal > 0
                  ? Math.round((step.value / prevVal) * 100) : null;
                return (
                  <div key={step.label} className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-36 flex-shrink-0">{step.label}</span>
                    <div className="flex-1 h-7 bg-gray-100 rounded-lg overflow-hidden">
                      <div className="h-7 rounded-lg flex items-center px-3 transition-all duration-500"
                        style={{ width: `${widthPct}%`, backgroundColor: step.color }}>
                        {step.value > 0 && <span className="text-white text-xs font-bold whitespace-nowrap">{step.value}</span>}
                      </div>
                    </div>
                    <span className="text-xs font-bold text-gray-700 w-10 text-right">{step.value}</span>
                    {dropOff !== null && <span className="text-[10px] text-gray-400 w-14">{dropOff}% kept</span>}
                  </div>
                );
              })}
            </div>
            {funnelSteps.every(s => s.value === 0) && (
              <p className="text-xs text-gray-400 text-center mt-4">
                Funnel data populates once Firebase Analytics events are tracked in the app
              </p>
            )}
          </div>

          {/* Screen Time Table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">Screen Time Heatmap</h3>
              <p className="text-xs text-gray-400 mt-0.5">Avg time spent per screen — last 7 days</p>
            </div>
            {screenTimes.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-300 text-sm">
                No screen time data yet — data accumulates as users navigate the app
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      {["Screen", "Avg Time", "Views", "Bounce Rate"].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {screenTimes.map((row: any, i: number) => (
                      <tr key={i} className="hover:bg-gray-50 transition">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 max-w-[200px] truncate">{row.screen}</td>
                        <td className="px-4 py-3 text-sm text-blue-600 font-semibold">{row.avg_time}s</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{row.views}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                            row.bounce_rate > 20 ? "bg-red-50 text-red-600" :
                            row.bounce_rate > 10 ? "bg-yellow-50 text-yellow-700" : "bg-green-50 text-green-700"
                          }`}>
                            {row.bounce_rate}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Geographic Distribution */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">Geographic Distribution</h3>
              <p className="text-xs text-gray-400 mt-0.5">Users and bookings by area — last 30 days</p>
            </div>
            {geoData.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-300 text-sm">
                No location data yet — populates after users grant location permission
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {geoData.slice(0, 12).map((row: any, i: number) => {
                  const max = geoData[0]?.users || 1;
                  return (
                    <div key={i} className="px-6 py-3 flex items-center gap-4">
                      <span className="text-xs font-bold text-gray-400 w-5">#{i+1}</span>
                      <div className="w-28 flex-shrink-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{row.area || row.city}</p>
                        <p className="text-xs text-gray-400">{row.city}</p>
                      </div>
                      <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-4 bg-blue-500 rounded-full" style={{ width: `${(row.users / max) * 100}%` }} />
                      </div>
                      <span className="text-xs font-bold text-blue-600 w-16 text-right">{row.users} users</span>
                      <span className="text-xs text-gray-400 w-20 text-right">{row.bookings} bookings</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Device Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="text-base font-bold text-gray-900 mb-5">OS Distribution</h3>
              {!deviceData?.os?.length ? (
                <div className="flex items-center justify-center h-32 text-gray-300 text-sm">No device data yet</div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={140}>
                    <PieChart>
                      <Pie
                        data={deviceData.os.map((d: any, i: number) => ({
                          ...d, name: d.os,
                          color: [COLORS.blue, COLORS.green, COLORS.orange][i % 3],
                        }))}
                        cx="50%" cy="50%" innerRadius={45} outerRadius={65} dataKey="users" paddingAngle={2}>
                        {deviceData.os.map((_: any, i: number) => (
                          <Cell key={i} fill={[COLORS.blue, COLORS.green, COLORS.orange][i % 3]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CHART_TOOLTIP />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-1.5 mt-3">
                    {deviceData.os.map((d: any, i: number) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: [COLORS.blue, COLORS.green, COLORS.orange][i % 3] }} />
                          <span className="text-gray-600 capitalize">{d.os}</span>
                        </div>
                        <span className="font-bold text-gray-900">{d.users} users</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="text-base font-bold text-gray-900 mb-5">Network Type</h3>
              {!deviceData?.networks?.length ? (
                <div className="flex items-center justify-center h-32 text-gray-300 text-sm">No network data yet</div>
              ) : (
                <div className="space-y-3 mt-2">
                  {deviceData.networks.map((n: any, i: number) => {
                    const max = deviceData.networks[0]?.users || 1;
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-xs text-gray-600 w-16 capitalize">{n.network}</span>
                        <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-5 bg-blue-500 rounded-full" style={{ width: `${(n.users / max) * 100}%` }} />
                        </div>
                        <span className="text-xs font-bold text-gray-900 w-16 text-right">{n.users} users</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Retention Cohort */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-base font-bold text-gray-900 mb-5">Retention Cohort</h3>
            {!retentionData?.buckets?.length ? (
              <div className="flex items-center justify-center h-24 text-gray-300 text-sm">No retention data yet</div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[
                  { key: "new",       label: "New Users",      emoji: "🆕" },
                  { key: "day_1",     label: "Day 1 Return",   emoji: "1️⃣" },
                  { key: "day_7",     label: "Day 7 Return",   emoji: "7️⃣" },
                  { key: "day_30",    label: "Day 30 Return",  emoji: "📅" },
                  { key: "day_30_plus", label: "30d+ Return",  emoji: "🏆" },
                ].map(({ key, label, emoji }) => {
                  const bucket = retentionData.buckets.find((b: any) => b.bucket === key);
                  return (
                    <div key={key} className="bg-blue-50 rounded-xl p-4 text-center">
                      <p className="text-xl mb-1">{emoji}</p>
                      <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-1">{label}</p>
                      <p className="text-xl font-extrabold text-blue-700">{bucket?.users ?? 0}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Usage Time Heatmap — 24h × 7d grid */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-base font-bold text-gray-900 mb-1">Usage Time Heatmap</h3>
            <p className="text-xs text-gray-400 mb-5">Event density by hour (0–23) and day of week — darker = more activity</p>
            {heatmapData.length === 0 ? (
              <div className="flex items-center justify-center h-24 text-gray-300 text-sm">No heatmap data yet</div>
            ) : (
              <div className="overflow-x-auto">
                <div className="min-w-max">
                  <div className="flex mb-1">
                    <div className="w-8" />
                    {Array.from({ length: 24 }, (_, h) => (
                      <div key={h} className="w-6 text-center text-[9px] text-gray-400">{h}</div>
                    ))}
                  </div>
                  {heatGrid.map((row, dayIdx) => (
                    <div key={dayIdx} className="flex items-center mb-0.5">
                      <span className="w-8 text-[10px] text-gray-500 font-medium">{DAY_LABELS[dayIdx]}</span>
                      {row.map((val, h) => {
                        const intensity = Math.round((val / maxHeat) * 255);
                        const opacity   = val === 0 ? 0.06 : 0.15 + (val / maxHeat) * 0.85;
                        return (
                          <div
                            key={h}
                            title={`${DAY_LABELS[dayIdx]} ${h}:00 — ${val} events`}
                            className="w-6 h-5 rounded-sm mx-px"
                            style={{ backgroundColor: `rgba(59, 130, 246, ${opacity})` }}
                          />
                        );
                      })}
                    </div>
                  ))}
                  <div className="flex items-center gap-2 mt-3">
                    <span className="text-[10px] text-gray-400">Low</span>
                    {[0.06, 0.25, 0.5, 0.75, 1].map((o, i) => (
                      <div key={i} className="w-4 h-4 rounded-sm" style={{ backgroundColor: `rgba(59, 130, 246, ${o})` }} />
                    ))}
                    <span className="text-[10px] text-gray-400">High</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Firebase Console link */}
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

          {/* Crash Reports */}
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
