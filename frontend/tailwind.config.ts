import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#f0f9ff",
          100: "#e0f2fe",
          200: "#bae6fd",
          300: "#7dd3fc",
          400: "#38bdf8",
          500: "#0ea5e9",
          600: "#0284c7",
          700: "#0369a1",
          800: "#075985",
          900: "#0c4a6e",
          950: "#082f49",
        },
        navy: {
          DEFAULT: "#0a1628",
          mid: "#0f2040",
          light: "#1a3555",
        },
        safe: {
          DEFAULT: "#10b981",
          light: "#ecfdf5",
          medium: "#6ee7b7",
          dark: "#065f46",
        },
        caution: {
          DEFAULT: "#f59e0b",
          light: "#fffbeb",
          medium: "#fcd34d",
          dark: "#92400e",
        },
        danger: {
          DEFAULT: "#ef4444",
          light: "#fef2f2",
          medium: "#fca5a5",
          dark: "#991b1b",
        },
      },
      fontFamily: {
        sans:    ["Outfit", "system-ui", "-apple-system", "sans-serif"],
        display: ["Instrument Serif", "Georgia", "serif"],
        mono:    ["JetBrains Mono", "monospace"],
      },
      boxShadow: {
        soft:     "0 2px 15px rgba(0,0,0,0.04)",
        card:     "0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.06)",
        elevated: "0 8px 40px rgba(0,0,0,0.12)",
        glow:     "0 0 40px rgba(14,165,233,0.25)",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
      },
    },
  },
  plugins: [],
};

export default config;
