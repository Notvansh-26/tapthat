import type { ZipCodeReport } from "@/lib/api";
import RiskBadge from "./RiskBadge";
import {
  Droplets,
  Users,
  AlertTriangle,
  ChevronRight,
  Building2,
  Calendar,
} from "lucide-react";

interface WaterQualityCardProps {
  report: ZipCodeReport;
  compact?: boolean;
}

export default function WaterQualityCard({
  report,
  compact = false,
}: WaterQualityCardProps) {
  const riskBg = {
    safe: "from-safe/5 to-safe/0",
    caution: "from-caution/5 to-caution/0",
    danger: "from-danger/5 to-danger/0",
  };

  const totalViolations = report.water_systems.reduce(
    (sum, s) => sum + s.violation_count_3yr,
    0
  );

  return (
    <div className="card overflow-hidden fade-up">
      {/* Top accent gradient */}
      <div className={`h-1 bg-gradient-to-r ${
        report.overall_risk_level === "safe" ? "from-safe to-safe-medium" :
        report.overall_risk_level === "caution" ? "from-caution to-caution-medium" :
        "from-danger to-danger-medium"
      }`} />

      {/* Header */}
      <div className={`p-6 bg-gradient-to-b ${riskBg[report.overall_risk_level]}`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                ZIP Code
              </span>
            </div>
            <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">
              {report.zip_code}
            </h2>
            {report.water_systems[0]?.counties_served && (
              <p className="text-sm text-slate-500 mt-1 font-medium">
                {report.water_systems[0].counties_served} County, TX
              </p>
            )}
          </div>
          <RiskBadge level={report.overall_risk_level} size="lg" />
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 divide-x divide-slate-100 border-t border-b border-slate-100">
        <Stat
          icon={<Users className="w-4 h-4" />}
          label="Population Served"
          value={formatNumber(report.total_population_served)}
        />
        <Stat
          icon={<Building2 className="w-4 h-4" />}
          label="Water Systems"
          value={String(report.water_systems.length)}
        />
        <Stat
          icon={<AlertTriangle className="w-4 h-4" />}
          label="Violations (3yr)"
          value={String(totalViolations)}
          alert={totalViolations > 0}
        />
      </div>

      {!compact && (
        <>
          {/* Top water systems */}
          <div className="p-6">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
              Largest Water Systems
            </h3>
            <div className="space-y-2">
              {report.water_systems
                .sort((a, b) => (b.population_served || 0) - (a.population_served || 0))
                .slice(0, 4)
                .map((s) => (
                  <div
                    key={s.pwsid}
                    className="flex items-center gap-3 p-3 rounded-xl bg-slate-50/80 hover:bg-slate-100/80 transition-colors group"
                  >
                    <div
                      className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        s.risk_level === "safe" ? "bg-safe" :
                        s.risk_level === "caution" ? "bg-caution" : "bg-danger"
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">
                        {s.name}
                      </p>
                      <p className="text-xs text-slate-400">
                        {formatNumber(s.population_served || 0)} served · {s.primary_source === "GW" ? "Groundwater" : s.primary_source === "SW" ? "Surface" : s.primary_source || "Unknown"}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
                  </div>
                ))}
            </div>
          </div>

          {/* Violations timeline */}
          {report.recent_violations.length > 0 && (
            <div className="px-6 pb-6">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
                Recent Violations
              </h3>
              <div className="space-y-2">
                {report.recent_violations
                  .filter((v) => v.contaminant_name || v.violation_type || v.compliance_begin_date)
                  .slice(0, 4)
                  .map((v, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 p-3 rounded-xl bg-slate-50/80"
                  >
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        v.is_health_based
                          ? "bg-danger-light text-danger"
                          : "bg-caution-light text-caution"
                      }`}
                    >
                      <AlertTriangle className="w-3 h-3" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700">
                        {v.contaminant_name || "Unknown Contaminant"}
                      </p>
                      {v.violation_type && (
                        <p className="text-xs text-slate-400 mt-0.5">
                          {v.violation_type}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        {v.is_health_based && (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-danger bg-danger-light px-1.5 py-0.5 rounded">
                            Health-based
                          </span>
                        )}
                        {v.compliance_begin_date && (
                          <span className="text-xs text-slate-400 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(v.compliance_begin_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {report.recent_violations.filter((v) => v.contaminant_name || v.violation_type || v.compliance_begin_date).length === 0 && (
                  <p className="text-sm text-slate-400 italic">
                    Violation details pending data enrichment
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Contaminant bars */}
          {report.top_contaminants.length > 0 && (
            <div className="px-6 pb-6">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
                Detected Contaminants
              </h3>
              <div className="space-y-3">
                {report.top_contaminants.slice(0, 5).map((c, i) => {
                  const ratio = c.exceedance_ratio ?? 0;
                  const pct = Math.min(ratio * 100, 100);
                  const color =
                    ratio > 1 ? "bg-danger" : ratio > 0.5 ? "bg-caution" : "bg-safe";
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-slate-600">
                          {c.contaminant_name || "Unknown"}
                        </span>
                        <span className="text-xs font-mono text-slate-400">
                          {c.measurement_value != null
                            ? `${c.measurement_value} ${c.unit || ""}`
                            : "—"}
                          {c.mcl != null && (
                            <span className="text-slate-300"> / {c.mcl} MCL</span>
                          )}
                        </span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full bar-fill ${color}`}
                          style={{ width: `${Math.max(pct, 3)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  alert = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  alert?: boolean;
}) {
  return (
    <div className="px-5 py-4">
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-slate-300">{icon}</span>
        <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
          {label}
        </span>
      </div>
      <p
        className={`text-xl font-bold tabular-nums ${
          alert ? "text-danger" : "text-slate-800"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}
