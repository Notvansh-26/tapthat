"use client";

import { useState } from "react";
import { Search } from "lucide-react";

interface SearchBarProps {
  onSearch: (zip: string) => void;
  placeholder?: string;
}

export default function SearchBar({
  onSearch,
  placeholder = "Enter a Texas ZIP code...",
}: SearchBarProps) {
  const [value, setValue] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const zip = value.trim();
    if (/^\d{5}$/.test(zip)) {
      onSearch(zip);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-tap-400" />
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value.replace(/\D/g, "").slice(0, 5))}
          placeholder={placeholder}
          className="w-full pl-12 pr-24 py-3.5 rounded-2xl bg-white border border-tap-200
                     text-tap-900 text-lg font-medium shadow-sm
                     focus:outline-none focus:ring-2 focus:ring-tap-400 focus:border-transparent
                     placeholder:text-tap-300 transition-all"
        />
        <button
          type="submit"
          className="absolute right-2 top-1/2 -translate-y-1/2
                     bg-tap-600 hover:bg-tap-700 text-white font-semibold
                     px-5 py-2 rounded-xl transition-colors text-sm"
        >
          Search
        </button>
      </div>
    </form>
  );
}
