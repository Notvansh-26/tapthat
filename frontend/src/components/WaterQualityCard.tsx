import type { ZipCodeReport, Violation } from "@/lib/api";
import RiskBadge from "./RiskBadge";
import {
  Users,
  AlertTriangle,
  ShieldAlert,
  ShieldX,
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

  // Split violations into warnings (non-health) and risks (health-based)
  const allViolations = report.recent_violations.filter(
    (v) => v.contaminant_name || v.violation_type || v.compliance_begin_date
  );
  const warnings = allViolations.filter((v) => !v.is_health_based);
  const risks = allViolations.filter((v) => v.is_health_based);

  // Derive county and state from water systems
  const county = report.water_systems[0]?.counties_served;
  const stateCode = report.water_systems[0]?.pwsid?.substring(0, 2) || "";

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
            {county && (
              <p className="text-sm text-slate-500 mt-1 font-medium">
                {county}{stateCode ? `, ${stateCode}` : ""}
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
          {/* Warnings & Risks — two columns */}
          {allViolations.length > 0 && (
            <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100">
              {/* Warnings column (orange) */}
              <div className="p-6">
                <div className="flex items-center gap-2 mb-3">
                  <ShieldAlert className="w-4 h-4 text-caution" />
                  <h3 className="text-xs font-semibold text-caution-dark uppercase tracking-widest">
                    Warnings
                  </h3>
                  <span className="text-xs font-mono text-slate-300 ml-auto">{warnings.length}</span>
                </div>
                {warnings.length > 0 ? (
                  <div className="space-y-2">
                    {warnings.slice(0, 5).map((v, i) => (
                      <ViolationRow key={i} violation={v} variant="warning" />
                    ))}
                    {warnings.length > 5 && (
                      <p className="text-xs text-slate-400 pt-1">
                        +{warnings.length - 5} more warnings
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 italic">No warnings</p>
                )}
              </div>

              {/* Risks column (red) */}
              <div className="p-6">
                <div className="flex items-center gap-2 mb-3">
                  <ShieldX className="w-4 h-4 text-danger" />
                  <h3 className="text-xs font-semibold text-danger-dark uppercase tracking-widest">
                    Health Risks
                  </h3>
                  <span className="text-xs font-mono text-slate-300 ml-auto">{risks.length}</span>
                </div>
                {risks.length > 0 ? (
                  <div className="space-y-2">
                    {risks.slice(0, 5).map((v, i) => (
                      <ViolationRow key={i} violation={v} variant="risk" />
                    ))}
                    {risks.length > 5 && (
                      <p className="text-xs text-slate-400 pt-1">
                        +{risks.length - 5} more risks
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 italic">No health-based risks</p>
                )}
              </div>
            </div>
          )}

          {allViolations.length === 0 && report.recent_violations.length > 0 && (
            <div className="p-6">
              <p className="text-sm text-slate-400 italic">
                Violation details pending data enrichment
              </p>
            </div>
          )}

          {/* Contaminant bars */}
          {report.top_contaminants.length > 0 && (
            <div className="p-6 border-t border-slate-100">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
                Detected Contaminants
              </h3>
              <div className="grid md:grid-cols-2 gap-x-8 gap-y-3">
                {report.top_contaminants.slice(0, 8).map((c, i) => {
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

function ViolationRow({ violation: v, variant }: { violation: Violation; variant: "warning" | "risk" }) {
  const isRisk = variant === "risk";
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50/80">
      <div
        className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
          isRisk ? "bg-danger-light text-danger" : "bg-caution-light text-caution"
        }`}
      >
        <AlertTriangle className="w-3 h-3" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-700">
          {v.contaminant_name || "Unknown Contaminant"}
        </p>
        {v.violation_type && (
          <p className="text-xs text-slate-400 mt-0.5">{v.violation_type}</p>
        )}
        {v.compliance_begin_date && (
          <span className="text-xs text-slate-400 flex items-center gap-1 mt-1">
            <Calendar className="w-3 h-3" />
            {new Date(v.compliance_begin_date).toLocaleDateString()}
          </span>
        )}
      </div>
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
