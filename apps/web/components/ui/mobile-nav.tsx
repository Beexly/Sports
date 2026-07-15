"use client";
import { useEffect, useRef, useState } from "react";
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
      { label: "Today's Picks", href: "/picks" },
      { label: "Today's Board", href: "/board" },
      { label: "The House: NFL hub", href: "/house" },
      { label: "Mission Control", href: "/today" },
      { label: "Daily Briefing", href: "/gsn" },
    ],
  },
  {
    heading: "Players",
    links: [{ label: "Player Lab: every player, every signal", href: "/players" }],
  },
  {
    heading: "Intelligence",
    collapsible: true,
    links: [
      { label: "Intelligence Engines", href: "/intelligence/engines" },
      { label: "Galaxy Twin: market map", href: "/observatory" },
    ],
  },
  {
    heading: "Fantasy & Daily",
    collapsible: true,
    links: [
      { label: "All fantasy & daily tools", href: "/fantasy" },
      { label: "Draft Assistant", href: "/fantasy/draft" },
      { label: "Best Ball", href: "/fantasy/bestball" },
      { label: "Start-Sit Helper", href: "/fantasy/lineup" },
      { label: "Waiver & FAAB", href: "/fantasy/waivers" },
      { label: "Trade Analyzer", href: "/fantasy/trade" },
      { label: "All-in-One Optimizer", href: "/optimizer" },
      { label: "DFS Suite", href: "/fantasy/dfs" },
      { label: "Pick'em Edge", href: "/fantasy/props" },
    ],
  },
  {
    heading: "GSN",
    collapsible: true,
    links: [
      { label: "The Beat: attributed signal ledger", href: "/the-beat" },
      { label: "The Academy: learn the signal", href: "/academy" },
    ],
  },
  {
    heading: "Proof",
    collapsible: true,
    links: [
      { label: "The Proof Room", href: "/calibration" },
      { label: "Calibration Report", href: "/performance" },
      { label: "Closing Line Value", href: "/clv" },
      { label: "Trust Ledger: pick receipts", href: "/ledger" },
      { label: "Proof of Record", href: "/proof" },
      { label: "FABLE Evidence Lab", href: "/fable" },
      { label: "Accountability", href: "/accountability" },
      { label: "How we read metrics", href: "/intelligence/metrics" },
      { label: "CLV Tracker: track your bets", href: "/track" },
    ],
  },
  {
    heading: "More",
    links: [
      { label: "Sign in", href: "/auth/signin" },
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
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  // Escape closes the menu and returns focus to the trigger (WCAG 2.1.1/2.4.3).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="mobile-nav">
      <button
        ref={triggerRef}
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
