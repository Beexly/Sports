/**
 * Line DNA — per-game path summary (TruthMetrics library).
 *
 * Line DNA is a compact fingerprint of how a single game's line evolved from
 * its first capture to its close. It answers: did the line wander? Did it jump?
 * Did books agree or disagree? Each metric is a single number per (game,
 * market, side) that feeds the metric-honesty component.
 *
 * ## Metrics
 *
 * - normalizedTotalVariation: sum of |Δline| across all consecutive captures,
 *   divided by the line's overall range (max − min). This is 0 for a perfectly
 *   flat line and 1 for a line that uses its full range in steps. Bounded [0, ∞)
 *   but practically ≤ ~1 for typical paths; values > 1 indicate oscillation.
 *
 * - incrementCount: number of times the line moved (non-zero Δ between
 *   consecutive captures), before deduplication of same-value snapshots.
 *
 * - bookCount: number of distinct books that contributed at least one snapshot
 *   to this game's path for this market+side.
 *
 * - firstSnapshotAge / lastSnapshotAge: hours before kickoff of the first and
 *   last captures. The "window" over which the path is observed.
 *
 * - firstSnapshotPhase / lastSnapshotPhase: the phase tags (OPEN/INTERIM/CLOSE
 *   /null) of the first and last captures, for diagnostics.
 *
 * ## Honest-empty contract
 *
 * With fewer than 2 snapshots the path is degenerate (no movement possible).
 * All numeric fields are null and emptyReason explains why. No zero-value
 * substitutes are emitted — a single-snapshot game renders "collecting", not
 * a fake TV of 0.
 */

export type { GameSnapshots, LineSnapshot, SnapshotPhase, MarketType } from "./line-snapshot";
export type { TruthMetricsResult } from "./line-snapshot";

import { canonicalJson, sha256Hex } from "@sports/prediction-engine/src/edge-lab/provenance.js";
import type { LineSnapshot } from "./line-snapshot";

// ── Output types ────────────────────────────────────────────────────────────

export interface LineDnaResult {
  readonly gameId: string;
  readonly market: string;
  readonly side: string;
  readonly hasEnoughData: boolean;
  readonly emptyReason: string | null;

  /** Sum of |Δ| normalized by range. null when < 2 snapshots. */
  readonly normalizedTotalVariation: number | null;
  /** Number of non-zero line/step changes. null when < 2 snapshots. */
  readonly incrementCount: number | null;
  /** Distinct books contributing snapshots. null when < 1 snapshot. */
  readonly bookCount: number | null;
  /** Hours before kickoff of the first capture. null when 0 snapshots. */
  readonly firstSnapshotAge: number | null;
  /** Hours before kickoff of the last capture. null when 0 snapshots. */
  readonly lastSnapshotAge: number | null;
  /** Phase tag of the first capture (OPEN expected). */
  readonly firstSnapshotPhase: string | null;
  /** Phase tag of the last capture (CLOSE expected). */
  readonly lastSnapshotPhase: string | null;

  /** Canonical hash of inputs — provenance stamp. */
  readonly snapshotHash: string;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function hoursBefore(kickoffAt: string, capturedAt: string): number {
  const kickoffMs = Date.parse(kickoffAt);
  const capturedMs = Date.parse(capturedAt);
  return (kickoffMs - capturedMs) / (1000 * 3600);
}

// ── Main API ────────────────────────────────────────────────────────────────

/**
 * Compute the Line DNA path summary for one (game, market, side).
 *
 * If `side` is null, all sides for the given market are merged into one path
 * (useful for aggregate market analysis).
 */
export function computeLineDna(
  gameId: string,
  kickoffAt: string,
  snapshots: readonly LineSnapshot[],
  market: string,
  side: string | null,
): LineDnaResult {
  // Filter to the requested market (and side if specified).
  const filtered = snapshots.filter((s) => {
    if (s.market !== market) return false;
    if (side !== null && s.side !== side) return false;
    return true;
  });

  const snapshotHash = sha256Hex(
    canonicalJson({
      gameId,
      kickoffAt,
      market,
      side,
      snapshots: filtered.map((s) => ({
        capturedAt: s.capturedAt,
        phase: s.phase,
        book: s.book,
        side: s.side,
        price: s.price,
        line: s.line,
        source: s.source,
      })),
    }),
  );

  if (filtered.length === 0) {
    return {
      gameId,
      market,
      side: side ?? "",
      hasEnoughData: false,
      emptyReason: `no snapshots for market=${market}, side=${side ?? "(any)"}`,
      normalizedTotalVariation: null,
      incrementCount: null,
      bookCount: null,
      firstSnapshotAge: null,
      lastSnapshotAge: null,
      firstSnapshotPhase: null,
      lastSnapshotPhase: null,
      snapshotHash,
    };
  }

  // Sort by capturedAt ascending (chronological path).
  const sorted = [...filtered].sort(
    (a, b) => Date.parse(a.capturedAt) - Date.parse(b.capturedAt),
  );

  const firstAge = hoursBefore(kickoffAt, sorted[0]!.capturedAt);
  const lastAge = hoursBefore(kickoffAt, sorted[sorted.length - 1]!.capturedAt);

  // Book count (distinct books).
  const books = new Set(sorted.map((s) => s.book));

  // Increment count: non-zero changes in line value.
  // We compare the "value" of each snapshot — line for spread/total, price
  // for moneyline — but skip consecutive duplicates (same book, same value).
  const values = sorted.map((s) => (s.line !== null ? s.line : s.price));
  let incrementCount = 0;
  let totalVariation = 0;
  for (let i = 1; i < values.length; i++) {
    const delta = values[i]! - values[i - 1]!;
    if (Math.abs(delta) > 1e-9) {
      totalVariation += Math.abs(delta);
      incrementCount += 1;
    }
  }

  // Normalized total variation: total variation / (max − min) range.
  // If all values are identical (range = 0), TVN = 0 (no movement).
  const range = Math.max(...values) - Math.min(...values);
  const normalizedTVN = range > 1e-9 ? totalVariation / range : 0;

  if (sorted.length < 2) {
    return {
      gameId,
      market,
      side: side ?? "",
      hasEnoughData: false,
      emptyReason: "single snapshot — no path to summarize",
      normalizedTotalVariation: null,
      incrementCount: null,
      bookCount: books.size,
      firstSnapshotAge: firstAge,
      lastSnapshotAge: lastAge,
      firstSnapshotPhase: sorted[0]!.phase,
      lastSnapshotPhase: sorted[sorted.length - 1]!.phase,
      snapshotHash,
    };
  }

  return {
    gameId,
    market,
    side: side ?? "",
    hasEnoughData: true,
    emptyReason: null,
    normalizedTotalVariation: normalizedTVN,
    incrementCount,
    bookCount: books.size,
    firstSnapshotAge: firstAge,
    lastSnapshotAge: lastAge,
    firstSnapshotPhase: sorted[0]!.phase,
    lastSnapshotPhase: sorted[sorted.length - 1]!.phase,
    snapshotHash,
  };
}

/**
 * Compute Line DNA across ALL markets and sides for a game.
 * Returns one result per (market, side) combination observed.
 */
export function computeLineDnaAllMarkets(
  gameId: string,
  kickoffAt: string,
  snapshots: readonly LineSnapshot[],
): LineDnaResult[] {
  const results: LineDnaResult[] = [];

  // Group by (market, side).
  const groups = new Map<string, { market: string; side: string }>();
  const groupSnapshots = new Map<string, LineSnapshot[]>();
  for (const s of snapshots) {
    const key = `${s.market}::${s.side}`;
    if (!groups.has(key)) {
      groups.set(key, { market: s.market, side: s.side });
      groupSnapshots.set(key, []);
    }
    groupSnapshots.get(key)!.push(s);
  }

  for (const [key, info] of groups) {
    const snaps = groupSnapshots.get(key)!;
    results.push(computeLineDna(gameId, kickoffAt, snaps, info.market, info.side));
  }

  return results;
}
