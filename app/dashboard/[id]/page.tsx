"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import { useParams, useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

const STATUS_STYLES: Record<string, { badge: string; dot: string }> = {
  approved:    { badge: "text-green-400 bg-green-400/10 border-green-400/20",  dot: "bg-green-400" },
  rejected:    { badge: "text-red-400 bg-red-400/10 border-red-400/20",        dot: "bg-red-400" },
  pending:     { badge: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20", dot: "bg-yellow-400" },
  missing:     { badge: "text-gray-500 bg-gray-500/10 border-gray-500/20",     dot: "bg-gray-600" },
};

const RIDE_STATUS: Record<string, { label: string; cls: string }> = {
  completed:   { label: "Completed",   cls: "text-green-400 bg-green-400/10 border-green-400/20" },
  cancelled:   { label: "Cancelled",   cls: "text-red-400 bg-red-400/10 border-red-400/20" },
  in_progress: { label: "In Progress", cls: "text-blue-400 bg-blue-400/10 border-blue-400/20" },
  arriving:    { label: "Arriving",    cls: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20" },
  accepted:    { label: "Accepted",    cls: "text-purple-400 bg-purple-400/10 border-purple-400/20" },
  searching:   { label: "Searching",   cls: "text-gray-400 bg-gray-400/10 border-gray-400/20" },
};

const RIDE_TABS = ["All", "Completed", "Cancelled", "In Progress"] as const;
type RideTab = typeof RIDE_TABS[number];

function formatBytes(bytes: number): string {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function DriverDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();

  const [driver,       setDriver]       = useState<any>(null);
  const [docs,         setDocs]         = useState<any[]>([]);
  const [rides,        setRides]        = useState<any[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [ridesLoading, setRidesLoading] = useState(true);
  const [reviewing,    setReviewing]    = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [previewDoc,   setPreviewDoc]   = useState<any | null>(null);
  const [rideTab,      setRideTab]      = useState<RideTab>("All");
  const [blockReason,  setBlockReason]  = useState("");
  const [blockHrs,     setBlockHrs]     = useState(48);
  const [blockBusy,    setBlockBusy]    = useState(false);

  const token   = typeof window !== "undefined" ? localStorage.getItem("access_token") : "";
  const headers = { Authorization: `Bearer ${token}` };

  const fetchData = async () => {
    try {
      const [driversRes, docsRes] = await Promise.all([
        axios.get(`${API}/gogoo/drivers`, { headers }),
        axios.get(`${API}/gogoo/drivers/${id}/documents`, { headers }),
      ]);
      const d = (driversRes.data || []).find((d: any) => d.id === id);
      setDriver(d);
      setDocs(docsRes.data.docs || []);
    } catch {} finally { setLoading(false); }
  };

  const fetchRides = async () => {
    setRidesLoading(true);
    try {
      const res = await axios.get(`${API}/gogoo/drivers/${id}/bookings`, { headers });
      setRides(res.data || []);
    } catch {} finally { setRidesLoading(false); }
  };

  useEffect(() => {
    fetchData();
    fetchRides();
  }, [id]);

  const reviewDoc = async (docType: string, status: string, reason?: string) => {
    await axios.patch(`${API}/gogoo/drivers/${id}/documents/${docType}/review`, {
      status, reject_reason: reason || "",
    }, { headers });
    setReviewing(null);
    setRejectReason("");
    fetchData();
  };

  const verifyDriver = async () => {
    await axios.patch(`${API}/gogoo/drivers/${id}/verify`, {}, { headers });
    fetchData();
  };

  const unblockDriver = async () => {
    setBlockBusy(true);
    try {
      await axios.patch(`${API}/gogoo/drivers/${id}/block`, { action: "unblock" }, { headers });
      fetchData();
    } finally { setBlockBusy(false); }
  };

  const blockDriver = async () => {
    setBlockBusy(true);
    try {
      await axios.patch(`${API}/gogoo/drivers/${id}/block`, {
        action: "block",
        reason: blockReason || "Manually blocked by admin",
        duration_hrs: blockHrs,
      }, { headers });
      setBlockReason("");
      fetchData();
    } finally { setBlockBusy(false); }
  };

  const approved    = docs.filter(d => d.status === "approved").length;
  const total       = docs.length;
  const progressPct = total > 0 ? Math.round((approved / total) * 100) : 0;
  const isBlocked   = driver?.is_blocked && driver?.blocked_until && new Date(driver.blocked_until) > new Date();

  const filteredRides = rides.filter(r => {
    if (rideTab === "All")         return true;
    if (rideTab === "Completed")   return r.status === "completed";
    if (rideTab === "Cancelled")   return r.status === "cancelled";
    if (rideTab === "In Progress") return r.status === "in_progress";
    return true;
  });

  const completedRides    = rides.filter(r => r.status === "completed");
  const totalRideEarnings = completedRides.reduce((s, r) => s + (r.fare || 0), 0);

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-500">Loading...</div>;
  if (!driver)  return <div className="text-gray-500">Driver not found</div>;

  return (
    <div>
      <button onClick={() => router.push("/dashboard/drivers")}
        className="text-gray-500 hover:text-white text-sm mb-6 flex items-center gap-2 transition">
        ← Back to Drivers
      </button>

      {/* Driver header */}
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-[#FF6B2B]/20 flex items-center justify-center text-[#FF6B2B] font-bold text-2xl">
              {driver.name?.[0]?.toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-white font-bold text-xl">{driver.name}</h1>
                <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${driver.is_verified ? "text-green-400 bg-green-400/10 border-green-400/20" : "text-yellow-400 bg-yellow-400/10 border-yellow-400/20"}`}>
                  {driver.is_verified ? "✓ Verified" : "⏳ Pending Verification"}
                </span>
                {driver.is_online && (
                  <span className="flex items-center gap-1 text-xs text-green-400">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse inline-block" /> Online
                  </span>
                )}
              </div>
              <p className="text-gray-500 text-sm mt-1">{driver.email} · {driver.phone}</p>
              <p className="text-gray-400 text-sm mt-1 capitalize">
                {driver.vehicle_type?.replace(/_/g, " ")} · {driver.vehicle_number} · {driver.vehicle_model}
              </p>
            </div>
          </div>
          {!driver.is_verified && (
            <button onClick={verifyDriver}
              className="px-4 py-2 bg-green-500/10 text-green-400 border border-green-500/20 rounded-xl text-sm font-medium hover:bg-green-500/20 transition">
              ✓ Verify Driver
            </button>
          )}
        </div>

        <div className="grid grid-cols-4 gap-4 mt-6 pt-6 border-t border-[#2A2A2A]">
          {[
            { label: "Rating",       value: `⭐ ${Number(driver.rating).toFixed(1)}` },
            { label: "Total Rides",  value: driver.total_rides },
            { label: "Earnings",     value: `₹${Number(driver.total_earnings || 0).toLocaleString()}` },
            { label: "Docs Verified", value: `${approved}/${total}` },
          ].map(s => (
            <div key={s.label} className="text-center">
              <p className="text-white font-bold text-lg">{s.value}</p>
              <p className="text-gray-500 text-xs mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Block Status Card ────────────────────────────────── */}
      {isBlocked ? (
        <div className="bg-red-500/5 border border-red-500/30 rounded-2xl p-5 mb-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl mt-0.5">🚫</span>
              <div>
                <p className="text-red-300 font-semibold text-base">Driver Blocked</p>
                <p className="text-red-400/80 text-sm mt-1">
                  Blocked until{" "}
                  <span className="font-bold text-red-300">
                    {new Date(driver.blocked_until).toLocaleString("en-IN", {
                      day: "2-digit", month: "short", year: "numeric",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </span>
                </p>
                {driver.block_reason && (
                  <p className="text-red-400/60 text-xs mt-1 italic">{driver.block_reason}</p>
                )}
              </div>
            </div>
            <button onClick={unblockDriver} disabled={blockBusy}
              className="flex-shrink-0 px-4 py-2 bg-green-500/10 text-green-400 border border-green-500/20 rounded-xl text-sm font-semibold hover:bg-green-500/20 transition disabled:opacity-50">
              {blockBusy ? "…" : "✓ Unblock Driver"}
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-5 mb-6">
          <p className="text-gray-400 text-sm font-medium mb-3">Manual Block</p>
          <div className="flex gap-2 mb-3 flex-wrap">
            {[24, 48, 72, 168].map(h => (
              <button key={h} onClick={() => setBlockHrs(h)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                  blockHrs === h
                    ? "bg-red-500/20 text-red-300 border-red-500/40"
                    : "bg-[#111] text-gray-400 border-[#2A2A2A] hover:border-red-500/30"
                }`}>
                {h === 24 ? "1 day" : h === 48 ? "2 days" : h === 72 ? "3 days" : "7 days"}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={blockReason}
              onChange={e => setBlockReason(e.target.value)}
              placeholder="Reason (optional)"
              className="flex-1 bg-[#111] border border-[#2A2A2A] rounded-xl px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-red-500/40"
            />
            <button onClick={blockDriver} disabled={blockBusy}
              className="px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl text-sm font-semibold hover:bg-red-500/20 transition disabled:opacity-50 whitespace-nowrap">
              {blockBusy ? "…" : "🚫 Block Driver"}
            </button>
          </div>
        </div>
      )}

      {/* ── Ride History ──────────────────────────────────────── */}
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6 mb-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-white font-semibold text-lg">Ride History</h2>
            <p className="text-gray-500 text-xs mt-0.5">
              {completedRides.length} completed · ₹{totalRideEarnings.toLocaleString("en-IN", { maximumFractionDigits: 0 })} earned
            </p>
          </div>
          <button onClick={fetchRides}
            className="text-xs px-3 py-1.5 bg-[#FF6B2B]/10 text-[#FF6B2B] border border-[#FF6B2B]/20 rounded-lg hover:bg-[#FF6B2B]/20 transition">
            ↻ Refresh
          </button>
        </div>

        {/* Status filter tabs */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {RIDE_TABS.map(tab => (
            <button key={tab} onClick={() => setRideTab(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                rideTab === tab
                  ? "bg-[#FF6B2B] text-white border-[#FF6B2B]"
                  : "text-gray-400 border-[#2A2A2A] hover:border-[#FF6B2B]/40 hover:text-white"
              }`}>
              {tab}
              <span className="ml-1.5 text-[10px] opacity-70">
                {tab === "All"         ? rides.length
                : tab === "Completed"  ? rides.filter(r => r.status === "completed").length
                : tab === "Cancelled"  ? rides.filter(r => r.status === "cancelled").length
                : rides.filter(r => r.status === "in_progress").length}
              </span>
            </button>
          ))}
        </div>

        {ridesLoading ? (
          <div className="flex items-center justify-center py-10 text-gray-500 text-sm">Loading rides…</div>
        ) : filteredRides.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-gray-600 text-sm gap-2">
            <span className="text-3xl">🏁</span>
            No {rideTab === "All" ? "" : rideTab.toLowerCase() + " "}rides found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-xs border-b border-[#2A2A2A]">
                  <th className="text-left py-2.5 pr-4 font-medium">Date</th>
                  <th className="text-left py-2.5 pr-4 font-medium">Rider</th>
                  <th className="text-left py-2.5 pr-4 font-medium">Route</th>
                  <th className="text-left py-2.5 pr-4 font-medium">Service</th>
                  <th className="text-right py-2.5 pr-4 font-medium">Dist.</th>
                  <th className="text-right py-2.5 pr-4 font-medium">Fare</th>
                  <th className="text-left py-2.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E1E1E]">
                {filteredRides.map((ride: any) => {
                  const rs = RIDE_STATUS[ride.status] || { label: ride.status, cls: "text-gray-400 bg-gray-400/10 border-gray-400/20" };
                  return (
                    <tr key={ride.id} className="hover:bg-white/[0.02] transition">
                      <td className="py-3 pr-4 text-gray-400 text-xs whitespace-nowrap">
                        {fmtDate(ride.created_at)}
                      </td>
                      <td className="py-3 pr-4 text-white font-medium text-xs">
                        {ride.rider_name || "—"}
                      </td>
                      <td className="py-3 pr-4 max-w-[220px]">
                        <p className="text-gray-300 text-xs truncate" title={ride.pickup_address}>
                          <span className="text-green-400 mr-1">●</span>{ride.pickup_address}
                        </p>
                        <p className="text-gray-400 text-xs truncate mt-0.5" title={ride.drop_address}>
                          <span className="text-[#FF6B2B] mr-1">●</span>{ride.drop_address}
                        </p>
                      </td>
                      <td className="py-3 pr-4 text-gray-400 text-xs whitespace-nowrap">
                        {ride.service_name}
                      </td>
                      <td className="py-3 pr-4 text-gray-300 text-xs text-right whitespace-nowrap">
                        {Number(ride.distance_km).toFixed(1)} km
                      </td>
                      <td className="py-3 pr-4 text-white font-semibold text-xs text-right whitespace-nowrap">
                        ₹{Math.round(ride.fare)}
                      </td>
                      <td className="py-3">
                        <span className={`text-xs px-2 py-1 rounded-lg border font-medium ${rs.cls}`}>
                          {rs.label}
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

      {/* Document progress */}
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4 mb-6">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-400">Document verification progress</span>
          <span className="text-[#FF6B2B] font-semibold">{progressPct}%</span>
        </div>
        <div className="h-2 bg-[#2A2A2A] rounded-full overflow-hidden">
          <div className="h-2 bg-[#FF6B2B] rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%` }} />
        </div>
        <p className="text-gray-500 text-xs mt-2">
          {approved === total && total > 0
            ? "All documents approved — driver can be verified"
            : `${total - approved} document${total - approved !== 1 ? "s" : ""} still pending`}
        </p>
      </div>

      {/* Documents grid */}
      <h2 className="text-white font-semibold text-lg mb-4">Documents</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {docs.map((doc: any) => {
          const cfg   = STATUS_STYLES[doc.status] || STATUS_STYLES.missing;
          const isPDF = doc.mime_type === "application/pdf";

          return (
            <div key={doc.doc_type} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-white font-semibold text-sm">{doc.label}</p>
                  <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border mt-1.5 font-medium ${cfg.badge}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                    {doc.status === "approved" ? "Approved"
                      : doc.status === "rejected" ? "Rejected"
                      : doc.status === "pending"  ? "Under Review"
                      : "Not Uploaded"}
                  </span>
                </div>
                {doc.required && (
                  <span className="text-xs text-red-400 bg-red-400/10 px-2 py-1 rounded-lg border border-red-400/20">Required</span>
                )}
              </div>

              {doc.reject_reason && (
                <div className="bg-red-400/5 border border-red-400/20 rounded-lg p-3 mb-3">
                  <p className="text-red-400 text-xs">⚠️ {doc.reject_reason}</p>
                </div>
              )}

              {doc.uploaded && doc.file_url && (
                <div className="bg-[#111] rounded-xl p-3 mb-3 flex items-center gap-3 border border-[#2A2A2A]">
                  <span className="text-2xl">{isPDF ? "📑" : "🖼️"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs font-medium truncate">{doc.file_name}</p>
                    <p className="text-gray-500 text-xs mt-0.5">
                      {isPDF ? "PDF Document" : "Image"} · {formatBytes(doc.file_size)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setPreviewDoc(doc)}
                      className="text-xs px-3 py-1.5 bg-[#FF6B2B]/10 text-[#FF6B2B] border border-[#FF6B2B]/20 rounded-lg hover:bg-[#FF6B2B]/20 transition">
                      👁 Preview
                    </button>
                    <a href={`${API}${doc.file_url}`} target="_blank" rel="noreferrer" download
                      className="text-xs px-3 py-1.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg hover:bg-blue-500/20 transition">
                      📥 Download
                    </a>
                  </div>
                </div>
              )}

              {doc.uploaded && doc.status !== "approved" && (
                <div>
                  {reviewing === doc.doc_type ? (
                    <div className="space-y-2">
                      <input
                        className="w-full bg-[#111] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-[#FF6B2B] placeholder-gray-600"
                        placeholder="Rejection reason (required if rejecting)"
                        value={rejectReason}
                        onChange={e => setRejectReason(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <button onClick={() => reviewDoc(doc.doc_type, "approved")}
                          className="flex-1 py-2 bg-green-500/10 text-green-400 border border-green-500/20 rounded-lg text-xs font-semibold hover:bg-green-500/20 transition">
                          ✓ Approve
                        </button>
                        <button onClick={() => {
                          if (!rejectReason.trim()) { alert("Please enter a rejection reason"); return; }
                          reviewDoc(doc.doc_type, "rejected", rejectReason);
                        }}
                          className="flex-1 py-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg text-xs font-semibold hover:bg-red-500/20 transition">
                          ✗ Reject
                        </button>
                        <button onClick={() => { setReviewing(null); setRejectReason(""); }}
                          className="px-3 py-2 text-gray-500 text-xs hover:text-white transition">
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setReviewing(doc.doc_type)}
                      className="w-full py-2 bg-[#FF6B2B]/10 text-[#FF6B2B] border border-[#FF6B2B]/20 rounded-lg text-xs font-semibold hover:bg-[#FF6B2B]/20 transition">
                      Review Document
                    </button>
                  )}
                </div>
              )}

              {!doc.uploaded && (
                <p className="text-gray-600 text-xs mt-1">Waiting for driver to upload</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Preview modal */}
      {previewDoc && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setPreviewDoc(null)}>
          <div className="bg-[#1A1A1A] rounded-2xl p-4 max-w-2xl w-full max-h-[90vh] overflow-auto"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">{previewDoc.label}</h3>
              <div className="flex gap-2">
                <a href={`${API}${previewDoc.file_url}`} target="_blank" rel="noreferrer" download
                  className="text-xs px-3 py-1.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg hover:bg-blue-500/20 transition">
                  📥 Download
                </a>
                <button onClick={() => setPreviewDoc(null)} className="text-gray-400 hover:text-white text-xl">×</button>
              </div>
            </div>
            {previewDoc.mime_type === "application/pdf" ? (
              <iframe src={`${API}${previewDoc.file_url}`}
                className="w-full h-[60vh] rounded-xl border border-[#2A2A2A]" title={previewDoc.label} />
            ) : (
              <img src={`${API}${previewDoc.file_url}`} alt={previewDoc.label}
                className="w-full rounded-xl border border-[#2A2A2A] object-contain max-h-[60vh]" />
            )}
            <p className="text-gray-500 text-xs mt-3 text-center">
              {previewDoc.file_name} · {formatBytes(previewDoc.file_size)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
