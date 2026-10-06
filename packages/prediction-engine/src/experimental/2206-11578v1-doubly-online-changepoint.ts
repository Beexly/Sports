/**
 * arXiv 2206.11578v1: Doubly-online changepoint detection for monitoring health status during sports activities
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * MECHANISM (paper):
 * Build a between-online changepoint monitor over weekly player series (EPA/play, snap share, NGS top speed/acceleration, target share): segment-specific latent trend + week-specific disturbance (game script, opponent), linear-Gaussian state space + online EM; alert when P(changepoint) > delta -> prop-model flag + feature freeze until the new segment has >=3 weeks (delta tuned for high sensitivity -- missing an injury is worse than a false flag); second use = team-level regime detection on offensive EPA/play to trigger model refits; then make the changepoint prior covariate-dependent lambda(X) (injury history, age, snap load, days rest) and allow game-script covariates to modulate week-specific states.
 *
 * IMPROVEMENT (wiring-wave2 slice, verbatim):
 * Build a between-online changepoint monitor over weekly player series (EPA/play, snap share, NGS top speed/acceleration, target share): segment-specific latent trend + week-specific disturbance (game script, opponent), linear-Gaussian state space + online EM; alert when P(changepoint) > delta -> prop-model flag + feature freeze until the new segment has >=3 weeks (delta tuned for high sensitivity — missing an injury is worse than a false flag); second use = team-level regime detection on offensive EPA/play to trigger model refits; then make the changepoint prior covariate-dependent lambda(X) (injury history, age, snap load, days rest) and allow game-script covariates to modulate week-specific states.
 *
 * ACCEPTANCE GATE (verbatim):
 * Accept iff it beats CUSUM on F1 against injury/role-change ground truth on 2019-2023 AND the within-+-1-week precision justifies the alert volume (<=2 flags per team-week on average); REJECT if the changepoint rate approaches the paper's 40% (pure noise) or EM fails to converge on 17-game series — fall back to BOCPD.
 *
 * Gate status: NOT EVALUATED. The gate requires historical walk-forward data
 * not available in this environment; it is documented here for future
 * evaluation. Pure functions below are exercised on synthetic data in the
 * adjacent test file.
 *
 * owner: Motif-lab | bucket: MODEL | lane: experimental | verdict: ADAPT | doctrine: PROPRIETARY_EDGE
 */

export const ENABLED = false;

/**
 * Two-sided Page's CUSUM changepoint detector; returns alarm indices.
 * The in-control mean is estimated from an initial Phase-I window
 * (first 50 points or first quarter of the series, whichever is smaller);
 * the series is assumed to start in control. A global mean must NOT be
 * used as the reference: after a level shift it sits between the regimes
 * and guarantees false alarms on both sides.
 */
export function cusumDetect(xs: number[], k: number, h: number): number[] {
  const alarms: number[] = [];
  const w = Math.max(5, Math.min(50, Math.floor(xs.length / 4)));
  const m = xs.slice(0, w).reduce((a, b) => a + b, 0) / w;
  let gPos = 0;
  let gNeg = 0;
  for (let i = 0; i < xs.length; i++) {
    gPos = Math.max(0, gPos + xs[i]! - m - k);
    gNeg = Math.max(0, gNeg + m - k - xs[i]!);
    if (gPos > h || gNeg > h) {
      alarms.push(i);
      gPos = 0;
      gNeg = 0;
    }
  }
  return alarms;
}

/**
 * Bayesian Online Changepoint Detection (Adams-MacKay) for 1D Gaussian data
 * with Normal-Gamma prior (mu0, kappa0, alpha0, beta0). Returns per-time-step
 * changepoint probability P(r_t = 0 | x_1..t).
 */
export function bocpdLite(
  xs: number[],
  hazard: number,
  mu0: number,
  kappa0: number,
  alpha0: number,
  beta0: number,
): number[] {
  // run-length distribution R[t][r]
  let R = new Map<number, number>([[0, 1]]);
  let muT: number[] = [mu0];
  let kaT: number[] = [kappa0];
  let alT: number[] = [alpha0];
  let beT: number[] = [beta0];
  const cpProb: number[] = [];
  for (const x of xs) {
    const Rnext = new Map<number, number>();
    let total = 0;
    // growth
    for (const [r, pr] of R) {
      const mu = muT[r]!;
      const ka = kaT[r]!;
      const al = alT[r]!;
      const be = beT[r]!;
      const pred = studentTPdf(x, mu, (be * (ka + 1)) / (al * ka), 2 * al);
      const w = pr * (1 - hazard) * pred;
      Rnext.set(r + 1, (Rnext.get(r + 1) ?? 0) + w);
      total += w;
    }
    // changepoint: a fresh run starts from the prior, so the changepoint
    // branch uses the PRIOR predictive density for all runs
    const priorPred = studentTPdf(x, mu0, (beta0 * (kappa0 + 1)) / (alpha0 * kappa0), 2 * alpha0);
    let cpMass = 0;
    for (const [, pr] of R) cpMass += pr;
    const cpW = cpMass * hazard * priorPred;
    Rnext.set(0, cpW);
    total += cpW;
    const norm = Math.max(1e-300, total);
    for (const [r, w] of Rnext) Rnext.set(r, w / norm);
    cpProb.push((Rnext.get(0) ?? 0));
    // update sufficient statistics per run length
    const maxR = Math.max(...Rnext.keys());
    const nmu: number[] = new Array<number>(maxR + 1).fill(mu0);
    const nka: number[] = new Array<number>(maxR + 1).fill(kappa0);
    const nal: number[] = new Array<number>(maxR + 1).fill(alpha0);
    const nbe: number[] = new Array<number>(maxR + 1).fill(beta0);
    for (const [r] of Rnext) {
      if (r === 0) continue;
      const pr = r - 1;
      const mu = pr < muT.length ? muT[pr]! : mu0;
      const ka = pr < kaT.length ? kaT[pr]! : kappa0;
      const al = pr < alT.length ? alT[pr]! : alpha0;
      const be = pr < beT.length ? beT[pr]! : beta0;
      nmu[r] = (ka * mu + x) / (ka + 1);
      nka[r] = ka + 1;
      nal[r] = al + 0.5;
      nbe[r] = be + (ka * (x - mu) * (x - mu)) / (2 * (ka + 1));
    }
    muT = nmu; kaT = nka; alT = nal; beT = nbe;
    R = Rnext;
  }
  return cpProb;
}

function studentTPdf(x: number, mu: number, sig2: number, nu: number): number {
  const z = (x - mu) / Math.sqrt(Math.max(1e-12, sig2));
  // normal approximation to t for stability
  return Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI * Math.max(1e-12, sig2));
}
