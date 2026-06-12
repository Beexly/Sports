/**
 * Closing-Line Value (CLV) — the sharp's gold-standard credibility metric.
 *
 * CLV measures whether the price/line you locked beat where the market closed.
 * Beating the close is the strongest *leading* indicator of genuine edge: it
 * predicts long-run profitability even before a single game settles, because the
 * closing line is the market's most efficient estimate. Every serious tool
 * (OddsJam, Unabated, Pikkit) centers CLV — and a platform whose thesis is
 * "calibrated, not just confident" should publish it as proof, not promise.
 *
 * Pure functions only — no DB, no side effects, fully unit-testable. These are
 * engine primitives; surfacing CLV in the public track record is a separate,
 * deliberate step.
 *
 * Line conventions match settlement.ts:
 *   SPREAD `line` is from the HOME team's perspective
 *     (negative = home favored / laying points; positive = home getting points).
 *   TOTAL `line` is the combined points total.
 *   MONEYLINE prices are American odds.
 *
 * Sign convention for all CLV outputs: POSITIVE = you beat the close (good).
 */

import { americanToImpliedProbability } from "./scoring.js";

export type ClvVerdict = "BEAT_CLOSE" | "MATCHED_CLOSE" | "LOST_TO_CLOSE";

export type SpreadSide = "HOME" | "AWAY";
export type TotalSide = "OVER" | "UNDER";

// Lines move in half-points; treat anything within this as "no movement".
const POINTS_EPSILON = 1e-9;
// Default tolerance for moneyline implied-probability CLV (0.5 percentage points)
// so trivial price wiggles read as MATCHED rather than a beat/loss.
const DEFAULT_ML_EPSILON = 0.005;

function verdictFromValue(value: number, epsilon: number): ClvVerdict {
  if (value > epsilon) return "BEAT_CLOSE";
  if (value < -epsilon) return "LOST_TO_CLOSE";
  return "MATCHED_CLOSE";
}

function round(value: number, digits = 4): number {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

export interface PointsClvResult {
  /** Points of CLV from the bettor's perspective. Positive = beat the close. */
  readonly clvPoints: number;
  readonly verdict: ClvVerdict;
}

export interface MoneylineClvResult {
  /**
   * Implied-probability CLV: closeImpliedProb − pickImpliedProb.
   * Positive = your price implied a longer (better) payout than the close.
   */
  readonly clvProbability: number;
  /** Same value expressed in percentage points, for display. */
  readonly clvPercent: number;
  readonly verdict: ClvVerdict;
}

/**
 * Spread CLV in points.
 *
 * Example (HOME): bet home at -3, market closes -4 → you laid fewer points →
 * clvPoints = (-3) − (-4) = +1 → BEAT_CLOSE.
 * Example (AWAY): bet away (home line +3, i.e. away -3), closes home +2 (away -2) →
 * away laid fewer points at your price → clvPoints = (+2) − (+3)... handled by side.
 */
export function computeSpreadClv(
  pickHomeLine: number,
  closeHomeLine: number,
  side: SpreadSide,
): PointsClvResult {
  // HOME beats the close when its line was more generous (higher home-perspective
  // line): pick − close. AWAY is the mirror image (zero-sum on the line).
  const clvPoints =
    side === "HOME" ? pickHomeLine - closeHomeLine : closeHomeLine - pickHomeLine;
  return { clvPoints: round(clvPoints), verdict: verdictFromValue(clvPoints, POINTS_EPSILON) };
}

/**
 * Total CLV in points.
 *
 * OVER beats the close when it locked a LOWER number than the close (needs fewer
 * points): clv = close − pick. UNDER is the mirror: clv = pick − close.
 */
export function computeTotalClv(
  pickTotal: number,
  closeTotal: number,
  side: TotalSide,
): PointsClvResult {
  const clvPoints = side === "OVER" ? closeTotal - pickTotal : pickTotal - closeTotal;
  return { clvPoints: round(clvPoints), verdict: verdictFromValue(clvPoints, POINTS_EPSILON) };
}

/**
 * Moneyline CLV via implied probability.
 *
 * Your price beats the close when it implies a lower win probability than the
 * close (i.e. you got a longer price / bigger payout for the same outcome).
 * clvProbability = closeImpliedProb − pickImpliedProb (positive = beat close).
 */
export function computeMoneylineClv(
  pickAmericanPrice: number,
  closeAmericanPrice: number,
  epsilon: number = DEFAULT_ML_EPSILON,
): MoneylineClvResult {
  const pickImplied = americanToImpliedProbability(pickAmericanPrice);
  const closeImplied = americanToImpliedProbability(closeAmericanPrice);
  const clvProbability = closeImplied - pickImplied;
  return {
    clvProbability: round(clvProbability),
    clvPercent: round(clvProbability * 100, 2),
    verdict: verdictFromValue(clvProbability, epsilon),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Public CLV proof aggregate
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Minimum graded sample before the beat-the-close rate may render on a PUBLIC
 * surface. Mirrors the discrimination floor philosophy in calibration: a
 * directional credibility signal needs a real sample, not three lucky picks.
 */
export const MIN_PUBLIC_CLV_SAMPLE = 20;

/**
 * Structural shape of a settled pick's persisted CLV grade (matches the
 * Pick.clv* columns). Verdict/kind arrive as nullable strings from the DB;
 * the aggregator validates them rather than trusting the cast.
 */
export interface PublicClvRow {
  readonly clvVerdict: string | null;
  readonly clvValue: number | null;
  readonly clvKind: string | null;
}

export interface PublicClvAggregate {
  /** Settled picks with a graded closing-line comparison (valid verdict). */
  readonly gradedSampleSize: number;
  readonly beatCloseCount: number;
  readonly matchedCloseCount: number;
  readonly lostToCloseCount: number;
  /** beatCloseCount / gradedSampleSize (0–1); null when nothing is graded. */
  readonly beatCloseRate: number | null;
  /** Mean CLV in points across POINTS-kind grades only (spread/total). Null
   *  when no points-kind grades exist — never mixes units with moneyline. */
  readonly averageClvPoints: number | null;
  /** True once gradedSampleSize ≥ MIN_PUBLIC_CLV_SAMPLE. Public surfaces must
   *  not render the rate while this is false. */
  readonly meetsPublicSampleFloor: boolean;
}

const VALID_VERDICTS: ReadonlySet<string> = new Set([
  "BEAT_CLOSE",
  "MATCHED_CLOSE",
  "LOST_TO_CLOSE",
]);

/**
 * Aggregate persisted per-pick CLV grades into the public-safe proof stat:
 * how many settled picks had a captured closing line, and what share beat it.
 *
 * Rows without a valid graded verdict (close never captured, or junk data) are
 * excluded from the sample — we never invent a close. Pure; callers supply
 * real settled-pick rows and own the bootstrap/published filtering.
 */
export function aggregatePublicClv(
  rows: ReadonlyArray<PublicClvRow> = [],
): PublicClvAggregate {
  const graded = rows.filter(
    (r) => r.clvVerdict !== null && VALID_VERDICTS.has(r.clvVerdict),
  );

  const beat = graded.filter((r) => r.clvVerdict === "BEAT_CLOSE").length;
  const matched = graded.filter((r) => r.clvVerdict === "MATCHED_CLOSE").length;
  const lost = graded.filter((r) => r.clvVerdict === "LOST_TO_CLOSE").length;

  const pointsValues = graded
    .filter((r) => r.clvKind === "POINTS")
    .map((r) => r.clvValue)
    .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  const averageClvPoints =
    pointsValues.length > 0
      ? round(pointsValues.reduce((a, b) => a + b, 0) / pointsValues.length, 2)
      : null;

  return {
    gradedSampleSize: graded.length,
    beatCloseCount: beat,
    matchedCloseCount: matched,
    lostToCloseCount: lost,
    beatCloseRate: graded.length > 0 ? round(beat / graded.length, 4) : null,
    averageClvPoints,
    meetsPublicSampleFloor: graded.length >= MIN_PUBLIC_CLV_SAMPLE,
  };
}

export interface ClvSummary {
  readonly sampleSize: number;
  /** Share of picks that beat the close (0–1). The headline credibility number. */
  readonly beatCloseRate: number;
  /** Share that lost to the close (0–1). */
  readonly lostToCloseRate: number;
  /** Mean CLV value across the sample (points for spread/total, prob for ML). */
  readonly averageClv: number | null;
  readonly note: string;
}

/**
 * Aggregate a set of CLV outcomes into a publishable summary.
 *
 * Accepts the raw value (points or probability) plus verdict for each pick. Keep
 * spread/total and moneyline samples separate when calling — their units differ.
 */
export function summarizeClv(
  items: ReadonlyArray<{ readonly value: number; readonly verdict: ClvVerdict }> = [],
): ClvSummary {
  if (items.length === 0) {
    return {
      sampleSize: 0,
      beatCloseRate: 0,
      lostToCloseRate: 0,
      averageClv: null,
      note: "No settled-line picks yet — CLV begins accruing once picks are graded against a closing line.",
    };
  }

  const beat = items.filter((i) => i.verdict === "BEAT_CLOSE").length;
  const lost = items.filter((i) => i.verdict === "LOST_TO_CLOSE").length;
  const averageClv = items.reduce((sum, i) => sum + i.value, 0) / items.length;
  const beatCloseRate = round(beat / items.length, 4);

  return {
    sampleSize: items.length,
    beatCloseRate,
    lostToCloseRate: round(lost / items.length, 4),
    averageClv: round(averageClv),
    note:
      beatCloseRate >= 0.5
        ? `Beat the close on ${Math.round(beatCloseRate * 100)}% of ${items.length} picks — ` +
          "the leading indicator of genuine edge."
        : `Beat the close on ${Math.round(beatCloseRate * 100)}% of ${items.length} picks — ` +
          "below the 50% line that signals a market-beating model.",
  };
}
