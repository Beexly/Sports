"use client";
import { useState } from "react";
import Link from "next/link";
import { Menu, X, ChevronDown } from "lucide-react";

type NavLink = { label: string; href: string };
// A section is either a flat list of links (no toggle) or a collapsible group.
type Section = { heading: string; collapsible?: boolean; links: ReadonlyArray<NavLink> };

// Mirrors the desktop top bar: six doors, three with a short grouped list.
const SECTIONS: readonly Section[] = [
  {
    heading: "Start here",
    links: [
      { label: "Board", href: "/board" },
      { label: "Today — Mission Control", href: "/today" },
      { label: "Pricing", href: "/pricing" },
    ],
  },
  {
    heading: "Players",
    collapsible: true,
    links: [
      { label: "Player Lab", href: "/players" },
      { label: "Opportunity", href: "/players?view=opportunity" },
      { label: "Snap Share", href: "/players?view=snaps" },
      { label: "Next Gen", href: "/players?view=nextgen" },
      { label: "Edge Signals", href: "/players?view=edge" },
      { label: "DFS Salaries", href: "/players?view=dfs" },
    ],
  },
  {
    heading: "Intelligence",
    collapsible: true,
    links: [
      { label: "Intelligence Engines", href: "/intelligence/engines" },
      { label: "Proof", href: "/intelligence/engines?engine=proof" },
      { label: "Player Model", href: "/intelligence/engines?engine=player-model" },
      { label: "Expected Points", href: "/intelligence/engines?engine=expected-points" },
      { label: "Mission Control", href: "/today" },
      { label: "Trend Lab", href: "/trends" },
      { label: "Galaxy Twin", href: "/observatory" },
      { label: "Decision Autopsy", href: "/performance/losses" },
      { label: "Parlay MRI", href: "/parlay-mri" },
      { label: "The Academy", href: "/academy" },
      { label: "CLV Tracker", href: "/track" },
      { label: "How we read metrics", href: "/intelligence/metrics" },
    ],
  },
  {
    heading: "Network",
    collapsible: true,
    links: [
      { label: "GSN Studio", href: "/gsn" },
      { label: "Airwave Ledger", href: "/airwave" },
      { label: "The Beat", href: "/the-beat" },
    ],
  },
  {
    heading: "Fantasy",
    collapsible: true,
    links: [
      { label: "Draft Assistant", href: "/fantasy/draft" },
      { label: "Lineup Optimizer", href: "/fantasy/lineup" },
      { label: "Waiver & FAAB", href: "/fantasy/waivers" },
      { label: "Trade Analyzer", href: "/fantasy/trade" },
      { label: "DFS Optimizer", href: "/fantasy/dfs" },
      { label: "Pick'em Edge", href: "/fantasy/props" },
      { label: "Contests", href: "/fantasy/contests" },
      { label: "Connect League", href: "/fantasy/connect" },
    ],
  },
  {
    heading: "Account",
    links: [
      { label: "Pricing", href: "/pricing" },
      { label: "Dashboard", href: "/dashboard" },
    ],
  },
];

function MobileSection({ section, onNavigate }: { section: Section; onNavigate: () => void }) {
  // Collapsible sections start open so everything stays one tap away, but can
  // be folded to keep the panel scannable.
  const [open, setOpen] = useState(true);

  if (!section.collapsible) {
    return (
      <div className="mobile-nav-section">
        <p className="mobile-nav-heading">{section.heading}</p>
        {section.links.map(({ label, href }) => (
          <Link key={href} href={href} onClick={onNavigate} className="mobile-nav-link">
            {label}
          </Link>
        ))}
      </div>
    );
  }

  const panelId = `mnav-${section.heading.toLowerCase()}`;
  return (
    <div className="mobile-nav-section">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={panelId}
        className="mobile-nav-heading flex w-full items-center justify-between"
      >
        <span>{section.heading}</span>
        <ChevronDown
          size={16}
          strokeWidth={1.8}
          aria-hidden
          className={`transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div id={panelId}>
          {section.links.map(({ label, href }) => (
            <Link key={href} href={href} onClick={onNavigate} className="mobile-nav-link">
              {label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

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
            <MobileSection key={section.heading} section={section} onNavigate={() => setOpen(false)} />
          ))}
        </div>
      )}
    </div>
  );
}
