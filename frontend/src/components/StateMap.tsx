"use client";

import { useEffect, useRef, useState } from "react";
import { api, CountyRisk } from "@/lib/api";

const RISK_COLORS: Record<string, { fill: string; stroke: string; label: string }> = {
  safe: { fill: "#10b981", stroke: "#059669", label: "Safe" },
  caution: { fill: "#f59e0b", stroke: "#d97706", label: "Caution" },
  danger: { fill: "#ef4444", stroke: "#dc2626", label: "At Risk" },
  unknown: { fill: "#e2e8f0", stroke: "#cbd5e1", label: "No Data" },
};

// State centers and zoom levels
const STATE_GEO: Record<string, { center: [number, number]; zoom: number }> = {
  AL: { center: [32.8, -86.8], zoom: 7 }, AK: { center: [64.0, -153.0], zoom: 4 },
  AZ: { center: [34.3, -111.7], zoom: 7 }, AR: { center: [34.8, -92.2], zoom: 7 },
  CA: { center: [37.2, -119.5], zoom: 6 }, CO: { center: [39.0, -105.5], zoom: 7 },
  CT: { center: [41.6, -72.7], zoom: 9 }, DE: { center: [39.0, -75.5], zoom: 9 },
  DC: { center: [38.9, -77.0], zoom: 12 }, FL: { center: [28.6, -82.4], zoom: 6 },
  GA: { center: [32.7, -83.5], zoom: 7 }, HI: { center: [20.8, -156.3], zoom: 7 },
  ID: { center: [44.4, -114.6], zoom: 6 }, IL: { center: [40.0, -89.2], zoom: 7 },
  IN: { center: [39.9, -86.3], zoom: 7 }, IA: { center: [42.0, -93.5], zoom: 7 },
  KS: { center: [38.5, -98.3], zoom: 7 }, KY: { center: [37.8, -85.7], zoom: 7 },
  LA: { center: [31.0, -92.0], zoom: 7 }, ME: { center: [45.4, -69.2], zoom: 7 },
  MD: { center: [39.0, -76.7], zoom: 8 }, MA: { center: [42.2, -71.8], zoom: 8 },
  MI: { center: [44.3, -84.6], zoom: 6 }, MN: { center: [46.3, -94.3], zoom: 6 },
  MS: { center: [32.7, -89.7], zoom: 7 }, MO: { center: [38.4, -92.5], zoom: 7 },
  MT: { center: [47.0, -109.6], zoom: 6 }, NE: { center: [41.5, -99.8], zoom: 7 },
  NV: { center: [39.3, -116.6], zoom: 6 }, NH: { center: [43.7, -71.6], zoom: 8 },
  NJ: { center: [40.1, -74.7], zoom: 8 }, NM: { center: [34.4, -106.1], zoom: 7 },
  NY: { center: [42.9, -75.5], zoom: 7 }, NC: { center: [35.5, -79.8], zoom: 7 },
  ND: { center: [47.4, -100.5], zoom: 7 }, OH: { center: [40.4, -82.7], zoom: 7 },
  OK: { center: [35.5, -97.5], zoom: 7 }, OR: { center: [44.0, -120.5], zoom: 7 },
  PA: { center: [41.0, -77.6], zoom: 7 }, RI: { center: [41.7, -71.5], zoom: 10 },
  SC: { center: [33.9, -80.9], zoom: 7 }, SD: { center: [44.4, -100.2], zoom: 7 },
  TN: { center: [35.9, -86.4], zoom: 7 }, TX: { center: [31.3, -99.5], zoom: 6 },
  UT: { center: [39.3, -111.7], zoom: 7 }, VT: { center: [44.1, -72.6], zoom: 8 },
  VA: { center: [37.5, -78.8], zoom: 7 }, WA: { center: [47.4, -120.5], zoom: 7 },
  WV: { center: [38.6, -80.6], zoom: 7 }, WI: { center: [44.6, -89.7], zoom: 7 },
  WY: { center: [43.0, -107.5], zoom: 7 }, PR: { center: [18.2, -66.5], zoom: 9 },
};

interface StateMapProps {
  stateCode: string;
  stateName: string;
  onBack?: () => void;
}

export default function StateMap({ stateCode, stateName, onBack }: StateMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({ safe: 0, caution: 0, danger: 0 });

  useEffect(() => {
    // Reset on state change
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    let cancelled = false;

    async function initMap() {
      try {
        const L = (await import("leaflet")).default;

        if (cancelled || !containerRef.current) return;

        const geo = STATE_GEO[stateCode] || { center: [39.5, -98.5] as [number, number], zoom: 6 };

        const map = L.map(containerRef.current, {
          center: geo.center,
          zoom: geo.zoom,
          zoomControl: false,
          attributionControl: false,
          minZoom: 4,
          maxZoom: 14,
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

        // Try state-specific county GeoJSON, fall back to TX for now
        const geoPath = `/geojson/${stateCode.toLowerCase()}-counties.geojson`;
        const [geoRes, countyRisks] = await Promise.all([
          fetch(geoPath),
          api.getCountyRisks(stateCode),
        ]);

        if (cancelled) return;

        if (!geoRes.ok) {
          // No county GeoJSON for this state yet — show data without map overlay
          setStats({
            safe: countyRisks.filter(r => r.risk_level === "safe").length,
            caution: countyRisks.filter(r => r.risk_level === "caution").length,
            danger: countyRisks.filter(r => r.risk_level === "danger").length,
          });
          setLoading(false);
          return;
        }

        const geoJson = await geoRes.json();

        const riskMap = new Map<string, CountyRisk>();
        let s = 0, c = 0, d = 0;
        for (const cr of countyRisks) {
          riskMap.set(cr.county.toUpperCase(), cr);
          if (cr.risk_level === "safe") s++;
          else if (cr.risk_level === "caution") c++;
          else d++;
        }
        setStats({ safe: s, caution: c, danger: d });

        const geoLayer = L.geoJSON(geoJson, {
          style: (feature: any) => {
            const name = (feature?.properties?.NAME || "").toUpperCase();
            const risk = riskMap.get(name);
            const level = risk?.risk_level || "unknown";
            const colors = RISK_COLORS[level];
            return {
              fillColor: colors.fill,
              fillOpacity: level === "unknown" ? 0.12 : 0.4,
              color: colors.stroke,
              weight: 0.8,
              opacity: 0.4,
            };
          },
          onEachFeature: (feature: any, layer: any) => {
            const name = feature?.properties?.NAME || "Unknown";
            const risk = riskMap.get(name.toUpperCase());
            const level = risk?.risk_level || "unknown";
            const colors = RISK_COLORS[level];

            layer.on({
              mouseover: (e: any) => {
                e.target.setStyle({
                  weight: 2.5,
                  opacity: 1,
                  fillOpacity: level === "unknown" ? 0.2 : 0.6,
                });
                e.target.bringToFront();
              },
              mouseout: () => {
                geoLayer.resetStyle(layer);
              },
            });

            const zipList = risk?.zip_codes?.length
              ? risk.zip_codes.slice(0, 12).join(", ") + (risk.zip_codes.length > 12 ? ` +${risk.zip_codes.length - 12} more` : "")
              : "";

            const countyLabel = stateCode === "LA" ? "Parish" : "County";

            const popupContent = `
              <div style="font-family:Inter,system-ui,sans-serif;padding:4px 0;min-width:200px;max-width:280px;">
                <div style="font-size:15px;font-weight:700;color:#0f172a;margin-bottom:6px;">
                  ${name} ${countyLabel}
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
                  ${zipList ? `
                    <div style="margin-top:8px;padding-top:8px;border-top:1px solid #e2e8f0;">
                      <div style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">
                        ZIP Codes
                      </div>
                      <div style="font-size:11px;color:#475569;line-height:1.5;word-break:break-all;">
                        ${zipList}
                      </div>
                    </div>
                  ` : ""}
                ` : '<div style="font-size:12px;color:#94a3b8;">No water quality data available</div>'}
              </div>
            `;
            layer.bindPopup(popupContent, { maxWidth: 280 });
            layer.bindTooltip(`${name} ${countyLabel}`, {
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
  }, [stateCode, stateName]);

  return (
    <div className="relative">
      {onBack && (
        <button
          onClick={onBack}
          className="mb-3 flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors"
        >
          ← Back to US Map
        </button>
      )}
      <div className="relative w-full h-[520px] rounded-2xl overflow-hidden border border-slate-200 shadow-card bg-slate-100">
        {loading && !error && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/90">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-[3px] border-brand-200 border-t-brand-600 rounded-full animate-spin" />
              <span className="text-sm font-medium text-slate-400">
                Loading {stateName} map...
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
