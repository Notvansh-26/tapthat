"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import SearchBar from "@/components/SearchBar";
import WaterQualityCard from "@/components/WaterQualityCard";
import RiskBadge from "@/components/RiskBadge";
import { api, ZipCodeReport } from "@/lib/api";
import { Droplets, MapPin, TrendingDown } from "lucide-react";

// Leaflet must be loaded client-side only
const TexasMap = dynamic(() => import("@/components/TexasMap"), { ssr: false });

export default function Home() {
  const [report, setReport] = useState<ZipCodeReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (zip: string) => {
    setLoading(true);
    setError(null);
    setSearched(true);
    try {
      const data = await api.getZipReport(zip);
      setReport(data);
    } catch (e: any) {
      setError(
        e.message.includes("404")
          ? `No water data found for ZIP ${zip}. Try another Texas ZIP code.`
          : "Something went wrong. Please try again."
      );
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Hero section — like the main weather display */}
      <section className="text-center mb-10">
        <div className="inline-flex items-center gap-2 bg-tap-100 text-tap-700 text-sm font-medium px-4 py-1.5 rounded-full mb-4">
          <Droplets className="w-4 h-4" />
          Texas Water Quality Dashboard
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-tap-950 mb-3">
          Know what&apos;s in your tap.
        </h1>
        <p className="text-tap-500 text-lg max-w-xl mx-auto mb-8">
          Enter your ZIP code to see water quality data, violations, and
          contaminant levels for your area.
        </p>

        <div className="flex justify-center">
          <SearchBar onSearch={handleSearch} />
        </div>
      </section>

      {/* Loading state */}
      {loading && (
        <div className="flex justify-center py-12">
          <div className="flex items-center gap-3 text-tap-500">
            <div className="w-6 h-6 border-2 border-tap-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-lg">Analyzing water quality...</span>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="max-w-md mx-auto bg-danger-light text-danger-dark rounded-2xl p-4 text-center">
          {error}
        </div>
      )}

      {/* Results */}
      {report && !loading && (
        <section className="mb-10">
          <WaterQualityCard report={report} />
        </section>
      )}

      {/* Map section */}
      <section className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="w-5 h-5 text-tap-600" />
          <h2 className="text-xl font-semibold text-tap-900">
            Texas Water Systems Map
          </h2>
        </div>
        <TexasMap />
        <div className="flex items-center gap-6 justify-center mt-4 text-sm text-tap-500">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-safe" /> Safe
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-caution" /> Caution
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-danger" /> At Risk
          </span>
        </div>
      </section>

      {/* Info cards — like weather app "details" section */}
      {!searched && (
        <section className="grid md:grid-cols-3 gap-6">
          <InfoCard
            icon={<Droplets className="w-6 h-6 text-tap-500" />}
            title="Real EPA Data"
            description="Sourced directly from EPA's ECHO and SDWIS databases. Updated weekly."
          />
          <InfoCard
            icon={<MapPin className="w-6 h-6 text-tap-500" />}
            title="Every TX ZIP Code"
            description="Coverage for all community water systems across the state of Texas."
          />
          <InfoCard
            icon={<TrendingDown className="w-6 h-6 text-tap-500" />}
            title="Track Trends"
            description="See violation history and contaminant levels over time for any system."
          />
        </section>
      )}
    </div>
  );
}

function InfoCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-6 border border-tap-100 shadow-sm card-hover">
      <div className="mb-3">{icon}</div>
      <h3 className="font-semibold text-tap-900 mb-1">{title}</h3>
      <p className="text-sm text-tap-500">{description}</p>
    </div>
  );
}
