"use client";
import { useState } from "react";
import Link from "next/link";
import { Menu, X, ChevronDown } from "lucide-react";

type NavLink = { label: string; href: string };
// A section is either a flat list of links (no toggle) or a collapsible group.
type Section = { heading: string; collapsible?: boolean; links: ReadonlyArray<NavLink> };

// Mirrors the desktop IA exactly: Board, Players (one lab), Intelligence,
// Fantasy & Daily, plus the standalone Beat and Proof doors. Players' deep
// views are in-page lenses (not nav items), so they are not duplicated here.
// Proof is its own door (the /calibration hub gathers every proof surface).
// Internal surfaces (Studio, Airwave) are not linked.
const SECTIONS: readonly Section[] = [
  {
    heading: "Board",
    collapsible: true,
    links: [
      { label: "Today's Board", href: "/board" },
      { label: "The House — NFL hub", href: "/house" },
      { label: "Mission Control", href: "/today" },
      { label: "Daily Briefing", href: "/gsn" },
    ],
  },
  {
    heading: "Players",
    links: [{ label: "Player Lab — every player, every signal", href: "/players" }],
  },
  {
    heading: "Intelligence",
    collapsible: true,
    links: [
      { label: "Intelligence Engines", href: "/intelligence/engines" },
      { label: "Galaxy Twin — Market map", href: "/observatory" },
      { label: "How we read metrics", href: "/intelligence/metrics" },
      { label: "Learn the Signal", href: "/academy" },
    ],
  },
  {
    heading: "Fantasy & Daily",
    collapsible: true,
    links: [
      { label: "Draft Assistant", href: "/fantasy/draft" },
      { label: "Start-Sit Helper", href: "/fantasy/lineup" },
      { label: "Waiver & FAAB", href: "/fantasy/waivers" },
      { label: "Trade Analyzer", href: "/fantasy/trade" },
      { label: "All-in-One Optimizer", href: "/optimizer" },
      { label: "DFS Suite", href: "/fantasy/dfs" },
      { label: "Pick'em Edge", href: "/fantasy/props" },
    ],
  },
  {
    heading: "Proof",
    collapsible: true,
    links: [
      { label: "The Proof Room", href: "/calibration" },
      { label: "Calibration Report", href: "/performance" },
      { label: "Closing Line Value", href: "/clv" },
      { label: "Trust Ledger — Pick receipts", href: "/ledger" },
      { label: "Proof of Record", href: "/proof" },
      { label: "Accountability", href: "/accountability" },
      { label: "CLV Tracker — Track your bets", href: "/track" },
    ],
  },
  {
    heading: "More",
    links: [
      { label: "The Beat — Media intelligence", href: "/the-beat" },
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
