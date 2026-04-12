import type { ZipCodeReport, Violation } from "@/lib/api";
import { AlertTriangle, Calendar, Users, Building2, ShieldAlert, ShieldX, ShieldCheck } from "lucide-react";

interface WaterQualityCardProps {
  report: ZipCodeReport;
  compact?: boolean;
}

const RISK_CONFIG = {
  safe:    { label: "Safe",    bg: "bg-safe-light",    text: "text-safe-dark",    border: "border-safe/30",    accent: "#10b981", bar: "bg-safe",    watermark: "text-safe/[0.06]",    Icon: ShieldCheck },
  caution: { label: "Caution", bg: "bg-caution-light", text: "text-caution-dark", border: "border-caution/30", accent: "#f59e0b", bar: "bg-caution", watermark: "text-caution/[0.07]", Icon: ShieldAlert },
  danger:  { label: "At Risk", bg: "bg-danger-light",  text: "text-danger-dark",  border: "border-danger/30",  accent: "#ef4444", bar: "bg-danger",  watermark: "text-danger/[0.07]",  Icon: ShieldX },
};

export default function WaterQualityCard({ report, compact = false }: WaterQualityCardProps) {
  const cfg = RISK_CONFIG[report.overall_risk_level];
  const { Icon } = cfg;

  const totalViolations = report.water_systems.reduce((s, w) => s + w.violation_count_3yr, 0);
  const stateCode = report.water_systems[0]?.pwsid?.substring(0, 2) ?? "";
  const county = report.water_systems[0]?.counties_served ?? "";

  const allViolations = report.recent_violations.filter(
    (v) => v.contaminant_name || v.violation_type || v.compliance_begin_date
  );
  const healthViolations = allViolations.filter((v) => v.is_health_based);
  const otherViolations  = allViolations.filter((v) => !v.is_health_based);

  return (
    <div className="card overflow-hidden">
      {/* Top strip */}
      <div className="h-1" style={{ background: `linear-gradient(90deg, ${cfg.accent}, ${cfg.accent}88)` }} />

      {/* Header */}
      <div className="relative overflow-hidden p-6 pb-5">
        {/* Watermark icon */}
        <Icon
          className={`absolute -right-4 -top-4 w-36 h-36 ${cfg.watermark} pointer-events-none select-none`}
          strokeWidth={1}
        />

        <div className="relative flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] tracking-[0.18em] text-slate-400 uppercase mb-1">
              ZIP Code Report
            </p>
            <div className="flex items-end gap-3 mb-1">
              <span className="font-mono text-5xl font-bold text-slate-900 tracking-tight leading-none">
                {report.zip_code}
              </span>
              <span
                className={`mb-1 inline-flex items-center gap-1.5 font-semibold rounded-full px-3 py-1 text-xs border
                  ${cfg.bg} ${cfg.text} ${cfg.border}`}
              >
                <Icon className="w-3.5 h-3.5" />
                {cfg.label}
              </span>
            </div>
            {county && (
              <p className="text-sm text-slate-500 font-medium">
                {county}{stateCode ? `, ${stateCode}` : ""}
              </p>
            )}
          </div>
        </div>

        {/* Stat row */}
        <div className="grid grid-cols-3 gap-3 mt-5">
          <StatChip icon={<Users className="w-3.5 h-3.5" />} label="Population" value={formatNumber(report.total_population_served)} />
          <StatChip icon={<Building2 className="w-3.5 h-3.5" />} label="Systems" value={String(report.water_systems.length)} />
          <StatChip
            icon={<AlertTriangle className="w-3.5 h-3.5" />}
            label="Violations (3yr)"
            value={String(totalViolations)}
            alert={totalViolations > 0}
          />
        </div>
      </div>

      {!compact && (
        <>
          {/* Violations */}
          {allViolations.length > 0 && (
            <div className="border-t border-slate-100 grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100">
              <ViolationColumn
                title="Health Risks"
                icon={<ShieldX className="w-4 h-4 text-danger" />}
                violations={healthViolations}
                variant="risk"
                emptyText="No health-based risks"
              />
              <ViolationColumn
                title="Warnings"
                icon={<ShieldAlert className="w-4 h-4 text-caution" />}
                violations={otherViolations}
                variant="warning"
                emptyText="No warnings"
              />
            </div>
          )}

          {/* Contaminants */}
          {report.top_contaminants.length > 0 && (
            <div className="border-t border-slate-100 p-6">
              <p className="font-mono text-[10px] tracking-[0.18em] text-slate-400 uppercase mb-4">
                Detected Contaminants
              </p>
              <div className="grid md:grid-cols-2 gap-x-8 gap-y-4">
                {report.top_contaminants.slice(0, 8).map((c, i) => {
                  const ratio = c.exceedance_ratio ?? 0;
                  const pct = Math.min(ratio * 100, 100);
                  const barColor =
                    ratio > 1 ? "bg-danger" : ratio > 0.5 ? "bg-caution" : "bg-safe";
                  const textColor =
                    ratio > 1 ? "text-danger-dark" : ratio > 0.5 ? "text-caution-dark" : "text-safe-dark";
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={`text-[13px] font-semibold ${ratio > 1 ? textColor : "text-slate-700"}`}>
                          {c.contaminant_name || "Unknown"}
                        </span>
                        <span className="font-mono text-[11px] text-slate-400">
                          {c.measurement_value != null
                            ? `${c.measurement_value} ${c.unit ?? ""}`.trim()
                            : "—"}
                          {c.mcl != null && (
                            <span className="text-slate-300"> / {c.mcl} MCL</span>
                          )}
                        </span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full bar-fill ${barColor}`}
                          style={{ width: `${Math.max(pct, 2)}%` }}
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

function ViolationColumn({
  title, icon, violations, variant, emptyText,
}: {
  title: string;
  icon: React.ReactNode;
  violations: Violation[];
  variant: "risk" | "warning";
  emptyText: string;
}) {
  const isRisk = variant === "risk";
  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <span className={`text-[11px] font-bold uppercase tracking-widest ${isRisk ? "text-danger-dark" : "text-caution-dark"}`}>
          {title}
        </span>
        <span className="ml-auto font-mono text-[11px] text-slate-300">{violations.length}</span>
      </div>
      {violations.length > 0 ? (
        <div className="space-y-2">
          {violations.slice(0, 5).map((v, i) => (
            <ViolationRow key={i} violation={v} variant={variant} />
          ))}
          {violations.length > 5 && (
            <p className="text-xs text-slate-400 pt-1 font-mono">+{violations.length - 5} more</p>
          )}
        </div>
      ) : (
        <p className="text-sm text-slate-400">{emptyText}</p>
      )}
    </div>
  );
}

function ViolationRow({ violation: v, variant }: { violation: Violation; variant: "warning" | "risk" }) {
  const isRisk = variant === "risk";
  return (
    <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50/70 border border-slate-100">
      <div className={`mt-0.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${isRisk ? "bg-danger" : "bg-caution"}`} />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-slate-800 leading-tight">
          {v.contaminant_name || "Unknown Contaminant"}
        </p>
        {v.violation_type && (
          <p className="text-[11px] text-slate-400 mt-0.5">{v.violation_type}</p>
        )}
        {v.compliance_begin_date && (
          <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1 font-mono">
            <Calendar className="w-3 h-3" />
            {new Date(v.compliance_begin_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </p>
        )}
      </div>
    </div>
  );
}

function StatChip({
  icon, label, value, alert = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  alert?: boolean;
}) {
  return (
    <div className="bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-slate-400">{icon}</span>
        <span className="font-mono text-[10px] text-slate-400 tracking-wider uppercase">{label}</span>
      </div>
      <p className={`font-mono text-xl font-bold tabular-nums ${alert ? "text-danger" : "text-slate-800"}`}>
        {value}
      </p>
    </div>
  );
}

export function WaterQualityCardSkeleton() {
  return (
    <div className="card overflow-hidden">
      <div className="h-1 skeleton" />
      <div className="p-6">
        <div className="skeleton h-2.5 w-24 rounded mb-3" />
        <div className="flex items-end gap-3 mb-4">
          <div className="skeleton h-12 w-36 rounded-lg" />
          <div className="skeleton h-7 w-20 rounded-full" />
        </div>
        <div className="skeleton h-3 w-32 rounded mb-5" />
        <div className="grid grid-cols-3 gap-3">
          {[0,1,2].map(i => <div key={i} className="skeleton h-16 rounded-xl" />)}
        </div>
      </div>
      <div className="border-t border-slate-100 p-6 grid md:grid-cols-2 gap-4">
        {[0,1,2,3].map(i => <div key={i} className="skeleton h-14 rounded-xl" />)}
      </div>
    </div>
  );
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}
