"use client";
import { useState } from "react";
import Link from "next/link";

const LINKS = [
  { label: "Picks", href: "/picks" },
  { label: "Performance", href: "/performance" },
  { label: "Pricing", href: "/pricing" },
  { label: "Blog", href: "/blog" },
] as const;

export function MobileNav() {
  const [open, setOpen] = useState(false);
  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="rounded-lg border border-gray-800 px-3 py-1 text-xs text-gray-300"
        aria-expanded={open}
        aria-controls="mobile-nav-panel"
      >
        Menu
      </button>
      {open && (
        <div id="mobile-nav-panel" className="absolute right-2 top-12 z-30 w-56 rounded-xl border border-gray-800 bg-gray-950 p-2 shadow-xl">
          {LINKS.map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-2 text-sm text-gray-300 hover:bg-gray-900"
            >
              {label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
