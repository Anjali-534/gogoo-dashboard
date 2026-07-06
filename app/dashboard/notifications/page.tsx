"use client";
import { useEffect, useState, useRef } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { Send, X, RefreshCw, Bell, Search, User } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "https://gogobackend-production.up.railway.app";

const TYPES = [
  { key: "general",      label: "General",      icon: "📢" },
  { key: "announcement", label: "Announcement", icon: "📣" },
  { key: "offer",        label: "Offer",        icon: "🎁" },
  { key: "coupon",       label: "Coupon",       icon: "🏷" },
  { key: "news",         label: "News",         icon: "📰" },
  { key: "ride",         label: "Ride Update",  icon: "🚗" },
];

const TYPE_ICON: Record<string, string> = Object.fromEntries(TYPES.map(t => [t.key, t.icon]));
const TYPE_BADGE: Record<string, string> = {
  general:      "bg-gray-100 text-gray-600",
  announcement: "bg-yellow-100 text-yellow-700",
  offer:        "bg-green-100 text-green-700",
  coupon:       "bg-teal-100 text-teal-700",
  news:         "bg-purple-100 text-purple-700",
  ride:         "bg-blue-100 text-blue-700",
};

const AUDIENCE_META = {
  drivers: { color: "#FF6B2B", label: "Drivers", emoji: "🚗", bg: "bg-orange-50" },
  riders:  { color: "#3B82F6", label: "Riders",  emoji: "👤", bg: "bg-blue-50"   },
};

const emptyForm = () => ({ title:"", body:"", type:"general", coupon_code:"", link_url:"" });

interface Person {
  id: string;
  user_id: string;
  name: string;
  phone?: string;
  email?: string;
}

function PersonSearch({ audience, selected, onSelect }: {
  audience: "drivers"|"riders";
  selected: Person | null;
  onSelect: (p: Person | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [all, setAll] = useState<Person[]>([]);
  const [loading, setLoading] = useState(false);
  const loadedRef = useRef(false);

  const loadPeople = async () => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    setLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      const endpoint = audience === "drivers" ? "/gogoo/drivers" : "/gogoo/riders";
      const res = await axios.get(`${API}${endpoint}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = res.data;
      const arr: Person[] = Array.isArray(data) ? data : (data?.drivers || data?.data || []);
      setAll(arr.filter(p => p.user_id));
    } catch { setAll([]); }
    finally { setLoading(false); }
  };

  const q = query.trim().toLowerCase();
  const matches = q.length === 0 ? [] : all.filter(p =>
    p.name?.toLowerCase().includes(q) || p.phone?.includes(q)
  ).slice(0, 8);

  if (selected) {
    return (
      <div className="flex items-center justify-between bg-white border border-orange-200 rounded-xl px-4 py-2.5 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <User size={14} className="text-orange-500 flex-shrink-0" />
          <span className="text-sm font-semibold text-gray-800 truncate">{selected.name}</span>
          {selected.phone && <span className="text-xs text-gray-400 flex-shrink-0">{selected.phone}</span>}
        </div>
        <button type="button" onClick={() => onSelect(null)} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="relative mb-3">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={query}
          onFocus={loadPeople}
          onChange={e => { setQuery(e.target.value); loadPeople(); }}
          placeholder={`Search ${audience === "drivers" ? "driver" : "rider"} by name or phone…`}
          className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-orange-400 transition"
        />
      </div>
      {q.length > 0 && (
        <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-lg max-h-56 overflow-y-auto">
          {loading ? (
            <p className="px-4 py-3 text-xs text-gray-400">Loading…</p>
          ) : matches.length === 0 ? (
            <p className="px-4 py-3 text-xs text-gray-400">No match found</p>
          ) : matches.map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => { onSelect(p); setQuery(""); }}
              className="w-full text-left px-4 py-2.5 text-sm hover:bg-orange-50 border-b border-gray-50 last:border-0"
            >
              <span className="font-medium text-gray-800">{p.name || "Unnamed"}</span>
              {p.phone && <span className="text-xs text-gray-400 ml-2">{p.phone}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ComposeForm({ audience, onSent }: { audience: "drivers"|"riders"; onSent: () => void }) {
  const [form,    setForm]    = useState(emptyForm());
  const [sending, setSending] = useState(false);
  // Broadcast is never the default silently — the admin must explicitly
  // switch to "Specific person" to narrow a send to one recipient.
  const [mode, setMode] = useState<"broadcast" | "specific">("broadcast");
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const meta = AUDIENCE_META[audience];

  const update = (k: string, v: string) => setForm(f => ({...f, [k]: v}));

  const switchMode = (m: "broadcast" | "specific") => {
    setMode(m);
    setSelectedPerson(null);
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.body.trim()) {
      toast.error("Title and message are required");
      return;
    }
    if (mode === "specific" && !selectedPerson) {
      toast.error(`Search and select a ${audience === "drivers" ? "driver" : "rider"} first`);
      return;
    }
    setSending(true);
    try {
      const token = localStorage.getItem("access_token");
      await axios.post(`${API}/gogoo/admin/notifications`,
        {
          ...form,
          target_audience: audience,
          ...(mode === "specific" ? { target_user_id: selectedPerson!.user_id } : {}),
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      toast.success(mode === "specific" ? `Message sent to ${selectedPerson!.name}` : `Broadcast sent to ${meta.label}!`);
      setForm(emptyForm());
      setSelectedPerson(null);
      onSent();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || "Failed to send. Try again.");
    } finally { setSending(false); }
  };

  const needsCoupon = form.type === "coupon" || form.type === "offer";

  return (
    <form onSubmit={send} className="border border-gray-100 rounded-2xl p-5 bg-gray-50 mb-5">
      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-4">New Message</p>

      {/* Target mode */}
      <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 mb-4">
        <button type="button" onClick={() => switchMode("broadcast")}
          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition ${
            mode === "broadcast" ? "bg-gray-900 text-white" : "text-gray-500 hover:text-gray-800"
          }`}>
          Broadcast to all {meta.label}
        </button>
        <button type="button" onClick={() => switchMode("specific")}
          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition ${
            mode === "specific" ? "bg-gray-900 text-white" : "text-gray-500 hover:text-gray-800"
          }`}>
          Specific person
        </button>
      </div>

      {mode === "specific" && (
        <PersonSearch audience={audience} selected={selectedPerson} onSelect={setSelectedPerson} />
      )}

      {/* Type chips */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {TYPES.map(t => (
          <button key={t.key} type="button" onClick={() => update("type", t.key)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition ${
              form.type === t.key
                ? "border-orange-400 bg-orange-50 text-orange-600"
                : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
            }`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <input value={form.title} onChange={e => update("title", e.target.value)}
        placeholder="Title  e.g. 50% off this weekend 🎉"
        maxLength={80}
        className="w-full px-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-orange-400 transition mb-3" />

      <textarea value={form.body} onChange={e => update("body", e.target.value)}
        placeholder="Message body…" maxLength={300} rows={3}
        className="w-full px-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-orange-400 transition resize-none mb-3" />

      {needsCoupon && (
        <input value={form.coupon_code} onChange={e => update("coupon_code", e.target.value.toUpperCase())}
          placeholder="Coupon code e.g. GOGOO50" maxLength={20}
          className="w-full px-4 py-2.5 text-sm bg-white border border-teal-300 rounded-xl focus:outline-none focus:border-teal-500 transition mb-3 font-mono tracking-widest text-teal-700" />
      )}

      <input value={form.link_url} onChange={e => update("link_url", e.target.value)}
        placeholder="Link URL (optional)"
        className="w-full px-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-orange-400 transition mb-4" />

      <button type="submit" disabled={sending || (mode === "specific" && !selectedPerson)}
        style={{ backgroundColor: meta.color }}
        className="w-full flex items-center justify-center gap-2 text-white font-bold py-2.5 rounded-xl text-sm disabled:opacity-50 transition hover:opacity-90">
        {sending ? (
          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
          </svg>
        ) : <Send size={15}/>}
        {sending ? "Sending…" : mode === "specific" ? `Send to ${selectedPerson?.name || "…"}` : `Send to ${meta.label}`}
      </button>
    </form>
  );
}

function BroadcastCard({ item, onDiscontinue }: { item: any; onDiscontinue: (id: string) => void }) {
  return (
    <div className={`border rounded-2xl p-4 mb-3 transition ${
      item.is_active
        ? "border-gray-100 bg-white shadow-sm"
        : "border-gray-100 bg-gray-50 opacity-60"
    }`}>
      <div className="flex items-start gap-3">
        <span className="text-xl mt-0.5 flex-shrink-0">{TYPE_ICON[item.type] || "📢"}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`font-semibold text-sm text-gray-900 ${!item.is_active ? "line-through" : ""}`}>
              {item.title}
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${TYPE_BADGE[item.type] || "bg-gray-100 text-gray-600"}`}>
              {item.type}
            </span>
            {item.target_user_id ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">1:1</span>
            ) : (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">broadcast</span>
            )}
            {!item.is_active && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">discontinued</span>
            )}
          </div>
          <p className="text-sm text-gray-600 leading-relaxed mb-2">{item.body}</p>

          {item.coupon_code && (
            <div className="inline-flex items-center gap-1.5 bg-teal-50 border border-teal-200 rounded-xl px-3 py-1 mb-2">
              <span className="text-xs">🏷</span>
              <span className="text-xs font-mono font-bold text-teal-700 tracking-widest">{item.coupon_code}</span>
            </div>
          )}

          {item.link_url && (
            <div className="inline-flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-xl px-3 py-1 mb-2 max-w-full">
              <span className="text-xs">🔗</span>
              <span className="text-xs text-blue-600 truncate max-w-[180px]">{item.link_url}</span>
            </div>
          )}

          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-gray-400">
              {new Date(item.created_at).toLocaleString("en-IN",{dateStyle:"medium",timeStyle:"short"})}
            </span>
            {item.read_count > 0 && (
              <span className="text-xs text-gray-400">👁 {item.read_count} read</span>
            )}
          </div>
        </div>

        {item.is_active && (
          <button onClick={() => onDiscontinue(item.id)}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 px-2.5 py-1.5 rounded-xl transition flex-shrink-0">
            <X size={12}/> Stop
          </button>
        )}
      </div>
    </div>
  );
}

function BroadcastColumn({ audience }: { audience: "drivers"|"riders" }) {
  const [items,   setItems]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const meta = AUDIENCE_META[audience];

  const fetchItems = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      const res = await axios.get(`${API}/gogoo/admin/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const all: any[] = res.data || [];
      setItems(all.filter(n => n.target_audience === audience || n.target_audience === "all"));
    } catch { setItems([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchItems(); }, []);

  const discontinue = async (id: string) => {
    if (!confirm("Stop this broadcast? It will be hidden from the app.")) return;
    try {
      const token = localStorage.getItem("access_token");
      await axios.delete(`${API}/gogoo/admin/notifications/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Broadcast discontinued");
      fetchItems();
    } catch { toast.error("Failed to discontinue"); }
  };

  const active   = items.filter(n => n.is_active);
  const inactive = items.filter(n => !n.is_active);

  return (
    <div className="flex-1 min-w-0 bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
      {/* Column header */}
      <div className="flex items-center gap-3 mb-5">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${meta.bg}`}>
          {meta.emoji}
        </div>
        <div>
          <h3 className="text-base font-bold text-gray-900">{meta.label}</h3>
          <p className="text-xs text-gray-400">{active.length} active message{active.length !== 1?"s":""}</p>
        </div>
        <button onClick={fetchItems} className="ml-auto p-1.5 hover:bg-gray-100 rounded-xl text-gray-400 transition">
          <RefreshCw size={14}/>
        </button>
      </div>

      <ComposeForm audience={audience} onSent={fetchItems} />

      {loading ? (
        <div className="space-y-3">
          {Array.from({length:3}).map((_,i)=>(
            <div key={i} className="animate-pulse h-20 bg-gray-50 rounded-2xl"/>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="border-2 border-dashed border-gray-200 rounded-2xl py-12 text-center">
          <Bell size={24} className="text-gray-300 mx-auto mb-3"/>
          <p className="text-sm text-gray-400">No messages yet</p>
          <p className="text-xs text-gray-300 mt-1">Send your first message above</p>
        </div>
      ) : (
        <>
          {active.length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">Active</p>
              {active.map(n => <BroadcastCard key={n.id} item={n} onDiscontinue={discontinue}/>)}
            </div>
          )}
          {inactive.length > 0 && (
            <div className="mt-4">
              <p className="text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-3">Discontinued</p>
              {inactive.map(n => <BroadcastCard key={n.id} item={n} onDiscontinue={discontinue}/>)}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function BroadcastsPage() {
  return (
    <div>
      <div className="mb-6">
        <p className="text-sm text-gray-400 mt-0.5">
          Send announcements, offers, coupons, and news to all drivers/riders, or message one specific person
        </p>
      </div>
      <div className="flex gap-5 items-start">
        <BroadcastColumn audience="drivers"/>
        <BroadcastColumn audience="riders"/>
      </div>
    </div>
  );
}
