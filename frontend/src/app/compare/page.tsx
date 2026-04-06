"use client";

import ComparisonView from "@/components/ComparisonView";
import { ArrowLeftRight } from "lucide-react";

export default function ComparePage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <section className="text-center mb-8">
        <div className="inline-flex items-center gap-2 bg-tap-100 text-tap-700 text-sm font-medium px-4 py-1.5 rounded-full mb-4">
          <ArrowLeftRight className="w-4 h-4" />
          Side-by-Side Comparison
        </div>
        <h1 className="text-3xl font-bold text-tap-950 mb-2">
          Compare Water Quality
        </h1>
        <p className="text-tap-500 max-w-lg mx-auto">
          Add up to 5 Texas ZIP codes and compare water systems, contaminants,
          and risk levels side by side.
        </p>
      </section>

      <ComparisonView />
    </div>
  );
}
