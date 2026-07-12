/**
 * Founder-gated MODEL-ACCURACY board — the platform's OWN model versions ranked
 * by calibrated accuracy over EXISTING settled picks, scored through the honest
 * accuracy engine (@sports/fantasy-engine: proper scoring rules + the seam-
 * closed leaderboard). This is the accuracy differentiator running on real data.
 *
 * READ-ONLY, ZERO MIGRATION: this loader reads existing `Pick` columns only
 * (modelVersion, confidence, result, isBootstrap, settledAt via signalSnapshot
 * eligibility) — no schema change, no new column.
 *
 * CANONICAL UNIVERSE: identical to the calibration surface's gate
 * (apps/web/lib/calibration/public-confidence.ts) — settled WIN/LOSS,
 * non-bootstrap, learning-eligible decisions, with the dev seed row excluded.
 * A "forecaster" is a distinct modelVersion; a settled WIN/LOSS decision with a
 * usable confidence becomes one ScoredForecast (probability = confidence/100,
 * outcome = WIN ? 1 : 0).
 *
 * METHOD-OPACITY SAFE: only model-version labels and outcome/calibration numbers
 * are surfaced — never a factor name, weight, threshold, or gate. Outcomes are
 * the public-provable layer; the page stays ADMIN-gated regardless.
 *
 * HONESTY: a DB failure degrades to an `unavailable` state (never throws into
 * the page); a window with no scoreable settled picks returns `empty` — the
 * board is never populated with fabricated rows.
 */

import { db } from "@sports/db";
import {
  buildLeaderboard,
  type ForecasterRecord,
  type LeaderboardEntry,
  type ScoredForecast,
} from "@sports/fantasy-engine";

/** Engine default rankable floor — surfaced so the page can label it. */
export const DEFAULT_MINIMUM_SAMPLE = 25;

/**
 * Bounded, recency-ordered window. The board reads at most this many most-
 * recently-settled scoreable picks (ordered by settledAt desc). At production
 * scale this is a documented window, not the entire history; today it is far
 * above the settled count so nothing is truncated.
 */
export const MAX_SETTLED_PICKS = 20_000;

/** Dev/seed rows must never count as a real model version's forecast. */
const SEED_MODEL_VERSION = "v5.0.0-seed";

/** Scoreable settlement outcomes — PUSH / VOID / PENDING are not decisions. */
const SCOREABLE_RESULTS: ReadonlySet<string> = new Set(["WIN", "LOSS"]);

/**
 * The minimal row shape the board consumes. Kept structural (not the Prisma
 * generated type) so the grouping is trivially unit-testable with plain rows
 * and the JS-level guard below is a REAL filter, not a restatement of the SQL
 * WHERE clause.
 */
export interface SettledPickRow {
  readonly modelVersion: string;
  readonly confidence: number;
  readonly result: string;
  readonly isBootstrap: boolean;
}

export type ModelAccuracyBoard =
  | {
      readonly status: "ok";
      readonly computedAt: string;
      readonly minimumSample: number;
      /** Distinct model versions that produced at least one scoreable forecast. */
      readonly scoredForecasters: number;
      /** Total scored forecasts across every ranked model version. */
      readonly totalForecasts: number;
      readonly entries: readonly LeaderboardEntry[];
    }
  | { readonly status: "empty"; readonly computedAt: string }
  | { readonly status: "unavailable"; readonly reason: string };

/**
 * Defensive scoreable predicate. Re-applied in JS on top of the SQL gate so a
 * PUSH / VOID / PENDING / bootstrap / unnamed-version row can never slip into
 * the scoring universe regardless of how the rows were produced.
 */
function isScoreable(row: SettledPickRow): boolean {
  return (
    typeof row.modelVersion === "string" &&
    row.modelVersion.length > 0 &&
    row.modelVersion !== SEED_MODEL_VERSION &&
    row.isBootstrap === false &&
    SCOREABLE_RESULTS.has(row.result)
  );
}

/** A confidence is usable as a probability only inside the open interval (0,100). */
function usableConfidence(confidence: number): boolean {
  return Number.isFinite(confidence) && confidence > 0 && confidence < 100;
}

/**
 * Pure: group settled rows into ForecasterRecord[] by modelVersion and score
 * them through the honest leaderboard. Exported for direct, DB-free testing.
 *
 * eventsAvailable (coverage denominator) for a model version = the count of its
 * OWN settled scoreable decisions (every WIN/LOSS non-bootstrap row). forecasts
 * = the subset with a usable confidence. Because forecasts ⊆ that universe,
 * eventsAvailable is always a non-negative integer ≥ forecasts.length, so
 * buildLeaderboard never throws on the denominator. Coverage < 1 honestly
 * exposes decisions we settled but could not score (unusable confidence).
 */
export function buildModelAccuracyBoard(
  rows: readonly SettledPickRow[],
  now: Date = new Date(),
  minimumSample: number = DEFAULT_MINIMUM_SAMPLE,
): ModelAccuracyBoard {
  const computedAt = now.toISOString();

  const universe = new Map<string, { available: number; forecasts: ScoredForecast[] }>();
  for (const row of rows) {
    if (!isScoreable(row)) continue; // drops PUSH/VOID/PENDING/bootstrap/seed/unnamed
    const bucket = universe.get(row.modelVersion) ?? { available: 0, forecasts: [] };
    bucket.available += 1; // every scoreable decision counts toward coverage
    if (usableConfidence(row.confidence)) {
      const outcome: 0 | 1 = row.result === "WIN" ? 1 : 0;
      bucket.forecasts.push({ probability: row.confidence / 100, outcome });
    }
    universe.set(row.modelVersion, bucket);
  }

  const records: ForecasterRecord[] = [];
  let totalForecasts = 0;
  for (const [modelVersion, bucket] of universe) {
    if (bucket.forecasts.length === 0) continue; // exclude versions with zero scoreable forecasts
    records.push({
      forecasterId: modelVersion,
      forecasts: bucket.forecasts,
      eventsAvailable: bucket.available,
    });
    totalForecasts += bucket.forecasts.length;
  }

  if (records.length === 0) {
    return { status: "empty", computedAt };
  }

  const entries = buildLeaderboard(records, { minimumSample });
  return {
    status: "ok",
    computedAt,
    minimumSample,
    scoredForecasters: records.length,
    totalForecasts,
    entries,
  };
}

// ── In-process memo (non-bulk discipline; derived output only) ───────────────

/** Short TTL: the board must reflect freshly-settled picks within minutes. */
export const MODEL_ACCURACY_TTL_MS = 5 * 60 * 1000;

let memo: { readonly at: number; readonly board: ModelAccuracyBoard } | null = null;

/**
 * Cockpit loader: query the canonical settled-pick universe, score it, and
 * return a typed discriminated state. Fail-safe — any DB error degrades to
 * `unavailable` and never throws into the page render. Only successful
 * (`ok`/`empty`) boards are memoized; an `unavailable` board is retried on the
 * next visit rather than pinned.
 */
export async function loadModelAccuracyBoard(now: Date = new Date()): Promise<ModelAccuracyBoard> {
  if (memo && now.getTime() - memo.at < MODEL_ACCURACY_TTL_MS) {
    return memo.board;
  }
  try {
    const rows = await db.pick.findMany({
      where: {
        result: { in: ["WIN", "LOSS"] },
        isBootstrap: false,
        // Same learning-eligibility gate the calibration view and report use.
        signalSnapshot: { is: { eligibleForLearning: true } },
        NOT: { modelVersion: SEED_MODEL_VERSION },
      },
      select: { modelVersion: true, confidence: true, result: true, isBootstrap: true },
      orderBy: { settledAt: "desc" },
      take: MAX_SETTLED_PICKS,
    });
    const board = buildModelAccuracyBoard(rows ?? [], now);
    memo = { at: now.getTime(), board };
    return board;
  } catch (err) {
    return {
      status: "unavailable",
      reason: err instanceof Error ? err.message : String(err),
    };
  }
}

/** Test hook — clears the in-process memo. */
export function __resetModelAccuracyBoardMemo(): void {
  memo = null;
}
