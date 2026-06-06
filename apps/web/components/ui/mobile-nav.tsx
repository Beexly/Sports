"use client";
import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

const LINKS = [
  { label: "Mission Control", href: "/today" },
  { label: "Today's Board", href: "/board" },
  { label: "Edge Map", href: "/observatory" },
  { label: "GSN", href: "/gsn" },
  { label: "Methodology", href: "/methodology" },
  { label: "Intelligence", href: "/intelligence" },
  { label: "The Beat", href: "/the-beat" },
  { label: "NFLverse Pulse", href: "/nflverse" },
  { label: "Production Lab", href: "/players" },
  { label: "Next Gen Stats", href: "/players/nextgen" },
  { label: "Edge Signals", href: "/players/edge" },
  { label: "Data Sourcing", href: "/data" },
  { label: "Parlay MRI", href: "/parlay-mri" },
  { label: "Ledger", href: "/ledger" },
  { label: "CLV Tracker", href: "/track" },
  { label: "Academy", href: "/academy" },
  { label: "Fantasy", href: "/fantasy" },
  { label: "Fantasy Baseline", href: "/fantasy/baseline" },
  { label: "Connect League", href: "/fantasy/connect" },
  { label: "GM Autopilot", href: "/fantasy/autopilot" },
  { label: "League Twin", href: "/fantasy/league-twin" },
  { label: "GM Ledger", href: "/fantasy/gm-ledger" },
  { label: "GM Academy", href: "/fantasy/academy" },
  { label: "DFS Optimizer", href: "/fantasy/dfs" },
  { label: "Pick'em Edge", href: "/fantasy/props" },
  { label: "Trade Analyzer", href: "/fantasy/trade" },
  { label: "Scheme Intel", href: "/fantasy/scheme" },
  { label: "Contests", href: "/fantasy/contests" },
  { label: "Galaxy Studios", href: "/fantasy/studio" },
  { label: "Cipher", href: "/cipher" },
  { label: "Pricing", href: "/pricing" },
  { label: "Dashboard", href: "/dashboard" },
] as const;

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
          {LINKS.map(({ label, href }) => (
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
      )}
    </div>
  );
}
