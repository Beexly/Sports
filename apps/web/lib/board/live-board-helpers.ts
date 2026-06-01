import type { BoardStateData } from "./state";

/**
 * Pure helpers for the LiveBoard "engine in the open" surface. Kept free of
 * React / next imports so they're trivially unit-testable in node.
 */

/** Every row id currently on the board, across all three lanes. */
export function rowIdSet(data: BoardStateData): Set<string> {
  return new Set(
    [...data.scoringNow, ...data.publishedToday, ...data.gatedTodayRows].map(
      (r) => r.id
    )
  );
}

/** Row ids present in `next` that weren't in `prevIds` — i.e. just arrived. */
export function pickNewIds(prevIds: Set<string>, next: BoardStateData): string[] {
  const out: string[] = [];
  for (const r of [
    ...next.scoringNow,
    ...next.publishedToday,
    ...next.gatedTodayRows,
  ]) {
    if (!prevIds.has(r.id)) out.push(r.id);
  }
  return out;
}

/** "just now" / "12s ago" / "3m ago" — compact freshness label. */
export function formatAgo(seconds: number): string {
  if (seconds < 3) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const m = Math.floor(seconds / 60);
  return `${m}m ago`;
}
