"use client";

import { useEffect, useRef, useState } from "react";
import { api, StateRisk } from "@/lib/api";

const RISK_COLORS: Record<string, { fill: string; stroke: string; glow: string; label: string }> = {
  safe:    { fill: "#34d399", stroke: "#10b981", glow: "#34d39940", label: "Safe" },
  caution: { fill: "#fbbf24", stroke: "#f59e0b", glow: "#fbbf2440", label: "Caution" },
  danger:  { fill: "#f87171", stroke: "#ef4444", glow: "#f8717140", label: "At Risk" },
  unknown: { fill: "#1e3a5f", stroke: "#2d4f7c", glow: "transparent", label: "No Data" },
};

const US_CENTER: [number, number] = [39.5, -98.5];
const US_ZOOM = 4;

interface USMapProps {
  onStateSelect?: (stateCode: string, stateName: string) => void;
  cachedStateRisks?: StateRisk[];
  onStateRisksLoaded?: (risks: StateRisk[]) => void;
}

export default function USMap({ onStateSelect, cachedStateRisks, onStateRisksLoaded }: USMapProps) {
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
          background: "#0a1628",
        });

        mapInstanceRef.current = map;

        // Dark base tiles
        L.tileLayer(
          "https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png",
          { subdomains: "abcd", maxZoom: 18 }
        ).addTo(map);

        // Label layer on top
        L.tileLayer(
          "https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png",
          { subdomains: "abcd", maxZoom: 18, pane: "overlayPane" }
        ).addTo(map);

        L.control.zoom({ position: "topright" }).addTo(map);

        const geoRes = await fetch("/geojson/us-states.geojson");
        if (cancelled) return;

        if (!geoRes.ok) {
          setError("Failed to load map data");
          setLoading(false);
          return;
        }

        const geoJson = await geoRes.json();

        let stateRisks: StateRisk[] = cachedStateRisks ?? [];
        if (!cachedStateRisks) {
          try {
            stateRisks = await api.getStateRisks();
            onStateRisksLoaded?.(stateRisks);
          } catch {
            // Backend unavailable — render with "no data" styling
          }
        }

        if (cancelled) return;

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
              fillOpacity: level === "unknown" ? 0.08 : 0.35,
              color: colors.stroke,
              weight: 1,
              opacity: level === "unknown" ? 0.3 : 0.7,
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
                  weight: 2,
                  opacity: 1,
                  fillOpacity: level === "unknown" ? 0.15 : 0.6,
                });
                e.target.bringToFront();
              },
              mouseout: () => geoLayer.resetStyle(layer),
              click: () => {
                if (stateCode && onStateSelect) onStateSelect(stateCode, name);
              },
            });

            const popupContent = `
              <div style="
                font-family:'Outfit',system-ui,sans-serif;
                background:#0f1f3a;
                border:1px solid #1e3a5f;
                border-radius:12px;
                padding:12px 14px;
                min-width:190px;
                box-shadow:0 8px 32px rgba(0,0,0,0.6);
              ">
                <div style="font-size:14px;font-weight:700;color:#f1f5f9;margin-bottom:6px;letter-spacing:-0.01em;">
                  ${name}
                </div>
                <div style="display:inline-flex;align-items:center;gap:5px;background:${colors.fill}18;
                  border:1px solid ${colors.fill}40;border-radius:99px;
                  padding:3px 10px;margin-bottom:9px;">
                  <span style="width:6px;height:6px;border-radius:50%;background:${colors.fill};display:inline-block;"></span>
                  <span style="font-size:10px;font-weight:700;color:${colors.fill};
                    text-transform:uppercase;letter-spacing:0.08em;">
                    ${colors.label}
                  </span>
                </div>
                ${risk ? `
                  <div style="font-size:11px;color:#64748b;line-height:1.8;font-family:'JetBrains Mono',monospace;">
                    <div><span style="color:#94a3b8;">${risk.system_count.toLocaleString()}</span> <span style="color:#475569;">systems</span></div>
                    <div><span style="color:#94a3b8;">${risk.population.toLocaleString()}</span> <span style="color:#475569;">pop. served</span></div>
                    <div><span style="color:${risk.violation_count > 0 ? colors.fill : '#64748b'};">${risk.violation_count}</span> <span style="color:#475569;">violations (3yr)</span></div>
                  </div>
                  <div style="margin-top:8px;font-size:10px;color:#38bdf8;font-weight:600;letter-spacing:0.03em;">
                    Click to explore →
                  </div>
                ` : '<div style="font-size:11px;color:#475569;">No data available</div>'}
              </div>
            `;
            layer.bindPopup(popupContent, {
              maxWidth: 250,
              className: "dark-popup",
            });
            layer.bindTooltip(name, {
              sticky: true,
              direction: "top",
              offset: [0, -8],
              className: "dark-tooltip",
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
    return () => { cancelled = true; };
  }, [onStateSelect]);

  return (
    <div className="relative">
      <div
        className="relative w-full h-[520px] rounded-xl overflow-hidden"
        style={{ background: "#080f1d" }}
      >
        {loading && !error && (
          <div className="absolute inset-0 z-10 flex items-center justify-center"
            style={{ background: "rgba(8,15,29,0.92)" }}>
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-[2px] border-brand-900 border-t-brand-400 rounded-full animate-spin" />
              <span className="text-xs font-mono text-brand-400 tracking-widest uppercase">Loading map...</span>
            </div>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 z-10 flex items-center justify-center"
            style={{ background: "rgba(8,15,29,0.92)" }}>
            <div className="text-center">
              <p className="text-sm text-red-400 font-medium">{error}</p>
              <button onClick={() => window.location.reload()}
                className="mt-2 text-xs text-brand-400 hover:text-brand-300 font-mono">
                Retry
              </button>
            </div>
          </div>
        )}
        <div ref={containerRef} className="w-full h-full" />
      </div>

      {!loading && !error && (
        <div className="flex items-center justify-center gap-8 mt-4">
          <LegendItem color="#34d399" label="Safe" count={stats.safe} />
          <LegendItem color="#fbbf24" label="Caution" count={stats.caution} />
          <LegendItem color="#f87171" label="At Risk" count={stats.danger} />
        </div>
      )}
    </div>
  );
}

function LegendItem({ color, label, count }: { color: string; label: string; count: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
      <span className="text-xs font-medium text-slate-400">{label}</span>
      <span className="text-xs font-mono text-slate-500">{count}</span>
    </div>
  );
}
