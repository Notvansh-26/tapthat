"use client";

import ComparisonView from "@/components/ComparisonView";
import PageHeader from "@/components/PageHeader";

export default function ComparePage() {
  return (
    <>
      <PageHeader
        eyebrow="Compare · ZIP Codes"
        title="Side-by-Side Comparison"
        subtitle="Add up to 5 ZIP codes and compare water systems, violations, and risk levels."
      />
      <div className="max-w-7xl mx-auto px-6 -mt-10 relative z-10 pb-16">
        <ComparisonView />
      </div>
    </>
  );
}
