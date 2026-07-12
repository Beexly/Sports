/**
 * Founder-gated MODEL-ACCURACY board — the platform's OWN model versions ranked
 * by calibrated accuracy over EXISTING settled picks, scored through the honest
 * accuracy engine (@sports/fantasy-engine: proper scoring rules + the seam-
 * closed leaderboard). This is the accuracy differentiator running on real data.
 *
 * READ-ONLY, ZERO MIGRATION: this loader reads existing columns only — the
 * immutable `PickProofReceipt` (modelVersion, confidence, modelProb; frozen once
 * at publish) joined to its `Pick` (pickType, result, settledAt). No schema
 * change, no new column.
 *
 * THREE HONESTY INVARIANTS — each closes a real Codex finding:
 *
 *  1. NEVER fabricate a probability from a ranking score. `confidence/100` is a
 *     valid WIN PROBABILITY only for MONEYLINE picks (confidence is derived from
 *     the vig-free fair probability); for spread/total it is a decision/ranking
 *     score priced to ~50% by construction — NOT a probability — so feeding it
 *     into Brier/log-loss fabricates a number the proof-receipt schema warns
 *     against (see apps/web/lib/calibration/compute.ts, and PickProofReceipt in
 *     packages/db/prisma/schema.prisma). We score, per pick:
 *       (a) the immutable, genuinely calibrated `modelProb` when one exists (any
 *           pick type) — the real frozen win probability. It is ALWAYS null in
 *           production today (packages/ingestion-pipeline/src/process-sport.ts
 *           mints `modelProb: null`; the receipt commits "none"), so this branch
 *           is inert until a calibrated probability is actually published; else
 *       (b) `confidence/100` for MONEYLINE picks ONLY.
 *     Every other settled decision (spread/total without a modelProb, or a
 *     moneyline whose frozen confidence is unusable) is counted as SETTLED-BUT-
 *     UNSCORED — it lowers coverage — rather than scored with a fabricated
 *     probability. Effect today: THIS BOARD MEASURES MONEYLINE CALIBRATION, and
 *     the page says so.
 *
 *  2. Score the FROZEN forecast, not the mutable Pick fields. The refresh
 *     pipeline rewrites `Pick.confidence` and `Pick.modelVersion` on every
 *     pending upsert (process-sport.ts `pickUpdateData`), so a pick created under
 *     version A and later refreshed by B would be mis-attributed. We therefore
 *     read the FROZEN modelVersion and FROZEN confidence/modelProb from the
 *     `PickProofReceipt` (minted ONCE at publish, `update: {}` — immutable). A
 *     pick with NO receipt cannot be attributed to a frozen version, so it is
 *     excluded entirely (never guessed) from BOTH the scored set and coverage.
 *
 *  3. Confidence endpoints 0 and 100 are valid high-conviction forecasts. The
 *     engine's `logLoss` clamps endpoints with epsilon and `brierScore` handles
 *     0/1 exactly, so we include them — only NON-FINITE or OUT-OF-[0,100] values
 *     are dropped. Excluding 0/100 would let a model dodge its largest miss
 *     penalties (a confidence-100 loss must cost the full Brier penalty).
 *
 * CANONICAL UNIVERSE: the same learning-eligibility gate as the calibration
 * surface (apps/web/lib/calibration/public-confidence.ts) — settled WIN/LOSS,
 * non-bootstrap, signalSnapshot.eligibleForLearning — narrowed to picks that
 * carry an immutable proof receipt. A "forecaster" is a distinct FROZEN
 * modelVersion; the dev seed version is excluded.
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
 * The ONLY pick type for which `confidence/100` is a documented win probability.
 * Spread/total confidence is a ranking score priced to ~50%, not a probability —
 * see apps/web/lib/calibration/compute.ts.
 */
const MONEYLINE_PICK_TYPE = "MONEYLINE";

/**
 * The immutable, publish-time frozen forecast — a subset of `PickProofReceipt`.
 * These fields are frozen ONCE at publish (`update: {}`), so they are the honest
 * attribution + probability source, immune to the refresh cycle rewriting the
 * mutable `Pick.confidence` / `Pick.modelVersion`.
 */
export interface FrozenProofReceipt {
  /** Prediction-engine version frozen at publish — the attribution source of truth. */
  readonly modelVersion: string;
  /** Published 0–100 confidence, frozen at publish. NOT a probability for spread/total. */
  readonly confidence: number;
  /** Genuinely calibrated win probability 0–1 — null until a real one is published. */
  readonly modelProb: number | null;
}

/**
 * The minimal row shape the board consumes. Kept structural (not the Prisma
 * generated type) so the grouping is trivially unit-testable with plain rows and
 * the JS-level guards below are REAL filters, not a restatement of the SQL WHERE.
 */
export interface SettledPickRow {
  /** Immutable market identity — the only thing that separates MONEYLINE from SPREAD/TOTAL. */
  readonly pickType: string;
  readonly result: string;
  readonly isBootstrap: boolean;
  /** Immutable proof receipt frozen at publish, or null for legacy / no-receipt picks. */
  readonly proofReceipt: FrozenProofReceipt | null;
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
 * A confidence is a usable win probability across the WHOLE closed interval
 * [0,100] — ENDPOINTS INCLUDED. brierScore handles 0/1 exactly and logLoss clamps
 * them with epsilon (packages/fantasy-engine/src/accuracy/scoring.ts), so only
 * non-finite or out-of-range values are unusable. Dropping 0/100 would let a
 * model dodge its largest miss penalties (finding 3).
 */
function usableConfidence(confidence: number): boolean {
  return Number.isFinite(confidence) && confidence >= 0 && confidence <= 100;
}

/** A modelProb is usable only as a real probability in the closed interval [0,1]. */
function usableModelProb(probability: number): boolean {
  return Number.isFinite(probability) && probability >= 0 && probability <= 1;
}

/** Frozen attribution for one settled row, plus its scored forecast (if any). */
interface AttributedRow {
  /** The FROZEN model version this decision is attributed to (never the mutable field). */
  readonly version: string;
  /**
   * The scored forecast, or null when the decision is SETTLED-BUT-UNSCORED — it
   * counts toward coverage but was not scored as a probability (no honest one
   * exists for it).
   */
  readonly forecast: ScoredForecast | null;
}

/**
 * Classify one settled row against the honesty invariants. Returns null to
 * EXCLUDE the row entirely (unattributable — from both numerator and coverage
 * denominator, never guessed); otherwise the FROZEN version plus the scored
 * forecast (or null when it is settled but cannot be scored without fabrication).
 */
function attributeRow(row: SettledPickRow): AttributedRow | null {
  // Defensive re-application of the SQL gate — a bootstrap/PUSH/VOID/PENDING row
  // can never slip in, and (finding 2) the mutable Pick fields are never read.
  if (row.isBootstrap !== false) return null;
  if (!SCOREABLE_RESULTS.has(row.result)) return null;

  const receipt = row.proofReceipt;
  if (receipt == null) return null; // no immutable receipt → never guess a version

  const version = receipt.modelVersion;
  if (typeof version !== "string" || version.length === 0 || version === SEED_MODEL_VERSION) {
    return null; // unnamed / dev-seed frozen version → not a real forecaster
  }

  const outcome: 0 | 1 = row.result === "WIN" ? 1 : 0;

  // (a) A genuinely calibrated, immutable win probability scores for ANY pick
  //     type — the real frozen probability. Null in production today, so inert.
  if (receipt.modelProb != null && usableModelProb(receipt.modelProb)) {
    return { version, forecast: { probability: receipt.modelProb, outcome } };
  }

  // (b) Otherwise confidence/100 is a valid win probability ONLY for moneyline.
  if (row.pickType === MONEYLINE_PICK_TYPE && usableConfidence(receipt.confidence)) {
    return { version, forecast: { probability: receipt.confidence / 100, outcome } };
  }

  // Attributable, but not scoreable as a probability without fabricating one →
  // settled-but-unscored (coverage denominator only). This is how spread/total
  // decisions honestly lower a version's coverage instead of inflating its score.
  return { version, forecast: null };
}

/**
 * Pure: group settled rows into ForecasterRecord[] by FROZEN modelVersion and
 * score them through the honest leaderboard. Exported for direct, DB-free testing.
 *
 * eventsAvailable (coverage denominator) for a version = the count of its OWN
 * attributable settled scoreable decisions (every WIN/LOSS non-bootstrap row that
 * carries an immutable receipt under that frozen version). forecasts = the subset
 * we could score as an honest win probability. Because forecasts ⊆ that universe,
 * eventsAvailable is always a non-negative integer ≥ forecasts.length, so
 * buildLeaderboard never throws on the denominator. Coverage < 1 honestly exposes
 * decisions we settled but could not score (spread/total, or unusable confidence).
 */
export function buildModelAccuracyBoard(
  rows: readonly SettledPickRow[],
  now: Date = new Date(),
  minimumSample: number = DEFAULT_MINIMUM_SAMPLE,
): ModelAccuracyBoard {
  const computedAt = now.toISOString();

  const universe = new Map<string, { available: number; forecasts: ScoredForecast[] }>();
  for (const row of rows) {
    const attributed = attributeRow(row);
    if (attributed === null) continue; // unattributable → excluded from BOTH numerator and denominator
    const bucket = universe.get(attributed.version) ?? { available: 0, forecasts: [] };
    bucket.available += 1; // every attributable settled decision counts toward coverage
    if (attributed.forecast) bucket.forecasts.push(attributed.forecast);
    universe.set(attributed.version, bucket);
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
 * Cockpit loader: query the canonical settled-pick universe (each row carrying
 * its immutable proof receipt), score the FROZEN forecast, and return a typed
 * discriminated state. Fail-safe — any DB error degrades to `unavailable` and
 * never throws into the page render. Only successful (`ok`/`empty`) boards are
 * memoized; an `unavailable` board is retried on the next visit rather than pinned.
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
        // Only picks that carry an IMMUTABLE frozen forecast are attributable —
        // a pick with no receipt is never scored (never guess its version).
        proofReceipt: { isNot: null },
      },
      select: {
        pickType: true,
        result: true,
        isBootstrap: true,
        // FROZEN forecast — read from the immutable receipt, NEVER the mutable
        // Pick.confidence / Pick.modelVersion that the refresh cycle rewrites.
        proofReceipt: { select: { modelVersion: true, confidence: true, modelProb: true } },
      },
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
