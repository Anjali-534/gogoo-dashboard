"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { Download, RefreshCw } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import Pagination from "../../../components/Pagination";

const API = process.env.NEXT_PUBLIC_API_URL || "https://gogobackend-production.up.railway.app";
const PER_PAGE = 50;

const METHOD_BADGE: Record<string, string> = {
  cash:   "bg-green-100 text-green-700",
  upi:    "bg-blue-100 text-blue-700",
  card:   "bg-purple-100 text-purple-700",
  wallet: "bg-yellow-100 text-yellow-700",
};

function walletStatus(d: any) {
  if (d.is_wallet_blocked) return { label: "Blocked",  cls: "bg-red-100 text-red-700" };
  const bal = d.wallet_balance ?? -700;
  if (bal < 0)   return { label: "Low ⚠",    cls: "bg-yellow-100 text-yellow-700" };
  return             { label: "Active ✓",  cls: "bg-green-100 text-green-700" };
}

export default function PaymentsPage() {
  const [payments,      setPayments]      = useState<any[]>([]);
  const [driverWallets, setDriverWallets] = useState<any[]>([]);
  const [tab,           setTab]           = useState<"trips"|"wallets"|"commission">("trips");
  const [page,          setPage]          = useState(1);

  const token = () => typeof window !== "undefined" ? localStorage.getItem("access_token") : null;

  const fetchAll = async () => {
    const h = { Authorization: `Bearer ${token()}` };
    await Promise.all([
      axios.get(`${API}/gogoo/payments`, { headers: h })
        .then(r => setPayments(r.data || [])).catch(() => {}),
      axios.get(`${API}/gogoo/admin/driver-payments`, { headers: h })
        .then(r => setDriverWallets(r.data?.drivers || [])).catch(() => {}),
    ]);
  };

  useEffect(() => { fetchAll(); }, []);
  useEffect(() => { setPage(1); }, [tab]);

  const completedPay   = payments.filter(p => p.status === "completed");
  const totalRevenue   = completedPay.reduce((s, p) => s + Number(p.platform_fee||0), 0);
  const totalGross     = completedPay.reduce((s, p) => s + Number(p.amount||0), 0);
  const driverPayouts  = completedPay.reduce((s, p) => s + Number(p.driver_earnings||0), 0);
  const regFees        = driverWallets.filter(d => d.reg_paid).length * 700;
  const walletBlocked  = driverWallets.filter(d => d.is_wallet_blocked).length;
  const walletLow      = driverWallets.filter(d => !d.is_wallet_blocked && (d.wallet_balance??-700) < 0).length;

  // Commission last 30 days
  const commByDay: Record<string, number> = {};
  completedPay.forEach(p => {
    if ((Date.now() - new Date(p.created_at).getTime()) > 30 * 86400000) return;
    const d = new Date(p.created_at).toLocaleDateString("en-IN", { day:"numeric", month:"short" });
    commByDay[d] = (commByDay[d] || 0) + Number(p.platform_fee||0);
  });
  const commData = Object.entries(commByDay).map(([day, comm]) => ({ day, comm: Math.round(comm) })).slice(-14);

  const paged = (tab === "trips" ? payments : driverWallets).slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <div className="space-y-5">
      {/* ── Revenue Summary ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: "Gross Revenue",    value: `₹${Math.round(totalGross).toLocaleString("en-IN")}`,   color: "text-gray-900" },
          { label: "Platform Commission", value: `₹${Math.round(totalRevenue).toLocaleString("en-IN")}`, color: "text-orange-500" },
          { label: "Driver Payouts",   value: `₹${Math.round(driverPayouts).toLocaleString("en-IN")}`, color: "text-green-600" },
          { label: "Reg Fees Collected", value: `₹${regFees.toLocaleString("en-IN")}`,               color: "text-blue-600" },
          { label: "Wallet Blocked",   value: walletBlocked,                                          color: "text-red-500" },
          { label: "Low Balance",      value: walletLow,                                              color: "text-yellow-600" },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className={`text-2xl font-extrabold ${c.color}`}>{c.value}</p>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mt-1">{c.label}</p>
          </div>
        ))}
      </div>

      {/* ── Tab bar + Actions ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {(["trips","wallets","commission"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold capitalize transition ${
                tab === t ? "bg-white text-orange-500 shadow-sm" : "text-gray-500 hover:text-gray-900"
              }`}>
              {t === "trips" ? "🗺 Trip Payments" : t === "wallets" ? "💰 Driver Wallets" : "📈 Commission Report"}
            </button>
          ))}
        </div>
        <button onClick={fetchAll} className="p-2 hover:bg-gray-100 rounded-xl text-gray-400">
          <RefreshCw size={16} />
        </button>
      </div>

      {/* ── Trip Payments ── */}
      {tab === "trips" && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {["Rider","Route","Amount","Platform Fee","Driver Earnings","Method","Status","Date"].map(h => (
                    <th key={h} className="px-5 py-3.5 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {payments.length === 0 ? (
                  <tr><td colSpan={8} className="px-5 py-16 text-center text-gray-400">
                    <p className="text-3xl mb-2">💳</p><p className="text-sm">No payments yet</p>
                  </td></tr>
                ) : (paged as any[]).map(p => (
                  <tr key={p.id} className="hover:bg-gray-50 transition">
                    <td className="px-5 py-4 text-sm font-medium text-gray-900">{p.rider_name}</td>
                    <td className="px-5 py-4 max-w-[130px]">
                      <p className="text-xs text-gray-600 truncate">{p.pickup_address}</p>
                      <p className="text-xs text-gray-400 truncate">→ {p.drop_address}</p>
                    </td>
                    <td className="px-5 py-4 text-sm font-bold text-gray-900">₹{p.amount}</td>
                    <td className="px-5 py-4 text-sm font-semibold text-orange-500">₹{p.platform_fee}</td>
                    <td className="px-5 py-4 text-sm font-semibold text-green-600">₹{p.driver_earnings}</td>
                    <td className="px-5 py-4">
                      <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full uppercase ${METHOD_BADGE[p.method] || "bg-gray-100 text-gray-600"}`}>
                        {p.method}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`text-[11px] font-bold px-2 py-1 rounded-full ${p.status === "completed" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs text-gray-400">
                      {new Date(p.created_at).toLocaleString("en-IN",{dateStyle:"short",timeStyle:"short"})}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 pb-2 pt-0" />
          {/* NOTE: pagination uses payments.length since paged is already sliced */}
          {payments.length > PER_PAGE && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
              <p className="text-sm text-gray-400">
                Showing {(page-1)*PER_PAGE+1}–{Math.min(page*PER_PAGE,payments.length)} of {payments.length}
              </p>
              <div className="flex gap-1">
                <button disabled={page===1} onClick={() => setPage(p => p-1)}
                  className="px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 rounded-lg disabled:opacity-30">← Prev</button>
                <button disabled={page * PER_PAGE >= payments.length} onClick={() => setPage(p => p+1)}
                  className="px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 rounded-lg disabled:opacity-30">Next →</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Driver Wallets ── */}
      {tab === "wallets" && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {["Driver","Vehicle","Wallet Balance","Gross Earnings","Commission","Rides","Reg Fee","Status"].map(h => (
                    <th key={h} className="px-5 py-3.5 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {driverWallets.length === 0 ? (
                  <tr><td colSpan={8} className="px-5 py-16 text-center text-gray-400 text-sm">No drivers yet</td></tr>
                ) : [...driverWallets]
                    .sort((a, b) => ((a.wallet_balance??-700) - (b.wallet_balance??-700)))
                    .slice((page-1)*PER_PAGE, page*PER_PAGE)
                    .map(d => {
                  const ws  = walletStatus(d);
                  const bal = d.wallet_balance ?? -700;
                  return (
                    <tr key={d.id} className="hover:bg-gray-50 transition">
                      <td className="px-5 py-4">
                        <p className="text-sm font-semibold text-gray-900">{d.name}</p>
                        <p className="text-xs text-gray-400">{d.email}</p>
                      </td>
                      <td className="px-5 py-4 text-xs text-gray-500 capitalize">{d.vehicle_type?.replace(/_/g," ")}</td>
                      <td className="px-5 py-4">
                        <span className={`text-sm font-bold ${bal < 0 ? "text-red-500" : "text-green-600"}`}>
                          ₹{Math.round(bal).toLocaleString("en-IN")}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-900">₹{Math.round(d.gross_earnings??0).toLocaleString("en-IN")}</td>
                      <td className="px-5 py-4 text-sm font-semibold text-orange-500">₹{Math.round(d.total_commission??0).toLocaleString("en-IN")}</td>
                      <td className="px-5 py-4 text-sm text-gray-700">{d.total_rides ?? 0}</td>
                      <td className="px-5 py-4">
                        <span className={`text-[11px] font-bold px-2 py-1 rounded-full ${d.reg_paid ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                          {d.reg_paid ? "Paid ✓" : "Pending"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`text-[11px] font-bold px-2 py-1 rounded-full ${ws.cls}`}>{ws.label}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination page={page} total={driverWallets.length} perPage={PER_PAGE} onChange={setPage} />
        </div>
      )}

      {/* ── Commission Report ── */}
      {tab === "commission" && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: "Cab Commission",       value: `₹${Math.round(completedPay.filter(p=>p.service_name?.toLowerCase().includes("cab")).reduce((s,p)=>s+Number(p.platform_fee||0),0)).toLocaleString("en-IN")}`, color: "text-orange-500" },
              { label: "Truck Commission",     value: `₹${Math.round(completedPay.filter(p=>p.service_name?.toLowerCase().includes("truck")).reduce((s,p)=>s+Number(p.platform_fee||0),0)).toLocaleString("en-IN")}`, color: "text-blue-600" },
              { label: "Ambulance Commission", value: `₹${Math.round(completedPay.filter(p=>p.service_name?.toLowerCase().includes("ambulance")).reduce((s,p)=>s+Number(p.platform_fee||0),0)).toLocaleString("en-IN")}`, color: "text-red-500" },
            ].map(c => (
              <div key={c.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <p className={`text-2xl font-extrabold ${c.color}`}>{c.value}</p>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mt-1">{c.label}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold text-gray-900">Daily Commission — Last 14 Days</h3>
              <button onClick={() => {
                const rows = [["Date","Commission (₹)"],...commData.map(c=>[c.day,c.comm])];
                const csv = rows.map(r=>r.join(",")).join("\n");
                const blob = new Blob([csv],{type:"text/csv"});
                const a = document.createElement("a");
                a.href = URL.createObjectURL(blob);
                a.download = "commission-report.csv";
                a.click();
                toast.success("Exported commission report");
              }} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-50">
                <Download size={13} /> Export CSV
              </button>
            </div>
            {commData.length === 0 ? (
              <div className="flex items-center justify-center h-40 text-gray-300 text-sm">No commission data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={commData} margin={{ left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F5F5F5" />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#9CA3AF" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} tickFormatter={v => `₹${v}`} />
                  <Tooltip formatter={(v: any) => [`₹${v}`, "Commission"]}
                    contentStyle={{ borderRadius:8, border:"1px solid #F0F0F0", fontSize:12 }} />
                  <Bar dataKey="comm" fill="#FF6B2B" radius={[4,4,0,0]} name="Commission" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Detailed table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">All Completed Payments</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {["Date","Rider","Service","Amount","Platform Fee","Driver Earnings"].map(h => (
                      <th key={h} className="px-5 py-3.5 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {completedPay.length === 0 ? (
                    <tr><td colSpan={6} className="px-5 py-10 text-center text-gray-400 text-sm">No completed payments</td></tr>
                  ) : completedPay.slice((page-1)*PER_PAGE, page*PER_PAGE).map(p => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3.5 text-xs text-gray-400">
                        {new Date(p.created_at).toLocaleString("en-IN",{dateStyle:"short",timeStyle:"short"})}
                      </td>
                      <td className="px-5 py-3.5 text-sm font-medium text-gray-900">{p.rider_name}</td>
                      <td className="px-5 py-3.5 text-xs text-gray-500">{p.service_name || "—"}</td>
                      <td className="px-5 py-3.5 text-sm font-bold text-gray-900">₹{p.amount}</td>
                      <td className="px-5 py-3.5 text-sm font-semibold text-orange-500">₹{p.platform_fee}</td>
                      <td className="px-5 py-3.5 text-sm font-semibold text-green-600">₹{p.driver_earnings}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} total={completedPay.length} perPage={PER_PAGE} onChange={setPage} />
          </div>
        </div>
      )}
    </div>
  );
}
