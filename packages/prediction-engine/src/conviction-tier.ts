/**
 * Conviction tier — the honest "70% tier" selector.
 *
 * WHAT THIS IS
 * A pure classifier that decides whether a pick belongs in the high-conviction
 * tier we are willing to stand behind publicly. It does NOT predict anything and
 * does NOT change the confidence score — it reads already-computed signals and
 * applies a single, honest bar:
 *
 *   1. a CALIBRATED probability of winning (not the raw heuristic confidence —
 *      see probability-calibration.ts), strictly in [0, 1], AND
 *   2. the pick must clear the PRICE-SPECIFIC break-even (a -200 favorite needs
 *      66.7%, not the -110 default of 52.4%), AND
 *   3. an independent EDGE decision of SPEAK (Poisson + Kalshi agree — edge-engine.ts), AND
 *   4. a CLV track record on the segment that is both strong enough AND large
 *      enough to be real (we have actually, repeatedly beaten the close — clv.ts).
 *
 * WHY IT IS GATED OFF
 * The whole point of a "70% tier" is that the number is real. That requires
 * calibration (currently founder-gated behind a MODEL_VERSION bump) and a settled
 * sample. So this module is additive and inert: nothing in the live scoring or
 * publishing path calls it yet. It exists so the selection logic is written,
 * tested, and ready to wire the moment the calibration switch is thrown.
 *
 * HONESTY GUARDS (added per review)
 * - Out-of-range probability is REJECTED, not clamped: if the future wiring ever
 *   passes the raw 0–100 confidence by mistake, 70 would clamp to 1.0 and certify
 *   a 100% pick. We treat anything outside [0, 1] as missing calibration → PASS.
 * - Conviction requires a MINIMUM CLV sample: a single graded pick that beat the
 *   close (rate = 1.0, n = 1) must not certify a "proven" track record.
 * - Break-even is PRICE-SPECIFIC: playability is judged against the pick's own
 *   American price, so heavy favorites are held to their true (higher) break-even.
 *
 * See docs/path-to-70.md for the staged plan this implements.
 *
 * Pure functions, no I/O — fully unit-testable. All probabilities are in [0, 1].
 */

import { clamp, americanToImpliedProbability } from "./scoring.js";
import type { EdgeDecision } from "./edge-engine.js";

/** Break-even win rate at standard -110 odds, used when no pick price is supplied. */
export const BREAK_EVEN_PROBABILITY = 0.524;
/** Calibrated-probability floor for the high-conviction ("70%") tier. */
export const CONVICTION_MIN_PROBABILITY = 0.65;
/** A segment must have beaten the close at least this often to earn conviction. */
export const CONVICTION_MIN_CLV_BEAT_RATE = 0.5;
/** ...and over at least this many graded picks — no certifying a one-pick record. */
export const CONVICTION_MIN_CLV_SAMPLE = 20;

/** The tier a pick lands in. PASS = no opinion we will stand behind. */
export type ConvictionTier = "CONVICTION" | "LEAN" | "PASS";

export interface ConvictionInput {
  /**
   * CALIBRATED probability the pick wins, strictly in [0, 1]. This must be the
   * output of the calibration mapping, not the raw 0–100 confidence score. Any
   * value outside [0, 1] (or non-finite) is treated as MISSING calibration → PASS,
   * never clamped — a raw score must never be mistaken for certainty.
   */
  readonly calibratedProbability: number;
  /** Independent edge decision (edge-engine.ts). Only SPEAK qualifies for conviction. */
  readonly edgeDecision: EdgeDecision;
  /**
   * Historical share of picks on this segment that beat the close, in [0, 1], or
   * null when we have no CLV history yet. null can never reach CONVICTION.
   */
  readonly clvBeatCloseRate?: number | null;
  /** How many graded picks `clvBeatCloseRate` is computed over. < CONVICTION_MIN_CLV_SAMPLE blocks conviction. */
  readonly clvSampleSize?: number;
  /**
   * The pick's American price (e.g. -200), when known. Used to compute a
   * price-specific break-even so favorites are held to their true bar. Omit for
   * point-spread/total picks priced near -110 (the default break-even applies).
   */
  readonly americanPrice?: number | null;
}

export interface ConvictionResult {
  readonly tier: ConvictionTier;
  /** Expected win rate = the calibrated probability (0 when the input was invalid). */
  readonly expectedWinRate: number;
  /** The break-even win rate this pick was judged against (price-specific when a price was given). */
  readonly breakEven: number;
  /** True only for the CONVICTION tier. */
  readonly meetsConvictionBar: boolean;
  /** Plain-language reasons a pick fell short of CONVICTION (empty when it meets the bar). */
  readonly reasons: readonly string[];
}

function pct(x: number): string {
  return `${(clamp(x, 0, 1) * 100).toFixed(1)}%`;
}

/** A calibrated probability is, by definition, a real number in [0, 1]. */
function isValidProbability(p: number): boolean {
  return Number.isFinite(p) && p >= 0 && p <= 1;
}

/**
 * Classify a pick into a conviction tier.
 *
 * CONVICTION requires ALL of: a valid calibrated probability ≥ max(CONVICTION_MIN_PROBABILITY,
 * price-specific break-even), edge = SPEAK, and a CLV beat-rate ≥ CONVICTION_MIN_CLV_BEAT_RATE
 * over ≥ CONVICTION_MIN_CLV_SAMPLE graded picks. Otherwise LEAN if there is any independent
 * edge and the probability clears break-even, else PASS.
 */
export function convictionTier(input: ConvictionInput): ConvictionResult {
  const valid = isValidProbability(input.calibratedProbability);
  const p = valid ? input.calibratedProbability : 0;

  const breakEven =
    input.americanPrice != null && Number.isFinite(input.americanPrice)
      ? americanToImpliedProbability(input.americanPrice)
      : BREAK_EVEN_PROBABILITY;
  // A heavy favorite's break-even can exceed the conviction floor; honor the higher bar.
  const convictionFloor = Math.max(CONVICTION_MIN_PROBABILITY, breakEven);

  const clv = input.clvBeatCloseRate;
  const clvN = input.clvSampleSize ?? 0;
  const reasons: string[] = [];

  if (!valid) {
    reasons.push(
      `calibrated win probability ${input.calibratedProbability} is outside [0,1] — treating as uncalibrated`,
    );
  } else if (p < convictionFloor) {
    reasons.push(
      `calibrated win probability ${pct(p)} is below the conviction floor ${pct(convictionFloor)}`,
    );
  }
  if (input.edgeDecision !== "SPEAK") {
    reasons.push(`edge decision is ${input.edgeDecision} (conviction needs SPEAK)`);
  }
  if (clv === null || clv === undefined || !Number.isFinite(clv)) {
    reasons.push("no closing-line-value history on this segment yet");
  } else if (clv < CONVICTION_MIN_CLV_BEAT_RATE) {
    reasons.push(`closing-line-value beat-rate ${pct(clv)} is below ${pct(CONVICTION_MIN_CLV_BEAT_RATE)}`);
  } else if (clvN < CONVICTION_MIN_CLV_SAMPLE) {
    reasons.push(
      `closing-line-value sample ${clvN} is below the minimum ${CONVICTION_MIN_CLV_SAMPLE} graded picks`,
    );
  }

  const meetsConvictionBar = reasons.length === 0;
  let tier: ConvictionTier;
  if (meetsConvictionBar) {
    tier = "CONVICTION";
  } else if (valid && input.edgeDecision !== "PASS" && p >= breakEven) {
    tier = "LEAN";
  } else {
    tier = "PASS";
  }

  return { tier, expectedWinRate: p, breakEven, meetsConvictionBar, reasons };
}

/** Count how a slate of picks distributes across tiers — useful for board telemetry. */
export function summarizeConviction(
  results: readonly ConvictionResult[],
): { readonly conviction: number; readonly lean: number; readonly pass: number } {
  let conviction = 0;
  let lean = 0;
  let pass = 0;
  for (const r of results) {
    if (r.tier === "CONVICTION") conviction += 1;
    else if (r.tier === "LEAN") lean += 1;
    else pass += 1;
  }
  return { conviction, lean, pass };
}
