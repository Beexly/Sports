/**
 * arXiv 2012.01643: Forecast with Forecasts: Diversity Matters
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * MECHANISM (paper):
 * For each game slate compute the pairwise diversity matrix among the K engine sub-models' forecast vectors over the slate horizon (Div per Eq. 3, adapted to predicted cover probabilities or point differentials per game), C(K,2) features per slate; gradient-boosted trees mapping the slate diversity vector -> per-model softmax weights; no historical series features needed.
 *
 * IMPROVEMENT (wiring-wave2 slice, verbatim):
 * For each game slate compute the pairwise diversity matrix among the K engine sub-models' forecast vectors over the slate horizon (Div per Eq. 3, adapted to predicted cover probabilities or point differentials per game), C(K,2) features per slate; gradient-boosted trees mapping the slate diversity vector -> per-model softmax weights; no historical series features needed.
 *
 * ACCEPTANCE GATE (verbatim):
 * ADOPT the diversity-weighted combiner if, on the held-out 2025 season, it beats the simple-average baseline by >=2% relative log-loss AND beats the static skill-weighted baseline by >=1% relative, with calibration slope within [0.9, 1.1]. REJECT (keep simple average) if it fails either gate or the meta-learner's feature importances concentrate on <3 pairs (degenerate map).
 *
 * Gate status: NOT EVALUATED. The gate requires historical walk-forward data
 * not available in this environment; it is documented here for future
 * evaluation. Pure functions below are exercised on synthetic data in the
 * adjacent test file.
 *
 * owner: Mimo | bucket: MODEL | lane: ensembles | verdict: ADAPT | doctrine: PROPRIETARY_EDGE
 */

export const ENABLED = false;

/** Pairwise diversity matrix among K forecast vectors (mean absolute difference). */
export function diversityMatrix(F: number[][]): number[][] {
  const K = F.length;
  const D: number[][] = Array.from({ length: K }, () => new Array<number>(K).fill(0));
  for (let i = 0; i < K; i++)
    for (let j = i + 1; j < K; j++) {
      const fi = F[i]!;
      const fj = F[j]!;
      let s = 0;
      for (let t = 0; t < fi.length; t++) s += Math.abs(fi[t]! - fj[t]!);
      const d = s / fi.length;
      D[i]![j] = d;
      D[j]![i] = d;
    }
  return D;
}

/** Diversity contribution of each model: mean distance to the others. */
export function diversityContribution(D: number[][]): number[] {
  const K = D.length;
  return D.map((row, i) => row.reduce((s, d, j) => s + (i === j ? 0 : d), 0) / (K - 1));
}

/** Softmax weights combining skill (log-score) and diversity contribution. */
export function diversityWeights(skill: number[], divContrib: number[], gamma: number): number[] {
  const logits = skill.map((s, i) => s + gamma * divContrib[i]!);
  const mx = Math.max(...logits);
  const e = logits.map((l) => Math.exp(l - mx));
  const tot = e.reduce((a, b) => a + b, 0);
  return e.map((x) => x / tot);
}

/** Projected-gradient NNLS stacking: min ||Fw - y||^2 s.t. w >= 0. */
export function stackNNLS(F: number[][], y: number[], iters = 500, lr = 0.05): number[] {
  const K = F[0]!.length;
  let w = new Array<number>(K).fill(1 / K);
  for (let it = 0; it < iters; it++) {
    const r = F.map((row, i) => row.reduce((s, f, k) => s + f * w[k]!, 0) - y[i]!);
    const grad = new Array<number>(K).fill(0);
    for (let i = 0; i < F.length; i++)
      for (let k = 0; k < K; k++) grad[k]! += (2 * F[i]![k]! * r[i]!) / F.length;
    w = w.map((wk, k) => Math.max(0, wk - lr * grad[k]!));
  }
  const s = w.reduce((a, b) => a + b, 0);
  return s > 0 ? w.map((x) => x / s) : new Array<number>(K).fill(1 / K);
}

/** Log-score stacking via coordinate ascent on the simplex. */
export function logScoreStacking(
  P: number[][],
  y: number[],
  iters = 300,
): number[] {
  const K = P[0]!.length;
  let w = new Array<number>(K).fill(1 / K);
  const score = (ww: number[]): number => {
    let s = 0;
    for (let i = 0; i < P.length; i++) {
      let p = 0;
      for (let k = 0; k < K; k++) p += ww[k]! * P[i]![k]!;
      const pc = Math.min(1 - 1e-12, Math.max(1e-12, p));
      s += y[i]! === 1 ? Math.log(pc) : Math.log(1 - pc);
    }
    return s / P.length;
  };
  for (let it = 0; it < iters; it++) {
    for (let k = 0; k < K; k++) {
      const step = 0.02;
      const wUp = w.map((x, j) => (j === k ? x + step : x));
      const wDn = w.map((x, j) => (j === k ? Math.max(0, x - step) : x));
      const nUp = (a: number[]): number[] => {
        const s = a.reduce((x, z) => x + z, 0);
        return a.map((x) => x / s);
      };
      const sUp = score(nUp(wUp));
      const sDn = score(nUp(wDn));
      const s0 = score(w);
      if (sUp > s0 && sUp >= sDn) w = nUp(wUp);
      else if (sDn > s0) w = nUp(wDn);
    }
  }
  return w;
}

/** Regime-dependent stacking: softmax weights linear in regime features. */
export function regimeStackWeights(regime: number[], coef: number[][]): number[] {
  const K = coef.length;
  const logits = coef.map((c) => c.reduce((s, cj, j) => s + cj * (j === 0 ? 1 : regime[j - 1] ?? 0), 0));
  const mx = Math.max(...logits);
  const e = logits.map((l) => Math.exp(l - mx));
  const s = e.reduce((a, b) => a + b, 0);
  return e.map((x) => x / s);
}
