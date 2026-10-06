/**
 * GSE Score + GSE Index — the player ranking the product actually sells.
 *
 * GSE Score (0–100): how good this player is right now, on our numbers.
 *   - LIVE pool: the process grade from real nflverse data
 *     (lib/intelligence/player-model.ts — within-position percentiles of
 *     EPA/opportunity/production, combined). That is a real, data-driven
 *     grade. It is the score.
 *   - Illustrative pool: derived from the pool's own VOR + projection, so
 *     the tools stay coherent, and the UI labels it SAMPLE — never as live.
 *
 * GSE Index (1-based): overall rank in the active pool by GSE Score.
 * Ties break on projection, then name, so the order is deterministic.
 *
 * This is NOT a win probability and NOT a confidence score. It is a
 * ranking. 100 is the best player in the pool; 0 is the worst.
 */

import { vor, type Player } from "./players";
import { activePlayerPool } from "@/lib/integrations/projections";

/** Live process-grade attached to a graded-pool row, when the feed supplies it. */
export type GseSource = "live-process" | "sample-vor";

export interface GseRating {
  readonly score: number;
  readonly source: GseSource;
  /** 1-based overall rank in the pool. */
  readonly index: number | null;
}

function clamp100(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

/**
 * GSE Score for one player against a pool.
 *
 * LIVE: `processGrade` is already a 0–100 within-position composite computed
 * from real nflverse rows. Use it directly — do not re-derive.
 *
 * SAMPLE: map VOR + projection into 0–100 by ranking the pool. Honest, but
 * the caller MUST label it sample; this is not live data.
 */
export function gseScore(
  p: Player,
  pool: readonly Player[] = activePlayerPool(),
): GseRating {
  const live = (p as Player & { processGrade?: number }).processGrade;
  if (typeof live === "number" && Number.isFinite(live) && live >= 0 && live <= 100) {
    return { score: clamp100(live), source: "live-process", index: null };
  }

  // Sample fallback: percentile of (proj + VOR) within the pool.
  if (pool.length === 0) {
    return { score: 50, source: "sample-vor", index: null };
  }
  const raw = pool.map((x) => ({
    id: x.id,
    v: x.proj * 0.4 + Math.max(0, vor(x, pool)) * 0.6,
  }));
  const mine = p.proj * 0.4 + Math.max(0, vor(p, pool)) * 0.6;
  const below = raw.filter((r) => r.v < mine).length;
  const pct = pool.length === 1 ? 50 : (below / (pool.length - 1)) * 100;
  return { score: clamp100(pct), source: "sample-vor", index: null };
}

/**
 * Full ranking: score + overall index, computed once over the pool.
 * Returns players in the SAME order as `pool` — callers sort by score.
 */
export function gseRankPool(pool: readonly Player[] = activePlayerPool()): Map<string, GseRating> {
  const scored = pool.map((p) => {
    const r = gseScore(p, pool);
    return { id: p.id, score: r.score, source: r.source, proj: p.proj, name: p.name };
  });
  // Sort: score desc, then proj desc, then name asc — deterministic.
  scored.sort((a, b) => b.score - a.score || b.proj - a.proj || a.name.localeCompare(b.name));
  const out = new Map<string, GseRating>();
  scored.forEach((row, i) => {
    out.set(row.id, { score: row.score, source: row.source, index: i + 1 });
  });
  return out;
}

/** Convenience: GSE Index (1-based) for one player. */
export function gseIndex(
  p: Player,
  pool: readonly Player[] = activePlayerPool(),
): number | null {
  return gseRankPool(pool).get(p.id)?.index ?? null;
}

/** True when the rating came from live process data, not the sample fallback. */
export function isLiveGse(rating: GseRating): boolean {
  return rating.source === "live-process";
}
