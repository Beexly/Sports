"use client";
import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

const LINKS = [
  { label: "The Network", href: "/intelligence" },
  { label: "Today's Board", href: "/board" },
  { label: "Fantasy Intelligence", href: "/fantasy" },
  { label: "Market Gravity", href: "/market-gravity" },
  { label: "Research Brain", href: "/brain" },
  { label: "Rumor Radar", href: "/rumor-radar" },
  { label: "Edge Map", href: "/observatory" },
  { label: "Journal", href: "/journal" },
  { label: "Methodology", href: "/methodology" },
  { label: "Pricing", href: "/pricing" },
  { label: "Developer & API", href: "/developer" },
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
