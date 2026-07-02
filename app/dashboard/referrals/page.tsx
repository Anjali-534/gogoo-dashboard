"use client";
import { useEffect, useMemo, useState, useCallback } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { Search, Download, X, RefreshCw, ChevronRight, ChevronDown, List, GitBranch } from "lucide-react";
import Pagination from "../../../components/Pagination";

const API = process.env.NEXT_PUBLIC_API_URL || "https://gogobackend-production.up.railway.app";
const PER_PAGE = 50;

const TYPE_BADGE: Record<string, string> = {
  rider: "bg-orange-100 text-orange-700",
  driver: "bg-blue-100 text-blue-700",
};
const STATUS_BADGE: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  credited: "bg-green-100 text-green-700",
};

function fmtDate(iso: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function StatPill({ label, value, cls = "" }: any) {
  return (
    <div className={`bg-white border border-gray-100 rounded-xl px-4 py-3 text-center ${cls}`}>
      <p className="text-xl font-extrabold text-gray-900">{value}</p>
      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mt-0.5">{label}</p>
    </div>
  );
}

// Level-1 rows are the referral graph's edges (referrer -> referee); level-2
// rows are just the derived grand-referrer bonus for the same signup, so the
// chain view is built from level-1 rows only.
function useChain(rows: any[], tab: string, search: string) {
  return useMemo(() => {
    const level1 = rows.filter(r => r.level === 1 && (tab === "all" || tab === "pending" || tab === "credited" || r.user_type === tab.slice(0, -1)));
    const childrenByCode = new Map<string, any[]>();
    const nodeInfo = new Map<string, { name: string; phone: string }>();

    level1.forEach(r => {
      if (r.referrer_code) {
        if (!childrenByCode.has(r.referrer_code)) childrenByCode.set(r.referrer_code, []);
        childrenByCode.get(r.referrer_code)!.push(r);
        nodeInfo.set(r.referrer_code, { name: r.referrer_name, phone: r.referrer_phone });
      }
      if (r.referee_code) {
        nodeInfo.set(r.referee_code, { name: r.referee_name, phone: r.referee_phone });
      }
    });

    const refereeCodeSet = new Set(level1.map(r => r.referee_code).filter(Boolean));
    let rootCodes = Array.from(childrenByCode.keys()).filter(c => !refereeCodeSet.has(c));

    if (search) {
      const q = search.toLowerCase();
      rootCodes = rootCodes.filter(code => {
        const n = nodeInfo.get(code);
        return code.toLowerCase().includes(q) || n?.name?.toLowerCase().includes(q) || n?.phone?.includes(q);
      });
    }

    return { rootCodes, childrenByCode, nodeInfo };
  }, [rows, tab, search]);
}

function ChainList({ rootCodes, childrenByCode, nodeInfo }: {
  rootCodes: string[]; childrenByCode: Map<string, any[]>; nodeInfo: Map<string, { name: string; phone: string }>;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggle = (code: string) => setExpanded(prev => {
    const next = new Set(prev);
    next.has(code) ? next.delete(code) : next.add(code);
    return next;
  });

  const flat: { code: string; depth: number; edge: any | null }[] = [];
  const visit = (code: string, depth: number, edge: any | null) => {
    flat.push({ code, depth, edge });
    if (expanded.has(code)) {
      (childrenByCode.get(code) || []).forEach(child => visit(child.referee_code, depth + 1, child));
    }
  };
  rootCodes.forEach(code => visit(code, 0, null));

  if (flat.length === 0) {
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
      {flat.map((row, i) => {
        const kids = childrenByCode.get(row.code) || [];
        const info = nodeInfo.get(row.code);
        const isExpanded = expanded.has(row.code);
        return (
          <div
            key={`${row.code}-${i}`}
            className="flex items-center gap-2 px-5 py-3 border-b border-gray-50 hover:bg-gray-50 transition"
            style={{ paddingLeft: 20 + row.depth * 28 }}
          >
            {kids.length > 0 ? (
              <button onClick={() => toggle(row.code)} className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-700 flex-shrink-0">
                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
            ) : <span className="w-5 flex-shrink-0" />}
            {row.depth > 0 && <span className="text-gray-300 text-xs flex-shrink-0">↳</span>}
            <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
              {info?.name?.[0]?.toUpperCase() || "?"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{info?.name || "—"}</p>
              <p className="text-xs text-gray-400">{row.code}{info?.phone ? ` · ${info.phone}` : ""}</p>
            </div>
            {row.edge && (
              <>
                <span className={`text-[11px] font-bold px-2 py-1 rounded-full capitalize ${STATUS_BADGE[row.edge.status] || "bg-gray-100 text-gray-600"}`}>
                  {row.edge.status}
                </span>
                <span className="text-sm font-semibold text-gray-900 w-16 text-right flex-shrink-0">₹{Math.round(row.edge.amount)}</span>
              </>
            )}
            {kids.length > 0 && (
              <span className="text-xs text-gray-400 flex-shrink-0 w-20 text-right">{kids.length} referred</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function ReferralsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [view, setView] = useState<"table" | "chain">("table");
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const token = () => (typeof window !== "undefined" ? localStorage.getItem("access_token") : "");

  const fetchRows = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/gogoo/referral/all`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      setRows(Array.isArray(res.data) ? res.data : []);
    } catch (e: any) {
      console.error("Failed to fetch referrals:", e?.response?.data || e?.message);
      setRows([]);
    }
  }, []);

  useEffect(() => { fetchRows(); }, [fetchRows]);
  useEffect(() => { setPage(1); }, [tab, search]);

  const filtered = rows
    .filter(r => {
      if (tab === "riders")   return r.user_type === "rider";
      if (tab === "drivers")  return r.user_type === "driver";
      if (tab === "pending")  return r.status === "pending";
      if (tab === "credited") return r.status === "credited";
      return true;
    })
    .filter(r => {
      const q = search.toLowerCase();
      return !q ||
        r.referrer_name?.toLowerCase().includes(q) || r.referrer_phone?.includes(q) || r.referrer_code?.toLowerCase().includes(q) ||
        r.referee_name?.toLowerCase().includes(q)  || r.referee_phone?.includes(q)  || r.referee_code?.toLowerCase().includes(q);
    });

  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const chain = useChain(rows, tab, search);

  const downloadXLSX = () => {
    window.open(`${API}/gogoo/export/referrals.xlsx?token=${token()}`, "_blank");
    toast.success("Downloading Excel file…");
  };

  const ridersReferred  = rows.filter(r => r.user_type === "rider").length;
  const driversReferred = rows.filter(r => r.user_type === "driver").length;
  const totalPaid    = rows.filter(r => r.status === "credited").reduce((s, r) => s + Number(r.amount || 0), 0);
  const totalPending = rows.filter(r => r.status === "pending").reduce((s, r) => s + Number(r.amount || 0), 0);

  return (
    <div className="space-y-5">
      {/* ── Stats bar ── */}
      <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
        <StatPill label="Total Referrals"  value={rows.length} />
        <StatPill label="Riders Referred"  value={ridersReferred} />
        <StatPill label="Drivers Referred" value={driversReferred} />
        <StatPill label="Total Paid Out"   value={`₹${Math.round(totalPaid).toLocaleString("en-IN")}`} />
        <StatPill label="Pending Payouts"  value={`₹${Math.round(totalPending).toLocaleString("en-IN")}`} />
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

          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            {([
              { key: "all",      label: "All" },
              { key: "riders",   label: "Riders" },
              { key: "drivers",  label: "Drivers" },
              { key: "pending",  label: "Pending",  disabled: view === "chain" },
              { key: "credited", label: "Credited", disabled: view === "chain" },
            ]).map(({ key, label, disabled }) => (
              <button key={key} onClick={() => !disabled && setTab(key)} disabled={disabled}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  disabled ? "text-gray-300 cursor-not-allowed" :
                  tab === key ? "bg-white text-orange-500 shadow-sm" : "text-gray-500 hover:text-gray-900"
                }`}>
                {label}
              </button>
            ))}
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
          <button onClick={fetchRows} className="p-2 hover:bg-gray-100 rounded-xl text-gray-400">
            <RefreshCw size={16} />
          </button>
          <button onClick={downloadXLSX}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition">
            <Download size={15} /> Export Excel
          </button>
        </div>
      </div>

      {view === "table" ? (
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
                      <div className="text-4xl mb-3">🎁</div>
                      <p className="text-base font-semibold text-gray-900 mb-1">No referrals found</p>
                      <p className="text-sm text-gray-400">Try adjusting filters</p>
                    </td>
                  </tr>
                ) : paged.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50 transition">
                    <td className="px-5 py-4">
                      <p className="text-sm font-semibold text-gray-900">{r.referrer_name || "—"}</p>
                      <p className="text-xs text-gray-400">{r.referrer_code || "—"}{r.referrer_phone ? ` · ${r.referrer_phone}` : ""}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm font-semibold text-gray-900">{r.referee_name || "—"}</p>
                      <p className="text-xs text-gray-400">{r.referee_code || "—"}{r.referee_phone ? ` · ${r.referee_phone}` : ""}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`text-xs font-bold px-2 py-1 rounded-full capitalize ${TYPE_BADGE[r.user_type] || "bg-gray-100 text-gray-600"}`}>
                        {r.user_type}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-700">L{r.level}</td>
                    <td className="px-5 py-4 text-sm font-semibold text-gray-900">₹{Math.round(r.amount)}</td>
                    <td className="px-5 py-4">
                      <span className={`text-[11px] font-bold px-2 py-1 rounded-full capitalize ${STATUS_BADGE[r.status] || "bg-gray-100 text-gray-600"}`}>
                        {r.status}
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
              Click a referrer to expand who they referred. Rewards shown are the direct (level 1, ₹50) referral for each edge — grand-referrer bonuses (level 2, ₹25) are folded into the chain automatically.
            </p>
          </div>
          <ChainList rootCodes={chain.rootCodes} childrenByCode={chain.childrenByCode} nodeInfo={chain.nodeInfo} />
        </div>
      )}
    </div>
  );
}
