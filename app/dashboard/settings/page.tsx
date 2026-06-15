"use client";
import { useState } from "react";

export default function SettingsPage() {
  const [surge, setSurge] = useState("1.0");
  const [commission, setCommission] = useState("20");

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Settings</h1>
      <div className="max-w-lg space-y-4">
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6 space-y-4">
          <h2 className="text-white font-semibold">Pricing Config</h2>
          <div>
            <label className="text-gray-400 text-xs mb-1.5 block">GLOBAL SURGE MULTIPLIER</label>
            <input value={surge} onChange={e => setSurge(e.target.value)}
              className="w-full bg-[#111] border border-[#2A2A2A] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#FF6B2B]" />
          </div>
          <div>
            <label className="text-gray-400 text-xs mb-1.5 block">PLATFORM COMMISSION (%)</label>
            <input value={commission} onChange={e => setCommission(e.target.value)}
              className="w-full bg-[#111] border border-[#2A2A2A] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#FF6B2B]" />
          </div>
          <button className="w-full bg-[#FF6B2B] text-white py-3 rounded-xl font-medium text-sm hover:bg-[#e85e22] transition">
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
