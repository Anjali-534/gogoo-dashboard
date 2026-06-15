"use client";
import { useEffect, useState } from "react";
import axios from "axios";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

/* ─── type config ──────────────────────────────────────────────── */
const TYPES = [
  { key: "general",      label: "General",      icon: "📢" },
  { key: "announcement", label: "Announcement", icon: "📣" },
  { key: "offer",        label: "Offer",        icon: "🎁" },
  { key: "coupon",       label: "Coupon",       icon: "🏷" },
  { key: "news",         label: "News",         icon: "📰" },
  { key: "ride",         label: "Ride Update",  icon: "🚗" },
];

const TYPE_META: Record<string, { icon: string; badge: string }> = {
  general:      { icon: "📢", badge: "text-gray-400 bg-gray-400/10" },
  announcement: { icon: "📣", badge: "text-yellow-400 bg-yellow-400/10" },
  offer:        { icon: "🎁", badge: "text-green-400 bg-green-400/10" },
  coupon:       { icon: "🏷", badge: "text-teal-400 bg-teal-400/10" },
  news:         { icon: "📰", badge: "text-purple-400 bg-purple-400/10" },
  ride:         { icon: "🚗", badge: "text-blue-400 bg-blue-400/10" },
};

const AUDIENCE_META = {
  drivers: { color: "#FF6B2B", label: "Drivers",  emoji: "🚗" },
  riders:  { color: "#3B82F6", label: "Riders",   emoji: "👤" },
};

const emptyForm = () => ({
  title: "", body: "", type: "general", coupon_code: "", link_url: "",
});

/* ─── compose form component ───────────────────────────────────── */
function ComposeForm({
  audience, onSent,
}: {
  audience: "drivers" | "riders";
  onSent: () => void;
}) {
  const [form,    setForm]    = useState(emptyForm());
  const [sending, setSending] = useState(false);
  const [err,     setErr]     = useState("");
  const [ok,      setOk]      = useState("");
  const meta = AUDIENCE_META[audience];

  const update = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.body.trim()) { setErr("Title and message required."); return; }
    setSending(true); setErr(""); setOk("");
    try {
      const token = localStorage.getItem("access_token");
      await axios.post(`${API}/gogoo/admin/notifications`,
        { ...form, target_audience: audience },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setOk("Broadcast sent!");
      setForm(emptyForm());
      onSent();
    } catch (e: any) { setErr(e?.response?.data?.error || e?.message || "Failed — try again."); }
    finally { setSending(false); }
  };

  const needsCoupon = form.type === "coupon" || form.type === "offer";

  return (
    <form onSubmit={send} className="border border-[#2A2A2A] rounded-2xl p-5 mb-6 bg-[#111]">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">New broadcast</p>

      {/* Type chips */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {TYPES.map(t => (
          <button key={t.key} type="button"
            onClick={() => update("type", t.key)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${
              form.type === t.key
                ? "border-[#FF6B2B] bg-[#FF6B2B]/10 text-[#FF6B2B]"
                : "border-[#2A2A2A] text-gray-600 hover:text-gray-300 hover:border-[#444]"
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Title */}
      <input
        value={form.title}
        onChange={e => update("title", e.target.value)}
        placeholder="Title  (e.g. 50% off this weekend 🎉)"
        maxLength={80}
        className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl px-3.5 py-2.5 text-white text-sm placeholder-gray-700 focus:outline-none focus:border-[#FF6B2B] transition mb-3"
      />

      {/* Body */}
      <textarea
        value={form.body}
        onChange={e => update("body", e.target.value)}
        placeholder="Message body…"
        maxLength={300}
        rows={3}
        className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl px-3.5 py-2.5 text-white text-sm placeholder-gray-700 focus:outline-none focus:border-[#FF6B2B] transition resize-none mb-3"
      />

      {/* Coupon code (conditional) */}
      {needsCoupon && (
        <input
          value={form.coupon_code}
          onChange={e => update("coupon_code", e.target.value.toUpperCase())}
          placeholder="Coupon code  e.g. GOGOO50"
          maxLength={20}
          className="w-full bg-[#0A0A0A] border border-teal-500/30 rounded-xl px-3.5 py-2.5 text-teal-300 text-sm placeholder-gray-700 focus:outline-none focus:border-teal-400 transition mb-3 font-mono tracking-widest"
        />
      )}

      {/* Link URL */}
      <input
        value={form.link_url}
        onChange={e => update("link_url", e.target.value)}
        placeholder="Link URL (optional)  https://…"
        className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl px-3.5 py-2.5 text-white text-sm placeholder-gray-700 focus:outline-none focus:border-[#FF6B2B] transition mb-4"
      />

      {err && <p className="text-red-400 text-xs mb-3">{err}</p>}
      {ok  && <p className="text-green-400 text-xs mb-3">{ok}</p>}

      <button type="submit" disabled={sending}
        style={{ backgroundColor: meta.color }}
        className="w-full flex items-center justify-center gap-2 text-white font-bold py-2.5 rounded-xl text-sm disabled:opacity-50 transition hover:opacity-90"
      >
        {sending
          ? <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
          : <span>📤</span>}
        {sending ? "Sending…" : `Send to ${meta.label}`}
      </button>
    </form>
  );
}

/* ─── broadcast card ────────────────────────────────────────────── */
function BroadcastCard({ item, onDiscontinue }: { item: any; onDiscontinue: (id: string) => void }) {
  const meta = TYPE_META[item.type] || TYPE_META.general;
  return (
    <div className={`border rounded-2xl p-4 mb-3 transition ${item.is_active ? "border-[#2A2A2A] bg-[#1A1A1A]" : "border-[#1E1E1E] bg-[#111] opacity-50"}`}>
      <div className="flex items-start gap-3">
        <span className="text-xl mt-0.5 flex-shrink-0">{meta.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`text-white font-semibold text-sm ${!item.is_active && "line-through"}`}>{item.title}</span>
            <span className={`text-xs px-2 py-0.5 rounded-md font-medium capitalize ${meta.badge}`}>{item.type}</span>
            {!item.is_active && <span className="text-xs px-2 py-0.5 rounded-md font-medium text-gray-600 bg-[#222]">discontinued</span>}
          </div>
          <p className="text-gray-400 text-sm leading-relaxed mb-2">{item.body}</p>

          {/* Coupon chip */}
          {item.coupon_code && (
            <div className="inline-flex items-center gap-1.5 bg-teal-400/10 border border-teal-400/20 rounded-lg px-3 py-1 mb-2">
              <span className="text-teal-400 text-xs">🏷</span>
              <span className="text-teal-300 text-xs font-mono font-bold tracking-widest">{item.coupon_code}</span>
            </div>
          )}

          {/* Link chip */}
          {item.link_url && (
            <div className="inline-flex items-center gap-1.5 bg-blue-400/10 border border-blue-400/20 rounded-lg px-3 py-1 mb-2 max-w-full">
              <span className="text-blue-400 text-xs">🔗</span>
              <span className="text-blue-300 text-xs truncate max-w-[200px]">{item.link_url}</span>
            </div>
          )}

          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-gray-600">
              {new Date(item.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
            </span>
            <span className="text-xs text-gray-600">👁 {item.read_count}</span>
          </div>
        </div>

        {item.is_active && (
          <button onClick={() => onDiscontinue(item.id)}
            className="text-gray-600 hover:text-red-400 text-xs px-2.5 py-1.5 rounded-lg hover:bg-red-400/10 transition flex-shrink-0 whitespace-nowrap"
          >
            Discontinue
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── column component ──────────────────────────────────────────── */
function BroadcastColumn({ audience }: { audience: "drivers" | "riders" }) {
  const [items,   setItems]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const meta = AUDIENCE_META[audience];

  const fetch = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      const res = await axios.get(`${API}/gogoo/admin/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const all = res.data || [];
      setItems(all.filter((n: any) => n.target_audience === audience || n.target_audience === "all"));
    } catch { setItems([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, []);

  const discontinue = async (id: string) => {
    if (!confirm("Discontinue this broadcast? It will be hidden from the app.")) return;
    try {
      const token = localStorage.getItem("access_token");
      await axios.delete(`${API}/gogoo/admin/notifications/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetch();
    } catch {}
  };

  const active   = items.filter(n => n.is_active);
  const inactive = items.filter(n => !n.is_active);

  return (
    <div className="flex-1 min-w-0">
      {/* Column header */}
      <div className="flex items-center gap-3 mb-5 pb-4 border-b border-[#1E1E1E]">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
          style={{ backgroundColor: `${meta.color}18` }}>
          {meta.emoji}
        </div>
        <div>
          <h2 className="text-white font-bold text-base">{meta.label}</h2>
          <p className="text-gray-600 text-xs">{active.length} active broadcast{active.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      <ComposeForm audience={audience} onSent={fetch} />

      {loading ? (
        <div className="text-center py-8 text-gray-700 text-sm">Loading…</div>
      ) : items.length === 0 ? (
        <div className="border border-dashed border-[#2A2A2A] rounded-2xl py-10 text-center text-gray-700 text-sm">
          No broadcasts yet
        </div>
      ) : (
        <div>
          {active.length > 0 && (
            <div>
              <p className="text-xs text-gray-600 uppercase tracking-wider font-semibold mb-3">Active</p>
              {active.map(n => <BroadcastCard key={n.id} item={n} onDiscontinue={discontinue} />)}
            </div>
          )}
          {inactive.length > 0 && (
            <div className="mt-4">
              <p className="text-xs text-gray-700 uppercase tracking-wider font-semibold mb-3">Discontinued</p>
              {inactive.map(n => <BroadcastCard key={n.id} item={n} onDiscontinue={discontinue} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── page ──────────────────────────────────────────────────────── */
export default function BroadcastsPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Broadcast Center</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          Send announcements, offers, coupons, and news directly to drivers and riders
        </p>
      </div>

      <div className="flex gap-6 items-start">
        <div className="flex-1 min-w-0 bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6">
          <BroadcastColumn audience="drivers" />
        </div>
        <div className="flex-1 min-w-0 bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6">
          <BroadcastColumn audience="riders" />
        </div>
      </div>
    </div>
  );
}
