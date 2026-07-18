"use client";
import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import { ArrowLeft, Phone, Mail, Check, X, Ban, RefreshCw, IndianRupee } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "https://gogobackend-production.up.railway.app";

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
  license_key: string;
}

interface TrackerDriver {
  id: string;
  driver_name: string;
  phone: string;
  vehicle_number: string;
  transporter_name: string;
  transporter_phone: string;
  is_active: boolean;
  created_at: string;
}

interface TrackerOrder {
  id: string;
  booked_for_company_name: string;
  booked_for_phone: string;
  dispatch_from: string;
  dispatch_to: string;
  driver_name: string;
  vehicle_number: string;
  status: "created" | "dispatched" | "in_transit" | "delivered" | "cancelled";
  created_at: string;
}

interface TrackerPlanOrder {
  id: string;
  plan: "single" | "2users" | "5users" | "mega" | "lifetime";
  billing_duration: "monthly" | "quarterly" | "halfYearly" | "yearly" | "onetime";
  base_amount: number;
  gst_amount: number;
  total_amount: number;
  invoice_number: string | null;
  status: "pending_payment" | "paid" | "cancelled";
  created_at: string;
  paid_at: string | null;
}

const STATUS_BADGE: Record<string, string> = {
  pending:   "bg-yellow-100 text-yellow-700",
  active:    "bg-green-100 text-green-700",
  rejected:  "bg-red-100 text-red-600",
  suspended: "bg-gray-200 text-gray-600",
};

const ORDER_STATUS_BADGE: Record<string, string> = {
  created:     "bg-gray-100 text-gray-600",
  dispatched:  "bg-amber-100 text-amber-700",
  in_transit:  "bg-blue-100 text-blue-700",
  delivered:   "bg-green-100 text-green-700",
  cancelled:   "bg-red-100 text-red-600",
};

const PLAN_ORDER_STATUS_BADGE: Record<string, string> = {
  pending_payment: "bg-yellow-100 text-yellow-700",
  paid:            "bg-green-100 text-green-700",
  cancelled:       "bg-red-100 text-red-600",
};

const PLAN_LABELS: Record<string, string> = {
  single: "Single User", "2users": "2 Users", "5users": "5 Users", mega: "Mega", lifetime: "Lifetime",
};

const DURATION_LABELS: Record<string, string> = {
  monthly: "Monthly", quarterly: "Quarterly", halfYearly: "Half-Yearly", yearly: "Yearly", onetime: "One-time",
};

function fmtINR(n: number) {
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function TrackerCompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [company, setCompany] = useState<TrackerCompany | null>(null);
  const [drivers, setDrivers] = useState<TrackerDriver[]>([]);
  const [orders,  setOrders]  = useState<TrackerOrder[]>([]);
  const [planOrders, setPlanOrders] = useState<TrackerPlanOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmAction, setConfirmAction] = useState<"approve" | "reject" | "suspend" | null>(null);
  const [busy, setBusy] = useState(false);
  const [markPaidOrder, setMarkPaidOrder] = useState<TrackerPlanOrder | null>(null);
  const [markPaidRef, setMarkPaidRef] = useState("");
  const [markPaidBusy, setMarkPaidBusy] = useState(false);

  const token = () => (typeof window !== "undefined" ? localStorage.getItem("access_token") : "");
  const headers = { Authorization: `Bearer ${token()}` };

  const load = useCallback(async () => {
    try {
      const [companyRes, driversRes, ordersRes, planOrdersRes] = await Promise.all([
        axios.get(`${API}/gogoo/dashboard/tracker/companies/${id}`, { headers }),
        axios.get(`${API}/gogoo/dashboard/tracker/companies/${id}/drivers`, { headers }),
        axios.get(`${API}/gogoo/dashboard/tracker/companies/${id}/orders`, { headers }),
        axios.get(`${API}/gogoo/dashboard/tracker/companies/${id}/plan-orders`, { headers }),
      ]);
      setCompany(companyRes.data || null);
      setDrivers(driversRes.data || []);
      setOrders(ordersRes.data || []);
      setPlanOrders(planOrdersRes.data || []);
    } catch {
      toast.error("Failed to load company");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function runAction() {
    if (!confirmAction) return;
    setBusy(true);
    try {
      await axios.post(`${API}/gogoo/dashboard/tracker/companies/${id}/${confirmAction}`, {}, { headers });
      toast.success(
        confirmAction === "approve" ? "Company approved" :
        confirmAction === "reject"  ? "Company rejected" : "Company suspended"
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

  async function runMarkPaid() {
    if (!markPaidOrder) return;
    setMarkPaidBusy(true);
    try {
      const res = await axios.post<{ company_activated?: boolean; first_activation?: boolean }>(
        `${API}/gogoo/dashboard/tracker/plan-orders/${markPaidOrder.id}/mark-paid`,
        markPaidRef.trim() ? { payment_gateway_ref: markPaidRef.trim() } : {},
        { headers }
      );
      let successMsg = "Order marked paid — invoice emailed to company";
      if (res.data?.company_activated) {
        successMsg = res.data?.first_activation
          ? "Order marked paid — company activated, license key & login emailed"
          : "Order marked paid — subscription reactivated, existing login restored";
      }
      toast.success(successMsg);
      setMarkPaidOrder(null);
      setMarkPaidRef("");
      load();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(msg || "Failed to mark paid");
    } finally {
      setMarkPaidBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-5">
        <div className="h-8 bg-gray-100 rounded w-32" />
        <div className="h-32 bg-gray-100 rounded-2xl" />
        <div className="h-48 bg-gray-100 rounded-2xl" />
      </div>
    );
  }
  if (!company) {
    return (
      <div className="text-center py-20">
        <p className="text-4xl mb-4">🔍</p>
        <p className="text-lg font-semibold text-gray-900 mb-2">Company not found</p>
        <button onClick={() => router.push("/dashboard/tracker-companies")} className="text-orange-500 text-sm font-semibold">
          ← Back to Tracker Companies
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-4xl">
      <Toaster position="top-right" />

      <button onClick={() => router.push("/dashboard/tracker-companies")}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-orange-500 transition font-medium">
        <ArrowLeft size={16} /> Back to Tracker Companies
      </button>

      {/* ── Company Header Card ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-orange-100 flex items-center justify-center text-orange-500 font-black text-2xl">
              {company.company_name?.[0]?.toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap mb-1">
                <h2 className="text-xl font-bold text-gray-900">{company.company_name}</h2>
                <span className={`text-xs font-bold px-2 py-1 rounded-full capitalize ${STATUS_BADGE[company.status]}`}>
                  {company.status}
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span className="flex items-center gap-1.5"><Mail size={13} />{company.contact_email}</span>
                <span className="flex items-center gap-1.5"><Phone size={13} />{company.contact_phone}</span>
              </div>
              {company.gstin && <p className="text-sm text-gray-400 mt-1">GSTIN: {company.gstin}</p>}
              {company.license_key && (
                <p className="text-sm text-gray-400 mt-1 font-mono">License Key: {company.license_key}</p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={load} className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 transition">
              <RefreshCw size={15} />
            </button>
            {company.status !== "active" && (
              <button onClick={() => setConfirmAction("approve")}
                className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-xl text-sm font-bold hover:bg-green-600 transition">
                <Check size={15} /> Approve
              </button>
            )}
            {company.status === "pending" && (
              <button onClick={() => setConfirmAction("reject")}
                className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-500 border border-red-200 rounded-xl text-sm font-bold hover:bg-red-100 transition">
                <X size={15} /> Reject
              </button>
            )}
            {company.status === "active" && (
              <button onClick={() => setConfirmAction("suspend")}
                className="flex items-center gap-2 px-4 py-2 bg-gray-50 text-gray-600 border border-gray-200 rounded-xl text-sm font-bold hover:bg-gray-100 transition">
                <Ban size={15} /> Suspend
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-100">
          {[
            { label: "Drivers", value: drivers.length },
            { label: "Orders",  value: orders.length },
            { label: "Signed Up", value: fmtDate(company.created_at) },
            { label: "Approved", value: company.approved_at ? fmtDate(company.approved_at) : "—" },
          ].map(s => (
            <div key={s.label} className="text-center">
              <p className="text-lg font-extrabold text-gray-900">{s.value}</p>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Plan Orders ── */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-900">Plan Orders</h3>
          <p className="text-xs text-gray-400 mt-0.5">{planOrders.length} total</p>
        </div>
        {planOrders.length === 0 ? (
          <div className="p-10 text-center text-gray-400">
            <p className="text-3xl mb-2">💳</p>
            <p className="text-sm">No plan orders yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {["Plan", "Duration", "Amount", "Status", "Invoice", "Created", ""].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {planOrders.map(o => (
                  <tr key={o.id} className="hover:bg-gray-50 transition">
                    <td className="px-5 py-3 text-sm font-semibold text-gray-900">{PLAN_LABELS[o.plan] || o.plan}</td>
                    <td className="px-5 py-3 text-sm text-gray-700">{DURATION_LABELS[o.billing_duration] || o.billing_duration}</td>
                    <td className="px-5 py-3 text-sm text-gray-900">{fmtINR(o.total_amount)}</td>
                    <td className="px-5 py-3">
                      <span className={`text-[11px] font-bold px-2 py-1 rounded-full capitalize ${PLAN_ORDER_STATUS_BADGE[o.status]}`}>
                        {o.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-500">{o.invoice_number || "—"}</td>
                    <td className="px-5 py-3 text-xs text-gray-500 whitespace-nowrap">{fmtDate(o.created_at)}</td>
                    <td className="px-5 py-3">
                      {o.status === "pending_payment" && (
                        <button onClick={() => { setMarkPaidOrder(o); setMarkPaidRef(""); }}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-green-50 text-green-600 border border-green-200 rounded-lg hover:bg-green-100 transition">
                          <IndianRupee size={12} /> Mark paid
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Drivers ── */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-900">Drivers</h3>
          <p className="text-xs text-gray-400 mt-0.5">{drivers.length} registered</p>
        </div>
        {drivers.length === 0 ? (
          <div className="p-10 text-center text-gray-400">
            <p className="text-3xl mb-2">🚚</p>
            <p className="text-sm">No drivers registered yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {["Driver", "Vehicle", "Transporter", "Status", "Registered"].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {drivers.map(d => (
                  <tr key={d.id} className="hover:bg-gray-50 transition">
                    <td className="px-5 py-3">
                      <p className="text-sm font-semibold text-gray-900">{d.driver_name}</p>
                      <p className="text-xs text-gray-400">{d.phone}</p>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-700">{d.vehicle_number || "—"}</td>
                    <td className="px-5 py-3 text-xs text-gray-500">
                      <p>{d.transporter_name || "—"}</p>
                      {d.transporter_phone && <p className="text-gray-400">{d.transporter_phone}</p>}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-[11px] font-bold px-2 py-1 rounded-full ${d.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {d.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-500 whitespace-nowrap">{fmtDate(d.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Orders ── */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-900">Orders</h3>
          <p className="text-xs text-gray-400 mt-0.5">{orders.length} total</p>
        </div>
        {orders.length === 0 ? (
          <div className="p-10 text-center text-gray-400">
            <p className="text-3xl mb-2">📦</p>
            <p className="text-sm">No orders yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {["Booked For", "Route", "Driver", "Status", "Created", ""].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {orders.map(o => (
                  <tr key={o.id} className="hover:bg-gray-50 transition">
                    <td className="px-5 py-3">
                      <p className="text-sm font-semibold text-gray-900">{o.booked_for_company_name}</p>
                      <p className="text-xs text-gray-400">{o.booked_for_phone}</p>
                    </td>
                    <td className="px-5 py-3 max-w-[180px]">
                      <p className="text-xs text-gray-600 truncate">● {o.dispatch_from}</p>
                      <p className="text-xs text-gray-400 truncate mt-0.5">● {o.dispatch_to}</p>
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-500">
                      <p>{o.driver_name || "—"}</p>
                      {o.vehicle_number && <p className="text-gray-400">{o.vehicle_number}</p>}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-[11px] font-bold px-2 py-1 rounded-full capitalize ${ORDER_STATUS_BADGE[o.status]}`}>
                        {o.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-500 whitespace-nowrap">{fmtDate(o.created_at)}</td>
                    <td className="px-5 py-3">
                      <Link href={`/dashboard/tracker-companies/${id}/orders/${o.id}`}
                        className="px-3 py-1.5 text-xs font-semibold bg-orange-50 text-orange-500 border border-orange-200 rounded-lg hover:bg-orange-100 transition">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirm modal */}
      {confirmAction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 w-96 text-center">
            <p className="text-4xl mb-3">
              {confirmAction === "approve" ? "✅" : confirmAction === "reject" ? "🚫" : "⏸️"}
            </p>
            <p className="font-bold text-gray-900 mb-2">
              {confirmAction === "approve" ? "Approve" : confirmAction === "reject" ? "Reject" : "Suspend"} {company.company_name}?
            </p>
            <p className="text-sm text-gray-500 mb-6">
              {confirmAction === "approve" ? "This company will get access to the Bogie Tracker panel." :
               confirmAction === "reject"  ? "This signup will be marked as rejected." :
               "This company will lose access until reactivated."}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmAction(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={runAction} disabled={busy}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-colors disabled:opacity-50 ${
                  confirmAction === "approve" ? "bg-green-500 hover:bg-green-600" :
                  confirmAction === "reject"  ? "bg-red-500 hover:bg-red-600" : "bg-gray-500 hover:bg-gray-600"
                }`}>
                {busy ? "…" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mark paid modal */}
      {markPaidOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 w-96 text-center">
            <p className="text-4xl mb-3">💳</p>
            <p className="font-bold text-gray-900 mb-2">
              Mark {PLAN_LABELS[markPaidOrder.plan] || markPaidOrder.plan} ({DURATION_LABELS[markPaidOrder.billing_duration] || markPaidOrder.billing_duration}) paid?
            </p>
            <p className="text-sm text-gray-500 mb-4">
              {fmtINR(markPaidOrder.total_amount)} — an invoice will be generated and emailed to the company.
            </p>
            <input
              type="text"
              value={markPaidRef}
              onChange={e => setMarkPaidRef(e.target.value)}
              placeholder="Payment reference (optional)"
              className="w-full mb-6 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-200"
            />
            <div className="flex gap-3">
              <button onClick={() => { setMarkPaidOrder(null); setMarkPaidRef(""); }}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button onClick={runMarkPaid} disabled={markPaidBusy}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-green-500 hover:bg-green-600 transition-colors disabled:opacity-50">
                {markPaidBusy ? "…" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
