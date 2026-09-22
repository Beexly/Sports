/**
 * Decoupled slate Kelly (portfolio staking for a weekly slate).
 *
 * For each week's slate of K picks: compute per-pick decoupled Kelly terms
 * from engine win prob and decimal odds (binary outcomes — closed form, no
 * integral), plus a shared risk penalty (1−P)·Σ_k Σ_j f_k f_j Cov(X_k, X_j)
 * using empirical same-slate outcome covariance. Maximize the combined
 * objective over stake fractions with Σ f_k ≤ maxExposure, 0 ≤ f_k ≤ cap —
 * the paper's Eq. 17 with binary X_k: cheaper than the joint (coupled)
 * optimization and richer than independent per-pick Kelly.
 *
 * @see arXiv:1710.00431v1 — "Kelly's Criterion in Portfolio Optimization: A Decoupled Problem"
 *
 * ACCEPTANCE GATE: ADAPT iff decoupled slate Kelly beats independent capped
 * Kelly on 2025-holdout log-growth with comparable or better drawdown —
 * else the coupling genuinely doesn't matter for GSE slates and per-pick
 * Kelly stands. The gate is a backtest concern; this module is the pure
 * staking kernel, not wired into any live path.
 */

export interface SlatePick {
  p: number; // engine win probability
  odds: number; // decimal odds
}

/** Independent (per-pick) Kelly fraction, capped. */
export function independentKelly(pick: SlatePick, cap = 0.25): number {
  const b = pick.odds - 1;
  if (!(pick.p > 0 && pick.p < 1) || !(b > 0)) return 0;
  return Math.max(0, Math.min(cap, (b * pick.p - (1 - pick.p)) / b));
}

/**
 * Decoupled slate objective at stake vector f:
 *   Σ_k [ f_k·E[X_k] ... ] − (1−P)·Σ_kΣ_j f_k f_j Cov(X_k,X_j)
 * where for binary X_k with payout b_k: E[X_k] = p_k·b_k − (1−p_k),
 * and the growth term uses the decoupled per-pick E[ln(1+f_k X_k)]
 * approximation. P = mean win prob (the paper's shared confidence).
 */
export function decoupledObjective(
  picks: readonly SlatePick[],
  f: readonly number[],
  cov: ReadonlyArray<readonly number[]>,
): number {
  const k = picks.length;
  let growth = 0;
  for (let i = 0; i < k; i++) {
    const { p, odds } = picks[i] ?? { p: 0.5, odds: 2 };
    const b = odds - 1;
    const fi = Math.max(0, f[i] ?? 0);
    growth += p * Math.log(1 + fi * b) + (1 - p) * Math.log(Math.max(1e-12, 1 - fi));
  }
  const pMean = picks.reduce((s, q) => s + q.p, 0) / Math.max(1, k);
  let penalty = 0;
  for (let i = 0; i < k; i++) {
    for (let j = 0; j < k; j++) {
      penalty += (f[i] ?? 0) * (f[j] ?? 0) * (cov[i]?.[j] ?? 0);
    }
  }
  return growth - (1 - pMean) * penalty;
}

/**
 * Maximize the decoupled objective by projected coordinate ascent:
 * per-pick 1-D golden-section steps, then project onto
 * {Σ f ≤ maxExposure, 0 ≤ f_k ≤ cap}.
 */
export function decoupledSlateKelly(
  picks: readonly SlatePick[],
  cov: ReadonlyArray<readonly number[]>,
  maxExposure = 1.0,
  cap = 0.25,
  iters = 40,
): number[] {
  const k = picks.length;
  if (k === 0) return [];
  let f = picks.map((q) => independentKelly(q, cap));
  const project = (v: number[]): number[] => {
    let u = v.map((x) => Math.min(cap, Math.max(0, x)));
    const total = u.reduce((a, b) => a + b, 0);
    if (total > maxExposure) u = u.map((x) => (x * maxExposure) / total);
    return u;
  };
  const objAt = (vec: number[]): number => decoupledObjective(picks, vec, cov);
  for (let it = 0; it < iters; it++) {
    for (let i = 0; i < k; i++) {
      const gr = (Math.sqrt(5) - 1) / 2;
      let a = 0;
      let bnd = cap;
      let c = bnd - gr * (bnd - a);
      let d = a + gr * (bnd - a);
      const trial = (x: number): number => {
        const v = [...f];
        v[i] = x;
        return objAt(project(v));
      };
      for (let s = 0; s < 30; s++) {
        if (trial(c) < trial(d)) a = c;
        else bnd = d;
        c = bnd - gr * (bnd - a);
        d = a + gr * (bnd - a);
      }
      f[i] = (a + bnd) / 2;
      f = project(f);
    }
  }
  return project(f);
}
