/**
 * Conviction tier — the honest "70% tier" selector.
 *
 * WHAT THIS IS
 * A pure classifier that decides whether a pick belongs in the high-conviction
 * tier we are willing to stand behind publicly. It does NOT predict anything and
 * does NOT change the confidence score — it reads three already-computed signals
 * and applies a single, honest bar:
 *
 *   1. a CALIBRATED probability of winning (not the raw heuristic confidence —
 *      see probability-calibration.ts; until calibration is wired this should be
 *      fed the calibrated value, never the raw score), AND
 *   2. an independent EDGE decision of SPEAK (Poisson + Kalshi agree on a real
 *      edge — see edge-engine.ts), AND
 *   3. a CLV track record on the segment (we have actually beaten the close — the
 *      leading indicator of genuine edge; see clv.ts).
 *
 * WHY IT IS GATED OFF
 * The whole point of a "70% tier" is that the number is real. That requires
 * calibration (currently founder-gated behind a MODEL_VERSION bump) and a settled
 * sample. So this module is additive and inert: nothing in the live scoring or
 * publishing path calls it yet. It exists so the selection logic is written,
 * tested, and ready to wire the moment the calibration switch is thrown.
 *
 * See docs/path-to-70.md for the staged plan this implements.
 *
 * Pure functions, no I/O — fully unit-testable. All probabilities are in [0, 1].
 */

import { clamp } from "./scoring.js";
import type { EdgeDecision } from "./edge-engine.js";

/** Break-even win rate at standard -110 odds. Below this a pick is not playable. */
export const BREAK_EVEN_PROBABILITY = 0.524;
/** Calibrated-probability floor for the high-conviction ("70%") tier. */
export const CONVICTION_MIN_PROBABILITY = 0.65;
/** A segment must have beaten the close at least this often to earn conviction. */
export const CONVICTION_MIN_CLV_BEAT_RATE = 0.5;

/** The tier a pick lands in. PASS = no opinion we will stand behind. */
export type ConvictionTier = "CONVICTION" | "LEAN" | "PASS";

export interface ConvictionInput {
  /**
   * CALIBRATED probability the pick wins, in [0, 1]. This must be the output of
   * the calibration mapping, not the raw 0–100 confidence score. NaN/▿ is treated
   * as 0 (→ PASS) so a missing calibration can never sneak into the tier.
   */
  readonly calibratedProbability: number;
  /** Independent edge decision (edge-engine.ts). Only SPEAK qualifies for conviction. */
  readonly edgeDecision: EdgeDecision;
  /**
   * Historical share of picks on this segment that beat the close, in [0, 1], or
   * null when we have no CLV history yet. null can never reach CONVICTION — we do
   * not claim conviction without evidence we beat the close.
   */
  readonly clvBeatCloseRate?: number | null;
}

export interface ConvictionResult {
  readonly tier: ConvictionTier;
  /**
   * Expected win rate for this pick. Because the input probability is calibrated,
   * the honest expected win rate IS that probability (clamped to [0, 1]).
   */
  readonly expectedWinRate: number;
  /** True only for the CONVICTION tier. */
  readonly meetsConvictionBar: boolean;
  /** Plain-language reasons a pick fell short of CONVICTION (empty when it meets the bar). */
  readonly reasons: readonly string[];
}

function pct(x: number): string {
  return `${(clamp(x, 0, 1) * 100).toFixed(1)}%`;
}

/**
 * Classify a pick into a conviction tier.
 *
 * CONVICTION requires ALL of: calibrated P ≥ CONVICTION_MIN_PROBABILITY,
 * edge = SPEAK, and a known CLV beat-rate ≥ CONVICTION_MIN_CLV_BEAT_RATE.
 * Otherwise LEAN if there is any independent edge and P clears break-even, else PASS.
 */
export function convictionTier(input: ConvictionInput): ConvictionResult {
  const p = Number.isFinite(input.calibratedProbability)
    ? clamp(input.calibratedProbability, 0, 1)
    : 0;
  const clv = input.clvBeatCloseRate;
  const reasons: string[] = [];

  if (p < CONVICTION_MIN_PROBABILITY) {
    reasons.push(
      `calibrated win probability ${pct(p)} is below the conviction floor ${pct(CONVICTION_MIN_PROBABILITY)}`,
    );
  }
  if (input.edgeDecision !== "SPEAK") {
    reasons.push(`edge decision is ${input.edgeDecision} (conviction needs SPEAK)`);
  }
  if (clv === null || clv === undefined) {
    reasons.push("no closing-line-value history on this segment yet");
  } else if (!Number.isFinite(clv) || clv < CONVICTION_MIN_CLV_BEAT_RATE) {
    reasons.push(
      `closing-line-value beat-rate ${pct(Number.isFinite(clv) ? clv : 0)} is below ${pct(CONVICTION_MIN_CLV_BEAT_RATE)}`,
    );
  }

  const meetsConvictionBar = reasons.length === 0;
  let tier: ConvictionTier;
  if (meetsConvictionBar) {
    tier = "CONVICTION";
  } else if (input.edgeDecision !== "PASS" && p >= BREAK_EVEN_PROBABILITY) {
    tier = "LEAN";
  } else {
    tier = "PASS";
  }

  return { tier, expectedWinRate: p, meetsConvictionBar, reasons };
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
