"use client";

import { useEffect, useRef, useState } from "react";
import { api, StateRisk } from "@/lib/api";

const RISK_COLORS: Record<string, { fill: string; stroke: string; label: string }> = {
  safe: { fill: "#10b981", stroke: "#059669", label: "Safe" },
  caution: { fill: "#f59e0b", stroke: "#d97706", label: "Caution" },
  danger: { fill: "#ef4444", stroke: "#dc2626", label: "At Risk" },
  unknown: { fill: "#e2e8f0", stroke: "#cbd5e1", label: "No Data" },
};

const US_CENTER: [number, number] = [39.5, -98.5];
const US_ZOOM = 4;

interface USMapProps {
  onStateSelect?: (stateCode: string, stateName: string) => void;
}

export default function USMap({ onStateSelect }: USMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({ safe: 0, caution: 0, danger: 0 });

  useEffect(() => {
    if (mapInstanceRef.current) return;

    let cancelled = false;

    async function initMap() {
      try {
        const L = (await import("leaflet")).default;

        if (cancelled || !containerRef.current) return;
        if ((containerRef.current as any)._leaflet_id) return;

        const map = L.map(containerRef.current, {
          center: US_CENTER,
          zoom: US_ZOOM,
          zoomControl: false,
          attributionControl: false,
          minZoom: 3,
          maxZoom: 12,
        });

        mapInstanceRef.current = map;

        L.tileLayer(
          "https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png",
          { subdomains: "abcd", maxZoom: 18 }
        ).addTo(map);

        L.tileLayer(
          "https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png",
          { subdomains: "abcd", maxZoom: 18, pane: "overlayPane" }
        ).addTo(map);

        L.control.zoom({ position: "topright" }).addTo(map);

        const [geoRes, stateRisks] = await Promise.all([
          fetch("/geojson/us-states.geojson"),
          api.getStateRisks(),
        ]);

        if (cancelled) return;

        if (!geoRes.ok) {
          setError("Failed to load map data");
          setLoading(false);
          return;
        }

        const geoJson = await geoRes.json();

        // Build risk lookup by state code
        const riskMap = new Map<string, StateRisk>();
        let s = 0, c = 0, d = 0;
        for (const sr of stateRisks) {
          riskMap.set(sr.state_code, sr);
          if (sr.risk_level === "safe") s++;
          else if (sr.risk_level === "caution") c++;
          else d++;
        }
        setStats({ safe: s, caution: c, danger: d });

        const geoLayer = L.geoJSON(geoJson, {
          style: (feature: any) => {
            const stateCode = feature?.properties?.STATE_CODE || "";
            const risk = riskMap.get(stateCode);
            const level = risk?.risk_level || "unknown";
            const colors = RISK_COLORS[level];
            return {
              fillColor: colors.fill,
              fillOpacity: level === "unknown" ? 0.12 : 0.45,
              color: colors.stroke,
              weight: 1,
              opacity: 0.5,
            };
          },
          onEachFeature: (feature: any, layer: any) => {
            const name = feature?.properties?.name || "Unknown";
            const stateCode = feature?.properties?.STATE_CODE || "";
            const risk = riskMap.get(stateCode);
            const level = risk?.risk_level || "unknown";
            const colors = RISK_COLORS[level];

            layer.on({
              mouseover: (e: any) => {
                e.target.setStyle({
                  weight: 2.5,
                  opacity: 1,
                  fillOpacity: level === "unknown" ? 0.2 : 0.65,
                });
                e.target.bringToFront();
              },
              mouseout: () => {
                geoLayer.resetStyle(layer);
              },
              click: () => {
                if (stateCode && onStateSelect) {
                  onStateSelect(stateCode, name);
                }
              },
            });

            const popupContent = `
              <div style="font-family:Inter,system-ui,sans-serif;padding:4px 0;min-width:180px;">
                <div style="font-size:15px;font-weight:700;color:#0f172a;margin-bottom:6px;">
                  ${name}
                </div>
                <div style="display:inline-block;background:${colors.fill}15;color:${colors.stroke};
                  font-size:11px;font-weight:700;padding:3px 10px;border-radius:99px;
                  text-transform:uppercase;letter-spacing:0.6px;border:1px solid ${colors.fill}30;
                  margin-bottom:8px;">
                  ${colors.label}
                </div>
                ${risk ? `
                  <div style="font-size:12px;color:#64748b;line-height:1.7;">
                    <div><strong style="color:#334155">${risk.system_count.toLocaleString()}</strong> water systems</div>
                    <div><strong style="color:#334155">${risk.population.toLocaleString()}</strong> population served</div>
                    <div><strong style="color:#334155">${risk.violation_count}</strong> violations (3yr)</div>
                  </div>
                  <div style="margin-top:6px;font-size:11px;color:#3b82f6;font-weight:600;cursor:pointer;">
                    Click to explore counties →
                  </div>
                ` : '<div style="font-size:12px;color:#94a3b8;">No water quality data available yet</div>'}
              </div>
            `;
            layer.bindPopup(popupContent, { maxWidth: 250 });
            layer.bindTooltip(name, {
              sticky: true,
              direction: "top",
              offset: [0, -8],
            });
          },
        });

        geoLayer.addTo(map);
        setLoading(false);
      } catch (err) {
        console.error("Map init error:", err);
        if (!cancelled) {
          setError("Failed to initialize map");
          setLoading(false);
        }
      }
    }

    initMap();

    return () => {
      cancelled = true;
    };
  }, [onStateSelect]);

  return (
    <div className="relative">
      <div className="relative w-full h-[520px] rounded-2xl overflow-hidden border border-slate-200 shadow-card bg-slate-100">
        {loading && !error && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/90">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-[3px] border-brand-200 border-t-brand-600 rounded-full animate-spin" />
              <span className="text-sm font-medium text-slate-400">
                Loading US map...
              </span>
            </div>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/90">
            <div className="text-center">
              <p className="text-sm text-danger font-medium">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-2 text-sm text-brand-600 hover:text-brand-700 font-medium"
              >
                Retry
              </button>
            </div>
          </div>
        )}
        <div ref={containerRef} className="w-full h-full" />
      </div>

      {!loading && !error && (
        <div className="flex items-center justify-center gap-8 mt-4">
          <LegendItem color="bg-safe" label="Safe" count={stats.safe} />
          <LegendItem color="bg-caution" label="Caution" count={stats.caution} />
          <LegendItem color="bg-danger" label="At Risk" count={stats.danger} />
        </div>
      )}
    </div>
  );
}

function LegendItem({ color, label, count }: { color: string; label: string; count: number }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className={`w-3.5 h-3.5 rounded ${color} shadow-sm`} />
      <span className="font-medium text-slate-600">{label}</span>
      <span className="text-slate-300 font-mono text-xs">{count}</span>
    </div>
  );
}
