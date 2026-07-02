"use client";
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { Search, Download, X, RefreshCw, ChevronRight, ChevronDown, List, GitBranch } from "lucide-react";
import Pagination from "../../../components/Pagination";

const API = process.env.NEXT_PUBLIC_API_URL || "https://gogobackend-production.up.railway.app";
const PER_PAGE = 50;
const AUTO_REFRESH_MS = 60000;

const TYPE_BADGE: Record<string, string> = {
  rider: "bg-orange-100 text-orange-700",
  driver: "bg-blue-100 text-blue-700",
};
const STATUS_BADGE: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  credited: "bg-green-100 text-green-700",
};
const TABS = [
  { key: "all",      label: "All" },
  { key: "riders",   label: "Riders" },
  { key: "drivers",  label: "Drivers" },
  { key: "level1",   label: "Level 1" },
  { key: "level2",   label: "Level 2" },
  { key: "pending",  label: "Pending" },
  { key: "credited", label: "Credited" },
];

function fmtDate(iso: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function StatPill({ icon, label, value }: any) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl px-4 py-3 text-center">
      <p className="text-xl font-extrabold text-gray-900">{icon} {value}</p>
      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mt-0.5">{label}</p>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="divide-y divide-gray-50">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-4 animate-pulse">
            <div className="h-8 w-8 rounded-full bg-gray-100" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-32 bg-gray-100 rounded" />
              <div className="h-2.5 w-20 bg-gray-100 rounded" />
            </div>
            <div className="h-3 w-16 bg-gray-100 rounded" />
            <div className="h-3 w-16 bg-gray-100 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

// Level-1 rows are the referral graph's direct edges (referrer -> referred).
// Level-2 rows are the derived grand-referrer bonus for the same signup; the
// chain view surfaces them as a "via <direct referrer> -> <name>" line under
// the same root, matching the actual 2-level reward structure.
function useChain(rows: any[], tab: string, search: string) {
  return useMemo(() => {
    const typeOk = (r: any) =>
      tab === "riders" ? r.user_type === "rider" :
      tab === "drivers" ? r.user_type === "driver" : true;

    const level1 = rows.filter(r => r.level === 1 && typeOk(r));
    const level2 = rows.filter(r => r.level === 2 && typeOk(r));

    const directReferrerByReferred = new Map<string, any>();
    const childrenByCode = new Map<string, any[]>();
    const nodeInfo = new Map<string, { name: string; phone: string }>();

    level1.forEach(r => {
      if (r.referred_code) directReferrerByReferred.set(r.referred_code, r);
      if (r.referrer_code) {
        if (!childrenByCode.has(r.referrer_code)) childrenByCode.set(r.referrer_code, []);
        childrenByCode.get(r.referrer_code)!.push(r);
        nodeInfo.set(r.referrer_code, { name: r.referrer_name, phone: r.referrer_phone });
      }
      if (r.referred_code) nodeInfo.set(r.referred_code, { name: r.referred_name, phone: r.referred_phone });
    });

    const grandchildrenByCode = new Map<string, any[]>();
    level2.forEach(r => {
      if (!r.referrer_code) return;
      const viaEdge = directReferrerByReferred.get(r.referred_code);
      if (!grandchildrenByCode.has(r.referrer_code)) grandchildrenByCode.set(r.referrer_code, []);
      grandchildrenByCode.get(r.referrer_code)!.push({ ...r, viaName: viaEdge?.referrer_name || "—" });
    });

    const refereeCodeSet = new Set(level1.map(r => r.referred_code).filter(Boolean));
    let rootCodes = Array.from(childrenByCode.keys()).filter(c => !refereeCodeSet.has(c));

    if (search) {
      const q = search.toLowerCase();
      rootCodes = rootCodes.filter(code => {
        const n = nodeInfo.get(code);
        return code.toLowerCase().includes(q) || n?.name?.toLowerCase().includes(q) || n?.phone?.includes(q);
      });
    }

    return { rootCodes, childrenByCode, grandchildrenByCode, nodeInfo };
  }, [rows, tab, search]);
}

function ChainList({ rootCodes, childrenByCode, grandchildrenByCode, nodeInfo }: {
  rootCodes: string[];
  childrenByCode: Map<string, any[]>;
  grandchildrenByCode: Map<string, any[]>;
  nodeInfo: Map<string, { name: string; phone: string }>;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggle = (code: string) => setExpanded(prev => {
    const next = new Set(prev);
    next.has(code) ? next.delete(code) : next.add(code);
    return next;
  });

  if (rootCodes.length === 0) {
    return (
      <div className="px-5 py-16 text-center">
        <div className="text-4xl mb-3">🌳</div>
        <p className="text-base font-semibold text-gray-900 mb-1">No referral chains found</p>
        <p className="text-sm text-gray-400">Try adjusting filters</p>
      </div>
    );
  }

  return (
    <div>
      {rootCodes.map(code => {
        const kids = childrenByCode.get(code) || [];
        const grandkids = grandchildrenByCode.get(code) || [];
        const info = nodeInfo.get(code);
        const isExpanded = expanded.has(code);
        const earned = kids.filter(k => k.status === "credited").reduce((s, k) => s + Number(k.amount), 0)
          + grandkids.filter(g => g.status === "credited").reduce((s, g) => s + Number(g.amount), 0);
        const hasChildren = kids.length + grandkids.length > 0;

        return (
          <div key={code}>
            <div
              className="flex items-center gap-3 px-5 py-3 border-b border-gray-50 hover:bg-gray-50 transition cursor-pointer"
              onClick={() => hasChildren && toggle(code)}
            >
              {hasChildren ? (
                <span className="w-5 h-5 flex items-center justify-center text-gray-400 flex-shrink-0">
                  {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </span>
              ) : <span className="w-5 flex-shrink-0" />}
              <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                {info?.name?.[0]?.toUpperCase() || "?"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {info?.name || "—"} <span className="text-gray-400 font-normal">({code})</span>
                </p>
                <p className="text-xs text-gray-400">
                  {kids.length} referral{kids.length !== 1 ? "s" : ""} · ₹{Math.round(earned)} earned
                </p>
              </div>
            </div>

            {isExpanded && (
              <div className="bg-gray-50/60">
                {kids.map(k => (
                  <div key={k.id} className="flex items-center gap-3 pl-16 pr-5 py-2.5 border-b border-gray-50">
                    <span className="text-gray-300 flex-shrink-0">→</span>
                    <span className="text-sm text-gray-800 flex-1 truncate">{k.referred_name || "—"}</span>
                    <span className={`text-[11px] font-bold px-2 py-1 rounded-full capitalize flex-shrink-0 ${STATUS_BADGE[k.status] || "bg-gray-100 text-gray-600"}`}>
                      {k.status}
                    </span>
                    <span className="text-sm font-semibold text-gray-900 w-14 text-right flex-shrink-0">₹{Math.round(k.amount)}</span>
                  </div>
                ))}
                {grandkids.map(g => (
                  <div key={g.id} className="flex items-center gap-3 pl-16 pr-5 py-2.5 border-b border-gray-50">
                    <span className="text-gray-300 flex-shrink-0">→</span>
                    <span className="text-sm text-gray-500 flex-1 truncate">via {g.viaName} → {g.referred_name || "—"}</span>
                    <span className={`text-[11px] font-bold px-2 py-1 rounded-full capitalize flex-shrink-0 ${STATUS_BADGE[g.status] || "bg-gray-100 text-gray-600"}`}>
                      {g.status}
                    </span>
                    <span className="text-sm font-semibold text-gray-900 w-14 text-right flex-shrink-0">₹{Math.round(g.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function ReferralsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [stats, setStats] = useState({ total_referrals: 0, rider_referrals: 0, driver_referrals: 0, total_paid: 0, total_pending: 0 });
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"table" | "chain">("table");
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const hasLoadedOnce = useRef(false);

  const token = () => (typeof window !== "undefined" ? localStorage.getItem("access_token") : "");

  const fetchRows = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await axios.get(`${API}/gogoo/referral/all`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      const data = res.data;
      const list = Array.isArray(data) ? data : (data?.referrals || []);
      setRows(list);
      setStats({
        total_referrals:  data?.total_referrals  ?? list.filter((r: any) => r.level === 1).length,
        rider_referrals:  data?.rider_referrals  ?? list.filter((r: any) => r.level === 1 && r.user_type === "rider").length,
        driver_referrals: data?.driver_referrals ?? list.filter((r: any) => r.level === 1 && r.user_type === "driver").length,
        total_paid:       data?.total_paid       ?? list.filter((r: any) => r.status === "credited").reduce((s: number, r: any) => s + Number(r.amount || 0), 0),
        total_pending:    data?.total_pending    ?? list.filter((r: any) => r.status === "pending").reduce((s: number, r: any) => s + Number(r.amount || 0), 0),
      });
    } catch (e: any) {
      console.error("Failed to fetch referrals:", e?.response?.data || e?.message);
      if (hasLoadedOnce.current) toast.error("Couldn't refresh referrals");
      else { setRows([]); toast.error("Failed to load referrals"); }
    } finally {
      setLoading(false);
      hasLoadedOnce.current = true;
    }
  }, []);

  useEffect(() => {
    fetchRows();
    const interval = setInterval(() => fetchRows(true), AUTO_REFRESH_MS);
    return () => clearInterval(interval);
  }, [fetchRows]);

  useEffect(() => { setPage(1); }, [tab, search]);

  const filtered = rows
    .filter(r => {
      if (tab === "riders")   return r.user_type === "rider";
      if (tab === "drivers")  return r.user_type === "driver";
      if (tab === "level1")   return r.level === 1;
      if (tab === "level2")   return r.level === 2;
      if (tab === "pending")  return r.status === "pending";
      if (tab === "credited") return r.status === "credited";
      return true;
    })
    .filter(r => {
      const q = search.toLowerCase();
      return !q ||
        r.referrer_name?.toLowerCase().includes(q) || r.referrer_phone?.includes(q) || r.referrer_code?.toLowerCase().includes(q) ||
        r.referred_name?.toLowerCase().includes(q)  || r.referred_phone?.includes(q) || r.referred_code?.toLowerCase().includes(q);
    });

  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const chain = useChain(rows, tab, search);
  const chainDisabled = ["level1", "level2", "pending", "credited"].includes(tab);

  const downloadXLSX = () => {
    window.open(`${API}/gogoo/export/referrals.xlsx?token=${token()}`, "_blank");
    toast.success("Downloading Excel file…");
  };

  return (
    <div className="space-y-5">
      {/* ── Stats bar ── */}
      <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
        <StatPill icon="🎁" label="Total Referrals"  value={stats.total_referrals} />
        <StatPill icon="👤" label="Rider Referrals"  value={stats.rider_referrals} />
        <StatPill icon="🚗" label="Driver Referrals" value={stats.driver_referrals} />
        <StatPill icon="💰" label="Total Paid"       value={`₹${Math.round(stats.total_paid).toLocaleString("en-IN")}`} />
        <StatPill icon="⏳" label="Pending Payouts"  value={`₹${Math.round(stats.total_pending).toLocaleString("en-IN")}`} />
      </div>

      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Name, phone, code…"
              className="pl-9 pr-9 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-orange-400 transition w-64" />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                <X size={13} />
              </button>
            )}
          </div>

          <div className="flex gap-1 bg-gray-100 rounded-xl p-1 flex-wrap">
            {TABS.map(({ key, label }) => {
              const disabled = view === "chain" && ["level1", "level2", "pending", "credited"].includes(key);
              return (
                <button key={key} onClick={() => !disabled && setTab(key)} disabled={disabled}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    disabled ? "text-gray-300 cursor-not-allowed" :
                    tab === key ? "bg-white text-orange-500 shadow-sm" : "text-gray-500 hover:text-gray-900"
                  }`}>
                  {label}
                </button>
              );
            })}
          </div>

          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            <button onClick={() => setView("table")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                view === "table" ? "bg-white text-orange-500 shadow-sm" : "text-gray-500 hover:text-gray-900"
              }`}>
              <List size={13} /> Table
            </button>
            <button onClick={() => setView("chain")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                view === "chain" ? "bg-white text-orange-500 shadow-sm" : "text-gray-500 hover:text-gray-900"
              }`}>
              <GitBranch size={13} /> Chain View
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => fetchRows()} className="p-2 hover:bg-gray-100 rounded-xl text-gray-400">
            <RefreshCw size={16} />
          </button>
          <button onClick={downloadXLSX}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition">
            <Download size={15} /> Export Excel
          </button>
        </div>
      </div>

      {loading ? (
        <TableSkeleton />
      ) : rows.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-20 text-center">
          <div className="text-4xl mb-3">🎁</div>
          <p className="text-base font-semibold text-gray-900 mb-1">No referrals yet</p>
          <p className="text-sm text-gray-400">Referrals will show up here once riders or drivers start inviting friends</p>
        </div>
      ) : view === "table" ? (
        /* ── Table ── */
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {["Referrer", "Referred", "Type", "Level", "Amount", "Status", "Signup Date", "Credited Date"].map(h => (
                    <th key={h} className="px-5 py-3.5 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paged.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-16 text-center">
                      <div className="text-4xl mb-3">🔍</div>
                      <p className="text-base font-semibold text-gray-900 mb-1">No referrals found</p>
                      <p className="text-sm text-gray-400">Try adjusting filters</p>
                    </td>
                  </tr>
                ) : paged.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50 transition">
                    <td className="px-5 py-4">
                      <p className="text-sm font-semibold text-gray-900">{r.referrer_name || "—"}</p>
                      <p className="text-xs text-gray-400 flex items-center gap-1.5">
                        {r.referrer_code && (
                          <span className="bg-gray-100 text-gray-600 font-bold px-1.5 py-0.5 rounded">{r.referrer_code}</span>
                        )}
                        {r.referrer_phone || ""}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm font-semibold text-gray-900">{r.referred_name || "—"}</p>
                      <p className="text-xs text-gray-400">{r.referred_phone || "—"}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`text-xs font-bold px-2 py-1 rounded-full capitalize ${TYPE_BADGE[r.user_type] || "bg-gray-100 text-gray-600"}`}>
                        {r.user_type === "rider" ? "🟠" : "🔵"} {r.user_type}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-700">
                      {r.level === 1 ? "Direct ₹50" : "Chain ₹25"}
                    </td>
                    <td className="px-5 py-4 text-sm font-semibold text-gray-900">₹{Math.round(r.amount)}</td>
                    <td className="px-5 py-4">
                      <span className={`text-[11px] font-bold px-2 py-1 rounded-full capitalize ${STATUS_BADGE[r.status] || "bg-gray-100 text-gray-600"}`}>
                        {r.status === "credited" ? "✅" : "⏳"} {r.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600">{fmtDate(r.created_at)}</td>
                    <td className="px-5 py-4 text-sm text-gray-600">{r.credited_at ? fmtDate(r.credited_at) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} total={filtered.length} perPage={PER_PAGE} onChange={setPage} />
        </div>
      ) : (
        /* ── Chain view ── */
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
            <p className="text-xs text-gray-500">
              {chainDisabled
                ? "Level/status filters don't apply to the chain view — showing all referral chains."
                : "Click a referrer to expand who they referred, including chain bonuses earned via their referrals."}
            </p>
          </div>
          <ChainList rootCodes={chain.rootCodes} childrenByCode={chain.childrenByCode} grandchildrenByCode={chain.grandchildrenByCode} nodeInfo={chain.nodeInfo} />
        </div>
      )}
    </div>
  );
}
