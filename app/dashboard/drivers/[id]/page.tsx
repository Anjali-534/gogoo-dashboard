"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { ArrowLeft, RefreshCw, X, CheckCircle, Ban, Phone, Mail, Star } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "https://gogobackend-production.up.railway.app";

const DOC_STATUS: Record<string, string> = {
  approved: "bg-green-100 text-green-700",
  pending:  "bg-yellow-100 text-yellow-700",
  rejected: "bg-red-100 text-red-700",
  missing:  "bg-gray-100 text-gray-500",
};

const RIDE_STATUS: Record<string, string> = {
  completed:   "bg-green-100 text-green-700",
  cancelled:   "bg-red-100 text-red-700",
  in_progress: "bg-orange-100 text-orange-700",
  accepted:    "bg-blue-100 text-blue-700",
  arriving:    "bg-purple-100 text-purple-700",
  searching:   "bg-yellow-100 text-yellow-700",
};

function fmtBytes(b?: number) {
  if (!b) return "";
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export default function DriverDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [driver,      setDriver]      = useState<any>(null);
  const [docs,        setDocs]        = useState<any[]>([]);
  const [rides,       setRides]       = useState<any[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [ridesLoading, setRidesLoading] = useState(true);
  const [reviewing,   setReviewing]   = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [previewDoc,  setPreviewDoc]  = useState<any | null>(null);
  const [rideTab,     setRideTab]     = useState("All");
  const [blockReason, setBlockReason] = useState("");
  const [blockHrs,    setBlockHrs]    = useState(48);
  const [blockBusy,   setBlockBusy]   = useState(false);
  const [notifMsg,    setNotifMsg]    = useState("");
  const [notifSending, setNotifSending] = useState(false);

  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : "";
  const headers = { Authorization: `Bearer ${token}` };

  const fetchData = async () => {
    try {
      const [driversRes, docsRes] = await Promise.all([
        axios.get(`${API}/gogoo/drivers`, { headers }),
        axios.get(`${API}/gogoo/drivers/${id}/documents`, { headers }),
      ]);
      const d = (driversRes.data || []).find((d: any) => d.id === id);
      setDriver(d || null);
      setDocs(docsRes.data.docs || []);
    } catch {} finally { setLoading(false); }
  };

  const fetchRides = async () => {
    setRidesLoading(true);
    try {
      const res = await axios.get(`${API}/gogoo/drivers/${id}/bookings`, { headers });
      setRides(res.data?.bookings || res.data || []);
    } catch {} finally { setRidesLoading(false); }
  };

  useEffect(() => { fetchData(); fetchRides(); }, [id]);

  const reviewDoc = async (docType: string, status: string) => {
    if (status === "rejected" && !rejectReason.trim()) {
      toast.error("Please enter a rejection reason");
      return;
    }
    try {
      await axios.patch(`${API}/gogoo/drivers/${id}/documents/${docType}/review`, {
        status, reject_reason: status === "rejected" ? rejectReason : "",
      }, { headers });
      toast.success(status === "approved" ? "Document approved" : "Document rejected");
      setReviewing(null);
      setRejectReason("");
      fetchData();
    } catch { toast.error("Failed to update document"); }
  };

  const verifyDriver = async () => {
    try {
      await axios.patch(`${API}/gogoo/drivers/${id}/verify`, {}, { headers });
      toast.success("Driver verified successfully");
      fetchData();
    } catch { toast.error("Failed to verify driver"); }
  };

  const unblockDriver = async () => {
    setBlockBusy(true);
    try {
      await axios.patch(`${API}/gogoo/drivers/${id}/block`, { action: "unblock" }, { headers });
      toast.success("Driver unblocked");
      fetchData();
    } catch { toast.error("Failed to unblock driver"); }
    finally { setBlockBusy(false); }
  };

  const blockDriver = async () => {
    setBlockBusy(true);
    try {
      await axios.patch(`${API}/gogoo/drivers/${id}/block`, {
        action: "block",
        reason: blockReason || "Manually blocked by admin",
        duration_hrs: blockHrs,
      }, { headers });
      toast.success(`Driver blocked for ${blockHrs}h`);
      setBlockReason("");
      fetchData();
    } catch { toast.error("Failed to block driver"); }
    finally { setBlockBusy(false); }
  };

  const sendNotification = async () => {
    if (!notifMsg.trim()) { toast.error("Enter a message"); return; }
    setNotifSending(true);
    try {
      await axios.post(`${API}/gogoo/admin/notifications`, {
        title: "Message from Admin",
        body: notifMsg,
        type: "general",
        target_audience: "drivers",
      }, { headers });
      toast.success("Notification sent to driver");
      setNotifMsg("");
    } catch { toast.error("Failed to send notification"); }
    finally { setNotifSending(false); }
  };

  const approved   = docs.filter(d => d.status === "approved").length;
  const total      = docs.length;
  const progress   = total > 0 ? Math.round((approved / total) * 100) : 0;
  const isBlocked  = driver?.is_blocked && driver?.blocked_until && new Date(driver.blocked_until) > new Date();

  const filteredRides = rideTab === "All" ? rides
    : rides.filter(r => r.status === rideTab.toLowerCase().replace(" ", "_"));

  const completedRides = rides.filter(r => r.status === "completed");
  const totalEarnings  = completedRides.reduce((s, r) => s + (r.fare || 0), 0);

  if (loading) {
    return (
      <div className="animate-pulse space-y-5">
        <div className="h-8 bg-gray-100 rounded w-32" />
        <div className="h-32 bg-gray-100 rounded-2xl" />
        <div className="h-48 bg-gray-100 rounded-2xl" />
      </div>
    );
  }
  if (!driver) {
    return (
      <div className="text-center py-20">
        <p className="text-4xl mb-4">🔍</p>
        <p className="text-lg font-semibold text-gray-900 mb-2">Driver not found</p>
        <button onClick={() => router.push("/dashboard/drivers")}
          className="text-orange-500 text-sm font-semibold">
          ← Back to Drivers
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Back */}
      <button onClick={() => router.push("/dashboard/drivers")}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-orange-500 transition font-medium">
        <ArrowLeft size={16} /> Back to Drivers
      </button>

      {/* ── Driver Header Card ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-orange-100 flex items-center justify-center text-orange-500 font-black text-2xl">
              {driver.name?.[0]?.toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap mb-1">
                <h2 className="text-xl font-bold text-gray-900">{driver.name}</h2>
                {driver.is_verified ? (
                  <span className="text-xs font-bold bg-green-100 text-green-700 px-2 py-1 rounded-full">✓ Verified</span>
                ) : (
                  <span className="text-xs font-bold bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">⏳ Pending</span>
                )}
                {driver.is_online && (
                  <span className="flex items-center gap-1 text-xs text-green-600 font-semibold">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" /> Online
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span className="flex items-center gap-1.5"><Mail size={13} />{driver.email || "—"}</span>
                <span className="flex items-center gap-1.5"><Phone size={13} />{driver.phone || "—"}</span>
              </div>
              <p className="text-sm text-gray-400 mt-1 capitalize">
                {driver.vehicle_category} · {driver.vehicle_type?.replace(/_/g," ")} · {driver.vehicle_number} · {driver.vehicle_model}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={fetchData}
              className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 transition">
              <RefreshCw size={15} />
            </button>
            {!driver.is_verified && (
              <button onClick={verifyDriver}
                className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-xl text-sm font-bold hover:bg-green-600 transition">
                <CheckCircle size={15} /> Verify Driver
              </button>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-100">
          {[
            { label: "Rating",        value: `⭐ ${Number(driver.rating||0).toFixed(1)}` },
            { label: "Total Rides",   value: driver.total_rides || 0 },
            { label: "Total Earnings",value: `₹${Number(driver.total_earnings||0).toLocaleString("en-IN")}` },
            { label: "Docs Approved", value: `${approved}/${total}` },
          ].map(s => (
            <div key={s.label} className="text-center">
              <p className="text-lg font-extrabold text-gray-900">{s.value}</p>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Block / Unblock ── */}
      {isBlocked ? (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <Ban size={20} className="text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-bold text-red-700">Driver Blocked</p>
                <p className="text-sm text-red-600 mt-1">
                  Blocked until <span className="font-semibold">{fmtDate(driver.blocked_until)}</span>
                </p>
                {driver.block_reason && (
                  <p className="text-xs text-red-400 mt-1 italic">{driver.block_reason}</p>
                )}
              </div>
            </div>
            <button onClick={unblockDriver} disabled={blockBusy}
              className="px-4 py-2 bg-white border border-green-200 text-green-600 rounded-xl text-sm font-bold hover:bg-green-50 transition disabled:opacity-50 flex-shrink-0">
              {blockBusy ? "…" : "✓ Unblock Driver"}
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
          <p className="text-sm font-bold text-gray-700 mb-3">Manual Block</p>
          <div className="flex gap-2 flex-wrap mb-3">
            {[24,48,72,168].map(h => (
              <button key={h} onClick={() => setBlockHrs(h)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                  blockHrs === h
                    ? "bg-red-50 text-red-600 border-red-200"
                    : "bg-gray-50 text-gray-500 border-gray-200 hover:border-red-200"
                }`}>
                {h === 24 ? "1 day" : h === 48 ? "2 days" : h === 72 ? "3 days" : "7 days"}
              </button>
            ))}
          </div>
          <div className="flex gap-3">
            <input value={blockReason} onChange={e => setBlockReason(e.target.value)}
              placeholder="Reason for blocking (optional)"
              className="flex-1 px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-red-300 transition" />
            <button onClick={blockDriver} disabled={blockBusy}
              className="px-4 py-2.5 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 transition disabled:opacity-50">
              {blockBusy ? "…" : "Block"}
            </button>
          </div>
        </div>
      )}

      {/* ── Doc Progress ── */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
        <div className="flex justify-between text-sm mb-2">
          <span className="font-medium text-gray-700">Document Verification Progress</span>
          <span className="font-bold text-orange-500">{progress}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-2 bg-orange-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
        <p className="text-xs text-gray-400 mt-2">
          {approved === total && total > 0
            ? "All documents approved — driver can be verified"
            : `${total - approved} document${total - approved !== 1 ? "s" : ""} pending review`}
        </p>
      </div>

      {/* ── Documents ── */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-900">Documents</h3>
        </div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          {docs.length === 0 ? (
            <div className="col-span-2 text-center py-10 text-gray-400">
              <p className="text-3xl mb-2">📄</p>
              <p className="text-sm">No documents uploaded yet</p>
            </div>
          ) : docs.map(doc => (
            <div key={doc.doc_type} className="border border-gray-100 rounded-xl p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{doc.label}</p>
                  <span className={`inline-block mt-1 text-[11px] font-bold px-2 py-1 rounded-full capitalize ${DOC_STATUS[doc.status] || DOC_STATUS.missing}`}>
                    {doc.status === "missing" ? "Not uploaded" : doc.status}
                  </span>
                </div>
                {doc.required && (
                  <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-1 rounded-full">Required</span>
                )}
              </div>

              {doc.doc_number  && <p className="text-xs text-gray-400 mb-1">No: {doc.doc_number}</p>}
              {doc.expiry_date && <p className="text-xs text-gray-400 mb-1">Expiry: {doc.expiry_date}</p>}
              {doc.reject_reason && (
                <p className="text-xs text-red-500 mb-2">⚠ {doc.reject_reason}</p>
              )}

              {doc.uploaded && doc.file_url && (
                <div className="mt-3 flex gap-2">
                  <button onClick={() => setPreviewDoc(doc)}
                    className="text-xs px-3 py-1.5 bg-orange-50 text-orange-500 border border-orange-200 rounded-lg hover:bg-orange-100 transition font-semibold">
                    👁 Preview
                  </button>
                  <a href={`${API}${doc.file_url}`} target="_blank" rel="noreferrer" download
                    className="text-xs px-3 py-1.5 bg-blue-50 text-blue-500 border border-blue-200 rounded-lg hover:bg-blue-100 transition font-semibold">
                    📥 Download
                  </a>
                </div>
              )}

              {doc.uploaded && doc.status !== "approved" && (
                <div className="mt-3">
                  {reviewing === doc.doc_type ? (
                    <div className="space-y-2">
                      <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                        placeholder="Rejection reason (required for reject)"
                        rows={2}
                        className="w-full text-xs px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none resize-none" />
                      <div className="flex gap-2">
                        <button onClick={() => reviewDoc(doc.doc_type, "approved")}
                          className="flex-1 py-2 bg-green-50 text-green-600 border border-green-200 rounded-lg text-xs font-bold hover:bg-green-100 transition">
                          ✓ Approve
                        </button>
                        <button onClick={() => reviewDoc(doc.doc_type, "rejected")}
                          className="flex-1 py-2 bg-red-50 text-red-500 border border-red-200 rounded-lg text-xs font-bold hover:bg-red-100 transition">
                          ✗ Reject
                        </button>
                        <button onClick={() => { setReviewing(null); setRejectReason(""); }}
                          className="px-3 py-2 text-gray-400 text-xs hover:text-gray-600">
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setReviewing(doc.doc_type)}
                      className="w-full py-2 text-xs font-bold bg-gray-50 border border-gray-200 text-gray-700 rounded-lg hover:bg-orange-50 hover:border-orange-200 hover:text-orange-500 transition">
                      Review Document
                    </button>
                  )}
                </div>
              )}

              {!doc.uploaded && (
                <p className="text-xs text-gray-400 mt-2">Driver has not uploaded this document yet.</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Ride History ── */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-gray-900">Ride History</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {completedRides.length} completed · ₹{totalEarnings.toLocaleString("en-IN")} earned
            </p>
          </div>
          <button onClick={fetchRides} className="p-2 hover:bg-gray-100 rounded-xl text-gray-400">
            <RefreshCw size={14} />
          </button>
        </div>

        {/* Ride stat chips */}
        <div className="px-6 py-4 border-b border-gray-100 flex gap-2 flex-wrap">
          {["All","Completed","Cancelled","In Progress"].map(t => {
            const cnt = t === "All" ? rides.length
              : rides.filter(r => r.status === t.toLowerCase().replace(" ","_")).length;
            return (
              <button key={t} onClick={() => setRideTab(t)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                  rideTab === t
                    ? "bg-orange-500 text-white border-orange-500"
                    : "bg-white text-gray-500 border-gray-200 hover:border-orange-300"
                }`}>
                {t} <span className="ml-1 opacity-70">{cnt}</span>
              </button>
            );
          })}
        </div>

        <div className="overflow-x-auto">
          {ridesLoading ? (
            <div className="p-10 text-center text-gray-400">Loading rides…</div>
          ) : filteredRides.length === 0 ? (
            <div className="p-10 text-center text-gray-400">
              <p className="text-3xl mb-2">🏁</p>
              <p className="text-sm">No {rideTab.toLowerCase()} rides found</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {["Date","Rider","Route","Service","Distance","Fare","Status"].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredRides.map((r: any) => (
                  <tr key={r.id} className="hover:bg-gray-50 transition">
                    <td className="px-5 py-3 text-xs text-gray-500 whitespace-nowrap">{fmtDate(r.created_at)}</td>
                    <td className="px-5 py-3 text-sm font-medium text-gray-900">{r.rider_name || "—"}</td>
                    <td className="px-5 py-3 max-w-[180px]">
                      <p className="text-xs text-gray-600 truncate">● {r.pickup_address || "—"}</p>
                      <p className="text-xs text-gray-400 truncate mt-0.5">● {r.drop_address || "—"}</p>
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-500">{r.service_name || "—"}</td>
                    <td className="px-5 py-3 text-xs text-gray-700 text-right">{Number(r.distance_km||0).toFixed(1)} km</td>
                    <td className="px-5 py-3 text-sm font-bold text-gray-900 text-right">₹{Math.round(r.fare||0)}</td>
                    <td className="px-5 py-3">
                      <span className={`text-[11px] font-bold px-2 py-1 rounded-full capitalize ${RIDE_STATUS[r.status] || "bg-gray-100 text-gray-600"}`}>
                        {r.status?.replace("_"," ")}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Send Notification ── */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
        <p className="text-sm font-bold text-gray-900 mb-3">Send Notification to Driver</p>
        <div className="flex gap-3">
          <input value={notifMsg} onChange={e => setNotifMsg(e.target.value)}
            placeholder="Message for this driver…"
            className="flex-1 px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-orange-400 transition" />
          <button onClick={sendNotification} disabled={notifSending}
            className="px-5 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-bold hover:bg-orange-600 transition disabled:opacity-50">
            {notifSending ? "Sending…" : "Send"}
          </button>
        </div>
      </div>

      {/* ── Preview Modal ── */}
      {previewDoc && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={() => setPreviewDoc(null)}>
          <div className="bg-white rounded-2xl p-5 max-w-2xl w-full max-h-[90vh] overflow-auto shadow-2xl"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-gray-900">{previewDoc.label}</h4>
              <div className="flex gap-2">
                <a href={`${API}${previewDoc.file_url}`} target="_blank" rel="noreferrer" download
                  className="text-xs px-3 py-1.5 bg-blue-50 text-blue-500 border border-blue-200 rounded-lg font-semibold">
                  📥 Download
                </a>
                <button onClick={() => setPreviewDoc(null)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                  <X size={16} className="text-gray-500" />
                </button>
              </div>
            </div>
            {previewDoc.mime_type === "application/pdf" ? (
              <iframe src={`${API}${previewDoc.file_url}`}
                className="w-full h-[60vh] rounded-xl border border-gray-200" title={previewDoc.label} />
            ) : (
              <img src={`${API}${previewDoc.file_url}`} alt={previewDoc.label}
                className="w-full rounded-xl border border-gray-100 object-contain max-h-[60vh]" />
            )}
            <p className="text-xs text-gray-400 mt-3 text-center">
              {previewDoc.file_name} · {fmtBytes(previewDoc.file_size)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
