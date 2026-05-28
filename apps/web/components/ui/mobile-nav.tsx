"use client";
import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { MOBILE_NAV_ROUTES } from "@/lib/routes-catalog";

const LINKS = [
  ...MOBILE_NAV_ROUTES.map((r) => ({
    label: r.mobileLabel ?? r.label,
    href: r.path,
  })),
  { label: "Dashboard", href: "/dashboard" },
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
