"use client";

import { useState } from "react";
import { Loader2, ArrowRight } from "lucide-react";

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
  placeholder = "Enter ZIP code",
}: SearchBarProps) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [focused, setFocused] = useState(false);

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
    <form onSubmit={handleSubmit} className={isHero ? "w-full max-w-md" : "w-full max-w-sm"}>
      <div
        className={`relative flex items-center rounded-2xl transition-all duration-300 ${
          isHero
            ? `bg-white/10 border ${focused ? "border-white/50 shadow-glow" : "border-white/20"} backdrop-blur-sm`
            : `bg-white border ${focused ? "border-brand-400 shadow-[0_0_0_3px_rgba(14,165,233,0.12)]" : "border-slate-200"} shadow-card`
        }`}
      >
        {/* Prompt char — hero only */}
        {isHero && (
          <span className={`pl-5 font-mono text-lg select-none transition-colors ${focused ? "text-brand-300" : "text-white/30"}`}>
            _
          </span>
        )}

        <input
          type="text"
          inputMode="numeric"
          value={value}
          onChange={(e) => {
            setValue(e.target.value.replace(/\D/g, "").slice(0, 5));
            if (error) setError("");
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          className={`flex-1 bg-transparent outline-none font-mono tracking-widest
            ${isHero
              ? "pl-3 pr-4 py-4 text-white placeholder:text-white/30 text-lg"
              : "pl-4 pr-4 py-3 text-slate-900 placeholder:text-slate-400 text-sm"
            }`}
        />

        <button
          type="submit"
          disabled={loading}
          className={`mr-2 flex items-center gap-2 font-semibold rounded-xl transition-all duration-150
            disabled:opacity-50 ${
            isHero
              ? "bg-white text-brand-700 hover:bg-brand-50 px-5 py-2.5 text-sm"
              : "bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 text-sm"
          }`}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              {isHero ? "Search" : "Go"}
              <ArrowRight className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </div>

      {error && (
        <p className={`mt-2 text-xs font-medium pl-1 ${isHero ? "text-red-300" : "text-red-500"}`}>
          {error}
        </p>
      )}
    </form>
  );
}
