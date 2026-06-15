"use client";
import { useEffect, useState } from "react";
import axios from "axios";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

const METHOD_COLOR: Record<string, string> = {
  cash: "text-green-400 bg-green-400/10",
  upi: "text-blue-400 bg-blue-400/10",
  card: "text-purple-400 bg-purple-400/10",
  wallet: "text-yellow-400 bg-yellow-400/10",
};

export default function PaymentsPage() {
  const [payments, setPayments] = useState<any[]>([]);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    axios.get(`${API}/gogoo/payments`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => setPayments(r.data || [])).catch(() => {});
  }, []);

  const totalRevenue = payments.filter(p => p.status === "completed").reduce((s, p) => s + p.platform_fee, 0);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Payments</h1>
        <p className="text-gray-500 text-sm mt-0.5">Platform revenue: <span className="text-[#FF6B2B] font-semibold">₹{totalRevenue.toLocaleString()}</span></p>
      </div>

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
    </div>
  );
}
