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

  getMapSystems: () => fetchApi<MapSystem[]>("/map/systems"),

  getContaminants: (pwsid: string) =>
    fetchApi<ContaminantResult[]>(`/contaminants/${pwsid}`),

  getViolationHistory: (pwsid: string) =>
    fetchApi<Violation[]>(`/history/${pwsid}`),
};
