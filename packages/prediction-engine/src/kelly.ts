// ============================================================
// Kelly Criterion stake sizing (v6.0.0)
//
// Computes a *fractional* Kelly stake recommendation for a pick,
// expressed in "units" relative to a 100-unit bankroll. The classic
// Kelly criterion sizes bets according to the player's edge:
//
//     f* = (b·p - q) / b
//
// where:
//   p = win probability  (fair-value probability from removed-vig market)
//   q = 1 - p
//   b = decimal odds payout - 1  (e.g. -110 → 0.909, +200 → 2.0)
//
// Full Kelly is theoretically growth-optimal but is also notoriously
// volatile in practice. We apply two safety mechanisms that the
// professional sports-betting literature converges on:
//
//   1. Fractional Kelly (default 0.25) — scales the stake down 4×
//      to reduce variance at a small cost to long-run growth.
//   2. Confidence gate — only return a stake when confidence and
//      edgeScore meet our publish thresholds; below that we return
//      null (display "stake: research only" in the UI).
//
// IMPORTANT — this is NOT a recommendation to bet. It is a sizing
// helper for users who have *already decided* to bet. The platform
// does NOT take wagers, does NOT promise outcomes, and does NOT
// imply that any of these picks will win. Stake sizing is bounded
// at MAX_UNITS_PER_PICK to prevent any single suggestion from
// implying overconfidence.
//
// References:
//   - Kelly, J. L. (1956). "A New Interpretation of Information Rate."
//   - Thorp, E. O. (2006). "The Kelly Criterion in Blackjack, Sports
//     Betting, and the Stock Market."
//   - Standard fractional Kelly practice — Aaron Brown, "Red-Blooded
//     Risk" (2011), discussing variance reduction at fractional sizes.
// ============================================================

import type { ScoredPick } from "@sports/types";
import { americanToImpliedProbability, clamp } from "./scoring.js";

// Fraction of full Kelly to apply. 0.25 = quarter-Kelly, a
// well-documented professional default.
export const KELLY_FRACTION = 0.25;

// Maximum units we will ever suggest on a single pick, regardless
// of computed Kelly value. Hard cap to keep individual picks from
// implying overconfidence.
export const MAX_UNITS_PER_PICK = 3;

// Below this confidence we return null — the pick is published
// but no stake is suggested.
export const MIN_CONFIDENCE_FOR_STAKE = 65;

// Below this edge we return null — without a clear pricing edge,
// Kelly is undefined or negative.
export const MIN_EDGE_FOR_STAKE = 50;

export interface KellyStake {
  /**
   * Headline bankroll sizing lens, in units where 1 unit = 1% of bankroll.
   * This is the CAPPED and ROUNDED figure: the raw fractional-Kelly stake is
   * clamped to [0, MAX_UNITS_PER_PICK] and then rounded to the nearest 0.25u.
   * `recommendStake` only returns a stake when this rounds to >= 0.25u.
   */
  units: number;
  /**
   * ILLUSTRATIVE fair-value win probability used in the Kelly computation.
   * This is an ESTIMATE derived from edgeScore and the offered (break-even)
   * price — it is NOT a de-vigged market consensus and must not be presented
   * as a precise money-management figure. Callers holding a real de-vigged
   * fair probability should compute Kelly from that instead.
   */
  estimatedFairProbability: number;
  /** Decimal odds (used in the b term). */
  decimalOdds: number;
  /** Full-Kelly stake before fractional discount, as % of bankroll. */
  fullKellyPercent: number;
  /**
   * Raw fractional-Kelly stake as % of bankroll (= fullKellyPercent ×
   * KELLY_FRACTION). This is the exact sizing math BEFORE the unit cap and
   * 0.25u rounding, so — unlike `units` — it is intentionally neither clamped
   * to MAX_UNITS_PER_PICK nor rounded. Under the 1u = 1% convention it will
   * therefore NOT exactly equal `units` when the cap binds (e.g. units 3.00
   * alongside recommendedPercent 3.09%) or when 0.25u rounding shifts the
   * value. Treat `units` as the headline figure and this as the underlying,
   * un-capped fractional-Kelly percentage.
   */
  recommendedPercent: number;
  /** "quarter-kelly" or whatever fraction was applied. */
  strategy: string;
  /** Plain-English explanation. */
  rationale: string;
}

// ============================================================
// Convert American odds to decimal odds.
// +200 → 3.0, -110 → 1.909, -200 → 1.5
// ============================================================
export function americanToDecimalOdds(american: number): number {
  if (american > 0) return 1 + american / 100;
  return 1 + 100 / Math.abs(american);
}

// ============================================================
// Compute full-Kelly stake as a fraction of bankroll.
// Returns 0 if no edge (or negative edge).
// ============================================================
export function fullKellyFraction(winProb: number, decimalOdds: number): number {
  const b = decimalOdds - 1;
  if (b <= 0) return 0;
  const p = clamp(winProb, 0, 1);
  const q = 1 - p;
  const f = (b * p - q) / b;
  // A negative Kelly means we don't have an edge — never bet.
  return Math.max(0, f);
}

// ============================================================
// Convert a fractional bankroll percentage to units (1 unit = 1%
// of bankroll, by industry convention). Apply our fractional-Kelly
// scaling and the MAX_UNITS_PER_PICK cap.
// ============================================================
export function unitsFromKelly(
  fullKelly: number,
  fraction: number = KELLY_FRACTION
): number {
  const scaled = fullKelly * fraction;
  const units = scaled * 100; // bankroll fraction → unit count (1u = 1%)
  return clamp(units, 0, MAX_UNITS_PER_PICK);
}

// ============================================================
// Narrow input shape that recommendStake actually needs. Lets the
// API route call this without fabricating unused ScoredPick fields
// like `factorBreakdown` or `dataFreshnessAt`. Any ScoredPick is
// assignable to StakeInput by structural typing.
// ============================================================
export interface StakeInput {
  confidence: number;
  edgeScore: number;
  pickType: ScoredPick["pickType"];
  line: number;
}

// ============================================================
// Top-level: compute a stake recommendation for a scored pick.
//
// Returns null when the pick does not clear the confidence/edge
// thresholds (caller should hide the stake field in the UI).
// ============================================================
export function recommendStake(pick: StakeInput): KellyStake | null {
  if (pick.confidence < MIN_CONFIDENCE_FOR_STAKE) return null;
  if (pick.edgeScore < MIN_EDGE_FOR_STAKE) return null;

  // We need a price to convert to decimal odds. For SPREAD and
  // TOTAL picks the line field is the spread/total itself, not the
  // price, so we use the standard -110 vig assumption (the field
  // breakdown's edge already accounts for the actual offered price).
  // For MONEYLINE, line === avgPrice (American odds), so we use it.
  const americanOdds = pick.pickType === "MONEYLINE" ? pick.line : -110;
  const decimalOdds = americanToDecimalOdds(americanOdds);

  // Reject degenerate / invalid prices before any Kelly math. A missing
  // MONEYLINE price commonly defaults to 0 upstream, which makes
  // americanToDecimalOdds return Infinity; that in turn makes fullKelly NaN,
  // and every guard below is a NaN comparison that FAILS OPEN (NaN <= 0 and
  // NaN < 0.25 are both false), so a garbage stake object would leak out.
  // Fail closed on non-finite / non-payout odds instead.
  if (!Number.isFinite(decimalOdds) || decimalOdds <= 1) return null;

  // Derive an ILLUSTRATIVE fair-value probability from the offered price and
  // the edge score. This is intentionally NOT a de-vigged market consensus:
  // it nudges the break-even (offered) probability up by a bounded edge proxy
  // so the Kelly lens has something to size against without re-walking the full
  // scoring pipeline. Because it is only an estimate, the output field is named
  // `estimatedFairProbability` and the rationale flags it as illustrative — we
  // do not claim a precise fair-value number here.
  const offeredProb = americanToImpliedProbability(americanOdds);
  const inferredEdge = (pick.edgeScore / 100) * 0.05; // bounded +5% edge proxy
  const estimatedFairProb = clamp(offeredProb + inferredEdge, 0, 0.95);

  const fullKelly = fullKellyFraction(estimatedFairProb, decimalOdds);
  // Fail closed on non-positive OR non-finite Kelly (`!(x > 0)` also rejects
  // NaN, unlike `x <= 0`).
  if (!(fullKelly > 0)) return null;

  const units = unitsFromKelly(fullKelly);
  const roundedUnits = Math.round(units * 4) / 4; // nearest 0.25u
  if (roundedUnits < 0.25) return null;

  // Raw fractional-Kelly percentage of bankroll, BEFORE the MAX_UNITS_PER_PICK
  // cap and 0.25u rounding that `units` applies. Deliberately left un-capped and
  // un-rounded so the exact sizing math stays visible; as a result it can read
  // slightly higher than `roundedUnits` × 1% when the unit cap binds (see the
  // KellyStake.recommendedPercent docstring). The rationale string below prints
  // both figures verbatim, so a capped pick honestly shows the two side by side.
  const recommendedPercent = fullKelly * KELLY_FRACTION * 100;

  const rationale =
    `Quarter-Kelly bankroll lens: ${roundedUnits.toFixed(2)} units ` +
    `(${recommendedPercent.toFixed(2)}% of bankroll). ` +
    `Based on an estimated ${Math.round(estimatedFairProb * 100)}% fair-value ` +
    `probability (illustrative, derived from edge score) at ` +
    `${americanOdds > 0 ? "+" : ""}${Math.round(americanOdds)} odds. ` +
    `Fractional Kelly applied to reduce variance.`;

  return {
    units: roundedUnits,
    estimatedFairProbability: estimatedFairProb,
    decimalOdds,
    fullKellyPercent: fullKelly * 100,
    recommendedPercent,
    strategy: "quarter-kelly",
    rationale,
  };
}
