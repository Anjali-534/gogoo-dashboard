"use client";
import { useEffect, useState } from "react";
import axios from "axios";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

const SAMPLE_ENTRIES = [
  { id:1, action:"Driver verified",          actor:"admin@gogoo.in", detail:"Driver ID: abc123",           time:"2026-06-18 14:23", type:"verify"    },
  { id:2, action:"Broadcast sent",            actor:"admin@gogoo.in", detail:"To drivers: Weekend offer",   time:"2026-06-17 10:45", type:"broadcast" },
  { id:3, action:"Driver blocked",            actor:"admin@gogoo.in", detail:"48h block — repeated cancel", time:"2026-06-16 09:12", type:"block"     },
  { id:4, action:"Driver document approved",  actor:"admin@gogoo.in", detail:"Aadhaar Card approved",       time:"2026-06-15 16:30", type:"docs"      },
  { id:5, action:"Settings updated",          actor:"admin@gogoo.in", detail:"Commission: 20% → 18%",       time:"2026-06-14 11:00", type:"settings"  },
];

const TYPE_ICON: Record<string, string> = {
  verify: "✅", broadcast: "📢", block: "🚫", docs: "📄", settings: "⚙️",
};
const TYPE_BADGE: Record<string, string> = {
  verify:    "bg-green-100 text-green-700",
  broadcast: "bg-blue-100 text-blue-700",
  block:     "bg-red-100 text-red-700",
  docs:      "bg-orange-100 text-orange-700",
  settings:  "bg-gray-100 text-gray-600",
};

export default function AuditLogPage() {
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading,   setLoading]   = useState(true);

  const token = () => typeof window !== "undefined" ? localStorage.getItem("access_token") : "";

  useEffect(() => {
    axios.get(`${API}/gogoo/admin/audit`, {
      headers: { Authorization: `Bearer ${token()}` },
    }).then(r => {
      setAuditLogs(r.data || SAMPLE_ENTRIES);
    }).catch(() => {
      setAuditLogs(SAMPLE_ENTRIES);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-3xl space-y-5">
      {/* Coming soon notice */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 flex items-start gap-3">
        <span className="text-xl mt-0.5">🔒</span>
        <div>
          <p className="text-sm font-bold text-blue-700">Audit Logging — Coming Soon</p>
          <p className="text-xs text-blue-500 mt-1">
            Full audit trail is being built. Below are sample entries showing the format.
            The backend needs a <code className="bg-blue-100 px-1 rounded font-mono">/gogoo/admin/audit</code> endpoint.
          </p>
        </div>
      </div>

      {/* Log table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-gray-900">Admin Actions Log</h3>
            <p className="text-xs text-gray-400 mt-0.5">{auditLogs.length} entries</p>
          </div>
          {auditLogs === SAMPLE_ENTRIES && (
            <span className="text-[10px] font-bold bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full uppercase tracking-wider">
              Sample Data
            </span>
          )}
        </div>

        {loading ? (
          <div className="p-5 space-y-3">
            {Array.from({length:5}).map((_,i)=>(
              <div key={i} className="animate-pulse h-14 bg-gray-50 rounded-xl"/>
            ))}
          </div>
        ) : auditLogs.length === 0 ? (
          <div className="p-10 text-center text-gray-400">
            <p className="text-3xl mb-2">📋</p>
            <p className="text-sm">No audit entries yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {auditLogs.map((entry, i) => (
              <div key={entry.id || i} className="px-6 py-4 flex items-center gap-4">
                <span className="text-xl flex-shrink-0">{TYPE_ICON[entry.type] || "📌"}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-semibold text-gray-900">{entry.action}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${TYPE_BADGE[entry.type] || "bg-gray-100 text-gray-600"}`}>
                      {entry.type}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">{entry.detail}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">by {entry.actor}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-gray-400">{entry.time || (entry.created_at && new Date(entry.created_at).toLocaleString("en-IN",{dateStyle:"short",timeStyle:"short"}))}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* What will be logged */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="text-sm font-bold text-gray-900 mb-4">What Will Be Tracked</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon:"✅", label:"Driver verifications" },
            { icon:"🚫", label:"Driver blocks/unblocks" },
            { icon:"📄", label:"Document approvals/rejections" },
            { icon:"📢", label:"Broadcast notifications sent" },
            { icon:"⚙️", label:"Settings changes" },
            { icon:"🔑", label:"Admin logins" },
            { icon:"💰", label:"Manual wallet credits/debits" },
            { icon:"🏷", label:"Coupon codes created" },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-2 text-sm text-gray-600">
              <span>{item.icon}</span>
              {item.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
