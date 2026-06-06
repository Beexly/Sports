"use client";
import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

type Section = { heading: string; links: ReadonlyArray<{ label: string; href: string }> };

const SECTIONS: readonly Section[] = [
  {
    heading: "Start here",
    links: [
      { label: "Board", href: "/board" },
      { label: "Optimizer", href: "/optimizer" },
      { label: "Mission Control", href: "/today" },
    ],
  },
  {
    heading: "Players",
    links: [
      { label: "Production Lab", href: "/players" },
      { label: "Snap Share", href: "/players/snaps" },
      { label: "Next Gen Stats", href: "/players/nextgen" },
      { label: "Pressure & Coverage", href: "/players/trenches" },
      { label: "Combine", href: "/players/combine" },
      { label: "Total QBR", href: "/players/qbr" },
      { label: "Edge Signals", href: "/players/edge" },
      { label: "Injury Report", href: "/players/injuries" },
      { label: "Market Signal", href: "/players/market" },
      { label: "DFS Salaries", href: "/players/dfs" },
      { label: "Game Weather", href: "/weather" },
      { label: "NFLverse Pulse", href: "/nflverse" },
    ],
  },
  {
    heading: "Fantasy",
    links: [
      { label: "Fantasy Home", href: "/fantasy" },
      { label: "Connect League", href: "/fantasy/connect" },
      { label: "Draft Assistant", href: "/fantasy/draft" },
      { label: "Waiver & FAAB", href: "/fantasy/waivers" },
      { label: "Lineup Optimizer", href: "/fantasy/lineup" },
      { label: "DFS Optimizer", href: "/fantasy/dfs" },
      { label: "Pick'em Edge", href: "/fantasy/props" },
      { label: "Trade Analyzer", href: "/fantasy/trade" },
      { label: "Contests", href: "/fantasy/contests" },
      { label: "Galaxy Studios", href: "/fantasy/studio" },
      { label: "Baseline Map", href: "/fantasy/baseline" },
    ],
  },
  {
    heading: "Intelligence",
    links: [
      { label: "Inside the Signal", href: "/intelligence" },
      { label: "Trend Lab", href: "/trends" },
      { label: "Edge Map", href: "/observatory" },
      { label: "The Beat", href: "/the-beat" },
      { label: "GSN", href: "/gsn" },
      { label: "Parlay MRI", href: "/parlay-mri" },
      { label: "CLV Tracker", href: "/track" },
      { label: "Data Sourcing", href: "/data" },
      { label: "NHL xG", href: "/nhl" },
      { label: "Human Performance", href: "/human" },
      { label: "Cipher", href: "/cipher" },
    ],
  },
  {
    heading: "Account",
    links: [
      { label: "Methodology", href: "/methodology" },
      { label: "Pricing", href: "/pricing" },
      { label: "Dashboard", href: "/dashboard" },
    ],
  },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);
  return (
    <div className="mobile-nav">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="mobile-nav-trigger"
        aria-expanded={open}
        aria-controls="mobile-nav-panel"
        aria-label={open ? "Close menu" : "Open menu"}
      >
        {open ? <X size={18} strokeWidth={1.8} /> : <Menu size={18} strokeWidth={1.8} />}
      </button>
      {open && (
        <div id="mobile-nav-panel" className="mobile-nav-panel">
          {SECTIONS.map((section) => (
            <div key={section.heading} className="mobile-nav-section">
              <p className="mobile-nav-heading">{section.heading}</p>
              {section.links.map(({ label, href }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className="mobile-nav-link"
                >
                  {label}
                </Link>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
