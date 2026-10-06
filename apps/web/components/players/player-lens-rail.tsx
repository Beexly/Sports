"use client";

/**
 * PlayerLensRail — one lab, lenses grouped.
 *
 * Replaces the flat 11-tab strip. The Player Lab leads as the prominent
 * button; the deeper views are presented as labeled lens groups (Usage,
 * Advanced, Status & market) rather than eleven equal subtabs. It keeps the
 * exact same URL model as the old tabs (?view= links, one view loaded at a
 * time), so there's no data regression and the page stays shareable. Trend
 * Lab is re-surfaced here as a sibling lab.
 */

import Link from "next/link";
import { buildTabHref } from "@/components/ui/tabs";

type Lens = { slug: string; label: string; tooltip?: string };

const GROUPS: ReadonlyArray<{ heading: string; slugs: readonly string[] }> = [
  { heading: "Usage", slugs: ["snaps", "opportunity", "trenches"] },
  { heading: "Advanced", slugs: ["qbr", "combine"] },
  { heading: "Status & market", slugs: ["injuries", "market", "dfs"] },
];

export function PlayerLensRail({
  lenses,
  active,
  pathname,
  currentParams = {},
}: {
  lenses: ReadonlyArray<Lens>;
  active: string;
  pathname: string;
  currentParams?: Record<string, string | string[] | undefined>;
}) {
  const byslug = new Map(lenses.map((l) => [l.slug, l]));
  const href = (slug: string) => buildTabHref(pathname, "view", slug, currentParams);

  return (
    <nav className="flex flex-col gap-5" aria-label="Player Lab lenses">
      {/* Grouped lenses */}
      <div className="grid gap-4 sm:grid-cols-3">
        {GROUPS.map((g) => (
          <div key={g.heading} className="flex flex-col gap-2">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-ion-2">{g.heading}</p>
            <div className="flex flex-wrap gap-1.5">
              {g.slugs.map((slug) => {
                const lens = byslug.get(slug);
                if (!lens) return null;
                const isActive = slug === active;
                return (
                  <Link
                    key={slug}
                    href={href(slug)}
                    scroll={false}
                    title={lens.tooltip}
                    aria-current={isActive ? "page" : undefined}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                      isActive
                        ? "border-orbital-cyan/60 bg-orbital-cyan/[0.08] text-ion-white"
                        : "border-mineral text-ion-1 hover:border-orbital-cyan/40 hover:text-ion-white"
                    }`}
                  >
                    {lens.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Sibling lab */}
      <div>
        <Link
          href="/trends"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-orbital-cyan hover:text-ion-white"
        >
          Trend Lab: trends that pass a real statistical test
          <span aria-hidden>→</span>
        </Link>
      </div>
    </nav>
  );
}
