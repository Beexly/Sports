
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
 */
export function ooEpc(odds: readonly number[], target = 1): number[] {
  const p = odds.map((o) => {
    if (!(o > 1)) throw new Error("oo-epc: odds must exceed 1");
    return 1 / o;
  });
  const sigma = p.map((pi) => Math.sqrt((pi * (1 - pi)) / pi));
  const sumSigma = sigma.reduce((s, v) => s + v, 0);
  if (sumSigma < 1e-12) return multiplicativeNormalize(odds);
  const z = (p.reduce((s, v) => s + v, 0) - target) / sumSigma;
  const out = p.map((pi, i) => pi - z * (sigma[i] ?? 0));
  const feasible = out.every((v) => v >= -1e-12) && Math.abs(out.reduce((s, v) => s + v, 0) - target) < 1e-6;
  if (!feasible) return multiplicativeNormalize(odds);
  const sum = out.reduce((s, v) => s + v, 0);
  return out.map((v) => Math.max(v, 0) / sum);
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
