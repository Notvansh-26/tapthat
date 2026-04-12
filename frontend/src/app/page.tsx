"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import SearchBar from "@/components/SearchBar";
import WaterQualityCard, { WaterQualityCardSkeleton } from "@/components/WaterQualityCard";
import { api, ZipCodeReport, StateRisk } from "@/lib/api";
import { Database, Eye, BarChart3, ArrowDown } from "lucide-react";

const USMap = dynamic(() => import("@/components/USMap"), { ssr: false });
const StateMap = dynamic(() => import("@/components/StateMap"), { ssr: false });

export default function Home() {
  const [report, setReport] = useState<ZipCodeReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedState, setSelectedState] = useState<{ code: string; name: string } | null>(null);
  const [stateRisksCache, setStateRisksCache] = useState<StateRisk[] | undefined>(undefined);

  const handleSearch = async (zip: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getZipReport(zip);
      setReport(data);
    } catch (e: any) {
      setError(
        e.message.includes("404")
          ? `No water data found for ZIP ${zip}.`
          : "Something went wrong. Please try again."
      );
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* ── Hero ── */}
      <section
        className="hero-bg relative overflow-hidden"
        style={{ clipPath: "polygon(0 0, 100% 0, 100% 92%, 0 100%)" }}
      >
        {/* Grid texture */}
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)`,
            backgroundSize: "48px 48px",
          }}
        />

        <div className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-36">
          {/* Eyebrow */}
          <div className="flex items-center gap-3 mb-8">
            <span className="h-px w-8 bg-brand-400/60" />
            <span className="font-mono text-[11px] text-brand-300 tracking-[0.2em] uppercase">
              EPA Data · 430K+ Water Systems · All 50 States
            </span>
          </div>

          {/* Headline */}
          <h1 className="font-display text-6xl md:text-7xl lg:text-8xl text-white leading-[1.05] tracking-tight mb-8 max-w-3xl">
            Know what&apos;s in{" "}
            <span className="italic text-brand-300">your tap.</span>
          </h1>

          <p className="text-white/50 text-lg max-w-md mb-10 leading-relaxed font-light">
            Real water quality data for every ZIP code in the US. Violations,
            contaminants, and risk levels — straight from the EPA.
          </p>

          <SearchBar onSearch={handleSearch} loading={loading} variant="hero" />

          {/* Scroll cue */}
          <div className="flex items-center gap-2 mt-12 text-white/30">
            <ArrowDown className="w-4 h-4 animate-bounce" />
            <span className="text-xs font-mono tracking-widest uppercase">
              Explore the map
            </span>
          </div>
        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-slate-50/20 to-transparent pointer-events-none" />
      </section>

      {/* ── Content ── */}
      <div className="max-w-7xl mx-auto px-6 -mt-16 relative z-10">

        {error && (
          <div className="mb-8 p-4 rounded-2xl bg-danger-light border border-danger/20 text-danger-dark text-sm font-medium fade-up">
            {error}
          </div>
        )}

        {loading && (
          <section className="mb-12 fade-up">
            <WaterQualityCardSkeleton />
          </section>
        )}

        {report && !loading && (
          <section className="mb-12 fade-up">
            <WaterQualityCard report={report} />
          </section>
        )}

        {/* Map section */}
        <section className="mb-16">
          {/* Dark mission-control frame */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: "linear-gradient(160deg, #0a1628 0%, #06101e 100%)",
              border: "1px solid rgba(56,189,248,0.1)",
              boxShadow: "0 24px 80px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.04)",
            }}
          >
            {/* Header bar */}
            <div className="flex items-center justify-between px-6 pt-5 pb-4"
              style={{ borderBottom: "1px solid rgba(56,189,248,0.08)" }}>
              <div className="flex items-center gap-3">
                {/* Status dot */}
                <span className="w-2 h-2 rounded-full bg-brand-400"
                  style={{ boxShadow: "0 0 8px rgba(56,189,248,0.8)" }} />
                <p className="font-mono text-[10px] text-brand-400/70 tracking-[0.2em] uppercase">
                  {selectedState ? `State View · ${selectedState.code}` : "National Overview"}
                </p>
              </div>
              <p className="font-mono text-[10px] text-slate-600 tracking-[0.15em] uppercase hidden sm:block">
                {selectedState ? selectedState.name : "Click any state to explore →"}
              </p>
            </div>

            {/* Map */}
            <div className="px-4 pt-4 pb-5">
              {selectedState ? (
                <StateMap
                  stateCode={selectedState.code}
                  stateName={selectedState.name}
                  onBack={() => setSelectedState(null)}
                />
              ) : (
                <USMap
                  onStateSelect={(code, name) => setSelectedState({ code, name })}
                  cachedStateRisks={stateRisksCache}
                  onStateRisksLoaded={setStateRisksCache}
                />
              )}
            </div>
          </div>
        </section>

        {/* Feature strip — only shown before search */}
        {!report && !loading && (
          <section className="grid md:grid-cols-3 gap-4 mb-20">
            <FeatureCard
              icon={<Database className="w-4 h-4" />}
              tag="Data Source"
              title="Direct from EPA"
              body="Sourced from EPA ECHO and SDWIS federal databases. Refreshed weekly."
              delay={1}
            />
            <FeatureCard
              icon={<Eye className="w-4 h-4" />}
              tag="Coverage"
              title="All 50 States"
              body="Community water systems across every county and territory in the US."
              delay={2}
            />
            <FeatureCard
              icon={<BarChart3 className="w-4 h-4" />}
              tag="Feature"
              title="Compare Areas"
              body="Side-by-side comparison of up to 5 ZIP codes to see where water is cleanest."
              delay={3}
            />
          </section>
        )}
      </div>
    </>
  );
}

function FeatureCard({
  icon, tag, title, body, delay,
}: {
  icon: React.ReactNode;
  tag: string;
  title: string;
  body: string;
  delay: number;
}) {
  return (
    <div className={`card p-6 fade-up fade-up-delay-${delay} group`}>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center">
          {icon}
        </div>
        <span className="font-mono text-[10px] text-slate-400 tracking-[0.15em] uppercase">{tag}</span>
      </div>
      <h3 className="font-bold text-slate-900 mb-1.5 text-[15px]">{title}</h3>
      <p className="text-sm text-slate-500 leading-relaxed">{body}</p>
    </div>
  );
}
