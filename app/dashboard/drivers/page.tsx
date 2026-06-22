"use client";
import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { Search, Download, X, CheckCircle, Ban, RefreshCw } from "lucide-react";
import Link from "next/link";
import Pagination from "../../../components/Pagination";

const API = process.env.NEXT_PUBLIC_API_URL || "https://gogobackend-production.up.railway.app";
const PER_PAGE = 50;

const CATEGORY_BADGE: Record<string, string> = {
  truck:     "bg-blue-100 text-blue-700",
  cab:       "bg-orange-100 text-orange-700",
  ambulance: "bg-red-100 text-red-700",
};

function isBlocked(d: any) {
  return d.is_blocked && d.blocked_until && new Date(d.blocked_until) > new Date();
}
function fmtBlocked(iso: string) {
  return new Date(iso).toLocaleString("en-IN", { day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit" });
}

function StatPill({ label, value, cls = "" }: any) {
  return (
    <div className={`bg-white border border-gray-100 rounded-xl px-4 py-3 text-center ${cls}`}>
      <p className="text-xl font-extrabold text-gray-900">{value}</p>
      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mt-0.5">{label}</p>
    </div>
  );
}

export default function DriversPage() {
  const [drivers,     setDrivers]     = useState<any[]>([]);
  const [tab,         setTab]         = useState("all");
  const [search,      setSearch]      = useState("");
  const [ratingF,     setRatingF]     = useState("all");
  const [walletF,     setWalletF]     = useState("all");
  const [page,        setPage]        = useState(1);
  const [blockModal,  setBlockModal]  = useState<any | null>(null);
  const [blockReason, setBlockReason] = useState("");
  const [blockHrs,    setBlockHrs]    = useState(48);
  const [blocking,    setBlocking]    = useState(false);

  const token = () => (typeof window !== "undefined" ? localStorage.getItem("access_token") : "");

  const fetchDrivers = useCallback(async () => {
    const res = await axios.get(`${API}/gogoo/drivers`, {
      headers: { Authorization: `Bearer ${token()}` },
    }).catch(() => ({ data: [] }));
    setDrivers(res.data || []);
  }, []);

  useEffect(() => { fetchDrivers(); }, [fetchDrivers]);
  useEffect(() => { setPage(1); }, [tab, search, ratingF, walletF]);

  const filtered = drivers
    .filter(d => {
      if (tab === "pending")  return !d.is_verified;
      if (tab === "online")   return d.is_online;
      if (tab === "blocked")  return isBlocked(d);
      return true;
    })
    .filter(d => {
      if (ratingF === "low")   return Number(d.rating) < 3.5;
      if (ratingF === "mid")   return Number(d.rating) >= 3.5 && Number(d.rating) < 4;
      if (ratingF === "high")  return Number(d.rating) >= 4;
      return true;
    })
    .filter(d => {
      const bal = d.wallet_balance ?? -700;
      if (walletF === "blocked") return d.is_wallet_blocked;
      if (walletF === "low")     return !d.is_wallet_blocked && bal < 0;
      if (walletF === "healthy") return !d.is_wallet_blocked && bal >= 0;
      return true;
    })
    .filter(d => {
      const q = search.toLowerCase();
      return !q || d.name?.toLowerCase().includes(q) ||
        d.email?.toLowerCase().includes(q) || d.phone?.includes(q);
    });

  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const verify = async (id: string) => {
    try {
      await axios.patch(`${API}/gogoo/drivers/${id}/verify`, {}, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      toast.success("Driver verified successfully");
      fetchDrivers();
    } catch {
      toast.error("Failed to verify driver");
    }
  };

  const unblock = async (id: string) => {
    try {
      await axios.patch(`${API}/gogoo/drivers/${id}/block`, { action: "unblock" }, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      toast.success("Driver unblocked");
      fetchDrivers();
    } catch {
      toast.error("Failed to unblock driver");
    }
  };

  const submitBlock = async () => {
    if (!blockModal) return;
    setBlocking(true);
    try {
      await axios.patch(`${API}/gogoo/drivers/${blockModal.id}/block`,
        { action: "block", reason: blockReason || "Manually blocked by admin", duration_hrs: blockHrs },
        { headers: { Authorization: `Bearer ${token()}` } },
      );
      toast.success(`${blockModal.name} blocked for ${blockHrs}h`);
      setBlockModal(null);
      setBlockReason("");
      fetchDrivers();
    } catch {
      toast.error("Failed to block driver");
    } finally {
      setBlocking(false);
    }
  };

  const downloadXLSX = () => {
    window.open(`${API}/gogoo/export/drivers.xlsx?token=${token()}`, "_blank");
    toast.success("Downloading Excel file…");
  };

  // stats
  const onlineCount  = drivers.filter(d => d.is_online).length;
  const blockedCount = drivers.filter(isBlocked).length;
  const pendingCount = drivers.filter(d => !d.is_verified).length;
  const newThisWeek  = drivers.filter(d => {
    if (!d.created_at) return false;
    return (Date.now() - new Date(d.created_at).getTime()) < 7 * 86400000;
  }).length;

  return (
    <div className="space-y-5">
      {/* ── Stats bar ── */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        <StatPill label="Total"       value={drivers.length} />
        <StatPill label="Online"      value={onlineCount} />
        <StatPill label="Offline"     value={drivers.length - onlineCount} />
        <StatPill label="Blocked"     value={blockedCount} />
        <StatPill label="Pending Docs" value={pendingCount} />
        <StatPill label="New This Week" value={newThisWeek} />
      </div>

      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Name, email, phone…"
              className="pl-9 pr-9 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-orange-400 transition w-64" />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                <X size={13} />
              </button>
            )}
          </div>

          {/* Status tabs */}
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            {(["all","pending","online","blocked"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition ${
                  tab === t ? "bg-white text-orange-500 shadow-sm" : "text-gray-500 hover:text-gray-900"
                }`}>
                {t}{t === "blocked" && blockedCount > 0 ? ` (${blockedCount})` : ""}
              </button>
            ))}
          </div>

          {/* Rating filter */}
          <select value={ratingF} onChange={e => setRatingF(e.target.value)}
            className="px-3 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none text-gray-700">
            <option value="all">All ratings</option>
            <option value="low">Below 3.5 ⭐</option>
            <option value="mid">3.5 – 4.0 ⭐</option>
            <option value="high">Above 4.0 ⭐</option>
          </select>

          {/* Wallet filter */}
          <select value={walletF} onChange={e => setWalletF(e.target.value)}
            className="px-3 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none text-gray-700">
            <option value="all">All wallets</option>
            <option value="blocked">Wallet blocked</option>
            <option value="low">Low balance</option>
            <option value="healthy">Healthy balance</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={fetchDrivers} className="p-2 hover:bg-gray-100 rounded-xl text-gray-400">
            <RefreshCw size={16} />
          </button>
          <button onClick={downloadXLSX}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition">
            <Download size={15} /> Export Excel
          </button>
        </div>
      </div>

      {/* ── Blocked banner ── */}
      {tab !== "blocked" && blockedCount > 0 && (
        <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 flex items-center gap-3">
          <Ban size={16} className="text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700 flex-1">
            <span className="font-bold">{blockedCount} driver{blockedCount > 1 ? "s" : ""}</span> currently blocked.
          </p>
          <button onClick={() => setTab("blocked")}
            className="text-xs px-3 py-1.5 bg-red-100 text-red-700 rounded-lg font-semibold hover:bg-red-200 transition">
            View Blocked
          </button>
        </div>
      )}

      {/* ── Table ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {["Driver","Vehicle","Category","Rides","Rating","Wallet","Status","Actions"].map(h => (
                  <th key={h} className="px-5 py-3.5 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paged.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-16 text-center">
                    <div className="text-4xl mb-3">🚗</div>
                    <p className="text-base font-semibold text-gray-900 mb-1">No drivers found</p>
                    <p className="text-sm text-gray-400">Try adjusting filters</p>
                  </td>
                </tr>
              ) : paged.map(d => {
                const blocked = isBlocked(d);
                const balance = d.wallet_balance ?? -700;
                return (
                  <tr key={d.id} className="hover:bg-gray-50 transition">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${blocked ? "bg-red-500" : "bg-orange-500"}`}>
                          {d.name?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{d.name}</p>
                          <p className="text-xs text-gray-400">{d.phone}</p>
                        </div>
                        {d.is_online && <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm text-gray-800 font-medium">{d.vehicle_model || "—"}</p>
                      <p className="text-xs text-gray-400">{d.vehicle_number}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`text-xs font-bold px-2 py-1 rounded-full capitalize ${CATEGORY_BADGE[d.vehicle_category] || "bg-gray-100 text-gray-600"}`}>
                        {d.vehicle_category}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-700">{d.total_rides || 0}</td>
                    <td className="px-5 py-4 text-sm font-semibold text-gray-900">⭐ {Number(d.rating || 0).toFixed(1)}</td>
                    <td className="px-5 py-4">
                      <span className={`text-sm font-bold ${balance < 0 ? "text-red-500" : balance < 500 ? "text-yellow-600" : "text-green-600"}`}>
                        ₹{Math.round(balance).toLocaleString("en-IN")}
                      </span>
                      {d.is_wallet_blocked && <p className="text-[10px] text-red-400 font-semibold">Wallet Blocked</p>}
                    </td>
                    <td className="px-5 py-4">
                      {blocked ? (
                        <div>
                          <span className="text-[11px] font-bold bg-red-100 text-red-700 px-2 py-1 rounded-full">Blocked</span>
                          <p className="text-[10px] text-gray-400 mt-1">{fmtBlocked(d.blocked_until)}</p>
                        </div>
                      ) : d.is_verified ? (
                        <span className="text-[11px] font-bold bg-green-100 text-green-700 px-2 py-1 rounded-full">Verified</span>
                      ) : (
                        <span className="text-[11px] font-bold bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">Pending</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5">
                        <Link href={`/dashboard/drivers/${d.id}`}
                          className="px-3 py-1.5 text-xs font-semibold bg-orange-50 text-orange-500 border border-orange-200 rounded-lg hover:bg-orange-100 transition">
                          View
                        </Link>
                        {!d.is_verified && !blocked && (
                          <button onClick={() => verify(d.id)}
                            className="px-3 py-1.5 text-xs font-semibold bg-green-50 text-green-600 border border-green-200 rounded-lg hover:bg-green-100 transition">
                            Verify
                          </button>
                        )}
                        {blocked ? (
                          <button onClick={() => unblock(d.id)}
                            className="px-3 py-1.5 text-xs font-semibold bg-gray-50 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-100 transition">
                            Unblock
                          </button>
                        ) : (
                          <button onClick={() => { setBlockModal(d); setBlockReason(""); setBlockHrs(48); }}
                            className="px-3 py-1.5 text-xs font-semibold bg-red-50 text-red-500 border border-red-200 rounded-lg hover:bg-red-100 transition">
                            Block
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Pagination page={page} total={filtered.length} perPage={PER_PAGE} onChange={setPage} />
      </div>

      {/* ── Block Modal ── */}
      {blockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Block Driver</h3>
              <button onClick={() => setBlockModal(null)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X size={16} className="text-gray-500" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-5">
              Block <span className="font-semibold text-gray-900">{blockModal.name}</span> from accepting rides.
            </p>

            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Duration</p>
            <div className="grid grid-cols-4 gap-2 mb-4">
              {[24,48,72,168].map(h => (
                <button key={h} onClick={() => setBlockHrs(h)}
                  className={`py-2 rounded-xl text-xs font-semibold border transition ${
                    blockHrs === h
                      ? "bg-red-50 text-red-600 border-red-200"
                      : "bg-gray-50 text-gray-500 border-gray-200 hover:border-red-200"
                  }`}>
                  {h === 24 ? "1 day" : h === 48 ? "2 days" : h === 72 ? "3 days" : "7 days"}
                </button>
              ))}
            </div>

            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Reason</p>
            <textarea
              value={blockReason}
              onChange={e => setBlockReason(e.target.value)}
              placeholder="Reason for blocking (optional)…"
              rows={3}
              className="w-full px-4 py-3 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-red-400 resize-none mb-5 transition"
            />

            <div className="flex gap-3">
              <button onClick={() => setBlockModal(null)}
                className="flex-1 py-2.5 bg-gray-50 text-gray-600 border border-gray-200 rounded-xl text-sm font-semibold hover:bg-gray-100 transition">
                Cancel
              </button>
              <button onClick={submitBlock} disabled={blocking}
                className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 transition disabled:opacity-50">
                {blocking ? "Blocking…" : "Block Driver"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
