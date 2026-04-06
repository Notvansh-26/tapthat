"use client";

import ComparisonView from "@/components/ComparisonView";
import { ArrowLeftRight } from "lucide-react";

export default function ComparePage() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <section className="mb-8">
        <div className="inline-flex items-center gap-2 bg-brand-50 text-brand-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-4 border border-brand-100">
          <ArrowLeftRight className="w-3.5 h-3.5" />
          SIDE-BY-SIDE COMPARISON
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
          Compare Water Quality
        </h1>
        <p className="text-slate-500 max-w-lg">
          Add up to 5 Texas ZIP codes and compare water systems, violations,
          and risk levels side by side.
        </p>
      </section>

      <ComparisonView />
    </div>
  );
}
