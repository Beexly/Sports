
/** Multiplicative (overround-proportional) normalization baseline. */
export function multiplicativeNormalize(odds: readonly number[]): number[] {
  if (odds.length === 0) throw new Error("oo-epc: need >= 1 odd");
  const inv = odds.map((o) => {
    if (!(o > 1)) throw new Error("oo-epc: odds must exceed 1");
    return 1 / o;
  });
  const sum = inv.reduce((s, v) => s + v, 0);
  return inv.map((v) => v / sum);
}

/**
 * One-over-EPC calibration: shift raw implied probabilities by z*sigma_i so they
 * sum to the target, with multiplicative fallback if feasibility fails.
 *
 * The z-shift is constructed so that sum(out) === target exactly, so this
 * function returns a vector summing to `target` and does NOT renormalize.
 * Renormalizing here would discard a caller's non-unit target and would also
 * require clamping negative components to zero, which silently manufactures a
 * valid-looking probability vector out of an infeasible shift. Neither is
 * done: an infeasible shift throws.
 */
export function ooEpc(odds: readonly number[], target = 1): number[] {
  const p = odds.map((o) => {
    if (!(o > 1)) throw new Error("oo-epc: odds must exceed 1");
    return 1 / o;
  });
  if (!(target > 0)) throw new Error("oo-epc: target must be positive");
  const sigma = p.map((pi) => Math.sqrt((pi * (1 - pi)) / pi));
  const sumSigma = sigma.reduce((s, v) => s + v, 0);
  if (sumSigma < 1e-12) return multiplicativeNormalize(odds);
  const z = (p.reduce((s, v) => s + v, 0) - target) / sumSigma;
  const out = p.map((pi, i) => pi - z * (sigma[i] ?? 0));
  if (out.some((v) => v < -1e-12)) {
    throw new Error(
      "oo-epc: one-over shift is infeasible (a shifted probability is negative); " +
        "clamping it to zero would fabricate a probability vector, so refusing. " +
        "Use multiplicativeNormalize for a sound overround-proportional baseline.",
    );
  }
  return out;
}

/** FL-GLM: probabilities proportional to odds^(-beta). */
export function flGlm(odds: readonly number[], beta: number): number[] {
  if (odds.length === 0) throw new Error("oo-epc: need >= 1 odd");
  if (!(beta > 0)) throw new Error("oo-epc: beta must be positive");
  const w = odds.map((o) => {
    if (!(o > 1)) throw new Error("oo-epc: odds must exceed 1");
    return Math.pow(o, -beta);
  });
  const sum = w.reduce((s, v) => s + v, 0);
  return w.map((v) => v / sum);
}
