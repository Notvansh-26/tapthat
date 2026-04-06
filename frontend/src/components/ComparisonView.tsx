"use client";

import { useState } from "react";
import { api, ZipCodeReport } from "@/lib/api";
import SearchBar from "./SearchBar";
import WaterQualityCard from "./WaterQualityCard";
import RiskBadge from "./RiskBadge";
import { X, Plus, ArrowLeftRight } from "lucide-react";

export default function ComparisonView() {
  const [zipCodes, setZipCodes] = useState<string[]>([]);
  const [reports, setReports] = useState<ZipCodeReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addZip = (zip: string) => {
    if (zipCodes.includes(zip)) return;
    if (zipCodes.length >= 5) {
      setError("Max 5 ZIP codes");
      return;
    }
    setZipCodes([...zipCodes, zip]);
    setError(null);
  };

  const removeZip = (zip: string) => {
    setZipCodes(zipCodes.filter((z) => z !== zip));
    setReports(reports.filter((r) => r.zip_code !== zip));
  };

  const runComparison = async () => {
    if (zipCodes.length < 2) {
      setError("Add at least 2 ZIP codes to compare");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await api.compare(zipCodes);
      setReports(data.reports);
    } catch (e: any) {
      setError(e.message || "Failed to load comparison");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Input area */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-tap-100">
        <div className="flex items-center gap-2 mb-4">
          <ArrowLeftRight className="w-5 h-5 text-tap-600" />
          <h2 className="text-lg font-semibold text-tap-900">
            Compare ZIP Codes
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-4">
          {zipCodes.map((zip) => (
            <span
              key={zip}
              className="inline-flex items-center gap-1.5 bg-tap-100 text-tap-800
                         font-semibold px-3 py-1.5 rounded-full text-sm"
            >
              {zip}
              <button
                onClick={() => removeZip(zip)}
                className="hover:text-danger transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
          {zipCodes.length < 5 && (
            <div className="flex-1 min-w-[200px]">
              <SearchBar
                onSearch={addZip}
                placeholder="Add ZIP code..."
              />
            </div>
          )}
        </div>

        {error && (
          <p className="text-sm text-danger font-medium mb-3">{error}</p>
        )}

        <button
          onClick={runComparison}
          disabled={zipCodes.length < 2 || loading}
          className="bg-tap-600 hover:bg-tap-700 disabled:bg-tap-300 text-white
                     font-semibold px-6 py-2.5 rounded-xl transition-colors"
        >
          {loading ? "Comparing..." : "Compare"}
        </button>
      </div>

      {/* Results grid */}
      {reports.length > 0 && (
        <div
          className="grid gap-6"
          style={{
            gridTemplateColumns: `repeat(${Math.min(reports.length, 3)}, 1fr)`,
          }}
        >
          {reports.map((report) => (
            <WaterQualityCard key={report.zip_code} report={report} />
          ))}
        </div>
      )}

      {/* Side-by-side contaminant comparison table */}
      {reports.length >= 2 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-tap-100 overflow-x-auto">
          <h3 className="text-lg font-semibold text-tap-900 mb-4">
            Contaminant Comparison
          </h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-tap-100">
                <th className="text-left py-2 px-3 text-tap-500 font-medium">
                  Contaminant
                </th>
                {reports.map((r) => (
                  <th key={r.zip_code} className="text-center py-2 px-3">
                    <span className="text-tap-800 font-semibold">{r.zip_code}</span>
                    <br />
                    <RiskBadge level={r.overall_risk_level} size="sm" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {getUniqueContaminants(reports).map((name) => (
                <tr key={name} className="border-b border-tap-50 hover:bg-tap-50 transition">
                  <td className="py-2.5 px-3 font-medium text-tap-700">{name}</td>
                  {reports.map((r) => {
                    const c = r.top_contaminants.find(
                      (tc) => tc.contaminant_name === name
                    );
                    return (
                      <td key={r.zip_code} className="text-center py-2.5 px-3 tabular-nums">
                        {c?.measurement_value != null ? (
                          <span
                            className={`font-semibold ${
                              (c.exceedance_ratio ?? 0) > 1
                                ? "text-danger"
                                : (c.exceedance_ratio ?? 0) > 0.5
                                ? "text-caution"
                                : "text-safe-dark"
                            }`}
                          >
                            {c.measurement_value} {c.unit}
                          </span>
                        ) : (
                          <span className="text-tap-300">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function getUniqueContaminants(reports: ZipCodeReport[]): string[] {
  const names = new Set<string>();
  reports.forEach((r) =>
    r.top_contaminants.forEach((c) => {
      if (c.contaminant_name) names.add(c.contaminant_name);
    })
  );
  return Array.from(names).sort();
}
