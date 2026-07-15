"use client";
import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import Link from "next/link";
import toast, { Toaster } from "react-hot-toast";
import { Search, Check, X, Ban } from "lucide-react";
import Pagination from "../../../components/Pagination";
import { ScrollBody } from "../../../components/TableControls";

const API = process.env.NEXT_PUBLIC_API_URL || "https://gogobackend-production.up.railway.app";
const PER_PAGE = 20;

interface TrackerCompany {
  id: string;
  company_name: string;
  contact_phone: string;
  contact_email: string;
  gstin: string;
  status: "pending" | "active" | "rejected" | "suspended";
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  driver_count: number;
  order_count: number;
}

const STATUS_BADGE: Record<string, string> = {
  pending:   "bg-yellow-100 text-yellow-700",
  active:    "bg-green-100 text-green-700",
  rejected:  "bg-red-100 text-red-600",
  suspended: "bg-gray-200 text-gray-600",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function TrackerCompaniesPage() {
  const [companies, setCompanies] = useState<TrackerCompany[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState("");
  const [page,      setPage]      = useState(1);
  const [confirmAction, setConfirmAction] = useState<{ id: string; name: string; action: "approve" | "reject" | "suspend" } | null>(null);
  const [busy, setBusy] = useState(false);

  const token = () => (typeof window !== "undefined" ? localStorage.getItem("access_token") : "");
  const hdrs  = () => ({ Authorization: `Bearer ${token()}` });

  const load = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/gogoo/dashboard/tracker/companies`, { headers: hdrs() });
      setCompanies(data || []);
    } catch {
      toast.error("Failed to load tracker companies");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search]);

  const filtered = companies.filter(c => {
    const q = search.toLowerCase();
    return !q ||
      c.company_name.toLowerCase().includes(q) ||
      c.contact_phone.includes(search) ||
      c.contact_email.toLowerCase().includes(q);
  });
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  async function runAction() {
    if (!confirmAction) return;
    setBusy(true);
    try {
      await axios.post(`${API}/gogoo/dashboard/tracker/companies/${confirmAction.id}/${confirmAction.action}`, {}, { headers: hdrs() });
      toast.success(
        confirmAction.action === "approve" ? "Company approved" :
        confirmAction.action === "reject"  ? "Company rejected" : "Company suspended"
      );
      setConfirmAction(null);
      load();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(msg || "Action failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <Toaster position="top-right" />

      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Tracker Companies</h1>
          <p className="text-xs text-gray-400">{companies.length} companies subscribed to Bogie Tracker</p>
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search name, phone, email…"
            className="pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-400 w-64" />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center"><p className="text-3xl mb-2">📦</p><p className="text-gray-500">No tracker companies found</p></div>
        ) : (
          <ScrollBody>
          <table className="w-full">
            <thead className="sticky top-0 z-10"><tr className="bg-gray-50">
              {["#", "Company", "Contact", "Drivers", "Orders", "Signed Up", "Status", "Actions"].map(h => (
                <th key={h} className="text-left px-5 py-3.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {paged.map((c, i) => (
                <tr key={c.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                  <td className="px-5 py-3 text-xs text-gray-400 font-medium">{(page - 1) * PER_PAGE + i + 1}</td>
                  <td className="px-5 py-3">
                    <p className="font-semibold text-gray-900 text-sm">{c.company_name}</p>
                    {c.gstin && <p className="text-xs text-gray-400">GSTIN: {c.gstin}</p>}
                  </td>
                  <td className="px-5 py-3 text-xs text-gray-600">
                    <p>{c.contact_phone}</p>
                    <p className="text-blue-500 truncate max-w-[160px]">{c.contact_email}</p>
                  </td>
                  <td className="px-5 py-3 text-sm font-bold text-gray-900 text-center">{c.driver_count}</td>
                  <td className="px-5 py-3 text-sm font-bold text-gray-900 text-center">{c.order_count}</td>
                  <td className="px-5 py-3 text-xs text-gray-500">{fmtDate(c.created_at)}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold capitalize ${STATUS_BADGE[c.status]}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1.5">
                      <Link href={`/dashboard/tracker-companies/${c.id}`}
                        className="px-3 py-1.5 text-xs font-semibold bg-orange-50 text-orange-500 border border-orange-200 rounded-lg hover:bg-orange-100 transition">
                        View
                      </Link>
                      {c.status !== "active" && (
                        <button onClick={() => setConfirmAction({ id: c.id, name: c.company_name, action: "approve" })}
                          className="p-1.5 rounded-lg hover:bg-green-50 text-green-600 transition-colors" title="Approve">
                          <Check size={14} />
                        </button>
                      )}
                      {c.status === "pending" && (
                        <button onClick={() => setConfirmAction({ id: c.id, name: c.company_name, action: "reject" })}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors" title="Reject">
                          <X size={14} />
                        </button>
                      )}
                      {c.status === "active" && (
                        <button onClick={() => setConfirmAction({ id: c.id, name: c.company_name, action: "suspend" })}
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors" title="Suspend">
                          <Ban size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </ScrollBody>
        )}
        <div className="px-5 py-3 border-t border-gray-100">
          <Pagination page={page} total={filtered.length} perPage={PER_PAGE} onChange={setPage} />
        </div>
      </div>

      {/* Confirm modal */}
      {confirmAction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 w-96 text-center">
            <p className="text-4xl mb-3">
              {confirmAction.action === "approve" ? "✅" : confirmAction.action === "reject" ? "🚫" : "⏸️"}
            </p>
            <p className="font-bold text-gray-900 mb-2">
              {confirmAction.action === "approve" ? "Approve" : confirmAction.action === "reject" ? "Reject" : "Suspend"} {confirmAction.name}?
            </p>
            <p className="text-sm text-gray-500 mb-6">
              {confirmAction.action === "approve" ? "This company will get access to the Bogie Tracker panel." :
               confirmAction.action === "reject"  ? "This signup will be marked as rejected." :
               "This company will lose access until reactivated."}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmAction(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={runAction} disabled={busy}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-colors disabled:opacity-50 ${
                  confirmAction.action === "approve" ? "bg-green-500 hover:bg-green-600" :
                  confirmAction.action === "reject"  ? "bg-red-500 hover:bg-red-600" : "bg-gray-500 hover:bg-gray-600"
                }`}>
                {busy ? "…" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
