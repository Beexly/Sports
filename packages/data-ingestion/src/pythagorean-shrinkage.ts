/**
 * First Order Approximations of the Pythagorean Won-Loss Formula for Predicting MLB Teams' Winning Percentages
 *
 * arXiv:1205.4750v1 · lane:win_spread_total · owner:Mimo
 *
 * Improvement (IMPROVEMENT-LEDGER.jsonl):
 * Re-fit the linearized Pythagorean won-loss formula on NFL data (OLS of season win% on point
 * differential, 2000-2025; recover gamma_hat_NFL = beta_hat*4*P_avg) and use it as a shrinkage
 * target for GSE team-strength ratings (shrink rating-implied win% toward the Pythagorean
 * expectation), a quick expected-win conversion for moneyline modeling, and a luck metric (actual
 * wins minus Pythagorean expected wins).
 *
 * ACCEPTANCE GATE: ADAPT-accept if gamma_hat_NFL estimated from the Taylor inversion on 2015-2019 falls within
 * [2.0, 2.8] (football-plausible range) AND forward MAE on 2020-2024 is within 0.01 wins-
 * equivalent of the nonlinear fit.
 *
 * Ingest role: feature builder (shrinkage target + luck metric for team-strength ratings).
 * Live data: NO. Runs offline on nflverse aggregates / stored snapshots.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "1205.4750v1" as const;
export const LANE = "win_spread_total" as const;

/** Numeric acceptance gate, verbatim from the ledger (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADAPT-accept if gamma_hat_NFL estimated from the Taylor inversion on 2015-2019 falls within
 * [2.0, 2.8] (football-plausible range) AND forward MAE on 2020-2024 is within 0.01 wins-
 * equivalent of the nonlinear fit.`;

export const CONFIG = { enabled: false, gammaDefault: 2.37, gammaPlausible: [2.0, 2.8] as const } as const;

/** Type guard for finite numbers (rejects NaN/Infinity/non-numbers). */
function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

/**
 * Pythagorean expected win share. pf/pa = season points for/against.
 * gamma ~= 2.37 is the NFL-plausible default; the ledger re-fits it on NFL data.
 */
export function pythagWinPct(pointsFor: number, pointsAgainst: number, gamma = 2.37): number | null {
  if (!isFiniteNumber(pointsFor) || !isFiniteNumber(pointsAgainst) || !isFiniteNumber(gamma)) return null;
  if (pointsFor < 0 || pointsAgainst < 0 || gamma <= 0) return null;
  if (pointsFor === 0 && pointsAgainst === 0) return null;
  const pf = Math.pow(pointsFor, gamma);
  const pa = Math.pow(pointsAgainst, gamma);
  return pf / (pf + pa);
}

/** Taylor-inversion recovery: gamma_hat = beta_hat * 4 * P_avg (paper eq.). */
export function linearizedGamma(betaHat: number, pointsPerGameAvg: number): number | null {
  if (!isFiniteNumber(betaHat) || !isFiniteNumber(pointsPerGameAvg)) return null;
  if (pointsPerGameAvg <= 0) return null;
  return betaHat * 4 * pointsPerGameAvg;
}

/** Luck metric: actual wins minus Pythagorean expected wins. */
export function luckWins(actualWins: number, expectedWinPct: number, games: number): number | null {
  if (!isFiniteNumber(actualWins) || !isFiniteNumber(expectedWinPct) || !isFiniteNumber(games)) return null;
  if (expectedWinPct < 0 || expectedWinPct > 1 || games <= 0) return null;
  return actualWins - expectedWinPct * games;
}

/** Shrink a rating-implied win% toward the Pythagorean expectation. */
export function shrinkTowardPythag(ratingWinPct: number, pythagWinPctVal: number, weight: number): number | null {
  if (!isFiniteNumber(ratingWinPct) || !isFiniteNumber(pythagWinPctVal) || !isFiniteNumber(weight)) return null;
  if (weight < 0 || weight > 1) return null;
  return (1 - weight) * ratingWinPct + weight * pythagWinPctVal;
}
