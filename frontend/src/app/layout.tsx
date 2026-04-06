import type { Metadata } from "next";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "TapThat — US Water Quality Dashboard",
  description:
    "Know what's in your tap. Real-time water quality data for every ZIP code in the United States.",
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
          {/* Nav */}
          <nav className="glass sticky top-0 z-50 border-b border-slate-200/50">
            <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
              <a href="/" className="flex items-center gap-2.5 group">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M8 1C8 1 3 7 3 10a5 5 0 0010 0c0-3-5-9-5-9z" fill="white" fillOpacity="0.9"/>
                  </svg>
                </div>
                <span className="font-bold text-slate-900 text-[15px] tracking-tight">
                  TapThat
                </span>
              </a>
              <div className="flex items-center gap-1">
                <NavLink href="/" label="Dashboard" />
                <NavLink href="/compare" label="Compare" />
                <NavLink href="/about" label="About" />
              </div>
            </div>
          </nav>

          <main className="flex-1">{children}</main>

          <footer className="border-t border-slate-200 bg-white py-8 mt-auto">
            <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-400">
              <p>
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
              <p className="text-slate-300">
                tapthat.info · Built for transparency
              </p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all"
    >
      {label}
    </a>
  );
}
