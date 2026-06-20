"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { RefreshCw, X, Edit2 } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

const CATEGORY_BADGE: Record<string, string> = {
  cab:       "bg-orange-100 text-orange-700",
  truck:     "bg-blue-100 text-blue-700",
  ambulance: "bg-red-100 text-red-700",
};

const TABS = ["all", "cab", "truck", "ambulance"] as const;

export default function ServicesPage() {
  const [services, setServices] = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [tab,      setTab]      = useState<string>("all");
  const [editing,  setEditing]  = useState<any | null>(null);
  const [saving,   setSaving]   = useState(false);

  const token = () => typeof window !== "undefined" ? localStorage.getItem("access_token") : "";

  const fetchServices = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/gogoo/services`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      setServices(res.data || []);
    } catch {
      setServices([]);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchServices(); }, []);

  const filtered = tab === "all" ? services : services.filter(s => s.category === tab);

  const openEdit = (s: any) => {
    setEditing({ ...s });
  };

  const saveService = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await axios.patch(`${API}/gogoo/services/${editing.id}`, {
        base_fare:        Number(editing.base_fare),
        per_km_rate:      Number(editing.per_km_rate),
        per_min_rate:     Number(editing.per_min_rate),
        surge_multiplier: Number(editing.surge_multiplier),
        is_active:        editing.is_active,
      }, { headers: { Authorization: `Bearer ${token()}` } });
      toast.success(`${editing.name} updated successfully`);
      setEditing(null);
      fetchServices();
    } catch {
      toast.error("Failed to update service. Endpoint may not exist yet.");
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">{filtered.length} services</p>
        <button onClick={fetchServices} className="p-2 hover:bg-gray-100 rounded-xl text-gray-400">
          <RefreshCw size={16}/>
        </button>
      </div>

      {/* Category tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-xs font-semibold capitalize transition ${
              tab === t ? "bg-white text-orange-500 shadow-sm" : "text-gray-500 hover:text-gray-900"
            }`}>
            {t}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {["Service","Category","Base Fare","Per KM","Per Min","Surge","Capacity","Status","Actions"].map(h => (
                  <th key={h} className="px-5 py-3.5 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                Array.from({length:5}).map((_,i)=>(
                  <tr key={i} className="animate-pulse">
                    {Array.from({length:9}).map((_,j)=>(
                      <td key={j} className="px-5 py-4"><div className="h-3 bg-gray-100 rounded w-3/4"/></td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-16 text-center">
                    <p className="text-4xl mb-3">🚗</p>
                    <p className="text-base font-semibold text-gray-900 mb-1">No services found</p>
                    <p className="text-sm text-gray-400">
                      {services.length === 0
                        ? "Services will appear here once the /gogoo/services endpoint is available"
                        : "No services in this category"}
                    </p>
                  </td>
                </tr>
              ) : filtered.map(s => (
                <tr key={s.id} className="hover:bg-gray-50 transition">
                  <td className="px-5 py-4">
                    <p className="text-sm font-semibold text-gray-900">{s.name}</p>
                    {s.slug && <p className="text-xs text-gray-400 font-mono">{s.slug}</p>}
                  </td>
                  <td className="px-5 py-4">
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full capitalize ${CATEGORY_BADGE[s.category] || "bg-gray-100 text-gray-600"}`}>
                      {s.category}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm font-semibold text-gray-900">₹{s.base_fare}</td>
                  <td className="px-5 py-4 text-sm text-gray-700">₹{s.per_km_rate}/km</td>
                  <td className="px-5 py-4 text-sm text-gray-700">₹{s.per_min_rate}/min</td>
                  <td className="px-5 py-4 text-sm text-gray-700">{s.surge_multiplier}×</td>
                  <td className="px-5 py-4 text-sm text-gray-700">{s.capacity || "—"}</td>
                  <td className="px-5 py-4">
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${s.is_active !== false ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {s.is_active !== false ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <button onClick={() => openEdit(s)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-orange-50 text-orange-500 border border-orange-200 rounded-lg hover:bg-orange-100 transition">
                      <Edit2 size={12}/> Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Note if no backend */}
      {!loading && services.length === 0 && (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
          <p className="text-sm font-semibold text-blue-700 mb-1">Backend endpoint not yet available</p>
          <p className="text-xs text-blue-500">
            This page calls <code className="bg-blue-100 px-1 py-0.5 rounded font-mono">/gogoo/services</code>.
            Once your backend exposes this endpoint, services will appear here with full edit capability.
          </p>
        </div>
      )}

      {/* ── Edit Modal ── */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md border border-gray-100">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-base font-bold text-gray-900">Edit: {editing.name}</h3>
                <p className="text-xs text-gray-400 mt-0.5 capitalize">{editing.category}</p>
              </div>
              <button onClick={() => setEditing(null)} className="p-1.5 hover:bg-gray-100 rounded-xl">
                <X size={16} className="text-gray-500"/>
              </button>
            </div>

            <div className="space-y-3 mb-5">
              {[
                { label: "Base Fare (₹)",      key: "base_fare" },
                { label: "Per KM Rate (₹)",     key: "per_km_rate" },
                { label: "Per Min Rate (₹)",    key: "per_min_rate" },
                { label: "Surge Multiplier (×)", key: "surge_multiplier" },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">{f.label}</label>
                  <input type="number" step="0.01"
                    value={editing[f.key] || ""}
                    onChange={e => setEditing((prev: any) => ({...prev, [f.key]: e.target.value}))}
                    className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-orange-400 transition font-semibold" />
                </div>
              ))}

              <div className="flex items-center justify-between py-2">
                <span className="text-sm font-semibold text-gray-900">Active</span>
                <button
                  type="button"
                  onClick={() => setEditing((prev: any) => ({...prev, is_active: !prev.is_active}))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${editing.is_active !== false ? "bg-orange-500" : "bg-gray-200"}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${editing.is_active !== false ? "translate-x-6" : "translate-x-1"}`}/>
                </button>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setEditing(null)}
                className="flex-1 py-2.5 bg-gray-50 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-100 transition">
                Cancel
              </button>
              <button onClick={saveService} disabled={saving}
                className="flex-1 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-bold hover:bg-orange-600 transition disabled:opacity-50">
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
