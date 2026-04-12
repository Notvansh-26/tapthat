"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/systems", label: "Systems" },
  { href: "/compare", label: "Compare" },
  { href: "/about", label: "About" },
];

function TapThatLogo() {
  return (
    <Link href="/" className="flex items-center gap-3 group select-none">
      {/* Mark: geometric water drop with inner facet */}
      <div className="relative w-9 h-9">
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none" className="drop-shadow-sm">
          {/* Outer drop */}
          <path
            d="M18 3 C18 3 7 16 7 22 a11 11 0 0 0 22 0 C29 16 18 3 18 3 Z"
            fill="url(#dropGrad)"
          />
          {/* Inner facet highlight */}
          <path
            d="M18 8 C18 8 12 17 12 21 a6 6 0 0 0 12 0 C24 17 18 8 18 8 Z"
            fill="white"
            opacity="0.18"
          />
          {/* Shine dot */}
          <circle cx="14" cy="19" r="2.5" fill="white" opacity="0.3" />
          <defs>
            <linearGradient id="dropGrad" x1="7" y1="3" x2="29" y2="33" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#0369a1" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      {/* Wordmark */}
      <div className="flex items-baseline gap-[1px]">
        <span className="text-[17px] font-light text-slate-700 tracking-tight">Tap</span>
        <span className="text-[17px] font-bold text-slate-900 tracking-tight">That</span>
      </div>
    </Link>
  );
}

export default function NavBar() {
  const pathname = usePathname();

  return (
    <nav className="glass sticky top-0 z-50 border-b border-slate-200/60">
      <div className="max-w-7xl mx-auto px-6 h-[60px] flex items-center justify-between">
        <TapThatLogo />

        <div className="flex items-center gap-1">
          {NAV_LINKS.map(({ href, label }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`relative px-3.5 py-2 text-[13.5px] font-medium tracking-wide rounded-xl transition-all duration-150 ${
                  active
                    ? "text-brand-700 bg-brand-50"
                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-100/80"
                }`}
              >
                {label}
                {active && (
                  <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-brand-500" />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
