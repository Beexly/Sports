/**
 * Conditional label-shift correction per slate archetype.
 *
 * NFL label shift is structured, not global. Estimate the base event rate
 * per slate archetype (divisional-heavy, bad-weather, prime-time, ...) from
 * history, then correct each week's predictions with the prior-probability
 * shift formula:
 *
 *   p_adj = p (pi1/pi0) / [ p (pi1/pi0) + (1-p) ((1-pi1)/(1-pi0)) ]
 *
 * where pi0 is the training base rate and pi1 the archetype's base rate.
 * A standing pre-game post-processing step.
 *
 * Pure TypeScript, no I/O.
 *
 * Reference: arXiv:2412.10871v1 — Fully Test-time Adaptation for Tabular
 * Data (FtaT).
 *
 * ACCEPTANCE GATE: on 2020-2025 walk-forward, slate-level calibration drift
 * cut by >= 30% vs uncorrected, weekly Brier not worse by > 0.001, ECE
 * neutral or better.
 */

/** Prior-probability-shift correction of one probability. */
export function labelShiftCorrect(p: number, pi0: number, pi1: number): number {
  if (!(p >= 0 && p <= 1)) throw new Error("slate-label-shift: p in [0,1]");
  if (!(pi0 > 0 && pi0 < 1)) throw new Error("slate-label-shift: pi0 in (0,1)");
  if (!(pi1 > 0 && pi1 < 1)) throw new Error("slate-label-shift: pi1 in (0,1)");
  const w1 = pi1 / pi0;
  const w0 = (1 - pi1) / (1 - pi0);
  const num = p * w1;
  return num / Math.max(num + (1 - p) * w0, 1e-12);
}

/** Correct a slate of predictions against its archetype base rate. */
export function correctSlate(
  probs: readonly number[],
  trainBaseRate: number,
  archetypeBaseRate: number,
): number[] {
  return probs.map((p) => labelShiftCorrect(p, trainBaseRate, archetypeBaseRate));
}

/** Estimate an archetype base rate from historical outcomes (Laplace-smoothed). */
export function archetypeBaseRate(outcomes: readonly number[], prior = 0.5, priorWeight = 10): number {
  if (outcomes.length === 0 && priorWeight <= 0) {
    throw new Error("slate-label-shift: need outcomes or a positive prior weight");
  }
  const hits = outcomes.reduce((s, y) => s + y, 0);
  return (hits + priorWeight * prior) / (outcomes.length + priorWeight);
}

/** Slate-level calibration drift: |mean p - base rate|. */
export function calibrationDrift(probs: readonly number[], baseRate: number): number {
  if (probs.length === 0) throw new Error("slate-label-shift: need >= 1 prob");
  const mean = probs.reduce((s, p) => s + p, 0) / probs.length;
  return Math.abs(mean - baseRate);
}
