"use client";
import { useEffect, useState } from "react";
import axios from "axios";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

const METHOD_COLOR: Record<string, string> = {
  cash:   "text-green-400 bg-green-400/10",
  upi:    "text-blue-400 bg-blue-400/10",
  card:   "text-purple-400 bg-purple-400/10",
  wallet: "text-yellow-400 bg-yellow-400/10",
};

function walletStatus(d: any) {
  if (d.is_blocked)                    return { label: "Blocked 🚫",    cls: "text-red-400 bg-red-400/10 border-red-400/20" };
  if ((d.wallet_balance ?? -700) < 0)  return { label: "Low ⚠️",        cls: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20" };
  return                                      { label: "Active ✅",      cls: "text-green-400 bg-green-400/10 border-green-400/20" };
}

export default function PaymentsPage() {
  const [payments,       setPayments]       = useState<any[]>([]);
  const [driverWallets,  setDriverWallets]  = useState<any[]>([]);
  const [tab,            setTab]            = useState<"trips" | "wallets">("trips");

  const token = () => typeof window !== "undefined" ? localStorage.getItem("access_token") : null;

  useEffect(() => {
    const h = { Authorization: `Bearer ${token()}` };
    axios.get(`${API}/gogoo/payments`,              { headers: h }).then(r => setPayments(r.data || [])).catch(() => {});
    axios.get(`${API}/gogoo/admin/driver-payments`, { headers: h }).then(r => setDriverWallets(r.data?.drivers || [])).catch(() => {});
  }, []);

  const totalRevenue    = payments.filter(p => p.status === "completed").reduce((s, p) => s + (p.platform_fee ?? 0), 0);
  const totalCommission = driverWallets.reduce((s, d) => s + (d.total_commission ?? 0), 0);
  const totalGross      = driverWallets.reduce((s, d) => s + (d.gross_earnings  ?? 0), 0);
  const blockedCount    = driverWallets.filter(d => d.is_blocked).length;
  const lowCount        = driverWallets.filter(d => !d.is_blocked && (d.wallet_balance ?? -700) < 0).length;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Payments</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          Platform revenue: <span className="text-[#FF6B2B] font-semibold">₹{Math.round(totalRevenue).toLocaleString()}</span>
        </p>
      </div>

      {/* Summary chips */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
          <p className="text-gray-500 text-xs mb-1">Driver Gross Earnings</p>
          <p className="text-white font-bold text-lg">₹{Math.round(totalGross).toLocaleString()}</p>
        </div>
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
          <p className="text-gray-500 text-xs mb-1">gogoo Commission</p>
          <p className="text-[#FF6B2B] font-bold text-lg">₹{Math.round(totalCommission).toLocaleString()}</p>
        </div>
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
          <p className="text-gray-500 text-xs mb-1">Blocked Wallets</p>
          <p className="text-red-400 font-bold text-lg">{blockedCount}</p>
        </div>
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
          <p className="text-gray-500 text-xs mb-1">Low Balance</p>
          <p className="text-yellow-400 font-bold text-lg">{lowCount}</p>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-1 mb-5 w-fit">
        {(["trips", "wallets"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-xs font-medium capitalize transition ${
              tab === t ? "bg-[#FF6B2B] text-white" : "text-gray-400 hover:text-white"
            }`}>
            {t === "trips" ? "🗺 Trip Payments" : "💰 Driver Wallets"}
          </button>
        ))}
      </div>

      {/* Trip Payments Table */}
      {tab === "trips" && (
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#2A2A2A]">
                {["Rider", "Route", "Amount", "Platform Fee", "Driver Earnings", "Method", "Status", "Time"].map(h => (
                  <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E1E1E]">
              {payments.length === 0 ? (
                <tr><td colSpan={8} className="px-5 py-10 text-center text-gray-600">No payments yet</td></tr>
              ) : payments.map((p: any) => (
                <tr key={p.id} className="hover:bg-[#111] transition">
                  <td className="px-5 py-4 text-sm text-white">{p.rider_name}</td>
                  <td className="px-5 py-4 text-xs text-gray-400 max-w-[140px]">
                    <p className="truncate">{p.pickup_address}</p>
                    <p className="truncate text-gray-600">→ {p.drop_address}</p>
                  </td>
                  <td className="px-5 py-4 text-sm text-white font-semibold">₹{p.amount}</td>
                  <td className="px-5 py-4 text-sm text-[#FF6B2B]">₹{p.platform_fee}</td>
                  <td className="px-5 py-4 text-sm text-green-400">₹{p.driver_earnings}</td>
                  <td className="px-5 py-4">
                    <span className={`text-xs px-2.5 py-1 rounded-lg font-medium uppercase ${METHOD_COLOR[p.method] || "text-gray-400 bg-gray-400/10"}`}>
                      {p.method}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`text-xs px-2.5 py-1 rounded-lg font-medium capitalize ${
                      p.status === "completed" ? "text-green-400 bg-green-400/10" : "text-red-400 bg-red-400/10"
                    }`}>{p.status}</span>
                  </td>
                  <td className="px-5 py-4 text-xs text-gray-500">
                    {new Date(p.created_at).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Driver Wallets Table */}
      {tab === "wallets" && (
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#2A2A2A]">
                {["Driver", "Vehicle", "Wallet Balance", "Gross Earnings", "Commission", "Total Rides", "Reg Fee", "Status"].map(h => (
                  <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E1E1E]">
              {driverWallets.length === 0 ? (
                <tr><td colSpan={8} className="px-5 py-10 text-center text-gray-600">No drivers yet</td></tr>
              ) : driverWallets.map((d: any) => {
                const ws = walletStatus(d);
                const balance = d.wallet_balance ?? -700;
                return (
                  <tr key={d.id} className="hover:bg-[#111] transition">
                    <td className="px-5 py-4">
                      <p className="text-white text-sm font-medium">{d.name}</p>
                      <p className="text-gray-500 text-xs">{d.email}</p>
                    </td>
                    <td className="px-5 py-4 text-xs text-gray-400 capitalize">
                      {d.vehicle_type?.replace(/_/g, " ") || "—"}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`text-sm font-bold ${balance >= 0 ? "text-green-400" : "text-red-400"}`}>
                        ₹{Math.round(balance).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-white">₹{Math.round(d.gross_earnings ?? 0).toLocaleString()}</td>
                    <td className="px-5 py-4 text-sm text-[#FF6B2B]">₹{Math.round(d.total_commission ?? 0).toLocaleString()}</td>
                    <td className="px-5 py-4 text-sm text-gray-300">{d.total_rides ?? 0}</td>
                    <td className="px-5 py-4">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${d.reg_paid ? "text-green-400 bg-green-400/10" : "text-yellow-400 bg-yellow-400/10"}`}>
                        {d.reg_paid ? "Paid ✅" : "Pending ⏳"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${ws.cls}`}>
                        {ws.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
