import { Droplets, Database, Shield, ExternalLink } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
        About TapThat
      </h1>
      <p className="text-slate-500 mb-10">
        Water quality transparency for the United States.
      </p>

      <div className="space-y-6">
        <Section icon={<Droplets />} title="What is this?">
          <p>
            TapThat is a free, public dashboard that makes US water quality
            data accessible and understandable. Enter any ZIP code to see which
            water systems serve your area, what contaminants have been detected,
            and whether there have been any regulatory violations.
          </p>
        </Section>

        <Section icon={<Database />} title="Data Sources">
          <ul className="space-y-3">
            <li>
              <strong className="text-slate-700">EPA ECHO</strong>
              <span className="text-slate-400"> — </span>
              Enforcement and Compliance History Online. Water system details,
              violation counts, compliance status, and enforcement actions.
            </li>
            <li>
              <strong className="text-slate-700">EPA SDWIS</strong>
              <span className="text-slate-400"> — </span>
              Safe Drinking Water Information System. Violation details,
              geographic mappings, and Lead &amp; Copper Rule sample results.
            </li>
          </ul>
          <p className="text-sm text-slate-400 mt-4 p-3 rounded-lg bg-slate-50 border border-slate-100">
            All data is public record and refreshed weekly from federal
            databases. No API keys or paid services required.
          </p>
        </Section>

        <Section icon={<Shield />} title="Risk Levels Explained">
          <div className="space-y-4">
            <RiskExplainer
              color="bg-safe"
              label="Safe"
              description="No violations in the past 3 years. The water system is in full compliance with EPA standards."
            />
            <RiskExplainer
              color="bg-caution"
              label="Caution"
              description="Some violations detected — monitoring or reporting issues, or minor non-health-based violations."
            />
            <RiskExplainer
              color="bg-danger"
              label="At Risk"
              description="Multiple health-based violations or designated as a Serious Non-Complier (SNC) by the EPA."
            />
          </div>
        </Section>
      </div>
    </div>
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
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
          {icon}
        </div>
        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
      </div>
      <div className="text-sm text-slate-500 leading-relaxed space-y-3">
        {children}
      </div>
    </div>
  );
}

function RiskExplainer({
  color,
  label,
  description,
}: {
  color: string;
  label: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className={`w-3 h-3 rounded-full ${color} mt-1 flex-shrink-0 shadow-sm`} />
      <div>
        <p className="font-semibold text-slate-700 text-sm">{label}</p>
        <p className="text-slate-500 text-sm">{description}</p>
      </div>
    </div>
  );
}
