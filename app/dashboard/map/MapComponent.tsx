"use client";
import { useEffect, useRef, useState } from "react";
import axios from "axios";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { RefreshCw } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "https://gogobackend-production.up.railway.app";
const REFRESH_MS = 5000;

type Driver = {
  id: string; name: string; phone: string;
  vehicle_type: string; vehicle_category: string;
  vehicle_number: string; vehicle_model: string;
  is_online: boolean; current_lat?: number; current_lng?: number;
  rating: number; total_rides: number;
};

const CATEGORY_COLOR: Record<string, string> = {
  truck: "#3B82F6", cab: "#FF6B2B", ambulance: "#EF4444",
};
const CATEGORY_EMOJI: Record<string, string> = {
  truck: "🚛", cab: "🚗", ambulance: "🚑",
};

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:       "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:     "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

function makeIcon(cat: string, color: string) {
  const emoji = CATEGORY_EMOJI[cat] || "🚗";
  return L.divIcon({
    className: "",
    html: `<div style="background:${color};width:40px;height:40px;border-radius:50%;
      border:3px solid white;box-shadow:0 3px 10px rgba(0,0,0,0.2);
      display:flex;align-items:center;justify-content:center;font-size:18px">
      ${emoji}
    </div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
}

export default function MapComponent() {
  const mapRef     = useRef<HTMLDivElement>(null);
  const leafletRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Record<string, L.Marker>>({});

  const [drivers,  setDrivers]  = useState<Driver[]>([]);
  const [selected, setSelected] = useState<Driver | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [catFilter, setCatFilter] = useState("all");
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const token = () => localStorage.getItem("access_token");

  // Init map
  useEffect(() => {
    if (!mapRef.current || leafletRef.current) return;
    const map = L.map(mapRef.current, { center: [28.6139, 77.2090], zoom: 11 });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors", maxZoom: 19,
    }).addTo(map);
    leafletRef.current = map;
    return () => { map.remove(); leafletRef.current = null; };
  }, []);

  // Fetch drivers
  const fetchDrivers = async () => {
    try {
      const res = await axios.get(`${API}/gogoo/drivers`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      setDrivers(res.data || []);
      setLastUpdate(new Date());
      setLoading(false);
    } catch {}
  };

  useEffect(() => {
    fetchDrivers();
    const iv = setInterval(fetchDrivers, REFRESH_MS);
    return () => clearInterval(iv);
  }, []);

  // Update markers
  useEffect(() => {
    const map = leafletRef.current;
    if (!map) return;
    const seen = new Set<string>();

    drivers.forEach(d => {
      if (!d.is_online || !d.current_lat || !d.current_lng) return;
      if (catFilter !== "all" && d.vehicle_category !== catFilter) return;
      seen.add(d.id);

      const color = CATEGORY_COLOR[d.vehicle_category] || "#FF6B2B";
      const icon  = makeIcon(d.vehicle_category, color);
      const popup = `
        <div style="font-family:system-ui;min-width:160px;padding:4px">
          <div style="font-weight:800;font-size:14px;margin-bottom:4px">
            ${CATEGORY_EMOJI[d.vehicle_category]||"🚗"} ${d.name}
          </div>
          <div style="color:#6B7280;font-size:12px">
            ${d.vehicle_number||"—"} · ${(d.vehicle_type||"").replace(/_/g," ")}
          </div>
          <div style="margin-top:6px;display:flex;align-items:center;gap:6px">
            <span style="background:#DCFCE7;color:#16A34A;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:700">ONLINE</span>
            <span style="color:#9CA3AF;font-size:12px">⭐ ${Number(d.rating||0).toFixed(1)}</span>
          </div>
          <div style="color:#6B7280;font-size:11px;margin-top:4px">${d.total_rides} rides</div>
        </div>`;

      if (markersRef.current[d.id]) {
        markersRef.current[d.id].setLatLng([d.current_lat!, d.current_lng!]);
        markersRef.current[d.id].setIcon(icon);
      } else {
        const marker = L.marker([d.current_lat!, d.current_lng!], { icon })
          .addTo(map)
          .bindPopup(popup);
        marker.on("click", () => setSelected(d));
        markersRef.current[d.id] = marker;
      }
    });

    Object.keys(markersRef.current).forEach(id => {
      if (!seen.has(id)) {
        markersRef.current[id].remove();
        delete markersRef.current[id];
      }
    });
  }, [drivers, catFilter]);

  const panTo = (d: Driver) => {
    if (!d.current_lat || !leafletRef.current) return;
    leafletRef.current.flyTo([d.current_lat, d.current_lng!], 15, { duration: 1 });
    setSelected(d);
    markersRef.current[d.id]?.openPopup();
  };

  const online  = drivers.filter(d => d.is_online);
  const offline = drivers.filter(d => !d.is_online);
  const withGPS = online.filter(d => d.current_lat);

  return (
    <div>
      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-4 mb-5">
        {[
          { label: "Online Drivers",   value: online.length,    color: "text-green-600" },
          { label: "With Live GPS",    value: withGPS.length,   color: "text-green-600" },
          { label: "Offline",          value: offline.length,   color: "text-gray-500"  },
          { label: "Total Fleet",      value: drivers.length,   color: "text-gray-900"  },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
            <p className={`text-2xl font-extrabold ${c.color}`}>{c.value}</p>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mt-1">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Controls bar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-3 mb-5 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-700">Filter:</span>
          {["all","cab","truck","ambulance"].map(c=>(
            <button key={c} onClick={()=>setCatFilter(c)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition ${
                catFilter === c
                  ? "bg-orange-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}>
              {c === "all" ? "All" : `${CATEGORY_EMOJI[c]||""} ${c}`}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchDrivers}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-orange-500 transition font-medium">
            <RefreshCw size={13}/>Refresh
          </button>
          {lastUpdate && (
            <p className="text-xs text-gray-400">
              Updated {lastUpdate.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit",second:"2-digit"})}
            </p>
          )}
        </div>
      </div>

      <div className="flex gap-5">
        {/* Map */}
        <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden relative"
          style={{ height: "calc(100vh - 310px)", minHeight: 500 }}>
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
              <div className="text-center">
                <p className="text-5xl mb-3">🗺</p>
                <p className="text-gray-400 font-medium">Loading map…</p>
              </div>
            </div>
          )}
          <div ref={mapRef} style={{ width:"100%", height:"100%", zIndex:0 }} />
        </div>

        {/* Driver sidebar */}
        <div className="flex-shrink-0 flex flex-col gap-3 overflow-y-auto" style={{ width:260, maxHeight:"calc(100vh - 310px)" }}>
          {/* Online */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex-shrink-0">
            <div className="px-4 py-3 border-b border-gray-100 bg-green-50">
              <p className="text-xs font-bold text-green-700 uppercase tracking-wider">🟢 Online ({online.length})</p>
            </div>
            {online.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-3xl mb-2">🚗</p>
                <p className="text-gray-400 text-sm">No drivers online</p>
              </div>
            ) : online.map(d => (
              <div key={d.id}
                onClick={() => panTo(d)}
                className={`px-4 py-3 border-b border-gray-50 cursor-pointer transition ${
                  selected?.id === d.id ? "bg-orange-50 border-l-4 border-l-orange-400 pl-3" : "hover:bg-gray-50"
                }`}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                    style={{ backgroundColor: CATEGORY_COLOR[d.vehicle_category]||"#FF6B2B" }}>
                    {d.name?.[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-900 font-semibold text-sm truncate">{d.name}</p>
                    <p className="text-gray-400 text-xs capitalize">{d.vehicle_category} · {d.vehicle_number||"—"}</p>
                  </div>
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${d.current_lat ? "bg-green-500" : "bg-yellow-400"}`}/>
                </div>
                <p className="text-xs mt-1 ml-12">
                  {d.current_lat
                    ? <span className="text-green-600">📍 Live GPS</span>
                    : <span className="text-yellow-500">⏳ No GPS yet</span>}
                </p>
              </div>
            ))}
          </div>

          {/* Offline */}
          {offline.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">⚫ Offline ({offline.length})</p>
              </div>
              <div className="max-h-48 overflow-y-auto">
                {offline.map(d => (
                  <div key={d.id} className="px-4 py-3 border-b border-gray-50 opacity-50">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-sm font-bold">
                        {d.name?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="text-gray-600 font-medium text-sm">{d.name}</p>
                        <p className="text-gray-400 text-xs capitalize">{d.vehicle_category}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
