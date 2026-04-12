"use client";

import { useState } from "react";
import { api, ZipCodeReport } from "@/lib/api";
import SearchBar from "./SearchBar";
import WaterQualityCard from "./WaterQualityCard";
import RiskBadge from "./RiskBadge";
import { X, Loader2, Plus } from "lucide-react";

export default function ComparisonView() {
  const [zipCodes, setZipCodes] = useState<string[]>([]);
  const [reports, setReports] = useState<ZipCodeReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addZip = (zip: string) => {
    if (zipCodes.includes(zip)) { setError(`${zip} is already added`); return; }
    if (zipCodes.length >= 5) { setError("Maximum 5 ZIP codes"); return; }
    setZipCodes([...zipCodes, zip]);
    setError(null);
  };

  const removeZip = (zip: string) => {
    setZipCodes(zipCodes.filter((z) => z !== zip));
    setReports(reports.filter((r) => r.zip_code !== zip));
  };

  const runComparison = async () => {
    if (zipCodes.length < 2) { setError("Add at least 2 ZIP codes to compare"); return; }
    setLoading(true);
    setError(null);
    try {
      const data = await api.compare(zipCodes);
      setReports(data.reports);
    } catch {
      setError("Failed to load comparison data");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Input card */}
      <div className="card p-6">
        <p className="font-mono text-[10px] text-slate-400 tracking-[0.15em] uppercase mb-4">
          ZIP Codes · {zipCodes.length}/5 added
        </p>

        {/* ZIP chips */}
        <div className="flex flex-wrap items-center gap-2 mb-5">
          {zipCodes.map((zip) => (
            <span
              key={zip}
              className="inline-flex items-center gap-1.5 bg-brand-50 text-brand-700
                         font-mono font-bold px-3 py-1.5 rounded-lg text-sm border border-brand-100"
            >
              {zip}
              <button
                onClick={() => removeZip(zip)}
                className="hover:text-danger transition-colors ml-0.5"
                aria-label={`Remove ${zip}`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}

          {zipCodes.length < 5 && (
            <div className="flex-1 min-w-[240px]">
              <SearchBar
                onSearch={addZip}
                variant="compact"
                placeholder={zipCodes.length === 0 ? "Enter first ZIP code" : "Add another ZIP"}
              />
            </div>
          )}
        </div>

        {error && (
          <p className="text-sm text-danger font-medium mb-4">{error}</p>
        )}

        <button
          onClick={runComparison}
          disabled={zipCodes.length < 2 || loading}
          className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 active:bg-brand-800
                     disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed
                     text-white font-semibold px-6 py-2.5 rounded-xl transition-all text-sm"
        >
          {loading
            ? <><Loader2 className="w-4 h-4 animate-spin" />Comparing...</>
            : <><Plus className="w-4 h-4" />Compare</>
          }
        </button>
      </div>

      {/* Cards grid */}
      {reports.length > 0 && (
        <div
          className="grid gap-5"
          style={{
            gridTemplateColumns: `repeat(${Math.min(reports.length, 3)}, minmax(0, 1fr))`,
          }}
        >
          {reports.map((report) => (
            <WaterQualityCard key={report.zip_code} report={report} compact />
          ))}
        </div>
      )}

      {/* Comparison table */}
      {reports.length >= 2 && (
        <div className="card overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100">
            <p className="font-mono text-[10px] text-slate-400 tracking-[0.15em] uppercase mb-0.5">Analysis</p>
            <h3 className="font-semibold text-slate-900 text-sm">Side-by-Side Metrics</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-3.5 px-5 font-mono text-[10px] text-slate-400 uppercase tracking-[0.15em]">
                    Metric
                  </th>
                  {reports.map((r) => (
                    <th key={r.zip_code} className="text-center py-3.5 px-5">
                      <div className="font-mono font-bold text-slate-800 text-sm">{r.zip_code}</div>
                      <div className="mt-1.5">
                        <RiskBadge level={r.overall_risk_level} size="sm" />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                <CompareRow
                  label="Population Served"
                  values={reports.map((r) => r.total_population_served.toLocaleString())}
                />
                <CompareRow
                  label="Water Systems"
                  values={reports.map((r) => String(r.water_systems.length))}
                />
                <CompareRow
                  label="Violations (3yr)"
                  values={reports.map((r) =>
                    String(r.water_systems.reduce((s, w) => s + w.violation_count_3yr, 0))
                  )}
                  highlight
                />
                <CompareRow
                  label="Health Violations"
                  values={reports.map((r) =>
                    String(r.water_systems.reduce((s, w) => s + w.health_violation_count_3yr, 0))
                  )}
                  highlight
                />
                <CompareRow
                  label="Serious Violators"
                  values={reports.map((r) =>
                    String(r.water_systems.filter((w) => w.serious_violator).length)
                  )}
                  highlight
                />
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function CompareRow({
  label,
  values,
  highlight = false,
}: {
  label: string;
  values: string[];
  highlight?: boolean;
}) {
  const nums = values.map((v) => parseInt(v.replace(/,/g, "")) || 0);
  const max = Math.max(...nums);

  return (
    <tr className="hover:bg-slate-50/50 transition-colors">
      <td className="py-3 px-5 font-mono text-[11px] text-slate-500 uppercase tracking-wider">{label}</td>
      {values.map((v, i) => (
        <td key={i} className="text-center py-3 px-5">
          <span
            className={`font-mono font-bold tabular-nums text-sm ${
              highlight && nums[i] === max && max > 0
                ? "text-danger"
                : highlight && nums[i] === 0
                ? "text-emerald-600"
                : "text-slate-800"
            }`}
          >
            {v}
          </span>
        </td>
      ))}
    </tr>
  );
}
