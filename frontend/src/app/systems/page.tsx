"use client";

import { useState, useEffect, useCallback } from "react";
import { api, WaterSystemSummary } from "@/lib/api";
import RiskBadge from "@/components/RiskBadge";
import PageHeader from "@/components/PageHeader";
import { Search, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

const STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN",
  "IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH",
  "NJ","NM","NY","NC","ND","OH","OK","OR","PA","PR","RI","SC","SD","TN","TX",
  "UT","VT","VA","WA","WV","WI","WY",
];

const PAGE_SIZE = 50;

export default function SystemsPage() {
  const [systems, setSystems] = useState<WaterSystemSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stateFilter, setStateFilter] = useState("");
  const [riskFilter, setRiskFilter] = useState("");
  const [countyInput, setCountyInput] = useState("");
  const [countySearch, setCountySearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setCountySearch(countyInput), 400);
    return () => clearTimeout(t);
  }, [countyInput]);

  const fetchSystems = useCallback(async (newOffset: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.listSystems({
        state: stateFilter || undefined,
        county: countySearch || undefined,
        risk: riskFilter || undefined,
        limit: PAGE_SIZE,
        offset: newOffset,
      });
      setSystems(data);
      setOffset(newOffset);
      setHasMore(data.length === PAGE_SIZE);
    } catch {
      setError("Failed to load water systems. Make sure the backend is running.");
      setSystems([]);
    } finally {
      setLoading(false);
    }
  }, [stateFilter, countySearch, riskFilter]);

  useEffect(() => { fetchSystems(0); }, [fetchSystems]);

  return (
    <>
      <PageHeader
        eyebrow="Database · 430K+ Systems"
        title="Water Systems Directory"
        subtitle="Browse every community water system in the US. Filter by state, county, or risk level."
      />

      <div className="max-w-7xl mx-auto px-6 -mt-10 relative z-10 pb-16">
        {/* Filters */}
        <div className="card p-5 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FilterField label="State">
              <select
                value={stateFilter}
                onChange={(e) => setStateFilter(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              >
                <option value="">All States</option>
                {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </FilterField>

            <FilterField label="Risk Level">
              <select
                value={riskFilter}
                onChange={(e) => setRiskFilter(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              >
                <option value="">All Levels</option>
                <option value="safe">Safe</option>
                <option value="caution">Caution</option>
                <option value="danger">At Risk</option>
              </select>
            </FilterField>

            <FilterField label="County">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                <input
                  type="text"
                  value={countyInput}
                  onChange={(e) => setCountyInput(e.target.value)}
                  placeholder="Search county..."
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                />
              </div>
            </FilterField>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-danger-light border border-danger/20 text-danger-dark text-sm font-medium">
            {error}
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-20 gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-brand-500" />
            <span className="text-sm text-slate-400 font-mono">Loading systems...</span>
          </div>
        )}

        {!loading && systems.length > 0 && (
          <>
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left px-5 py-3.5 font-mono text-[10px] text-slate-400 tracking-[0.15em] uppercase">System</th>
                      <th className="text-left px-5 py-3.5 font-mono text-[10px] text-slate-400 tracking-[0.15em] uppercase">State</th>
                      <th className="text-left px-5 py-3.5 font-mono text-[10px] text-slate-400 tracking-[0.15em] uppercase">County</th>
                      <th className="text-left px-5 py-3.5 font-mono text-[10px] text-slate-400 tracking-[0.15em] uppercase">Source</th>
                      <th className="text-right px-5 py-3.5 font-mono text-[10px] text-slate-400 tracking-[0.15em] uppercase">Population</th>
                      <th className="text-center px-5 py-3.5 font-mono text-[10px] text-slate-400 tracking-[0.15em] uppercase">Violations</th>
                      <th className="text-center px-5 py-3.5 font-mono text-[10px] text-slate-400 tracking-[0.15em] uppercase">Risk</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {systems.map((s) => (
                      <tr key={s.pwsid} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-5 py-3">
                          <p className="font-semibold text-slate-800 truncate max-w-[240px] text-[13px]">{s.name}</p>
                          <p className="text-[11px] text-slate-400 font-mono mt-0.5">{s.pwsid}</p>
                        </td>
                        <td className="px-5 py-3 font-mono font-semibold text-slate-600 text-xs">{s.pwsid?.substring(0, 2)}</td>
                        <td className="px-5 py-3 text-slate-500 text-[13px]">{s.counties_served || "—"}</td>
                        <td className="px-5 py-3 text-slate-400 text-xs">
                          {s.primary_source === "GW" ? "Groundwater" : s.primary_source === "SW" ? "Surface" : s.primary_source || "—"}
                        </td>
                        <td className="px-5 py-3 text-right font-mono text-slate-700 tabular-nums text-[13px]">
                          {s.population_served?.toLocaleString() || "—"}
                        </td>
                        <td className="px-5 py-3 text-center font-mono tabular-nums text-[13px]">
                          <span className={s.violation_count_3yr > 0 ? "text-danger font-bold" : "text-slate-300"}>
                            {s.violation_count_3yr}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-center">
                          <RiskBadge level={s.risk_level} size="sm" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-center justify-between mt-4">
              <p className="font-mono text-xs text-slate-400">
                {offset + 1}–{offset + systems.length}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fetchSystems(Math.max(0, offset - PAGE_SIZE))}
                  disabled={offset === 0}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" /> Prev
                </button>
                <button
                  onClick={() => fetchSystems(offset + PAGE_SIZE)}
                  disabled={!hasMore}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}

        {!loading && systems.length === 0 && !error && (
          <div className="text-center py-20">
            <p className="text-sm text-slate-400 font-mono">No systems match your filters.</p>
          </div>
        )}
      </div>
    </>
  );
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="font-mono text-[10px] text-slate-400 tracking-[0.15em] uppercase mb-1.5 block">
        {label}
      </label>
      {children}
    </div>
  );
}
