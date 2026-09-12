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
      { label: "The board", href: "/board" },
      { label: "League slates", href: "/slate" },
      { label: "Today's picks", href: "/picks" },
      { label: "Our record", href: "/calibration" },
      { label: "Bankroll", href: "/bankroll" },
      { label: "NFL hub", href: "/house" },
    ],
  },
  {
    heading: "Players",
    links: [{ label: "Player Lab", href: "/players" }],
  },
  {
    heading: "Fantasy & Daily",
    collapsible: true,
    links: [
      { label: "All tools", href: "/fantasy" },
      { label: "Draft Assistant", href: "/fantasy/draft" },
      { label: "Start-Sit", href: "/fantasy/lineup" },
      { label: "Waivers", href: "/fantasy/waivers" },
      { label: "Trades", href: "/fantasy/trade" },
      { label: "DFS Optimizer", href: "/fantasy/dfs" },
      { label: "Pick'em", href: "/fantasy/props" },
      { label: "Best ball", href: "/fantasy/bestball" },
      { label: "NBA slate", href: "/fantasy/nba" },
      { label: "Optimizer", href: "/optimizer" },
      { label: "Connect league", href: "/fantasy/connect" },
    ],
  },
  {
    heading: "GSN",
    collapsible: true,
    links: [
      { label: "The Beat", href: "/the-beat" },
    ],
  },
  {
    heading: "More",
    links: [
      { label: "Verify a receipt", href: "/verify" },
      { label: "Plans", href: "/pricing" },
      { label: "Free tools", href: "/tools" },
      { label: "How we make money", href: "/how-we-make-money" },
      { label: "Sign in", href: "/auth/signin" },
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
        className="mobile-nav-heading flex min-h-11 w-full items-center justify-between"
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

// Focusable elements considered part of the trap — links and enabled buttons.
const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled])';

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  // On open: move focus into the panel (WCAG 2.4.3) so keyboard/AT users land
  // directly on the menu instead of past it.
  useEffect(() => {
    if (!open) return;
    const first = panelRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    first?.focus();
  }, [open]);

  // Escape closes the menu and returns focus to the trigger (WCAG 2.1.1/2.4.3).
  // Tab/Shift+Tab is trapped inside the panel while it's open so keyboard
  // focus never silently leaks into the page behind the flyout.
  // Clicking outside the panel/trigger also dismisses it.
  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
        return;
      }
      if (e.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusables = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      if (focusables.length === 0) return;
      const first = focusables[0]!;
      const last = focusables[focusables.length - 1]!;
      const active = document.activeElement;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    const onPointerDown = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node | null)) {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [open]);

  return (
    <div className="mobile-nav" ref={containerRef}>
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
        <div id="mobile-nav-panel" className="mobile-nav-panel" ref={panelRef}>
          {SECTIONS.map((section) => (
            <MobileSection key={section.heading} section={section} onNavigate={() => setOpen(false)} />
          ))}
        </div>
      )}
    </div>
  );
}
