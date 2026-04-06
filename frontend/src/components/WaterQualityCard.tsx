import type { ZipCodeReport } from "@/lib/api";
import RiskBadge from "./RiskBadge";
import { Droplets, Users, AlertTriangle, Shield } from "lucide-react";

interface WaterQualityCardProps {
  report: ZipCodeReport;
}

export default function WaterQualityCard({ report }: WaterQualityCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-tap-100 overflow-hidden card-hover">
      {/* Header — like the big temperature display in weather apps */}
      <div className="p-6 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-tap-500 uppercase tracking-wide">
              ZIP Code
            </p>
            <h2 className="text-3xl font-bold text-tap-900 mt-1">
              {report.zip_code}
            </h2>
          </div>
          <RiskBadge level={report.overall_risk_level} size="lg" />
        </div>
      </div>

      {/* Quick stats row — like wind/humidity/UV in weather apps */}
      <div className="grid grid-cols-3 gap-px bg-tap-100">
        <QuickStat
          icon={<Users className="w-4 h-4" />}
          label="Population"
          value={report.total_population_served.toLocaleString()}
        />
        <QuickStat
          icon={<Droplets className="w-4 h-4" />}
          label="Water Systems"
          value={String(report.water_systems.length)}
        />
        <QuickStat
          icon={<AlertTriangle className="w-4 h-4" />}
          label="Violations (3yr)"
          value={String(
            report.water_systems.reduce(
              (sum, s) => sum + s.violation_count_3yr,
              0
            )
          )}
        />
      </div>

      {/* Top contaminants — like the hourly forecast row */}
      {report.top_contaminants.length > 0 && (
        <div className="p-6 pt-4">
          <h3 className="text-sm font-semibold text-tap-600 uppercase tracking-wide mb-3">
            Key Contaminants
          </h3>
          <div className="space-y-2">
            {report.top_contaminants.slice(0, 5).map((c, i) => (
              <ContaminantRow key={i} contaminant={c} />
            ))}
          </div>
        </div>
      )}

      {/* Recent violations */}
      {report.recent_violations.length > 0 && (
        <div className="p-6 pt-0">
          <h3 className="text-sm font-semibold text-tap-600 uppercase tracking-wide mb-3">
            Recent Violations
          </h3>
          <div className="space-y-2">
            {report.recent_violations.slice(0, 3).map((v, i) => (
              <div
                key={i}
                className="flex items-center gap-2 text-sm p-2 rounded-lg bg-tap-50"
              >
                <Shield
                  className={`w-4 h-4 flex-shrink-0 ${
                    v.is_health_based ? "text-danger" : "text-caution"
                  }`}
                />
                <span className="text-tap-700 truncate">
                  {v.contaminant_name || v.rule_name || "Violation"}
                </span>
                {v.compliance_begin_date && (
                  <span className="text-tap-400 text-xs ml-auto flex-shrink-0">
                    {new Date(v.compliance_begin_date).toLocaleDateString()}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function QuickStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-white p-4 text-center">
      <div className="flex items-center justify-center gap-1 text-tap-400 mb-1">
        {icon}
        <span className="text-xs font-medium uppercase">{label}</span>
      </div>
      <p className="text-lg font-bold text-tap-800">{value}</p>
    </div>
  );
}

function ContaminantRow({
  contaminant,
}: {
  contaminant: { contaminant_name: string | null; exceedance_ratio: number | null; mcl: number | null; measurement_value: number | null; unit: string | null };
}) {
  const ratio = contaminant.exceedance_ratio ?? 0;
  const barWidth = Math.min(ratio * 100, 100);
  const barColor =
    ratio > 1 ? "bg-danger" : ratio > 0.5 ? "bg-caution" : "bg-safe";

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-tap-700 w-36 truncate font-medium">
        {contaminant.contaminant_name || "Unknown"}
      </span>
      <div className="flex-1 h-2 bg-tap-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${barWidth}%` }}
        />
      </div>
      <span className="text-xs text-tap-500 w-16 text-right tabular-nums">
        {contaminant.measurement_value != null
          ? `${contaminant.measurement_value} ${contaminant.unit || ""}`
          : "N/A"}
      </span>
    </div>
  );
}
