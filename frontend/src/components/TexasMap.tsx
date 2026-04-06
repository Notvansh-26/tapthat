"use client";

import { useEffect, useState } from "react";
import { api, MapSystem } from "@/lib/api";

// Lazy-load Leaflet only on client side
let L: typeof import("leaflet") | null = null;

const RISK_COLORS = {
  safe: "#10b981",
  caution: "#f59e0b",
  danger: "#ef4444",
};

// Texas center
const TX_CENTER: [number, number] = [31.0, -99.9];
const TX_ZOOM = 6;

interface TexasMapProps {
  onSystemClick?: (pwsid: string) => void;
}

export default function TexasMap({ onSystemClick }: TexasMapProps) {
  const [systems, setSystems] = useState<MapSystem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getMapSystems().then((data) => {
      setSystems(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    // Dynamic import of leaflet for SSR compatibility
    import("leaflet").then((leaflet) => {
      L = leaflet;

      const container = document.getElementById("texas-map");
      if (!container || (container as any)._leaflet_id) return;

      const map = leaflet.map("texas-map").setView(TX_CENTER, TX_ZOOM);

      leaflet
        .tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
          subdomains: "abcd",
          maxZoom: 19,
        })
        .addTo(map);

      // Add markers for each system
      systems.forEach((sys) => {
        if (!sys.lat || !sys.lng) return;

        const color = RISK_COLORS[sys.risk_level];
        const radius = Math.max(3, Math.min(12, Math.log2(sys.population || 100)));

        const marker = leaflet.circleMarker([sys.lat, sys.lng], {
          radius,
          fillColor: color,
          color: "#fff",
          weight: 1.5,
          fillOpacity: 0.8,
        });

        marker.bindPopup(`
          <div style="font-family: Inter, sans-serif; min-width: 180px;">
            <strong style="font-size: 14px;">${sys.name}</strong><br/>
            <span style="color: #6b7280; font-size: 12px;">
              Pop: ${(sys.population || 0).toLocaleString()}<br/>
              Status: <span style="color: ${color}; font-weight: 600;">${sys.risk_level.toUpperCase()}</span>
            </span>
          </div>
        `);

        marker.on("click", () => {
          if (onSystemClick) onSystemClick(sys.pwsid);
        });

        marker.addTo(map);
      });
    });
  }, [systems, onSystemClick]);

  return (
    <div className="relative w-full h-[500px] rounded-2xl overflow-hidden border border-tap-200 shadow-sm">
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80">
          <div className="flex items-center gap-3 text-tap-500">
            <div className="w-5 h-5 border-2 border-tap-400 border-t-transparent rounded-full animate-spin" />
            Loading map data...
          </div>
        </div>
      )}
      <div id="texas-map" className="w-full h-full" />
    </div>
  );
}
