/**
 * arXiv 2009.06750: Stop the Clock: Are Timeout Effects Real?
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * MECHANISM (paper):
 * Causal effect of icing-the-kicker timeouts on FG/XP make probability on nflverse pbp (all FG/XP 1999-2024): propensity via GBM on confounders (kick distance, weather, kicker quality, score differential, time remaining, dome/outdoor) + exact match on distance bucket and same game, permutation inference; product: 'Icing the kicker is a myth' causal content series and pruning of spurious timeout-effect features from the late-game WP model.
 *
 * IMPROVEMENT (wiring-wave2 slice, verbatim):
 * Estimate the causal effect of icing-the-kicker timeouts on FG/XP make probability on nflverse pbp (all FG/XP attempts 1999-2024): propensity via GBM on confounders (kick distance, weather, kicker quality, score differential, time remaining, dome/outdoor) + exact match on distance bucket and same game, permutation inference; product: 'Icing the kicker is a myth' causal content series for @GalaxySportsHQ and pruning of spurious timeout-effect features from the late-game WP model.
 *
 * ACCEPTANCE GATE (verbatim):
 * ADAPT the DAG+matching template if the NFL icing replication achieves post-match SMD < 0.1 on all observed confounders AND the 99% permutation CI for the ATT either excludes 0 with |ATT| >= 0.03 (real effect -- publish) or includes 0 with CI half-width < 0.03 (clean null -- prune the feature). REJECT if balance fails or CI half-width > 0.05.
 *
 * Gate status: NOT EVALUATED. The gate requires historical walk-forward data
 * not available in this environment; it is documented here for future
 * evaluation. Pure functions below are exercised on synthetic data in the
 * adjacent test file.
 *
 * owner: Motif-lab | bucket: MODEL | lane: causal_injury | verdict: ADAPT | doctrine: SITUATIONAL
 */

export const ENABLED = false;

/** Stratified (exact-match) ATT: mean treated-minus-control within strata. */
export function stratifiedATT(y: number[], t: number[], strata: number[]): number {
  const sIds = [...new Set(strata)];
  let num = 0;
  let den = 0;
  for (const s of sIds) {
    const yt = y.filter((_, i) => strata[i] === s && t[i] === 1);
    const yc = y.filter((_, i) => strata[i] === s && t[i] === 0);
    if (yt.length === 0 || yc.length === 0) continue;
    const mt = yt.reduce((a, b) => a + b, 0) / yt.length;
    const mc = yc.reduce((a, b) => a + b, 0) / yc.length;
    num += yt.length * (mt - mc);
    den += yt.length;
  }
  return den === 0 ? NaN : num / den;
}

/** Permutation p-value for the stratified ATT (two-sided). */
export function permutationP(
  y: number[],
  t: number[],
  strata: number[],
  rand: () => number,
  B = 500,
): number {
  const obs = Math.abs(stratifiedATT(y, t, strata));
  let ge = 0;
  for (let b = 0; b < B; b++) {
    const tp = [...t];
    for (let i = tp.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      const tmp = tp[i]!;
      tp[i] = tp[j]!;
      tp[j] = tmp;
    }
    if (Math.abs(stratifiedATT(y, tp, strata)) >= obs) ge++;
  }
  return (ge + 1) / (B + 1);
}

/** Rosenbaum Gamma sensitivity: upper bound on the sign-test p-value. */
export function rosenbaumGammaBound(diffs: number[], Gamma: number): number {
  // matched-pair differences; worst-case p under hidden bias Gamma
  const n = diffs.length;
  const pos = diffs.filter((d) => d > 0).length;
  const pPlus = Gamma / (1 + Gamma);
  // normal approx to Binomial(n, pPlus) upper tail
  const m = n * pPlus;
  const sd = Math.sqrt(n * pPlus * (1 - pPlus));
  const z = (pos - 0.5 - m) / Math.max(1e-9, sd);
  return 1 - normalCdfR(z);
}

function normalCdfR(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989422804014327 * Math.exp(-x * x / 2);
  const p = d * t * (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return x > 0 ? 1 - p : p;
}

/** Genetic-matching-style balance objective: max |SMD| across covariates. */
export function maxAbsSmd(X: number[][], t: number[]): number {
  let m = 0;
  for (let j = 0; j < X[0]!.length; j++) {
    const col = X.map((row) => row[j]!);
    m = Math.max(m, Math.abs(smdLocal(col, t)));
  }
  return m;
}

function smdLocal(x: number[], t: number[]): number {
  const x1 = x.filter((_, i) => t[i] === 1);
  const x0 = x.filter((_, i) => t[i] === 0);
  const m1 = x1.reduce((a, b) => a + b, 0) / Math.max(1, x1.length);
  const m0 = x0.reduce((a, b) => a + b, 0) / Math.max(1, x0.length);
  return m1 - m0;
}
