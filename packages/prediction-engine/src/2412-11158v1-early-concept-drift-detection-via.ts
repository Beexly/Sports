/**
 * arXiv:2412.11158v1 — Early Concept Drift Detection via Prediction Uncertainty
 *
 * Online Newton Predictor for nonstationary win-probability tracking: an online Newton step on the logistic
 * loss with an optimistic hint (yesterday's gradient), giving dynamic regret that scales with the path
 * variation, not the horizon.
 *
 * Improvement: Replace blunt refit-on-alarm with PU-index-weighted forgetting: weight training samples by an exponential forgetting factor keyed to the chi-square drift evidence, keeping old weeks at reduced weight instead of discarding them, since NFL regimes recur (returning QBs, seasonal weather) rather than being truly novel.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: ADOPT the detector into the weekly pipeline if, on 2020–2025 nflverse history: (i) PUDD fires ≥1 week earlier than the error-rate baseline on ≥60% of known regime-change episodes, (ii) false-alarm rate ≤2/season, and (iii) the drift-triggered refit policy does not degrade Brier by more than 0.002 vs the frozen baseline on non-drift weeks.
 */

/** Numerically stable logistic. */
export function logistic(x: number): number {
  if (x >= 0) {
    const e = Math.exp(-x);
    return 1 / (1 + e);
  }
  const e = Math.exp(x);
  return e / (1 + e);
}

/**
 * One ONP update on the logistic loss with an optimistic hint.
 * w <- w - H^{-1} (g + hint), H += g g^T + eps I (rank-1 sketch diagonal).
 */
export function onpUpdate(
  w: readonly number[],
  diagH: readonly number[],
  x: readonly number[],
  y: 0 | 1,
  hint: readonly number[],
  eps: number,
): { w: number[]; diagH: number[] } {
  if (w.length !== x.length || w.length !== hint.length) throw new Error("onpUpdate: dimension mismatch");
  const eta = x.reduce((s, v, i) => s + v * (w[i] ?? 0), 0);
  const p = logistic(eta);
  const g = x.map((xi) => (p - y) * xi);
  const newDiag = diagH.map((h, i) => h + g[i]! * g[i]! + eps);
  const step = g.map((gi, i) => (gi + (hint[i] ?? 0)) / (newDiag[i] ?? eps));
  return { w: w.map((wi, i) => wi - step[i]!), diagH: newDiag };
}

/** Path variation of a weight trajectory (regret-scale diagnostic). */
export function pathVariation(traj: readonly number[][]): number {
  let v = 0;
  for (let t = 1; t < traj.length; t++) {
    const a = traj[t - 1]!;
    const b = traj[t]!;
    v += Math.sqrt(a.reduce((s, av, i) => s + ((b[i] ?? 0) - av) ** 2, 0));
  }
  return v;
}
