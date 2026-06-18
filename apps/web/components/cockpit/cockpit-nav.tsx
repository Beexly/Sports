"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type CockpitNavItem = { href: string; label: string; hint: string };
export type CockpitNavGroup = { section: string; items: ReadonlyArray<CockpitNavItem> };

/**
 * Cockpit sidebar nav (client) — grouped into scannable buckets with a live
 * active-page indicator (a pulsing accent rail + lit row), so the 24-deck
 * cockpit stops feeling like a flat wall of links and you always know where
 * you are. Pure presentation over the NAV data the server layout owns (which
 * keeps the href literals the coverage test pins).
 */
export function CockpitNav({ nav }: { nav: ReadonlyArray<CockpitNavGroup> }) {
  const pathname = usePathname();

  const isActive = (href: string): boolean =>
    href === "/cockpit"
      ? pathname === "/cockpit"
      : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav className="flex flex-col gap-5">
      {nav.map((group) => (
        <div key={group.section} className="flex flex-col gap-0.5">
          <p className="mb-1 px-3 font-mono text-[9px] uppercase tracking-[0.18em] text-ink-500">
            {group.section}
          </p>
          {group.items.map(({ href, label, hint }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={[
                  "group relative rounded-lg border px-3 py-2 transition-colors",
                  active
                    ? "border-orbital-cyan/40 bg-orbital-cyan/10"
                    : "border-transparent hover:border-white/[0.10]/70 hover:bg-white/[0.03]",
                ].join(" ")}
              >
                {active && (
                  <span
                    aria-hidden
                    className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-orbital-cyan animate-live-pulse"
                  />
                )}
                <p
                  className={[
                    "text-sm font-medium",
                    active ? "text-white" : "text-ink-300 group-hover:text-white",
                  ].join(" ")}
                >
                  {label}
                </p>
                <p className="text-[11px] text-ink-500">{hint}</p>
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
