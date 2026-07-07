"use client";

import { useEffect, useState } from "react";
import { lineAgeLabel } from "@/lib/picks/line-freshness";

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
 * The pure helpers (freshestLineTimestamp, lineAgeLabel) live in
 * `@/lib/picks/line-freshness` so the SERVER page can call them without tripping
 * Next's client-reference boundary. Honesty rules (CLAUDE.md #5): render only
 * when a real upstream timestamp exists; show the true age even when unflattering.
 */

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
