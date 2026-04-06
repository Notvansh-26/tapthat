"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import SearchBar from "@/components/SearchBar";
import WaterQualityCard from "@/components/WaterQualityCard";
import { api, ZipCodeReport } from "@/lib/api";
import { Droplets, MapPin, BarChart3, Database, Eye } from "lucide-react";

const USMap = dynamic(() => import("@/components/USMap"), { ssr: false });
const StateMap = dynamic(() => import("@/components/StateMap"), { ssr: false });

export default function Home() {
  const [report, setReport] = useState<ZipCodeReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedState, setSelectedState] = useState<{ code: string; name: string } | null>(null);

  const handleSearch = async (zip: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getZipReport(zip);
      setReport(data);
    } catch (e: any) {
      setError(
        e.message.includes("404")
          ? `No water data found for ZIP ${zip}. Try another ZIP code.`
          : "Something went wrong. Please try again."
      );
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Hero */}
      <section className="hero-gradient relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
            backgroundSize: "32px 32px",
          }}
        />

        <div className="relative max-w-7xl mx-auto px-6 pt-16 pb-20">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm text-white/90 text-xs font-semibold px-3 py-1.5 rounded-full mb-6 border border-white/10">
              <Droplets className="w-3.5 h-3.5" />
              US WATER QUALITY · REAL EPA DATA
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white leading-[1.1] tracking-tight mb-4">
              Know what&apos;s in
              <br />
              <span className="text-brand-200">your tap.</span>
            </h1>

            <p className="text-lg text-brand-100/80 mb-8 max-w-lg leading-relaxed">
              Search any US ZIP code for real water quality data, violations,
              and contaminant levels from the EPA.
            </p>

            <SearchBar onSearch={handleSearch} loading={loading} variant="hero" />
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" fill="none" className="w-full">
            <path d="M0 60V20C240 40 480 0 720 20C960 40 1200 0 1440 20V60H0Z" fill="#f8fafc" />
          </svg>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6 -mt-2">
        {error && (
          <div className="mb-8 p-4 rounded-2xl bg-danger-light border border-danger/20 text-danger-dark text-sm font-medium fade-up">
            {error}
          </div>
        )}

        {report && !loading && (
          <section className="mb-12">
            <WaterQualityCard report={report} />
          </section>
        )}

        {/* Map */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-brand-500" />
                {selectedState ? `${selectedState.name} County Risk Map` : "US Water Quality Map"}
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                {selectedState
                  ? "Hover over a county to see water quality details and ZIP codes"
                  : "Click a state to explore county-level water quality"}
              </p>
            </div>
          </div>
          {selectedState ? (
            <StateMap
              stateCode={selectedState.code}
              stateName={selectedState.name}
              onBack={() => setSelectedState(null)}
            />
          ) : (
            <USMap
              onStateSelect={(code, name) => setSelectedState({ code, name })}
            />
          )}
        </section>

        {!report && (
          <section className="grid md:grid-cols-3 gap-5 mb-16">
            <FeatureCard
              icon={<Database className="w-5 h-5" />}
              title="Real EPA Data"
              description="Sourced directly from EPA ECHO and SDWIS federal databases. Updated weekly with the latest compliance data."
              delay={1}
            />
            <FeatureCard
              icon={<Eye className="w-5 h-5" />}
              title="Nationwide Coverage"
              description="Water quality data for all 50 states, covering community water systems across every county."
              delay={2}
            />
            <FeatureCard
              icon={<BarChart3 className="w-5 h-5" />}
              title="Compare Areas"
              description="Side-by-side comparison of up to 5 ZIP codes. See which areas have cleaner water at a glance."
              delay={3}
            />
          </section>
        )}
      </div>
    </>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  delay,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  delay: number;
}) {
  return (
    <div className={`card p-6 fade-up fade-up-delay-${delay}`}>
      <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="font-semibold text-slate-900 mb-1.5">{title}</h3>
      <p className="text-sm text-slate-500 leading-relaxed">{description}</p>
    </div>
  );
}
