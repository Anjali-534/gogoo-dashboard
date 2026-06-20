"use client";
import { useEffect, useState } from "react";
import axios from "axios";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export default function SupportPage() {
  const [problematicBookings, setProblematicBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const token = () => typeof window !== "undefined" ? localStorage.getItem("access_token") : "";

  useEffect(() => {
    axios.get(`${API}/gogoo/bookings`, {
      headers: { Authorization: `Bearer ${token()}` },
    }).then(r => {
      const bookings = r.data || [];
      // Bookings cancelled after acceptance = potential issues
      const problematic = bookings
        .filter((b: any) => b.status === "cancelled" && b.driver_name)
        .slice(0, 20);
      setProblematicBookings(problematic);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-3xl space-y-6">
      {/* Coming Soon Banner */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">🎧</span>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Support Center</h2>
        <p className="text-sm text-gray-500 mb-4">
          A full support ticket system is coming soon. For now, you can reach out to riders and drivers
          directly or manage issues through bookings.
        </p>
        <a href="mailto:support@gogoo.in"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-bold hover:bg-orange-600 transition">
          📧 Email: support@gogoo.in
        </a>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { icon: "📋", label: "View All Bookings", desc: "Browse and filter all bookings", href: "/dashboard/bookings" },
          { icon: "🚗", label: "Driver Issues",     desc: "Manage driver blocks and verification", href: "/dashboard/drivers" },
          { icon: "👤", label: "Rider Issues",      desc: "View rider booking history", href: "/dashboard/users" },
          { icon: "📢", label: "Send Broadcast",    desc: "Notify drivers or riders about issues", href: "/dashboard/notifications" },
        ].map(a => (
          <a key={a.href} href={a.href}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:border-orange-200 transition group">
            <span className="text-3xl mb-3 block">{a.icon}</span>
            <p className="text-sm font-bold text-gray-900 group-hover:text-orange-500 transition">{a.label}</p>
            <p className="text-xs text-gray-400 mt-1">{a.desc}</p>
          </a>
        ))}
      </div>

      {/* Potentially problematic bookings */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-900">Cancelled After Driver Assigned</h3>
          <p className="text-xs text-gray-400 mt-0.5">Bookings that were cancelled after a driver accepted — may need follow-up</p>
        </div>
        {loading ? (
          <div className="p-6 space-y-3">
            {Array.from({length:4}).map((_,i)=>(
              <div key={i} className="animate-pulse h-12 bg-gray-50 rounded-xl"/>
            ))}
          </div>
        ) : problematicBookings.length === 0 ? (
          <div className="p-10 text-center text-gray-400">
            <p className="text-3xl mb-2">✅</p>
            <p className="text-sm">No problematic bookings found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {problematicBookings.map(b => (
              <div key={b.id} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {b.rider_name} → {b.driver_name}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5 truncate max-w-sm">
                    {b.pickup_address} → {b.drop_address}
                  </p>
                  {b.cancel_reason && (
                    <p className="text-xs text-red-500 mt-0.5">Reason: {b.cancel_reason}</p>
                  )}
                </div>
                <div className="text-right flex-shrink-0 ml-4">
                  <p className="text-xs text-gray-400">
                    {new Date(b.created_at).toLocaleDateString("en-IN",{day:"numeric",month:"short"})}
                  </p>
                  {b.final_fare && <p className="text-sm font-bold text-gray-900">₹{b.final_fare}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
