/**
 * Pure line-freshness helpers, shared by the SERVER /picks page and the CLIENT
 * LineFreshnessBadge. These live outside the "use client" badge module on
 * purpose: importing a function from a client module and calling it during
 * server render throws (Next treats the export as a client reference), which
 * broke the public board for any non-empty slate. Keeping the pure logic here
 * lets the server page compute the freshest timestamp directly.
 *
 * Honesty rules (CLAUDE.md #5, no fake freshness): return null when no real
 * upstream timestamp exists; the age shown is the truth even when unflattering.
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
