"use client";

/**
 * PlayerLensRail — one lab, lenses grouped.
 *
 * Replaces the flat 11-tab strip. The two surfaces a visitor actually starts
 * from — the Player Lab and Edge Signals — lead as prominent buttons; the deeper
 * views are presented as labeled lens groups (Usage, Advanced, Status & market)
 * rather than eleven equal subtabs. It keeps the exact same URL model as the old
 * tabs (?view= links, one view loaded at a time), so there's no data regression
 * and the page stays shareable. Trend Lab is re-surfaced here as a sibling lab.
 */

import Link from "next/link";
import { buildTabHref } from "@/components/ui/tabs";

type Lens = { slug: string; label: string; tooltip?: string };

const PRIMARY: ReadonlyArray<{ slug: string; label: string; blurb: string }> = [
  { slug: "production", label: "Player Lab", blurb: "Every player, every signal" },
  { slug: "edge", label: "Edge Signals", blurb: "The advanced stats, one read" },
];

const GROUPS: ReadonlyArray<{ heading: string; slugs: readonly string[] }> = [
  { heading: "Usage", slugs: ["snaps", "opportunity", "trenches"] },
  { heading: "Advanced", slugs: ["nextgen", "qbr", "combine"] },
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
    <div className="flex flex-col gap-5" role="navigation" aria-label="Player Lab lenses">
      {/* Primary surfaces */}
      <div className="grid gap-3 sm:grid-cols-2">
        {PRIMARY.map((p) => {
          const isActive = p.slug === active;
          return (
            <Link
              key={p.slug}
              href={href(p.slug)}
              scroll={false}
              aria-current={isActive ? "page" : undefined}
              className={`group flex items-center justify-between rounded-ds-md border px-4 py-3 transition-colors ${
                isActive
                  ? "border-orbital-cyan/60 bg-orbital-cyan/[0.06]"
                  : "border-mineral bg-eclipse hover:border-orbital-cyan/40 hover:bg-carbon"
              }`}
            >
              <span>
                <span className="block font-display text-base font-semibold text-ion-white">{p.label}</span>
                <span className="block text-xs text-ion-2">{p.blurb}</span>
              </span>
              <span aria-hidden className={`text-sm ${isActive ? "text-orbital-cyan" : "text-ion-2 group-hover:text-orbital-cyan"}`}>
                {isActive ? "●" : "→"}
              </span>
            </Link>
          );
        })}
      </div>

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
          Trend Lab — trends that pass a real statistical test
          <span aria-hidden>→</span>
        </Link>
      </div>
    </div>
  );
}
