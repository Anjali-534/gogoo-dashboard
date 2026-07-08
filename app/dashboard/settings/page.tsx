"use client";
import { useState, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { Save, RefreshCw, Lock, Key } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "https://gogobackend-production.up.railway.app";

const DEFAULT_SETTINGS = {
  commission_percent:      20,
  surge_multiplier:        1.0,
  min_wallet_balance:      500,
  wallet_block_threshold: -1000,
  registration_fee:        700,
  cancellation_fee:         30,
  otp_expiry_seconds:      300,
};

type Settings = typeof DEFAULT_SETTINGS;

function SettingRow({ label, description, name, value, onChange, unit = "", type = "number" }: any) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0">
      <div className="flex-1 min-w-0 mr-8">
        <p className="text-sm font-semibold text-gray-900">{label}</p>
        {description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {unit && <span className="text-sm text-gray-400">{unit}</span>}
        <input
          type={type}
          value={value}
          onChange={e => onChange(name, type === "number" ? Number(e.target.value) : e.target.value)}
          className="w-28 px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-orange-400 transition text-right font-semibold text-gray-900"
        />
      </div>
    </div>
  );
}

type PanelUser = {
  id: string;
  panel_name: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
  last_login: string | null;
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [saving,   setSaving]   = useState(false);
  const [loading,  setLoading]  = useState(true);
  const [pwModal,  setPwModal]  = useState(false);
  const [newPw,    setNewPw]    = useState("");
  const [confirmPw, setConfirmPw] = useState("");

  const [panelUsers,       setPanelUsers]       = useState<PanelUser[]>([]);
  const [resetModal,       setResetModal]       = useState(false);
  const [selectedUser,     setSelectedUser]     = useState<PanelUser | null>(null);
  const [newPanelPw,       setNewPanelPw]       = useState("");

  const token = () => typeof window !== "undefined" ? localStorage.getItem("access_token") : "";

  const fetchPanelUsers = async () => {
    try {
      const res = await axios.get(`${API}/gogoo/admin/panel-access`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      setPanelUsers(res.data.users || []);
    } catch {}
  };

  const resetPanelPassword = async () => {
    if (!selectedUser) return;
    if (!newPanelPw || newPanelPw.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    try {
      await axios.patch(
        `${API}/gogoo/admin/panel-access/${selectedUser.id}/password`,
        { password: newPanelPw },
        { headers: { Authorization: `Bearer ${token()}` } },
      );
      toast.success(`Password updated for ${selectedUser.email}`);
      setResetModal(false);
      setNewPanelPw("");
      setSelectedUser(null);
      fetchPanelUsers();
    } catch {
      toast.error("Failed to update password");
    }
  };

  useEffect(() => {
    // Try to load settings from backend, fall back to localStorage
    const saved = localStorage.getItem("gogoo_settings");
    if (saved) { try { setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(saved) }); } catch {} }
    axios.get(`${API}/gogoo/admin/settings`, {
      headers: { Authorization: `Bearer ${token()}` },
    }).then(r => {
      if (r.data && typeof r.data === "object") {
        setSettings(prev => ({ ...prev, ...r.data }));
      }
    }).catch(() => {}).finally(() => setLoading(false));
    fetchPanelUsers();
  }, []);

  const update = (name: string, value: any) => {
    setSettings(prev => ({ ...prev, [name]: value }));
  };

  const save = async () => {
    setSaving(true);
    try {
      await axios.patch(`${API}/gogoo/admin/settings`, settings, {
        headers: { Authorization: `Bearer ${token()}` },
      }).catch(() => {});
      localStorage.setItem("gogoo_settings", JSON.stringify(settings));
      toast.success("Settings saved successfully");
    } catch {
      localStorage.setItem("gogoo_settings", JSON.stringify(settings));
      toast.success("Settings saved locally");
    } finally { setSaving(false); }
  };

  const changePassword = async () => {
    if (!newPw.trim()) { toast.error("Enter a new password"); return; }
    if (newPw !== confirmPw) { toast.error("Passwords do not match"); return; }
    if (newPw.length < 6)   { toast.error("Password must be at least 6 characters"); return; }
    try {
      await axios.patch(`${API}/gogoo/admin/change-password`,
        { new_password: newPw },
        { headers: { Authorization: `Bearer ${token()}` } },
      );
      toast.success("Password changed successfully");
      setPwModal(false);
      setNewPw(""); setConfirmPw("");
    } catch {
      toast.error("Failed to change password. Contact your backend admin.");
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl space-y-5 animate-pulse">
        {Array.from({length:3}).map((_,i)=>(
          <div key={i} className="h-40 bg-gray-100 rounded-2xl"/>
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* ── Pricing & Commission ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-900">Pricing & Commission</h3>
          <p className="text-xs text-gray-400 mt-0.5">Controls fare calculation and platform revenue</p>
        </div>
        <div className="px-6">
          <SettingRow label="Platform Commission" description="% of fare collected by bogie" name="commission_percent" value={settings.commission_percent} onChange={update} unit="%" />
          <SettingRow label="Surge Multiplier"    description="Global fare multiplier (1.0 = normal)" name="surge_multiplier" value={settings.surge_multiplier} onChange={update} />
          <SettingRow label="Registration Fee"    description="One-time fee charged to new drivers" name="registration_fee" value={settings.registration_fee} onChange={update} unit="₹" />
          <SettingRow label="Cancellation Fee"    description="Fee charged for cancellations after acceptance" name="cancellation_fee" value={settings.cancellation_fee} onChange={update} unit="₹" />
        </div>
      </div>

      {/* ── Wallet Settings ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-900">Driver Wallet</h3>
          <p className="text-xs text-gray-400 mt-0.5">Wallet balance thresholds and restrictions</p>
        </div>
        <div className="px-6">
          <SettingRow label="Minimum Balance"       description="Drivers below this get a low-balance warning" name="min_wallet_balance" value={settings.min_wallet_balance} onChange={update} unit="₹" />
          <SettingRow label="Block Threshold"       description="Wallet blocked when balance falls below this" name="wallet_block_threshold" value={settings.wallet_block_threshold} onChange={update} unit="₹" />
        </div>
      </div>

      {/* ── Operations ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-900">Operations</h3>
        </div>
        <div className="px-6">
          <SettingRow label="OTP Expiry" description="Seconds before OTP expires during ride start" name="otp_expiry_seconds" value={settings.otp_expiry_seconds} onChange={update} unit="sec" />
        </div>
      </div>

      {/* Current values preview */}
      <div className="bg-orange-50 border border-orange-100 rounded-2xl p-5">
        <p className="text-xs font-bold text-orange-600 uppercase tracking-wider mb-3">Current Values Preview</p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {Object.entries(settings).map(([k, v]) => (
            <div key={k} className="flex justify-between">
              <span className="text-gray-600 capitalize">{k.replace(/_/g," ")}</span>
              <span className="font-bold text-gray-900">{String(v)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Save */}
      <button onClick={save} disabled={saving}
        className="flex items-center gap-2 w-full justify-center py-3 bg-orange-500 text-white rounded-2xl font-bold text-sm hover:bg-orange-600 transition disabled:opacity-50">
        {saving ? <RefreshCw size={16} className="animate-spin"/> : <Save size={16}/>}
        {saving ? "Saving…" : "Save Settings"}
      </button>

      {/* ── Panel Access ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-gray-900">Sub Panel Access</h3>
            <p className="text-xs text-gray-400 mt-0.5">Manage credentials for cab and truck panels</p>
          </div>
          <Key size={16} className="text-gray-400" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                {["Panel","Email","Role","Last Login","Status",""].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {panelUsers.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-6 text-center text-sm text-gray-400">No panel users found</td></tr>
              ) : panelUsers.map(u => (
                <tr key={u.id} className="border-t border-gray-50 hover:bg-gray-50">
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold
                      ${u.panel_name === "cab" ? "bg-orange-100 text-orange-700"
                      : u.panel_name === "truck" ? "bg-blue-100 text-blue-700"
                      : "bg-gray-100 text-gray-700"}`}>
                      {u.panel_name === "cab" ? "🚗" : u.panel_name === "truck" ? "🚛" : "🔧"}
                      {u.panel_name.charAt(0).toUpperCase() + u.panel_name.slice(1)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-gray-700">{u.email}</td>
                  <td className="px-5 py-3.5 text-sm text-gray-500 capitalize">{u.role}</td>
                  <td className="px-5 py-3.5 text-sm text-gray-500">
                    {u.last_login ? new Date(u.last_login).toLocaleDateString("en-IN") : "Never"}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold
                      ${u.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${u.is_active ? "bg-green-500" : "bg-red-500"}`} />
                      {u.is_active ? "Active" : "Disabled"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <button
                      onClick={() => { setSelectedUser(u); setResetModal(true); }}
                      className="text-xs font-semibold text-orange-500 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Reset Password
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Admin Account ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-900">Admin Account</h3>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900">admin@gogoo.in</p>
              <p className="text-xs text-gray-400 mt-0.5">Master Admin · Full Access</p>
            </div>
            <span className="text-xs font-bold bg-orange-100 text-orange-600 px-2.5 py-1 rounded-full">Master</span>
          </div>
          <button onClick={() => setPwModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-100 transition w-full justify-center">
            <Lock size={15}/> Change Password
          </button>
        </div>
      </div>

      {/* ── Reset Panel Password Modal ── */}
      {resetModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm border border-gray-100">
            <h3 className="text-base font-bold text-gray-900 mb-1">Reset Panel Password</h3>
            <p className="text-xs text-gray-500 mb-4">
              Updating password for{" "}
              <span className="font-semibold text-gray-700">{selectedUser.email}</span>
            </p>
            <input
              type="password"
              value={newPanelPw}
              onChange={e => setNewPanelPw(e.target.value)}
              placeholder="New password (min 8 characters)"
              className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-orange-400 transition mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setResetModal(false); setNewPanelPw(""); setSelectedUser(null); }}
                className="flex-1 py-2.5 bg-gray-50 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-100 transition"
              >
                Cancel
              </button>
              <button
                onClick={resetPanelPassword}
                className="flex-1 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-bold hover:bg-orange-600 transition"
              >
                Update Password
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Change Password Modal ── */}
      {pwModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm border border-gray-100">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold text-gray-900">Change Password</h3>
              <button onClick={() => { setPwModal(false); setNewPw(""); setConfirmPw(""); }}
                className="p-1.5 hover:bg-gray-100 rounded-lg">
                <RefreshCw size={14} className="text-gray-400" />
              </button>
            </div>
            <div className="space-y-3 mb-5">
              <div>
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">New Password</label>
                <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)}
                  placeholder="Min. 6 characters"
                  className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-orange-400 transition" />
              </div>
              <div>
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Confirm Password</label>
                <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-orange-400 transition" />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setPwModal(false); setNewPw(""); setConfirmPw(""); }}
                className="flex-1 py-2.5 bg-gray-50 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-100 transition">
                Cancel
              </button>
              <button onClick={changePassword}
                className="flex-1 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-bold hover:bg-orange-600 transition">
                Change Password
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
