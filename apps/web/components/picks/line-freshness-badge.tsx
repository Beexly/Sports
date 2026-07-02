"use client";

import { useEffect, useState } from "react";

/**
 * LineFreshnessBadge — the public trust signal for line age on /picks.
 *
 * Shows how old the freshest bookmaker line behind today's published picks is
 * ("Lines updated 12m ago"). This is a client component on purpose: the picks
 * page is cached for anonymous traffic, and a server-rendered relative age
 * would freeze at build time and quietly lie as the cache aged. Here the ISO
 * timestamp is the only thing that crosses the boundary; the age is computed
 * on the visitor's clock and refreshed every minute.
 *
 * Honesty rules (CLAUDE.md #5, no fake freshness):
 *   - Renders ONLY when a real upstream timestamp exists. No picks or no
 *     timestamp: render nothing, never a placeholder "just now".
 *   - The age shown is the truth even when it is unflattering. Older data gets
 *     the caution treatment instead of being hidden.
 */

/** Freshest non-null dataFreshnessAt across the displayed picks, or null. */
export function freshestLineTimestamp(
  picks: ReadonlyArray<{ dataFreshnessAt: string | null }>,
): string | null {
  let freshest: number = Number.NEGATIVE_INFINITY;
  for (const p of picks) {
    if (!p.dataFreshnessAt) continue;
    const t = Date.parse(p.dataFreshnessAt);
    if (Number.isFinite(t) && t > freshest) freshest = t;
  }
  return Number.isFinite(freshest) ? new Date(freshest).toISOString() : null;
}

/** Human age label for a line timestamp ("4m ago", "2h 10m ago", "26h ago"). */
export function lineAgeLabel(iso: string, now: number): string | null {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  const mins = Math.max(0, Math.floor((now - t) / 60_000));
  if (mins < 1) return "under a minute ago";
  if (mins < 60) return `${mins}m ago`;
  const h = Math.floor(mins / 60);
  if (h < 6) {
    const rem = mins % 60;
    return rem > 0 ? `${h}h ${rem}m ago` : `${h}h ago`;
  }
  return `${h}h ago`;
}

export function LineFreshnessBadge({ freshestIso }: { freshestIso: string }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  // Before hydration completes we render nothing rather than a wrong age.
  if (now === null) return null;
  const label = lineAgeLabel(freshestIso, now);
  if (!label) return null;

  const ageMinutes = Math.floor((now - Date.parse(freshestIso)) / 60_000);
  const fresh = ageMinutes < 120; // under 2h reads as live-market fresh

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-xs ${
        fresh
          ? "border-orbital-cyan/40 bg-orbital-cyan/10 text-orbital-cyan"
          : "border-caution/40 bg-caution/10 text-caution"
      }`}
      title={`Freshest bookmaker line behind today's picks: ${new Date(freshestIso).toLocaleString()}`}
    >
      <span
        aria-hidden
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${fresh ? "bg-orbital-cyan" : "bg-caution"}`}
      />
      Lines updated {label}
    </span>
  );
}
