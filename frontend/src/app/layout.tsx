import type { Metadata } from "next";
import NavBar from "@/components/NavBar";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "TapThat — US Water Quality Dashboard",
  description:
    "Know what's in your tap. Real-time water quality data for every ZIP code in the United States.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          crossOrigin=""
        />
      </head>
      <body>
        <div className="min-h-screen flex flex-col bg-slate-50">
          <NavBar />
          <main className="flex-1">{children}</main>
          <footer className="border-t border-slate-200 bg-white py-10 mt-auto">
            <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <svg width="22" height="22" viewBox="0 0 36 36" fill="none">
                  <path d="M18 3 C18 3 7 16 7 22 a11 11 0 0 0 22 0 C29 16 18 3 18 3 Z" fill="url(#footerGrad)" />
                  <defs>
                    <linearGradient id="footerGrad" x1="7" y1="3" x2="29" y2="33" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#38bdf8" />
                      <stop offset="100%" stopColor="#0369a1" />
                    </linearGradient>
                  </defs>
                </svg>
                <span className="font-semibold text-slate-700 text-sm">TapThat</span>
              </div>
              <p className="text-sm text-slate-400">
                Data from{" "}
                <a href="https://echo.epa.gov" className="text-slate-500 hover:text-brand-600 underline underline-offset-2 transition-colors">
                  EPA ECHO
                </a>
                {" & "}
                <a href="https://data.epa.gov" className="text-slate-500 hover:text-brand-600 underline underline-offset-2 transition-colors">
                  SDWIS
                </a>
                {" · Updated weekly"}
              </p>
              <p className="text-xs text-slate-300 font-mono">tapthat.info</p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
