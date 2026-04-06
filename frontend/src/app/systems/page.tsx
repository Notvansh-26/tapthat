"use client";

import { useState, useEffect, useCallback } from "react";
import { api, WaterSystemSummary } from "@/lib/api";
import RiskBadge from "@/components/RiskBadge";
import {
  Building2,
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Filter,
  Users,
} from "lucide-react";

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
  const [countySearch, setCountySearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

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

  useEffect(() => {
    fetchSystems(0);
  }, [fetchSystems]);

  const handlePrev = () => {
    if (offset > 0) fetchSystems(Math.max(0, offset - PAGE_SIZE));
  };
  const handleNext = () => {
    if (hasMore) fetchSystems(offset + PAGE_SIZE);
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <section className="mb-8">
        <div className="inline-flex items-center gap-2 bg-brand-50 text-brand-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-4 border border-brand-100">
          <Building2 className="w-3.5 h-3.5" />
          ALL US WATER SYSTEMS
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
          Water Systems Directory
        </h1>
        <p className="text-slate-500 max-w-lg">
          Browse all community water systems across the United States.
          Filter by state, county, or risk level.
        </p>
      </section>

      {/* Filters */}
      <div className="card p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-semibold text-slate-700">Filters</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1 block">
              State
            </label>
            <select
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
            >
              <option value="">All States</option>
              {STATES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1 block">
              Risk Level
            </label>
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
            >
              <option value="">All Levels</option>
              <option value="safe">Safe</option>
              <option value="caution">Caution</option>
              <option value="danger">At Risk</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1 block">
              County
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
              <input
                type="text"
                value={countySearch}
                onChange={(e) => setCountySearch(e.target.value)}
                placeholder="Search county..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-danger-light border border-danger/20 text-danger-dark text-sm font-medium">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
          <span className="ml-3 text-sm text-slate-400">Loading systems...</span>
        </div>
      )}

      {!loading && systems.length > 0 && (
        <>
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="text-left px-5 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider">System</th>
                    <th className="text-left px-5 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider">State</th>
                    <th className="text-left px-5 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider">County</th>
                    <th className="text-left px-5 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider">Source</th>
                    <th className="text-right px-5 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider">Population</th>
                    <th className="text-center px-5 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider">Violations</th>
                    <th className="text-center px-5 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider">Risk</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {systems.map((s) => (
                    <tr key={s.pwsid} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-3">
                        <div>
                          <p className="font-medium text-slate-800 truncate max-w-[250px]">{s.name}</p>
                          <p className="text-xs text-slate-400 font-mono">{s.pwsid}</p>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-slate-600 font-medium">{s.pwsid?.substring(0, 2)}</td>
                      <td className="px-5 py-3 text-slate-600">{s.counties_served || "—"}</td>
                      <td className="px-5 py-3 text-slate-500 text-xs">
                        {s.primary_source === "GW" ? "Groundwater" : s.primary_source === "SW" ? "Surface" : s.primary_source || "—"}
                      </td>
                      <td className="px-5 py-3 text-right text-slate-700 font-mono tabular-nums">
                        {s.population_served?.toLocaleString() || "—"}
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className={`font-mono tabular-nums ${s.violation_count_3yr > 0 ? "text-danger font-semibold" : "text-slate-400"}`}>
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

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-slate-400">
              Showing {offset + 1}–{offset + systems.length}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrev}
                disabled={offset === 0}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" /> Prev
              </button>
              <button
                onClick={handleNext}
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
          <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-400">No water systems found matching your filters.</p>
        </div>
      )}
    </div>
  );
}
