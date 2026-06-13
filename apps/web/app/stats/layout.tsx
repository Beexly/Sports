import Link from "next/link";
import React from "react";

const NAV = [
  { label: "Overview",  href: "/stats" },
  { label: "Players",   href: "/stats/players" },
  { label: "Teams",     href: "/stats/teams" },
  { label: "Compare",   href: "/stats/compare" },
  { label: "Alerts",    href: "/stats/alerts" },
  { label: "Media",     href: "/stats/media" },
  { label: "Sources",   href: "/stats/sources" },
  { label: "Proof",     href: "/stats/proof" },
  { label: "Ask",       href: "/stats/ask" },
];

export default function StatsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <nav className="border-b border-mineral bg-eclipse/60 sticky top-0 z-20 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl overflow-x-auto">
          <div className="flex min-w-max px-4 sm:px-6 lg:px-8">
            {NAV.map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                className="px-4 py-3 text-sm text-ion-1 hover:text-orbital-cyan border-b-2 border-transparent hover:border-orbital-cyan transition-colors whitespace-nowrap"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </nav>
      {children}
    </>
  );
}
