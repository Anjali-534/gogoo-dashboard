"use client";
import { useEffect, useState } from "react";
import axios from "axios";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

type Doc = {
  doc_type: string;
  label: string;
  required: boolean;
  uploaded: boolean;
  status: string;
  file_url?: string;
  file_name?: string;
  file_size?: number;
  mime_type?: string;
  doc_number?: string;
  expiry_date?: string;
  reject_reason?: string;
};

const STATUS_STYLE: Record<string, string> = {
  approved: "text-green-400 bg-green-400/10",
  pending:  "text-yellow-400 bg-yellow-400/10",
  rejected: "text-red-400 bg-red-400/10",
  missing:  "text-gray-500 bg-[#222]",
};

const CATEGORY_BADGE: Record<string, string> = {
  truck:     "text-orange-400 bg-orange-400/10",
  cab:       "text-blue-400 bg-blue-400/10",
  ambulance: "text-red-400 bg-red-400/10",
};

function fmtBlockedUntil(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function isStillBlocked(d: any): boolean {
  return d.is_blocked && d.blocked_until && new Date(d.blocked_until) > new Date();
}

export default function DriversPage() {
  const [drivers,       setDrivers]       = useState<any[]>([]);
  const [tab,           setTab]           = useState("all");
  const [search,        setSearch]        = useState("");
  const [selected,      setSelected]      = useState<any | null>(null);
  const [drawerTab,     setDrawerTab]     = useState<"docs" | "history">("docs");
  const [docs,          setDocs]          = useState<Doc[]>([]);
  const [docsLoading,   setDocsLoading]   = useState(false);
  const [driverHistory, setDriverHistory] = useState<any[]>([]);
  const [histLoading,   setHistLoading]   = useState(false);
  const [busy,          setBusy]          = useState<string | null>(null);
  const [blockModal,    setBlockModal]    = useState<any | null>(null);
  const [blockReason,   setBlockReason]   = useState("");
  const [blockHrs,      setBlockHrs]      = useState(48);
  const [blocking,      setBlocking]      = useState(false);

  const token = () => (typeof window !== "undefined" ? localStorage.getItem("access_token") : null);

  const fetchDrivers = async () => {
    const res = await axios.get(`${API}/gogoo/drivers`, {
      headers: { Authorization: `Bearer ${token()}` },
    }).catch(() => ({ data: [] }));
    setDrivers(res.data || []);
  };

  useEffect(() => { fetchDrivers(); }, []);

  const openDriver = async (d: any) => {
    setSelected(d);
    setDrawerTab("docs");
    setDocs([]);
    setDriverHistory([]);
    setDocsLoading(true);
    try {
      const res = await axios.get(`${API}/gogoo/drivers/${d.id}/documents`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      setDocs(res.data.docs || []);
    } catch {
      setDocs([]);
    } finally {
      setDocsLoading(false);
    }
  };

  const loadDriverHistory = async (driverId: string) => {
    setHistLoading(true);
    try {
      const res = await axios.get(`${API}/gogoo/drivers/${driverId}/bookings`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      setDriverHistory(res.data?.bookings || res.data || []);
    } catch {
      setDriverHistory([]);
    } finally {
      setHistLoading(false);
    }
  };

  const switchDrawerTab = (t: "docs" | "history") => {
    setDrawerTab(t);
    if (t === "history" && selected && driverHistory.length === 0 && !histLoading) {
      loadDriverHistory(selected.id);
    }
  };

  const reviewDoc = async (docType: string, status: "approved" | "rejected") => {
    if (!selected) return;
    let reject_reason = "";
    if (status === "rejected") {
      reject_reason = window.prompt("Reason for rejection?") || "Document not clear";
    }
    setBusy(docType);
    try {
      await axios.patch(
        `${API}/gogoo/drivers/${selected.id}/documents/${docType}/review`,
        { status, reject_reason },
        { headers: { Authorization: `Bearer ${token()}` } }
      );
      await openDriver(selected);
      fetchDrivers();
    } catch {
      alert("Failed to update document");
    } finally {
      setBusy(null);
    }
  };

  const verify = async (id: string) => {
    await axios.patch(`${API}/gogoo/drivers/${id}/verify`, {}, {
      headers: { Authorization: `Bearer ${token()}` },
    });
    fetchDrivers();
    if (selected?.id === id) setSelected({ ...selected, is_verified: true });
  };

  const unblockDriver = async (driverId: string) => {
    await axios.patch(`${API}/gogoo/drivers/${driverId}/block`,
      { action: "unblock" },
      { headers: { Authorization: `Bearer ${token()}` } }
    ).catch(() => {});
    fetchDrivers();
  };

  const submitBlock = async () => {
    if (!blockModal) return;
    setBlocking(true);
    try {
      await axios.patch(`${API}/gogoo/drivers/${blockModal.id}/block`,
        { action: "block", reason: blockReason || "Manually blocked by admin", duration_hrs: blockHrs },
        { headers: { Authorization: `Bearer ${token()}` } }
      );
      setBlockModal(null);
      setBlockReason("");
      setBlockHrs(48);
      fetchDrivers();
    } catch {
      alert("Failed to block driver");
    } finally {
      setBlocking(false);
    }
  };

  const fmtBytes = (b?: number) => {
    if (!b) return "";
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / (1024 * 1024)).toFixed(1)} MB`;
  };

  const downloadXLSX = () => {
    const t = token();
    window.open(`${API}/gogoo/export/drivers.xlsx?token=${t}`, "_blank");
  };

  const filtered = drivers
    .filter(d => {
      if (tab === "pending")  return !d.is_verified;
      if (tab === "online")   return d.is_online;
      if (tab === "blocked")  return isStillBlocked(d);
      return true;
    })
    .filter(d => {
      const q = search.toLowerCase();
      return !q || d.name?.toLowerCase().includes(q) || d.email?.toLowerCase().includes(q) || d.phone?.includes(q);
    });

  const blockedCount = drivers.filter(isStillBlocked).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Drivers</h1>
          <p className="text-gray-500 text-sm mt-0.5">{filtered.length} drivers</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={downloadXLSX}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-xl text-sm font-semibold transition"
          >
            ⬇ Export Excel
          </button>
          <div className="flex gap-1 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-1">
            {(["all", "pending", "online", "blocked"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition flex items-center gap-1 ${
                  tab === t ? "bg-[#FF6B2B] text-white" : "text-gray-400 hover:text-white"
                }`}
              >
                {t}
                {t === "blocked" && blockedCount > 0 && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${tab === "blocked" ? "bg-white/20" : "bg-red-500/80 text-white"}`}>
                    {blockedCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, email, or phone…"
          className="w-full max-w-sm bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl px-4 py-2.5 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-[#FF6B2B]"
        />
      </div>

      {/* Blocked banner */}
      {tab !== "blocked" && blockedCount > 0 && (
        <div className="mb-4 flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
          <span className="text-red-400 text-lg">🚫</span>
          <p className="text-red-300 text-sm flex-1">
            <span className="font-bold">{blockedCount} driver{blockedCount !== 1 ? "s" : ""}</span> currently blocked due to excessive cancellations.
          </p>
          <button onClick={() => setTab("blocked")}
            className="text-xs px-3 py-1.5 bg-red-500/20 text-red-300 border border-red-500/30 rounded-lg hover:bg-red-500/30 transition">
            View Blocked
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3">
        {filtered.length === 0 && (
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-10 text-center text-gray-600">No drivers found</div>
        )}
        {filtered.map((d: any) => {
          const blocked = isStillBlocked(d);
          return (
            <div key={d.id} className={`bg-[#1A1A1A] border rounded-2xl p-5 flex items-center gap-5 ${blocked ? "border-red-500/30" : "border-[#2A2A2A]"}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold flex-shrink-0 ${blocked ? "bg-red-500/20 text-red-400" : "bg-[#FF6B2B]/20 text-[#FF6B2B]"}`}>
                {d.name?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-white font-medium">{d.name}</p>
                  {d.is_online && <span className="w-2 h-2 rounded-full bg-green-400" />}
                  {d.is_verified
                    ? <span className="text-xs text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full">Verified</span>
                    : <span className="text-xs text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded-full">Pending</span>
                  }
                  {d.vehicle_category && (
                    <span className={`text-xs px-2 py-0.5 rounded-full capitalize font-medium ${CATEGORY_BADGE[d.vehicle_category] || "text-gray-400 bg-gray-400/10"}`}>
                      {d.vehicle_category}
                    </span>
                  )}
                  {blocked && (
                    <span className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 px-2 py-0.5 rounded-full font-medium">
                      🚫 Blocked until {fmtBlockedUntil(d.blocked_until)}
                    </span>
                  )}
                </div>
                <p className="text-gray-500 text-xs mt-0.5">
                  📧 {d.email || "—"} &nbsp;·&nbsp; 📱 {d.phone || "—"}
                </p>
                {blocked && d.block_reason && (
                  <p className="text-red-400/70 text-xs mt-0.5 italic">{d.block_reason}</p>
                )}
              </div>
              <div className="text-center hidden md:block">
                <p className="text-white text-sm font-medium">{d.vehicle_model}</p>
                <p className="text-gray-500 text-xs">{d.vehicle_number}</p>
                <span className="text-xs text-gray-400 capitalize bg-[#111] px-2 py-0.5 rounded mt-1 inline-block">{d.vehicle_type?.replace(/_/g, " ")}</span>
              </div>
              <div className="text-center hidden lg:block">
                <p className="text-white text-sm font-bold">⭐ {Number(d.rating).toFixed(1)}</p>
                <p className="text-gray-500 text-xs">{d.total_rides} rides</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => openDriver(d)}
                  className="px-4 py-2 bg-[#FF6B2B]/10 text-[#FF6B2B] border border-[#FF6B2B]/30 rounded-xl text-xs font-medium hover:bg-[#FF6B2B]/20 transition">
                  View Docs
                </button>
                {!d.is_verified && !blocked && (
                  <button onClick={() => verify(d.id)}
                    className="px-4 py-2 bg-green-500/10 text-green-400 border border-green-500/20 rounded-xl text-xs font-medium hover:bg-green-500/20 transition">
                    Verify
                  </button>
                )}
                {blocked ? (
                  <button onClick={() => unblockDriver(d.id)}
                    className="px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl text-xs font-medium hover:bg-red-500/20 transition">
                    Unblock
                  </button>
                ) : (
                  <button onClick={() => { setBlockModal(d); setBlockReason(""); setBlockHrs(48); }}
                    className="px-4 py-2 bg-[#222] text-gray-400 border border-[#333] rounded-xl text-xs font-medium hover:text-red-400 hover:border-red-500/30 transition">
                    Block
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Document review drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSelected(null)} />
          <div className="relative w-full max-w-lg h-full bg-[#0F0F0F] border-l border-[#2A2A2A] overflow-y-auto">
            <div className="sticky top-0 bg-[#0F0F0F] border-b border-[#2A2A2A] p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h2 className="text-white font-bold text-lg">{selected.name}</h2>
                  <p className="text-gray-400 text-xs mt-0.5">📧 {selected.email || "—"}</p>
                  <p className="text-gray-400 text-xs">📱 {selected.phone || "—"}</p>
                  {selected.vehicle_category && (
                    <span className={`mt-1 inline-block text-xs px-2 py-0.5 rounded-full capitalize font-medium ${CATEGORY_BADGE[selected.vehicle_category] || "text-gray-400 bg-gray-400/10"}`}>
                      {selected.vehicle_category} · {selected.vehicle_type?.replace(/_/g, " ")}
                    </span>
                  )}
                </div>
                <button onClick={() => setSelected(null)} className="text-gray-500 hover:text-white text-xl">✕</button>
              </div>
              <div className="flex gap-1 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-1">
                {(["docs", "history"] as const).map(t => (
                  <button key={t} onClick={() => switchDrawerTab(t)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium capitalize transition ${
                      drawerTab === t ? "bg-[#FF6B2B] text-white" : "text-gray-400 hover:text-white"
                    }`}
                  >
                    {t === "docs" ? "📄 Documents" : "🚗 Ride History"}
                  </button>
                ))}
              </div>
            </div>

            {drawerTab === "docs" && (
            <div className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">Verification status</span>
                {selected.is_verified
                  ? <span className="text-xs text-green-400 bg-green-400/10 px-2 py-1 rounded-full">Verified</span>
                  : <span className="text-xs text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded-full">Pending</span>}
              </div>

              {docsLoading ? (
                <div className="text-gray-500 text-sm py-8 text-center">Loading documents…</div>
              ) : docs.length === 0 ? (
                <div className="text-gray-500 text-sm py-8 text-center">No documents uploaded yet.</div>
              ) : docs.map(doc => (
                <div key={doc.doc_type} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-white text-sm font-medium">{doc.label}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${STATUS_STYLE[doc.status] || STATUS_STYLE.missing}`}>
                      {doc.status === "missing" ? "not uploaded" : doc.status}
                    </span>
                  </div>

                  {doc.doc_number    && <p className="text-gray-500 text-xs">No: {doc.doc_number}</p>}
                  {doc.expiry_date   && <p className="text-gray-500 text-xs">Expiry: {doc.expiry_date}</p>}
                  {doc.reject_reason && <p className="text-red-400 text-xs mt-1">⚠ {doc.reject_reason}</p>}

                  {doc.uploaded && doc.file_url ? (
                    <div className="mt-3">
                      {doc.mime_type === "application/pdf" ? (
                        <a href={`${API}${doc.file_url}`} target="_blank" rel="noreferrer"
                          className="inline-block text-xs text-[#FF6B2B] underline">
                          📑 {doc.file_name} ({fmtBytes(doc.file_size)})
                        </a>
                      ) : (
                        <a href={`${API}${doc.file_url}`} target="_blank" rel="noreferrer">
                          <img src={`${API}${doc.file_url}`} alt={doc.label}
                            className="rounded-lg border border-[#2A2A2A] max-h-48 object-cover" />
                        </a>
                      )}

                      {doc.status !== "approved" && (
                        <div className="flex gap-2 mt-3">
                          <button disabled={busy === doc.doc_type}
                            onClick={() => reviewDoc(doc.doc_type, "approved")}
                            className="flex-1 py-2 bg-green-500/10 text-green-400 border border-green-500/20 rounded-lg text-xs font-medium hover:bg-green-500/20 transition disabled:opacity-50">
                            ✓ Approve
                          </button>
                          <button disabled={busy === doc.doc_type}
                            onClick={() => reviewDoc(doc.doc_type, "rejected")}
                            className="flex-1 py-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg text-xs font-medium hover:bg-red-500/20 transition disabled:opacity-50">
                            ✗ Reject
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-gray-600 text-xs mt-2">Driver has not uploaded this document.</p>
                  )}
                </div>
              ))}
            </div>
            )}

            {drawerTab === "history" && (() => {
              const completed = driverHistory.filter(b => b.status === "completed").length;
              const cancelled = driverHistory.filter(b => b.status === "cancelled").length;
              const STATUS_BADGE: Record<string, string> = {
                completed:   "text-green-400 bg-green-400/10 border-green-400/20",
                cancelled:   "text-red-400 bg-red-400/10 border-red-400/20",
                in_progress: "text-blue-400 bg-blue-400/10 border-blue-400/20",
                accepted:    "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
                arriving:    "text-orange-400 bg-orange-400/10 border-orange-400/20",
                searching:   "text-gray-400 bg-gray-400/10 border-gray-400/20",
              };
              return (
                <div className="p-5 space-y-3">
                  {histLoading ? (
                    <div className="text-gray-500 text-sm py-10 text-center">Loading ride history…</div>
                  ) : driverHistory.length === 0 ? (
                    <div className="text-gray-600 text-sm py-10 text-center">
                      <p className="text-3xl mb-2">🚗</p>
                      <p>No rides yet for this driver.</p>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-3 gap-3 mb-1">
                        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-3 text-center">
                          <p className="text-white font-bold text-xl">{driverHistory.length}</p>
                          <p className="text-gray-500 text-xs mt-0.5">Total</p>
                        </div>
                        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 text-center">
                          <p className="text-green-400 font-bold text-xl">{completed}</p>
                          <p className="text-gray-500 text-xs mt-0.5">Completed</p>
                        </div>
                        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-center">
                          <p className="text-red-400 font-bold text-xl">{cancelled}</p>
                          <p className="text-gray-500 text-xs mt-0.5">Cancelled</p>
                        </div>
                      </div>
                      {driverHistory.map((b: any) => (
                        <div key={b.id} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full capitalize font-medium border ${STATUS_BADGE[b.status] || "text-gray-400 bg-gray-400/10 border-gray-400/20"}`}>
                              {b.status?.replace("_", " ")}
                            </span>
                            <span className="text-white font-bold text-sm">Rs.{Math.round(b.fare || 0)}</span>
                          </div>
                          <div className="space-y-1 mb-2">
                            <p className="text-gray-400 text-xs flex gap-2">
                              <span className="text-green-400 flex-shrink-0">▲</span>
                              <span>{b.pickup_address || "—"}</span>
                            </p>
                            <p className="text-gray-400 text-xs flex gap-2">
                              <span className="text-[#FF6B2B] flex-shrink-0">▼</span>
                              <span>{b.drop_address || "—"}</span>
                            </p>
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="text-gray-600 text-xs">
                              {b.created_at
                                ? new Date(b.created_at).toLocaleString("en-IN", {
                                    day: "2-digit", month: "short", year: "numeric",
                                    hour: "2-digit", minute: "2-digit",
                                  })
                                : "—"}
                            </p>
                            {b.rider_name && <p className="text-gray-500 text-xs">👤 {b.rider_name}</p>}
                          </div>
                          {b.status === "cancelled" && (b.cancelled_by || b.cancel_reason) && (
                            <div className="mt-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                              {b.cancelled_by && (
                                <p className="text-red-400 text-xs">
                                  Cancelled by: <span className="font-semibold capitalize">{b.cancelled_by}</span>
                                </p>
                              )}
                              {b.cancel_reason && (
                                <p className="text-red-300/70 text-xs mt-0.5">{b.cancel_reason}</p>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Manual block modal */}
      {blockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-white font-bold text-lg mb-1">Block Driver</h3>
            <p className="text-gray-400 text-sm mb-5">
              Block <span className="text-white font-medium">{blockModal.name}</span> from accepting rides.
            </p>

            <label className="text-gray-400 text-xs mb-1 block">Block duration</label>
            <div className="flex gap-2 mb-4">
              {[24, 48, 72, 168].map(h => (
                <button key={h} onClick={() => setBlockHrs(h)}
                  className={`flex-1 py-2 rounded-xl text-xs font-medium border transition ${
                    blockHrs === h
                      ? "bg-red-500/20 text-red-300 border-red-500/40"
                      : "bg-[#111] text-gray-400 border-[#2A2A2A] hover:border-red-500/30"
                  }`}>
                  {h < 24 ? `${h}h` : h === 24 ? "1 day" : h === 48 ? "2 days" : h === 72 ? "3 days" : "7 days"}
                </button>
              ))}
            </div>

            <label className="text-gray-400 text-xs mb-1 block">Reason (optional)</label>
            <input
              value={blockReason}
              onChange={e => setBlockReason(e.target.value)}
              placeholder="e.g. Repeated cancellations, complaints from riders…"
              className="w-full bg-[#111] border border-[#2A2A2A] rounded-xl px-3 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-red-500/50 mb-5"
            />

            <div className="flex gap-3">
              <button onClick={() => setBlockModal(null)}
                className="flex-1 py-2.5 bg-[#111] text-gray-400 border border-[#2A2A2A] rounded-xl text-sm hover:text-white transition">
                Cancel
              </button>
              <button onClick={submitBlock} disabled={blocking}
                className="flex-1 py-2.5 bg-red-500/20 text-red-300 border border-red-500/30 rounded-xl text-sm font-semibold hover:bg-red-500/30 transition disabled:opacity-50">
                {blocking ? "Blocking…" : "🚫 Block Driver"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
