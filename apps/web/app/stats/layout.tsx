"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";

const NAV = [
  { label: "Overview",          href: "/stats" },
  { label: "Players",           href: "/stats/players" },
  { label: "Teams",             href: "/stats/teams" },
  { label: "Compare",           href: "/stats/compare" },
  { label: "Status & Movement", href: "/stats/injuries" },
  { label: "Media",             href: "/stats/media" },
  { label: "Sources",           href: "/stats/sources" },
  { label: "Proof",             href: "/stats/proof" },
  { label: "Ask",               href: "/stats/ask" },
];

function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const isActive =
    href === "/stats" ? pathname === "/stats" : pathname.startsWith(href);

  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={[
        "px-4 py-3 text-sm border-b-2 transition-colors whitespace-nowrap",
        isActive
          ? "border-orbital-cyan text-orbital-cyan"
          : "border-transparent text-ion-1 hover:text-orbital-cyan hover:border-orbital-cyan",
      ].join(" ")}
    >
      {label}
    </Link>
  );
}

export default function StatsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <nav aria-label="Stats sections" className="border-b border-mineral bg-eclipse/60 sticky top-0 z-20 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl overflow-x-auto">
          <div className="flex min-w-max px-4 sm:px-6 lg:px-8">
            {NAV.map(({ label, href }) => (
              <NavLink key={href} href={href} label={label} />
            ))}
          </div>
        </div>
      </nav>
      {children}
    </>
  );
}
