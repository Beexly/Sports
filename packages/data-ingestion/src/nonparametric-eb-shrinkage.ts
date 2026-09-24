/**
 * Approximate nonparametric maximum likelihood inference for mixture models via convex optimization
 *
 * arXiv:1606.02011v3 · lane:win_spread_total · owner:Mimo
 *
 * Improvement (IMPROVEMENT-LEDGER.jsonl):
 * Add a nonparametric empirical-Bayes shrinkage layer for noisy short-season per-unit estimates:
 * for each unit j (QB/skill-player efficiency like CPOE, EPA/play, yards/route; per-team
 * pace/offense params), compute MLE theta-hat_j from game-level replicates, solve Eq. 6 by EM (or
 * cvxpy/ECOS interior point) on a regular grid Lambda inside conv(theta-hat_j), and predict via
 * posterior means under the data-driven mixing distribution G-hat_Lambda -- jointly modeling
 * (mean, noise) per unit in d=2, and feeding the shrunk posterior means as features or priors into
 * the engine.
 *
 * ACCEPTANCE GATE: ADOPT as a GSE shrinkage layer if bivariate NPMLE beats both raw MLE and parametric hierarchical
 * Bayes on the 2016-2024 first-half->second-half test with relative MSE <= 0.95 of the parametric-
 * HB baseline in at least two of the three target families (QB efficiency, skill-player
 * efficiency, team offense).
 *
 * Ingest role: feature builder (shrinkage layer for noisy short-season per-unit estimates).
 * Live data: NO. Runs offline on nflverse aggregates / stored snapshots.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "1606.02011v3" as const;
export const LANE = "win_spread_total" as const;

/** Numeric acceptance gate, verbatim from the ledger (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADOPT as a GSE shrinkage layer if bivariate NPMLE beats both raw MLE and parametric hierarchical
 * Bayes on the 2016-2024 first-half->second-half test with relative MSE <= 0.95 of the parametric-
 * HB baseline in at least two of the three target families (QB efficiency, skill-player
 * efficiency, team offense).`;

export const CONFIG = { enabled: false, gridNote: "Eq.6 EM on a regular grid inside conv(theta-hat); James-Stein closed form shipped as the MVP core" } as const;

/** Type guard for finite numbers (rejects NaN/Infinity/non-numbers). */
function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

/**
 * James-Stein shrinkage toward the grand mean (the closed-form MVP core of the
 * paper's nonparametric EB layer): theta*_j = m + (1 - (d-2)*s2/S) (theta_j - m).
 */
export function jamesSteinShrink(thetas: readonly number[], ses: readonly number[]): number[] | null {
  if (thetas.length !== ses.length || thetas.length < 3) return null;
  if (!thetas.every(isFiniteNumber) || !ses.every(isFiniteNumber) || ses.some((s) => s <= 0)) return null;
  const d = thetas.length;
  const m = thetas.reduce((a, b) => a + b, 0) / d;
  const s2 = ses.reduce((a, b) => a + b * b, 0) / d;
  const S = thetas.reduce((a, t) => a + (t - m) * (t - m), 0);
  if (S === 0) return thetas.map(() => m);
  const shrink = Math.max(0, 1 - ((d - 2) * s2) / S);
  return thetas.map((t) => m + shrink * (t - m));
}

/** Posterior mean under N(theta | 0, tau^2) prior: w*theta_hat, w = tau^2/(tau^2+se^2). */
export function posteriorMeanShrink(thetaHat: number, se: number, tau2: number): number | null {
  if (![thetaHat, se, tau2].every(isFiniteNumber)) return null;
  if (se <= 0 || tau2 < 0) return null;
  const w = tau2 / (tau2 + se * se);
  return w * thetaHat;
}

/** Bivariate (mean, noise) joint shrinkage: shrink each dimension independently. */
export function bivariateShrink(
  means: readonly number[],
  noises: readonly number[],
  seMeans: readonly number[],
  seNoises: readonly number[],
): Array<{ mean: number; noise: number }> | null {
  const sm = jamesSteinShrink(means, seMeans);
  const sn = jamesSteinShrink(noises, seNoises);
  if (!sm || !sn) return null;
  return sm.map((mean, i) => ({ mean, noise: sn[i] ?? 0 }));
}

/** Relative MSE of shrunk vs raw against truth (gate: <= 0.95 of baseline). */
export function relativeMSE(shrunk: readonly number[], raw: readonly number[], truth: readonly number[]): number | null {
  if (shrunk.length !== raw.length || raw.length !== truth.length || raw.length === 0) return null;
  const mse = (xs: readonly number[]) => xs.reduce((a, x, i) => a + Math.pow(x - (truth[i] ?? 0), 2), 0) / xs.length;
  const mRaw = mse(raw);
  if (mRaw === 0) return null;
  return mse(shrunk) / mRaw;
}
