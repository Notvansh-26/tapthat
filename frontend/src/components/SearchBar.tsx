"use client";

import { useState } from "react";
import { Search, Loader2 } from "lucide-react";

interface SearchBarProps {
  onSearch: (zip: string) => void;
  loading?: boolean;
  variant?: "hero" | "compact";
  placeholder?: string;
}

export default function SearchBar({
  onSearch,
  loading = false,
  variant = "hero",
  placeholder = "Enter a Texas ZIP code",
}: SearchBarProps) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const zip = value.trim();
    if (!/^\d{5}$/.test(zip)) {
      setError("Enter a valid 5-digit ZIP code");
      return;
    }
    setError("");
    onSearch(zip);
  };

  const isHero = variant === "hero";

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-lg">
      <div className="relative group">
        <div
          className={`relative flex items-center rounded-2xl border bg-white overflow-hidden transition-all
            ${isHero
              ? "shadow-elevated border-white/30 focus-within:shadow-[0_10px_50px_rgba(14,165,233,0.15)]"
              : "shadow-soft border-slate-200 focus-within:border-brand-300 focus-within:shadow-card"
            }`}
        >
          <Search
            className={`absolute left-4 w-5 h-5 text-slate-300 transition-colors group-focus-within:text-brand-500`}
          />
          <input
            type="text"
            inputMode="numeric"
            value={value}
            onChange={(e) => {
              setValue(e.target.value.replace(/\D/g, "").slice(0, 5));
              if (error) setError("");
            }}
            placeholder={placeholder}
            className={`w-full bg-transparent outline-none placeholder:text-slate-300
              ${isHero ? "pl-12 pr-28 py-4 text-lg" : "pl-11 pr-24 py-3 text-base"}
              font-medium text-slate-900`}
          />
          <button
            type="submit"
            disabled={loading}
            className={`absolute right-2 flex items-center gap-2 font-semibold rounded-xl
              bg-brand-600 hover:bg-brand-700 active:bg-brand-800
              disabled:bg-brand-300 text-white transition-all
              ${isHero ? "px-5 py-2.5 text-sm" : "px-4 py-2 text-sm"}`}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Search"
            )}
          </button>
        </div>
      </div>
      {error && (
        <p className="mt-2 text-sm text-red-500 font-medium pl-1">{error}</p>
      )}
    </form>
  );
}
