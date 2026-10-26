/**
 * Published-probability recalibration toward the market.
 *
 * MEASURED 2026-10-23 over 552 settled production picks (read-only, hermes_ro):
 *
 *   hit rate .5217 v mean stated probability .5627 -> 4.1 points OVERCONFIDENT
 *   correlation of stated probability with the result: only .1114
 *   Brier .2532 v market .2158 v coin .2500 — the engine's own number loses to
 *   both the close and to saying 50% every time.
 *
 * Bands show where it fails. Bands at .45-.55 hit .433-.488 and .60+ hit .615
 * against a stated .679: overconfident through the middle and the top, roughly
 * calibrated only at the bottom.
 *
 * The honest response is not a rewrite — it is to admit the number carries little
 * of its own information and let the market carry the rest. Fitting an engine
 * weight on the oldest 70% (n=386) chose w=0.15; on the untouched newest 30%
 * (n=166) that scored .2314 against the engine's .2642 and the market's .2299.
 * So 85% market recovers almost all of the gap, and the engine's 15% is what is
 * left of its claim to know something the close does not.
 *
 * NOT A MODEL. A single monotone mix, one fitted constant, no per-market fit and
 * no isotonic map — those exist in calibration/ and need their own audit. This is
 * the smallest change that stops shipping a number worse than 0.5.
 */

/** Weight on the engine's own probability. Fitted, not chosen. */
export const ENGINE_WEIGHT = 0.15;

/** Published probabilities never ship outside this band. */
export const PROB_FLOOR = 0.01;
export const PROB_CEIL = 0.99;

export interface RecalibratedProbability {
  readonly prob: number;
  readonly engineWeight: number;
  /** False when there was no market number and the engine figure passed through. */
  readonly placed: boolean;
}

export function recalibrateProbability(
  engineProb: number | null | undefined,
  marketFairProb: number | null | undefined,
): RecalibratedProbability | null {
  const e = finiteUnit(engineProb);
  const m = finiteUnit(marketFairProb);

  if (e === null && m === null) return null;
  // No market: pass the engine figure through and say so, rather than inventing
  // a 0.5 prior that would look like information.
  if (m === null) return { prob: clamp(e as number), engineWeight: 1, placed: false };
  if (e === null) return { prob: clamp(m), engineWeight: 0, placed: false };

  return { prob: clamp(ENGINE_WEIGHT * e + (1 - ENGINE_WEIGHT) * m), engineWeight: ENGINE_WEIGHT, placed: true };
}

function finiteUnit(v: number | null | undefined): number | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  if (v <= 0 || v >= 1) return null;
  return v;
}

function clamp(p: number): number {
  return Math.min(PROB_CEIL, Math.max(PROB_FLOOR, p));
}

/**
 * Brier of the recalibrated number on the calibration sample, for regression
 * pinning. Values are the measured .2532 / .2158 cell means expressed through the
 * mix; recomputed rather than hard-coded so a weight edit shows up in the test.
 */
export function expectedBrier(engineBrier: number, marketBrier: number): number {
  // Brier is not linear in p, so this is a lower bound on the achievable gain and
  // is documented as such rather than presented as the measured test figure.
  return ENGINE_WEIGHT * engineBrier + (1 - ENGINE_WEIGHT) * marketBrier;
}
