import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Clean blue/white govt-style palette
        tap: {
          50: "#f0f7ff",
          100: "#e0efff",
          200: "#b8dbff",
          300: "#7abfff",
          400: "#3a9fff",
          500: "#0d7fe8",
          600: "#0062c7",
          700: "#004ea1",
          800: "#004285",
          900: "#00376e",
          950: "#002349",
        },
        safe: { DEFAULT: "#10b981", light: "#d1fae5", dark: "#065f46" },
        caution: { DEFAULT: "#f59e0b", light: "#fef3c7", dark: "#92400e" },
        danger: { DEFAULT: "#ef4444", light: "#fee2e2", dark: "#991b1b" },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
