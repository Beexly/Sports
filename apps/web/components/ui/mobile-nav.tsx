"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Menu, X, ChevronDown } from "lucide-react";

type NavLink = { label: string; href: string };
// A section is either a flat list of links (no toggle) or a collapsible group.
type Section = { heading: string; collapsible?: boolean; links: ReadonlyArray<NavLink> };

// Mirrors the desktop Decision OS IA: Edge · My Gameplan · Learn · Proof (the logo carries Home/Today).
// Every prior surface is re-homed here, none deleted. Public labels only (Galaxy Twin → Live Market Map).
const SECTIONS: readonly Section[] = [
  {
    heading: "Today",
    links: [{ label: "What needs attention today", href: "/" }],
  },
  {
    heading: "Edge",
    collapsible: true,
    links: [
      { label: "Today's Board", href: "/board" },
      { label: "The House: NFL hub", href: "/house" },
      { label: "Players Lab", href: "/players" },
      { label: "Live Market Map", href: "/observatory" },
      { label: "Props & Pick'em", href: "/fantasy/props" },
      { label: "Mission Control", href: "/today" },
      { label: "Daily Briefing", href: "/gsn" },
    ],
  },
  {
    heading: "My Gameplan",
    collapsible: true,
    links: [
      { label: "All fantasy tools", href: "/fantasy" },
      { label: "Draft Assistant", href: "/fantasy/draft" },
      { label: "Start-Sit Helper", href: "/fantasy/lineup" },
      { label: "Waiver & FAAB", href: "/fantasy/waivers" },
      { label: "Trade Analyzer", href: "/fantasy/trade" },
      { label: "Best Ball", href: "/fantasy/bestball" },
      { label: "DFS Suite", href: "/fantasy/dfs" },
      { label: "All-in-One Optimizer", href: "/optimizer" },
    ],
  },
  {
    heading: "Learn",
    collapsible: true,
    links: [
      { label: "How we read it", href: "/intelligence" },
      { label: "Every engine", href: "/intelligence/engines" },
      { label: "How we read metrics", href: "/intelligence/metrics" },
      { label: "Stories: The Beat", href: "/the-beat" },
      { label: "The Studio", href: "/fantasy/studio" },
      { label: "The Academy", href: "/academy" },
    ],
  },
  {
    heading: "Proof",
    collapsible: true,
    links: [
      { label: "Track record", href: "/calibration" },
      { label: "Calibration report", href: "/performance" },
      { label: "Closing line value", href: "/clv" },
      { label: "Trust ledger", href: "/ledger" },
      { label: "Proof of record", href: "/proof" },
      { label: "Accountability", href: "/accountability" },
      { label: "What we learned", href: "/proof/memory" },
      { label: "CLV Tracker: track your bets", href: "/track" },
    ],
  },
  {
    heading: "More",
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
