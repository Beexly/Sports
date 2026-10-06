/**
 * Block-Poisson chance-rate layer for team scoring chances.
 *
 * Data: nflverse play-by-play 2015–2025. A "scoring chance" = a drive
 * reaching the opponent's 35-yard line (or EPA-based: drive with max EPA
 * play > threshold). Games are split into 8 × ~7.5-minute blocks; chance
 * counts N^j_{t,k} ~ Poisson(λ) with
 *   log λ = θ^j_off − θ^opp_def + home·γ + α·(score differential at block
 *   start) + β·(turnover/penalty state proxy),   Σθ = 0.
 * Fit weekly-expanding; posterior θ = the team's "chance-creation ability"
 * — a feature in the engine's totals model and a matchup input (offense
 * chance-creation vs defense chance-suppression).
 *
 * @see arXiv:1802.08664 — "Modeling goal chances in soccer: a Bayesian inference approach"
 *
 * ACCEPTANCE GATE: ADOPT the block-Poisson chance-rate layer iff, on 2025
 * held-out games, it improves the Dawid-Sebastiani score for team
 * scoring-chance counts over the constant-rate baseline by ≥ 5% AND the
 * posterior θ feature improves totals-pick Brier by ≥ 0.001 vs v5.2.7;
 * REJECT if neither gate clears. The gate is a backtest concern; this module
 * is the pure Poisson kernel, not wired into any live path.
 */

export interface BlockObs {
  teamOff: string;
  teamDef: string;
  home: boolean;
  scoreDiff: number; // score differential at block start (offense perspective)
  chaos: number; // turnover/penalty state proxy
  chances: number; // observed scoring-chance count
}

export interface ChanceRateParams {
  offTheta: Record<string, number>;
  defTheta: Record<string, number>;
  homeGamma: number;
  alpha: number;
  beta: number;
  baseRate: number;
}

/** log λ for one block observation. */
export function logLambda(obs: BlockObs, p: ChanceRateParams): number {
  return (
    Math.log(Math.max(1e-9, p.baseRate)) +
    (p.offTheta[obs.teamOff] ?? 0) -
    (p.defTheta[obs.teamDef] ?? 0) +
    (obs.home ? p.homeGamma : 0) +
    p.alpha * obs.scoreDiff +
    p.beta * obs.chaos
  );
}

/** Poisson log-likelihood of the block observations. */
export function poissonLogLik(obs: readonly BlockObs[], p: ChanceRateParams): number {
  let ll = 0;
  for (const o of obs) {
    const lam = Math.exp(logLambda(o, p));
    ll += o.chances * Math.log(lam) - lam; // −log(chances!) is constant
  }
  return ll;
}

/**
 * Dawid–Sebastiani score for count forecasts: (y − μ)²/σ² + log σ²,
 * with μ = σ² = λ under Poisson. Lower is better.
 */
export function dawidSebastiani(obs: readonly BlockObs[], p: ChanceRateParams): number {
  if (obs.length === 0) return NaN;
  let s = 0;
  for (const o of obs) {
    const lam = Math.max(1e-9, Math.exp(logLambda(o, p)));
    s += ((o.chances - lam) ** 2) / lam + Math.log(lam);
  }
  return s / obs.length;
}

/**
 * Fit by gradient ascent on the Poisson log-likelihood with a sum-to-zero
 * projection on θ after each step (identifiability).
 */
export function fitChanceRates(
  obs: readonly BlockObs[],
  lr = 0.05,
  iters = 500,
): ChanceRateParams {
  const teams = [...new Set(obs.flatMap((o) => [o.teamOff, o.teamDef]))];
  const p: ChanceRateParams = {
    offTheta: Object.fromEntries(teams.map((t) => [t, 0])),
    defTheta: Object.fromEntries(teams.map((t) => [t, 0])),
    homeGamma: 0,
    alpha: 0,
    beta: 0,
    baseRate: 1,
  };
  const project = (): void => {
    for (const key of ["offTheta", "defTheta"] as const) {
      const vals = teams.map((t) => p[key][t] ?? 0);
      const mean = vals.reduce((a, b) => a + b, 0) / Math.max(1, vals.length);
      for (const t of teams) p[key][t] = (p[key][t] ?? 0) - mean;
    }
  };
  // scoreDiff is O(±10) while other regressors are O(1): fit alpha on the
  // rescaled feature and back-transform exactly (alpha = alphaFit / 10).
  const SD_SCALE = 10;
  for (let it = 0; it < iters; it++) {
    const grad = {
      off: Object.fromEntries(teams.map((t) => [t, 0])),
      def: Object.fromEntries(teams.map((t) => [t, 0])),
      home: 0,
      alpha: 0,
      beta: 0,
      base: 0,
    };
    for (const o of obs) {
      const lam = Math.exp(logLambda(o, p));
      const resid = o.chances - lam;
      grad.off[o.teamOff] = (grad.off[o.teamOff] ?? 0) + resid;
      grad.def[o.teamDef] = (grad.def[o.teamDef] ?? 0) - resid;
      if (o.home) grad.home += resid;
      grad.alpha += resid * (o.scoreDiff / SD_SCALE);
      grad.beta += resid * o.chaos;
      grad.base += resid / Math.max(1e-9, p.baseRate);
    }
    const n = Math.max(1, obs.length);
    for (const t of teams) {
      p.offTheta[t] = (p.offTheta[t] ?? 0) + (lr * (grad.off[t] ?? 0)) / n;
      p.defTheta[t] = (p.defTheta[t] ?? 0) + (lr * (grad.def[t] ?? 0)) / n;
    }
    p.homeGamma += (lr * grad.home) / n;
    // alphaFit accumulates on the scaled feature; store per-point alpha.
    p.alpha += ((lr * grad.alpha) / n) / SD_SCALE;
    p.beta += (lr * grad.beta) / n;
    p.baseRate = Math.max(0.05, p.baseRate + (lr * grad.base) / n);
    project();
  }
  return p;
}
