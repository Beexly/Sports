/**
 * arXiv 2110.03874: Uncertainty Quantification in the Bradley-Terry-Luce Model.
 *
 * ADDITIVE utility. Not wired into any publish path (wiring changes published picks and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: Uncertainty quantification for Bradley-Terry ratings: rolling 3-season BT-MLE with centering constraint 1^T theta = 0 and a jointly-estimated home-field term h; asymptotic SEs -> 90% CIs on win probabilities; abstention when the CI covers 0.5; time-varying variant with exponentially decayed pseudo-counts (lambda in {0.90, 0.95, 0.98}) tracking in-season strength changes.
 *
 * Improvement (wiring wave-2 slice CALIBRATE):
 * Add the SE/CI machinery as post-processing on GSE's BT/Elo ratings: rolling 3-season window BT-MLE with centering constraint 1^T theta = 0 (LBFGS on l_n(theta), eq. 2.3; n=32 so trivial compute), an explicit HFA term h estimated jointly (fold into features before the BT fit if needed), exponential recency weights (the paper assumes static theta*, so windowing is the stationarity hack); emit per-game win-probability point estimates plus 90% CIs from the paper's asymptotic SEs; add an abstention policy (skip games where the CI covers 0.5) — then test a time-varying variant: exponentially decayed pseudo-counts inside the likelihood itself (game (i,j) at lag t weighted by lambda^t, lambda in {0.90, 0.95, 0.98}) with decay-weighted rho_i^{(lambda)} for the SEs, hypothesizing the decay-weighted fit tracks in-season strength changes (injuries, QB swaps) faster so its CIs stay calibrated late-season.
 *
 * ACCEPTANCE GATE:
 * ADOPT the SE/CI machinery if, on the 2024-2025 test window: (i) empirical coverage of the 90% win-probability CIs falls in [87%, 93%] overall AND within +-4pp of 90% in at least 8 of 10 predicted-probability deciles; and (ii) the abstention policy (skip CI-covers-0.5 games) achieves Brier >= 0.005 better than the always-bet BT baseline on the games it does bet.
 *
 * ENABLED=false: post-processing on BT/Elo ratings; needs a human call.
 */


export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const ENABLED = false;

export interface GameResult {
  /** Team indices into the strength vector. */
  readonly home: number;
  readonly away: number;
  /** 1 if home won, 0 if away won. */
  readonly homeWin: 0 | 1;
  /** Recency weight (1 = static fit; lambda^t for the decayed variant). */
  readonly weight?: number;
}

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

/**
 * BT-MLE with centering constraint sum(theta) = 0 and home-field term h:
 * P(home wins) = sigmoid(theta_home - theta_away + h). Projected gradient ascent.
 */
export function btFit(
  nTeams: number,
  games: readonly GameResult[],
  nIter = 2000,
  lr = 0.05,
): { theta: number[]; h: number } {
  const theta = new Array(nTeams).fill(0);
  let h = 0;
  for (let it = 0; it < nIter; it++) {
    const gTheta = new Array(nTeams).fill(0);
    let gH = 0;
    for (const g of games) {
      const w = g.weight ?? 1;
      const s = theta[g.home] - theta[g.away] + h;
      const p = sigmoid(s);
      const err = w * (g.homeWin - p);
      gTheta[g.home] += err;
      gTheta[g.away] -= err;
      gH += err;
    }
    for (let i = 0; i < nTeams; i++) theta[i] += lr * gTheta[i];
    h += lr * gH;
    // project onto sum(theta) = 0
    const m = theta.reduce((a, b) => a + b, 0) / nTeams;
    for (let i = 0; i < nTeams; i++) theta[i] -= m;
  }
  return { theta, h };
}

/**
 * Asymptotic standard errors from the observed Fisher information
 * (diagonal of the inverse Hessian of the negative log-likelihood).
 */
export function btStandardErrors(
  nTeams: number,
  games: readonly GameResult[],
  fit: { theta: number[]; h: number },
): { seTheta: number[]; seH: number } {
  // I_ii = sum over games involving i of w * p * (1 - p); I_hh likewise.
  const info = new Array(nTeams).fill(0);
  let infoH = 0;
  for (const g of games) {
    const w = g.weight ?? 1;
    const p = sigmoid(fit.theta[g.home]! - fit.theta[g.away]! + fit.h);
    const v = w * p * (1 - p);
    info[g.home] += v;
    info[g.away] += v;
    infoH += v;
  }
  const seTheta = info.map((v) => (v > 1e-9 ? 1 / Math.sqrt(v) : Infinity));
  return { seTheta, seH: infoH > 1e-9 ? 1 / Math.sqrt(infoH) : Infinity };
}

/** Win probability with a 90% CI via the delta method on the logit scale. */
export function winProbWithCI(
  thetaHome: number,
  thetaAway: number,
  h: number,
  seHome: number,
  seAway: number,
  seH: number,
  z = 1.645,
): { p: number; lo: number; hi: number } {
  const logit = thetaHome - thetaAway + h;
  const seLogit = Math.sqrt(seHome * seHome + seAway * seAway + seH * seH);
  const p = sigmoid(logit);
  return {
    p,
    lo: sigmoid(logit - z * seLogit),
    hi: sigmoid(logit + z * seLogit),
  };
}

/** Abstention policy: skip games where the 90% CI covers 0.5. */
export function shouldAbstain(ci: { lo: number; hi: number }): boolean {
  return ci.lo <= 0.5 && ci.hi >= 0.5;
}

/**
 * Decay-weighted variant: game at lag t (0 = most recent) gets weight lambda^t.
 * Returns the fit plus decay-weighted rho for the SEs.
 */
export function btFitDecayed(
  nTeams: number,
  games: readonly GameResult[],
  lags: readonly number[],
  lambda: number,
): { theta: number[]; h: number; seTheta: number[]; seH: number } {
  const weighted = games.map((g, i) => ({
    ...g,
    weight: Math.pow(lambda, lags[i]!),
  }));
  const fit = btFit(nTeams, weighted);
  const { seTheta, seH } = btStandardErrors(nTeams, weighted, fit);
  return { ...fit, seTheta, seH };
}

export const DECAY_LAMBDAS = [0.9, 0.95, 0.98];
