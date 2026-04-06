const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export interface WaterSystemSummary {
  pwsid: string;
  name: string;
  primary_source: string | null;
  system_type: string | null;
  population_served: number | null;
  counties_served: string | null;
  serious_violator: boolean;
  violation_count_3yr: number;
  health_violation_count_3yr: number;
  risk_level: "safe" | "caution" | "danger";
}

export interface ContaminantResult {
  contaminant_name: string | null;
  category: string | null;
  measurement_value: number | null;
  unit: string | null;
  mcl: number | null;
  mclg: number | null;
  sample_date: string | null;
  exceedance_ratio: number | null;
}

export interface Violation {
  violation_id: string | null;
  contaminant_name: string | null;
  rule_name: string | null;
  violation_type: string | null;
  severity: string | null;
  is_health_based: boolean;
  compliance_begin_date: string | null;
  compliance_end_date: string | null;
}

export interface ZipCodeReport {
  zip_code: string;
  water_systems: WaterSystemSummary[];
  total_population_served: number;
  overall_risk_level: "safe" | "caution" | "danger";
  top_contaminants: ContaminantResult[];
  recent_violations: Violation[];
}

export interface ComparisonReport {
  zip_codes: string[];
  reports: ZipCodeReport[];
}

export interface MapSystem {
  pwsid: string;
  name: string;
  lat: number;
  lng: number;
  population: number | null;
  risk_level: "safe" | "caution" | "danger";
}

export interface CountyRisk {
  county: string;
  risk_level: "safe" | "caution" | "danger";
  system_count: number;
  population: number;
  violation_count: number;
  zip_codes: string[];
}

export interface StateRisk {
  state_code: string;
  state_name: string;
  risk_level: "safe" | "caution" | "danger";
  system_count: number;
  population: number;
  violation_count: number;
}

async function fetchApi<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export const api = {
  getZipReport: (zip: string) => fetchApi<ZipCodeReport>(`/search/${zip}`),

  compare: (zips: string[]) => {
    const params = zips.map((z) => `zips=${z}`).join("&");
    return fetchApi<ComparisonReport>(`/compare?${params}`);
  },

  listSystems: (opts: {
    state?: string;
    county?: string;
    risk?: string;
    limit?: number;
    offset?: number;
  }) => {
    const params = new URLSearchParams();
    if (opts.state) params.set("state", opts.state);
    if (opts.county) params.set("county", opts.county);
    if (opts.risk) params.set("risk", opts.risk);
    if (opts.limit != null) params.set("limit", String(opts.limit));
    if (opts.offset != null) params.set("offset", String(opts.offset));
    const qs = params.toString();
    return fetchApi<WaterSystemSummary[]>(`/systems${qs ? `?${qs}` : ""}`);
  },

  getMapSystems: (stateCode?: string) =>
    fetchApi<MapSystem[]>(`/map/systems${stateCode ? `?state=${stateCode}` : ""}`),

  getStateRisks: () => fetchApi<StateRisk[]>("/map/states"),

  getCountyRisks: (stateCode: string) =>
    fetchApi<CountyRisk[]>(`/map/counties/${stateCode}`),

  getContaminants: (pwsid: string) =>
    fetchApi<ContaminantResult[]>(`/contaminants/${pwsid}`),

  getViolationHistory: (pwsid: string) =>
    fetchApi<Violation[]>(`/history/${pwsid}`),
};
