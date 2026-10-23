/**
 * Safety availability and explosive passes — the effect runs BACKWARDS to the
 * intuitive story, and backwards to what the spec encoded.
 *
 * MEASURED 2026-10-23, BDB 2023-2025: 527 defence-games with >=8 targets, 109
 * with a starting safety ruled Out (starters derived from prior-game snap share
 * >= 0.5, so no depth-chart staleness). With a safety out, explosive-pass rate
 * FALLS from 18.2% to 15.6% — coefficient -0.0258, p=.033, defence fixed
 * effects. CB availability is flat on the same outcome (+0.0036, p=.702), so
 * there is no CB bit to build.
 *
 * Mechanism, coherent with the sign: with a safety down, defences move to
 * deeper and softer shells and trade underneath access for protection over the
 * top. YAC-over-expected is flat alongside it (p=.366), which is what a
 * shell change looks like rather than a talent loss.
 *
 * Four attempts preceded this: safety->slot separation was +0.272 (p=.002) in
 * 2025, -0.114 (p=.22) in 2024 and -0.142 (p=.45) in 2023, so separation was
 * never a stable channel for safeties. Explosives are.
 *
 * The effect is small (2.6 pp on an 18% base) and the treated sample is 109
 * games, so this is a low-weight flag, not a lever.
 */

/** League base explosive-pass rate (>=15 yards), 2023-2025. */
export const BASE_EXPLOSIVE_RATE = 0.1822;

/** Reduction per starting safety out. */
export const SAFETY_OUT_EXPLOSIVE_DELTA = -0.0258;

/** Cap on how far the adjustment can travel before it is extrapolation. */
export const MAX_SAFETY_OUTS = 2;

/**
 * Adjusted explosive rate for a defence given how many starting safeties are
 * out. Clamped at 0 — the effect is linear over the 0-2 range observed and
 * there is no evidence past that.
 */
export function explosiveRateWithSafetyOuts(base: number, outs: number): number {
  if (!Number.isFinite(base)) return BASE_EXPLOSIVE_RATE;
  const n = Math.min(MAX_SAFETY_OUTS, Math.max(0, Math.trunc(outs)));
  return Math.max(0, base + n * SAFETY_OUT_EXPLOSIVE_DELTA);
}

/**
 * Multiplier form for callers that scale rather than add. 0 outs returns 1.
 */
export function explosiveMultiplierForSafetyOuts(base: number, outs: number): number {
  if (!Number.isFinite(base) || base <= 0) return 1;
  return explosiveRateWithSafetyOuts(base, outs) / base;
}

/** True when the sign should surprise a reader trained on "safety out = bombs". */
export function isReversedVsFolkModel(): true {
  return true;
}
