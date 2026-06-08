"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * IntelligenceSubnav — the shared "one system" tab bar.
 *
 * Folds the standalone Intelligence surfaces (Trend Lab, Edge Map, Airwave,
 * CLV Tracker, The Beat) into a single Intelligence system: a persistent,
 * horizontally-scrollable row of pills that pins directly under the global
 * <Nav/> (which is in-flow, sticky, 64px tall). Rendered immediately AFTER
 * <Nav/> on every light Intelligence page so the section reads as one system
 * with tabs, not a dumped list.
 *
 * Pure, deterministic client component — no data fetching, no time/random
 * sources. Active state is derived solely from usePathname() (which returns the
 * path WITHOUT the query string).
 *
 * Public surfaces only. The engine browser and methodology/metrics are
 * founder-gated and intentionally absent here.
 *
 * Accessibility: every item is a real <Link> (keyboard reachable); the active
 * item is distinguishable by MORE than hue — it carries font-semibold weight, a
 * filled background, and an inset cyan ring, plus aria-current="page". The row
 * scrolls horizontally on narrow screens (overflow-x-auto).
 */

interface SubnavItem {
  readonly label: string;
  readonly href: string;
  /** How the active state is computed for this item. */
  readonly match: "exact" | "startsWith";
}

const ITEMS: readonly SubnavItem[] = [
  { label: "Overview", href: "/intelligence", match: "exact" },
  { label: "GSE Rating", href: "/intelligence/rating", match: "startsWith" },
  { label: "Trends", href: "/trends", match: "startsWith" },
  { label: "Edge Map", href: "/observatory", match: "startsWith" },
  { label: "Airwave", href: "/airwave", match: "startsWith" },
  { label: "CLV Tracker", href: "/track", match: "startsWith" },
  { label: "The Beat", href: "/the-beat", match: "startsWith" },
];

function isActive(item: SubnavItem, pathname: string): boolean {
  if (item.match === "exact") return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function IntelligenceSubnav(): JSX.Element {
  const pathname = usePathname() ?? "";

  return (
    <nav
      aria-label="Intelligence"
      className="sticky top-[60px] z-40 border-b border-white/10 bg-[rgba(7,10,17,0.85)] backdrop-blur supports-[backdrop-filter]:bg-[rgba(7,10,17,0.7)] sm:top-16"
    >
      <div className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-4 py-2.5 text-sm">
        <span className="mr-2 hidden font-mono text-[10px] uppercase tracking-wider text-ink-500 sm:inline">
          Intelligence
        </span>
        {ITEMS.map((item) => {
          const active = isActive(item, pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={
                active
                  ? "whitespace-nowrap rounded-full bg-white/10 px-3 py-1.5 font-semibold text-white ring-1 ring-inset ring-orbital-cyan/50"
                  : "whitespace-nowrap rounded-full px-3 py-1.5 text-ink-300 hover:bg-white/5 hover:text-white"
              }
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
