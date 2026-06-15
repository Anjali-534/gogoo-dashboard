"use client";
import { useEffect, useRef, useState } from "react";
import axios from "axios";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
const REFRESH_MS = 5000;

type Driver = {
  id: string; name: string; phone: string;
  vehicle_type: string; vehicle_category: string;
  vehicle_number: string; is_online: boolean;
  current_lat?: number; current_lng?: number;
  rating: number; total_rides: number;
};

const CATEGORY_COLOR: Record<string, string> = {
  truck: "#FF6B2B", cab: "#3B82F6", ambulance: "#EF4444",
};

// Fix leaflet default icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

export default function MapComponent() {
  const mapRef     = useRef<HTMLDivElement>(null);
  const leafletRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Record<string, L.Marker>>({});

  const [drivers,  setDrivers]  = useState<Driver[]>([]);
  const [selected, setSelected] = useState<Driver | null>(null);
  const [loading,  setLoading]  = useState(true);

  const token = () => localStorage.getItem("access_token");

  // ── Init map ─────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || leafletRef.current) return;

    const map = L.map(mapRef.current, {
      center: [28.6139, 77.2090],
      zoom: 11,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);

    leafletRef.current = map;

    return () => {
      map.remove();
      leafletRef.current = null;
    };
  }, []);

  // ── Fetch drivers ────────────────────────────────────────────
  const fetchDrivers = async () => {
    try {
      const res = await axios.get(`${API}/gogoo/drivers`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      setDrivers(res.data || []);
      setLoading(false);
    } catch {}
  };

  useEffect(() => {
    fetchDrivers();
    const iv = setInterval(fetchDrivers, REFRESH_MS);
    return () => clearInterval(iv);
  }, []);

  // ── Update markers ───────────────────────────────────────────
  useEffect(() => {
    const map = leafletRef.current;
    if (!map) return;
    const seen = new Set<string>();

    drivers.forEach(d => {
      if (!d.is_online || !d.current_lat || !d.current_lng) return;
      seen.add(d.id);

      const color = CATEGORY_COLOR[d.vehicle_category] || "#FF6B2B";
      const emoji = d.vehicle_category === "truck" ? "🚛" : d.vehicle_category === "ambulance" ? "🚑" : "🚗";

      const icon = L.divIcon({
        className: "",
        html: `<div style="background:${color};width:38px;height:38px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;font-size:18px">${emoji}</div>`,
        iconSize: [38, 38],
        iconAnchor: [19, 19],
      });

      if (markersRef.current[d.id]) {
        markersRef.current[d.id].setLatLng([d.current_lat, d.current_lng]);
      } else {
        const marker = L.marker([d.current_lat, d.current_lng], { icon })
          .addTo(map)
          .bindPopup(`
            <div style="font-family:system-ui;min-width:160px;padding:4px">
              <div style="font-weight:800;font-size:14px">${emoji} ${d.name}</div>
              <div style="color:#777;font-size:12px;margin:2px 0">${d.vehicle_number||"—"} · ${(d.vehicle_type||"").replace(/_/g," ")}</div>
              <div style="margin-top:6px">
                <span style="background:#dcfce7;color:#16a34a;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700">ONLINE</span>
                <span style="color:#888;font-size:12px;margin-left:6px">⭐ ${Number(d.rating||0).toFixed(1)}</span>
              </div>
            </div>
          `);
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
  }, [drivers]);

  const panTo = (d: Driver) => {
    if (!d.current_lat || !leafletRef.current) return;
    leafletRef.current.flyTo([d.current_lat, d.current_lng], 15, { duration: 1 });
    setSelected(d);
    markersRef.current[d.id]?.openPopup();
  };

  const onlineDrivers  = drivers.filter(d => d.is_online);
  const offlineDrivers = drivers.filter(d => !d.is_online);

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Live Driver Map</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {onlineDrivers.length} online · {onlineDrivers.filter(d=>d.current_lat).length} with GPS · refreshes every 5s
          </p>
        </div>
        <div className="flex gap-2">
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2 shadow-sm">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm font-semibold text-gray-700">{onlineDrivers.length} Online</span>
          </div>
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2 shadow-sm">
            <div className="w-2 h-2 rounded-full bg-gray-300" />
            <span className="text-sm font-semibold text-gray-500">{offlineDrivers.length} Offline</span>
          </div>
        </div>
      </div>

      <div className="flex gap-5">
        {/* Map */}
        <div className="flex-1 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden relative"
          style={{ height: "calc(100vh - 210px)", minHeight: 500 }}>
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
              <div className="text-center">
                <div className="text-5xl mb-3">🗺</div>
                <p className="text-gray-500 font-medium">Loading map...</p>
              </div>
            </div>
          )}
          <div ref={mapRef} style={{ width:"100%", height:"100%", zIndex:0 }} />
        </div>

        {/* Sidebar */}
        <div className="flex-shrink-0 flex flex-col gap-3 overflow-y-auto" style={{ width:260, maxHeight:"calc(100vh - 210px)" }}>
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-green-50">
              <p className="text-xs font-bold text-green-700 uppercase tracking-wider">🟢 Online ({onlineDrivers.length})</p>
            </div>
            {onlineDrivers.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-3xl mb-2">🚗</p>
                <p className="text-gray-400 text-sm">No drivers online</p>
                <p className="text-gray-300 text-xs mt-1">Drivers appear when they go online in the app</p>
              </div>
            ) : onlineDrivers.map(d => (
              <div key={d.id}
                className={`px-4 py-3 border-b border-gray-50 cursor-pointer transition ${selected?.id===d.id ? "bg-orange-50 border-l-4 border-l-orange-400" : "hover:bg-gray-50"}`}
                onClick={() => panTo(d)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                    style={{ backgroundColor: CATEGORY_COLOR[d.vehicle_category]||"#FF6B2B" }}>
                    {d.name?.[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-900 font-semibold text-sm truncate">{d.name}</p>
                    <p className="text-gray-400 text-xs">{d.vehicle_number||"—"}</p>
                  </div>
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${d.current_lat ? "bg-green-500" : "bg-yellow-400"}`} />
                </div>
                <p className="text-xs mt-1 ml-12">
                  {d.current_lat
                    ? <span className="text-green-600">📍 Live location</span>
                    : <span className="text-yellow-500">⏳ No GPS yet</span>
                  }
                </p>
              </div>
            ))}
          </div>

          {offlineDrivers.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">⚫ Offline ({offlineDrivers.length})</p>
              </div>
              {offlineDrivers.map(d => (
                <div key={d.id} className="px-4 py-3 border-b border-gray-50 opacity-40">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-sm font-bold">
                      {d.name?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-gray-600 font-medium text-sm">{d.name}</p>
                      <p className="text-gray-400 text-xs capitalize">{d.vehicle_category} · {d.vehicle_number||"—"}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}