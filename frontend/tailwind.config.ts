import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0f9ff",
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
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      boxShadow: {
        soft: "0 2px 15px rgba(0, 0, 0, 0.04)",
        card: "0 4px 20px rgba(0, 0, 0, 0.06)",
        elevated: "0 10px 40px rgba(0, 0, 0, 0.1)",
      },
    },
  },
  plugins: [],
};

export default config;
