/**
 * Convert settled `ShadowSignal` rows (packages/db/prisma/schema.prisma:1322)
 * into `falsify.ts`'s `BacktestRow` shape — the missing piece the C-67
 * edge-program-verification audit found: an independent, market-referenced
 * probability (`shadowProb`) has been accumulating in production on every
 * refresh-odds cycle and has NEVER been run through the falsifier's kill
 * tests. `apps/web/lib/ops/shadow-vs-live-report.ts` already scores these
 * rows (Brier/comparison metrics, wired to a weekly GitHub Actions report) —
 * this module is deliberately NOT a duplicate of that: it exists only to
 * bridge the shape gap into `falsifyBind`.
 *
 * THE SHAPE PROBLEM THIS SOLVES. `BacktestRow` wants `season` /
 * `knownAtWeek` / `outcomeWeek` — an NFL-week-shaped ordinal convention that
 * matches `covariate-bus.ts`'s "week t for game t+1" grain. `ShadowSignal`
 * has no such concept: `Game` (schema.prisma:301) carries only
 * `commenceTime`, no season/week integers, and shadow signals span whatever
 * sports the live board covers, not NFL specifically. Inventing an NFL week
 * number for a non-NFL game would be exactly the kind of fabricated metadata
 * CLAUDE.md rule 1 forbids.
 *
 * THE HONEST FIX: `knownAtWeek` / `outcomeWeek` are GLOBAL CHRONOLOGICAL
 * RANKS over every `evaluatedAt` / `settledAt` timestamp actually present in
 * the input batch — not calendar buckets, not invented week numbers. This
 * preserves true real-time ordering exactly (down to the millisecond) and
 * makes `falsifyBind`'s leakage check (`knownAtWeek >= outcomeWeek`) mean
 * precisely what it says: "was this row's evaluation timestamped at or after
 * its outcome became known". `season` is the row's real settlement year —
 * used only as the split test's chronological grouping key, which the global
 * rank already fully orders; season is a harmless secondary key here, not a
 * semantic requirement.
 *
 * WHY `evaluatedAt` IS TRUSTWORTHY AS A PRE-SETTLEMENT SNAPSHOT (verified by
 * reading, not assumed): `recordShadowSignal` (shadow-signal-store.ts:206)
 * upserts on `[gameId, modelVersion]` and its `update` payload does NOT touch
 * `evaluatedAt` — only Prisma's `@default(now())` on CREATE sets it, so it is
 * the FIRST time this game/model pair was ever evaluated. `shadow-evaluation-
 * pass.ts`'s own docblock states the cron evaluates "upcoming games" and
 * settles strictly BEFORE evaluating in the same cycle ("ORDER MATTERS:
 * settle first, then evaluate"), and `settleShadowSignal` only ever updates
 * rows `WHERE outcome: null` (idempotent, one-time). Together these mean a
 * genuinely-collected row's `evaluatedAt` predates its `settledAt`. This
 * module trusts that; it does not re-verify it against real data (no DB
 * access where this was written). A future session with DB access should
 * spot-check `evaluatedAt < settledAt` holds before trusting a SURVIVOR
 * verdict from real rows — see the runner script's own header.
 *
 * Pure. No I/O. No Prisma import (this package stays DB-free) — the caller
 * supplies plain data, typically from `loadShadowSignalsForFalsifier`
 * (apps/web/lib/ops/shadow-signal-store.ts) or an equivalent query.
 */
import type { BacktestRow } from "./falsify.js";

export const SHADOW_SIGNAL_BACKTEST_METHOD_TAG = "shadow_signal_backtest_v1" as const;

/** One settled ShadowSignal row, as the caller (a DB-backed query) supplies it. */
export interface ShadowSignalInput {
  readonly gameId: string;
  readonly modelVersion: string;
  /** The shadow engine's home-win probability. Maps to BacktestRow.modelProb. */
  readonly shadowProb: number;
  /** De-vigged market probability at evaluation time. Maps to BacktestRow.marketProb. */
  readonly marketProb: number;
  /** 1 = home win, 0 = away win. Must already be settled — null rows are the caller's job to exclude. */
  readonly outcome: 0 | 1;
  readonly evaluatedAt: Date;
  readonly settledAt: Date;
}

export interface ShadowConversionResult {
  readonly rows: readonly BacktestRow[];
  /** Count of input rows dropped for being malformed (non-finite prob, invalid date, etc.) — never silently coerced. */
  readonly droppedMalformed: number;
  /**
   * Count of input rows where evaluatedAt and settledAt landed on the EXACT
   * same millisecond, so their global rank collapsed to equal values. This
   * makes falsifyBind's leakage check flag them (knownAtWeek >= outcomeWeek)
   * even though it may be a timestamp-precision artifact rather than real
   * leakage. Reported so a caller can investigate rather than silently
   * absorb it into an unexplained leakage count.
   */
  readonly exactTimestampCollisions: number;
}

/**
 * Convert a batch of settled ShadowSignal rows into BacktestRow[], ready for
 * `falsifyBind`. Ranks are computed over THIS BATCH only — running the same
 * logical rows through two separate batches will NOT produce the same rank
 * numbers (though the relative order is always preserved within a batch).
 * Pass the full settled corpus in one call for a real falsifier run, not a
 * paginated subset.
 */
export function convertShadowSignalsToBacktestRows(
  rows: readonly ShadowSignalInput[],
): ShadowConversionResult {
  const isValidProb = (p: number): boolean => Number.isFinite(p) && p >= 0 && p <= 1;
  const isValidDate = (d: Date): boolean => d instanceof Date && Number.isFinite(d.getTime());

  const valid = rows.filter(
    (r) =>
      isValidProb(r.shadowProb) &&
      isValidProb(r.marketProb) &&
      (r.outcome === 0 || r.outcome === 1) &&
      isValidDate(r.evaluatedAt) &&
      isValidDate(r.settledAt),
  );
  const droppedMalformed = rows.length - valid.length;

  // Global chronological rank over every distinct timestamp in the batch.
  // 1-indexed so the smallest rank is never 0 — keeps it visually distinct
  // from covariate-bus.ts's unrelated "week=0 means season aggregate"
  // convention, even though the two modules don't interact.
  const allTimes = new Set<number>();
  for (const r of valid) {
    allTimes.add(r.evaluatedAt.getTime());
    allTimes.add(r.settledAt.getTime());
  }
  const sortedTimes = [...allTimes].sort((a, b) => a - b);
  const rankOf = new Map<number, number>();
  sortedTimes.forEach((t, i) => rankOf.set(t, i + 1));

  let exactTimestampCollisions = 0;
  const out: BacktestRow[] = valid.map((r) => {
    const knownAtWeek = rankOf.get(r.evaluatedAt.getTime())!;
    const outcomeWeek = rankOf.get(r.settledAt.getTime())!;
    if (knownAtWeek === outcomeWeek) exactTimestampCollisions++;
    return {
      season: r.settledAt.getUTCFullYear(),
      knownAtWeek,
      outcomeWeek,
      outcome: r.outcome,
      modelProb: r.shadowProb,
      marketProb: r.marketProb,
    };
  });

  return { rows: out, droppedMalformed, exactTimestampCollisions };
}
