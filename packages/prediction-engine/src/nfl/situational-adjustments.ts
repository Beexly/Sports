/**
 * The application seam for the situational registry: one place that turns
 * measured verdicts into projection adjustments, so call sites never hard-code a
 * coefficient and never resurrect a killed one.
 *
 * Weights come from `situational-constants.ts`. This module only APPLIES them.
 */

import { constantWeight } from "./situational-constants";
import { kneeldownExpectedHaircutYd, type VictoryFormationState } from "./kneeldown-mass";
import { explosiveMultiplierForSafetyOuts, BASE_EXPLOSIVE_RATE } from "./safety-explosive";

export interface SituationalInputs {
  /** QB rush projection, yards. Haircut only applies when provided. */
  readonly qbRushYards?: number | null;
  readonly victoryFormation?: VictoryFormationState | null;
  /** Baseline explosive-pass rate for the defence, if known. */
  readonly baseExplosiveRate?: number | null;
  readonly safetiesOut?: number;
  /** Starting interior linemen ruled out — weight is 0, kept for reporting. */
  readonly interiorLinemenOut?: number;
  /** Starting ILBs out — small parked weight. */
  readonly insideLinebackersOut?: number;
}

export interface SituationalAdjustment {
  readonly key: string;
  readonly delta: number;
  /** Informational multiplier form where the term is monotone. */
  readonly multiplier?: number;
  readonly note: string;
}

export interface SituationalResult {
  readonly adjustments: readonly SituationalAdjustment[];
  readonly qbRushYards: number | null;
  readonly explosiveMultiplier: number;
  /** Terms with weight 0 that were still evaluated, so callers can show them. */
  readonly inert: readonly string[];
}

/**
 * Apply the registry. Nulls pass through untouched — absence is not a zero, and
 * imputing it would turn a missing input into a confident adjustment.
 */
export function applySituationalAdjustments(input: SituationalInputs): SituationalResult {
  const adjustments: SituationalAdjustment[] = [];
  const inert: string[] = [];

  let qbRush = typeof input.qbRushYards === "number" ? input.qbRushYards : null;
  const kneelWeight = constantWeight("kneeldown_haircut");
  if (qbRush !== null && input.victoryFormation && kneelWeight > 0) {
    const delta = kneeldownExpectedHaircutYd(input.victoryFormation) * kneelWeight;
    if (delta !== 0) {
      adjustments.push({
        key: "kneeldown_haircut",
        delta,
        note: "victory-formation kneels, -1.06 yd mass scaled by entry probability",
      });
      qbRush += delta;
    }
  } else if (qbRush !== null) {
    inert.push("kneeldown_haircut");
  }

  const base = input.baseExplosiveRate ?? null;
  const safetyWeight = constantWeight("safety_out_explosive");
  let explosiveMultiplier = 1;
  if (base !== null && input.safetiesOut && safetyWeight > 0) {
    const raw = explosiveMultiplierForSafetyOuts(base, input.safetiesOut);
    explosiveMultiplier = 1 + (raw - 1) * safetyWeight;
    if (explosiveMultiplier !== 1) {
      adjustments.push({
        key: "safety_out_explosive",
        delta: (explosiveMultiplier - 1) * 100,
        multiplier: explosiveMultiplier,
        note: "REVERSED vs folk model: safeties out cut explosives (deeper shells)",
      });
    }
  }

  // Evaluated but inert by design — reported so their absence is visible.
  if ((input.interiorLinemenOut ?? 0) > 0) inert.push("interior_ol_penalty");
  if ((input.insideLinebackersOut ?? 0) > 0) inert.push("mutual_ilb_cb_override");

  return { adjustments, qbRushYards: qbRush, explosiveMultiplier, inert };
}

/** Convenience: explosive rate after the flag, for callers holding only a rate. */
export function situationalExplosiveRate(input: SituationalInputs): number | null {
  const base = input.baseExplosiveRate ?? null;
  if (base === null) return null;
  return base * applySituationalAdjustments(input).explosiveMultiplier;
}

export { BASE_EXPLOSIVE_RATE };
