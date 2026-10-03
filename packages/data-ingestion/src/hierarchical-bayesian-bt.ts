/**
 * Hierarchical Bayesian Bradley-Terry for Applications in Major League Baseball
 *
 * arXiv:1712.05879v1 · lane:team_ratings · owner:Mimo
 *
 * Improvement (IMPROVEMENT-LEDGER.jsonl):
 * Adopt hierarchical Bayesian Bradley-Terry (the MLB paper's recipe) as GSE's ratings backbone:
 * data = nflverse 2002-2026 games; per-season head-to-head win matrices for 32 teams (ties as
 * half-wins); copy Eq. 22 verbatim: sigma ~ Gamma(64, 64/sigma-hat^2) (N=32) with sigma-hat^2 from
 * previous season's MLE log-strengths; lambda|sigma ~ N(0,sigma^2 I) plus a home-field offset tau
 * (addition -- needed for NFL; weakly informative N(0,1) prior); HMC via cmdstanpy; weekly refits
 * within season: hyperprior from previous season stays fixed, lambda updated with games to date;
 * outputs: posterior mean log-strengths (ratings), posterior-predictive win probabilities per game
 * (integrate over lambda uncertainty -- the calibration edge over plug-in Elo), posterior sd as a
 * rating-uncertainty feed for Kelly sizing.
 *
 * ACCEPTANCE GATE: Adopt iff on 2015-2025 walk-forward partitions: (a) log loss beats dynamic Elo by >= 0.003
 * averaged over Weeks 2-8 partitions; AND (b) log loss no worse than Elo (within 0.001) at Weeks
 * 13-16; AND (c) posterior-predictive probabilities better calibrated than Elo plug-in. If (a)
 * fails, reject and keep Elo.
 *
 * Ingest role: feature builder (ratings backbone: posterior means + predictive win probs + sd).
 * Live data: NO. Runs offline on nflverse aggregates / stored snapshots.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "1712.05879v1" as const;
export const LANE = "team_ratings" as const;

/** Numeric acceptance gate, verbatim from the ledger (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `Adopt iff on 2015-2025 walk-forward partitions: (a) log loss beats dynamic Elo by >= 0.003
 * averaged over Weeks 2-8 partitions; AND (b) log loss no worse than Elo (within 0.001) at Weeks
 * 13-16; AND (c) posterior-predictive probabilities better calibrated than Elo plug-in. If (a)
 * fails, reject and keep Elo.`;

export const CONFIG = {
  enabled: false,
  inference: "HMC via cmdstanpy (offline); this module ships the prior recipe + plug-in predictive core",
  homePrior: "tau ~ N(0,1)",
} as const;

/** Type guard for finite numbers (rejects NaN/Infinity/non-numbers). */
function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

/**
 * Paper Eq. 22 (verbatim recipe): sigma ~ Gamma(64, 64/sigma_hat^2), N=32,
 * sigma_hat^2 from the previous season's MLE log-strengths.
 */
export function gammaPriorSigma(sigmaHat2: number): { shape: number; rate: number } | null {
  if (!isFiniteNumber(sigmaHat2) || sigmaHat2 <= 0) return null;
  return { shape: 64, rate: 64 / sigmaHat2 };
}

/** Precision-weighted shrinkage of MLE log-strengths toward the prior mean 0. */
export function shrinkLogStrengths(mle: readonly number[], sigma2: number, priorVar = 1): number[] | null {
  if (mle.length === 0 || !isFiniteNumber(sigma2) || !isFiniteNumber(priorVar)) return null;
  if (!mle.every(isFiniteNumber) || sigma2 <= 0 || priorVar <= 0) return null;
  const w = priorVar / (priorVar + sigma2);
  return mle.map((v) => w * v);
}

/** Head-to-head win matrix with ties as half-wins. */
export function winMatrix(games: ReadonlyArray<{ home: string; away: string; result: "H" | "A" | "T" }>, teams: readonly string[]): number[][] | null {
  if (teams.length === 0) return null;
  const idx = new Map(teams.map((t, i) => [t, i]));
  const n = teams.length;
  const W: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  for (const g of games) {
    const i = idx.get(g.home);
    const j = idx.get(g.away);
    if (i === undefined || j === undefined) return null;
    if (g.result === "H") {
      const r1 = W[i]; const r2 = W[j];
      if (r1 && r2) { r1[j] = (r1[j] ?? 0) + 1; }
    } else if (g.result === "A") {
      const r = W[j];
      if (r) r[i] = (r[i] ?? 0) + 1;
    } else {
      const r1 = W[i]; const r2 = W[j];
      if (r1 && r2) { r1[j] = (r1[j] ?? 0) + 0.5; r2[i] = (r2[i] ?? 0) + 0.5; }
    }
  }
  return W;
}

/**
 * Posterior-predictive win probability integrating over lambda uncertainty:
 * probit approximation P(i beats j) = Phi((mu_i - mu_j + tau) / sqrt(1 + sd_i^2 + sd_j^2)).
 */
export function posteriorPredictiveWinProb(
  muI: number,
  muJ: number,
  sdI: number,
  sdJ: number,
  tau: number,
): number | null {
  if (![muI, muJ, sdI, sdJ, tau].every(isFiniteNumber)) return null;
  if (sdI < 0 || sdJ < 0) return null;
  const z = (muI - muJ + tau) / Math.sqrt(1 + sdI * sdI + sdJ * sdJ);
  return 0.5 * (1 + erf(z / Math.SQRT2));
}

function erf(x: number): number {
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return x >= 0 ? y : -y;
}
