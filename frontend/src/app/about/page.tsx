import { Droplets, Database, Shield } from "lucide-react";
import PageHeader from "@/components/PageHeader";

export default function AboutPage() {
  return (
    <>
      <PageHeader
        eyebrow="TapThat · About"
        title="Know What's in Your Tap"
        subtitle="Free, public water quality data for every community water system in the US."
      />

      <div className="max-w-3xl mx-auto px-6 -mt-10 relative z-10 pb-16 space-y-5">
        <Section icon={<Droplets className="w-4 h-4" />} title="What is TapThat?">
          <p>
            TapThat is a free dashboard that makes US water quality data accessible.
            Enter any ZIP code to see which water systems serve your area, what contaminants
            have been detected, and whether there have been any regulatory violations.
          </p>
          <p>
            Data covers all 430,000+ community water systems across all 50 states —
            updated weekly from federal sources.
          </p>
        </Section>

        <Section icon={<Database className="w-4 h-4" />} title="Data Sources">
          <div className="space-y-4">
            <DataSource
              name="EPA ECHO"
              description="Enforcement and Compliance History Online. Water system details, violation counts, compliance status, and enforcement actions."
            />
            <DataSource
              name="EPA SDWIS"
              description="Safe Drinking Water Information System. Violation details, geographic mappings, and Lead & Copper Rule sample results."
            />
          </div>
          <div className="mt-4 p-4 rounded-xl bg-navy/40 border border-brand-900/50">
            <p className="text-xs font-mono text-slate-400 leading-relaxed">
              All data is public record. No API keys or paid services required.
              Refreshed weekly from federal databases.
            </p>
          </div>
        </Section>

        <Section icon={<Shield className="w-4 h-4" />} title="Risk Level Methodology">
          <div className="space-y-3">
            <RiskRow
              color="#34d399"
              label="Safe"
              description="No violations in the past 3 years. Full compliance with EPA standards."
            />
            <RiskRow
              color="#fbbf24"
              label="Caution"
              description="Some violations detected — monitoring gaps, reporting issues, or minor non-health-based violations."
            />
            <RiskRow
              color="#f87171"
              label="At Risk"
              description="Multiple health-based violations, or designated a Serious Non-Complier (SNC) by the EPA."
            />
          </div>
        </Section>
      </div>
    </>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center">
          {icon}
        </div>
        <h2 className="font-semibold text-slate-900 tracking-tight">{title}</h2>
      </div>
      <div className="text-sm text-slate-500 leading-relaxed space-y-3">
        {children}
      </div>
    </div>
  );
}

function DataSource({ name, description }: { name: string; description: string }) {
  return (
    <div className="flex gap-3">
      <div className="w-1 rounded-full bg-brand-200 flex-shrink-0 mt-1" />
      <div>
        <p className="font-mono text-xs font-bold text-brand-700 uppercase tracking-widest mb-1">{name}</p>
        <p className="text-sm text-slate-500 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

function RiskRow({ color, label, description }: { color: string; label: string; description: string }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50/60">
      <span
        className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1"
        style={{ background: color, boxShadow: `0 0 6px ${color}80` }}
      />
      <div>
        <p className="font-semibold text-slate-800 text-sm">{label}</p>
        <p className="text-slate-500 text-sm leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
