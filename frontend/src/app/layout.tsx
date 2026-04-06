import type { Metadata } from "next";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "TapThat — Texas Water Quality Dashboard",
  description:
    "Know what's in your tap. Real-time water quality data for every ZIP code in Texas.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
        <div className="min-h-screen flex flex-col">
          {/* Header */}
          <header className="glass sticky top-0 z-50 border-b border-tap-200">
            <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-tap-600 flex items-center justify-center">
                  <span className="text-white font-bold text-sm">💧</span>
                </div>
                <div>
                  <h1 className="text-lg font-bold text-tap-900 leading-tight">
                    TapThat
                  </h1>
                  <p className="text-xs text-tap-500">Texas Water Quality</p>
                </div>
              </div>
              <nav className="flex items-center gap-6 text-sm font-medium">
                <a href="/" className="text-tap-700 hover:text-tap-900 transition">
                  Dashboard
                </a>
                <a href="/compare" className="text-tap-700 hover:text-tap-900 transition">
                  Compare
                </a>
                <a href="/about" className="text-tap-700 hover:text-tap-900 transition">
                  About
                </a>
              </nav>
            </div>
          </header>

          {/* Main content */}
          <main className="flex-1">{children}</main>

          {/* Footer */}
          <footer className="border-t border-tap-200 bg-white py-6">
            <div className="max-w-7xl mx-auto px-4 text-center text-sm text-tap-500">
              <p>
                Data sourced from{" "}
                <a href="https://echo.epa.gov" className="underline hover:text-tap-700">
                  EPA ECHO
                </a>{" "}
                &{" "}
                <a href="https://data.epa.gov" className="underline hover:text-tap-700">
                  EPA SDWIS
                </a>
                . Updated weekly.
              </p>
              <p className="mt-1 text-tap-400">
                tapthat.info — Built for transparency, not profit.
              </p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
