import { Droplets, Database, Shield, ExternalLink } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-tap-950 mb-6">About TapThat</h1>

      <div className="prose prose-tap max-w-none space-y-6">
        <div className="bg-white rounded-2xl p-6 border border-tap-100 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <Droplets className="w-6 h-6 text-tap-600" />
            <h2 className="text-xl font-semibold text-tap-900">What is this?</h2>
          </div>
          <p className="text-tap-600 leading-relaxed">
            TapThat is a water quality transparency tool for the state of Texas.
            Enter your ZIP code to see which water system serves your area, what
            contaminants have been detected, and whether there have been any
            regulatory violations.
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-tap-100 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <Database className="w-6 h-6 text-tap-600" />
            <h2 className="text-xl font-semibold text-tap-900">Where does the data come from?</h2>
          </div>
          <ul className="text-tap-600 space-y-2">
            <li>
              <strong>EPA ECHO</strong> — Enforcement and Compliance History
              Online. Provides water system details, violation counts, and
              compliance status.
            </li>
            <li>
              <strong>EPA SDWIS</strong> — Safe Drinking Water Information
              System. Provides violation details, geographic area mappings, and
              Lead/Copper Rule sample results.
            </li>
          </ul>
          <p className="text-tap-500 text-sm mt-3">
            Data is refreshed weekly from federal databases. All data is public
            record.
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-tap-100 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <Shield className="w-6 h-6 text-tap-600" />
            <h2 className="text-xl font-semibold text-tap-900">Risk levels explained</h2>
          </div>
          <div className="space-y-3 text-tap-600">
            <div className="flex items-start gap-3">
              <span className="w-3 h-3 rounded-full bg-safe mt-1.5 flex-shrink-0" />
              <p>
                <strong className="text-safe-dark">Safe</strong> — No violations in
                the past 3 years. The water system is in full compliance.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="w-3 h-3 rounded-full bg-caution mt-1.5 flex-shrink-0" />
              <p>
                <strong className="text-caution-dark">Caution</strong> — Some
                violations detected, but none classified as health-based, or
                only minor monitoring issues.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="w-3 h-3 rounded-full bg-danger mt-1.5 flex-shrink-0" />
              <p>
                <strong className="text-danger-dark">At Risk</strong> — Multiple
                health-based violations or designated as a Serious Non-Complier
                by the EPA.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
