/**
 * Dixon–Coles (1997) low-score correlation on independent Poisson joints.
 *
 * Port of machina-predictions-templates monte-carlo.py `dixon_coles_tau` into pure
 * TypeScript for GSE ranking independents. Market-free: uses the same TeamGameLog
 * λ path as poissonIndependentFairValue (Maher attack/defense), then multiplies
 * P(X=x)P(Y=y) by τ(ρ) on {0-0, 0-1, 1-0, 1-1} and renormalises the joint.
 *
 * Why a separate independent (source: "dixon_coles"), not a silent Poisson swap:
 *   - Ranking wants diversified non-book trueProb signals.
 *   - ρ is a fixed literature default until form-fit lands — honest and frozen.
 *   - Soccer-only: low-score correlation is the Dixon–Coles claim; hockey/baseball
 *     keep independent Poisson without τ.
 *
 * Never reads sportsbook lines. Never fabricates λ (reuses validated team rates).
 *
 * References:
 *   - Dixon, M. J. & Coles, S. G. (1997). Applied Statistics 46(2), 265–280.
 *   - machina-sports soccer monte-carlo (rho ≈ −0.12).
 */

import { poissonPmf } from "./poisson.js";
import {
  computeTeamScoringRates,
  estimateMatchupLambdas,
  isPoissonValidSport,
  type PoissonFairValue,
  type PoissonFairValueInput,
} from "./team-rates.js";

/** Literature default for football low-score dependence (Machina: −0.12). */
export const DEFAULT_DIXON_COLES_RHO = -0.13;

/** Clamp ρ to a safe negative band; 0 disables adjustment (identity). */
export function clampDixonColesRho(rho: number): number {
  if (!Number.isFinite(rho)) return DEFAULT_DIXON_COLES_RHO;
  if (rho === 0) return 0;
  return Math.max(-0.2, Math.min(0, rho));
}

/**
 * Dixon–Coles τ factor. Only {0-0,0-1,1-0,1-1} deviate from 1 when ρ ≠ 0.
 * Formula matches Dixon & Coles (1997) / Machina monte-carlo.py.
 */
export function dixonColesTau(
  homeGoals: number,
  awayGoals: number,
  lambdaHome: number,
  lambdaAway: number,
  rho: number,
): number {
  if (rho === 0) return 1;
  if (homeGoals === 0 && awayGoals === 0) {
    return 1 - lambdaHome * lambdaAway * rho;
  }
  if (homeGoals === 0 && awayGoals === 1) {
    return 1 + lambdaHome * rho;
  }
  if (homeGoals === 1 && awayGoals === 0) {
    return 1 + lambdaAway * rho;
  }
  if (homeGoals === 1 && awayGoals === 1) {
    return 1 - rho;
  }
  return 1;
}

/**
 * Joint score matrix with Dixon–Coles τ, then normalised to sum 1.
 * Non-positive λ → empty-usable mass (caller treats as no opinion).
 */
export function jointScoreMatrixDixonColes(
  lambdaHome: number,
  lambdaAway: number,
  rho: number = DEFAULT_DIXON_COLES_RHO,
  maxGoals: number = 12,
): number[][] {
  if (maxGoals < 0) throw new RangeError("maxGoals must be >= 0");
  const r = clampDixonColesRho(rho);
  const homePmfs: number[] = [];
  const awayPmfs: number[] = [];
  for (let i = 0; i <= maxGoals; i++) {
    homePmfs.push(poissonPmf(i, lambdaHome));
    awayPmfs.push(poissonPmf(i, lambdaAway));
  }

  const matrix: number[][] = [];
  let total = 0;
  for (let x = 0; x <= maxGoals; x++) {
    const row: number[] = [];
    for (let y = 0; y <= maxGoals; y++) {
      const base = (homePmfs[x] ?? 0) * (awayPmfs[y] ?? 0);
      const tau = dixonColesTau(x, y, lambdaHome, lambdaAway, r);
      // Guard: τ can theoretically go non-positive for extreme λ/ρ; floor at 0.
      const p = Math.max(0, base * tau);
      row.push(p);
      total += p;
    }
    matrix.push(row);
  }

  if (!(total > 0)) return matrix;
  for (let x = 0; x <= maxGoals; x++) {
    const row = matrix[x]!;
    for (let y = 0; y <= maxGoals; y++) {
      row[y] = (row[y] ?? 0) / total;
    }
  }
  return matrix;
}

export function dixonColesMoneylineProbabilities(
  lambdaHome: number,
  lambdaAway: number,
  rho: number = DEFAULT_DIXON_COLES_RHO,
  maxGoals: number = 12,
): { home: number; draw: number; away: number; coverage: number } {
  const m = jointScoreMatrixDixonColes(lambdaHome, lambdaAway, rho, maxGoals);
  let home = 0;
  let draw = 0;
  let away = 0;
  for (let x = 0; x <= maxGoals; x++) {
    for (let y = 0; y <= maxGoals; y++) {
      const p = m[x]?.[y] ?? 0;
      if (x > y) home += p;
      else if (x === y) draw += p;
      else away += p;
    }
  }
  return { home, draw, away, coverage: home + draw + away };
}

function round(v: number, d = 4): number {
  const s = 10 ** d;
  return Math.round(v * s) / s;
}

/** Soccer sport keys only — Dixon–Coles is a football low-score model. */
export function isDixonColesValidSport(sportKey: string): boolean {
  return sportKey.toLowerCase().startsWith("soccer");
}

export interface DixonColesFairValueInput extends PoissonFairValueInput {
  /** Correlation ρ (typically −0.10…−0.15). Default DEFAULT_DIXON_COLES_RHO. */
  readonly rho?: number;
  readonly maxGoals?: number;
}

export interface DixonColesFairValue extends PoissonFairValue {
  readonly rho: number;
}

/**
 * Independent 2-way moneyline fair value from Dixon–Coles joints.
 * Null when not soccer, rates thin, or no decisive mass — honest no-opinion.
 * Draw mass removed and sides renormalised (same bridge as independent Poisson).
 */
export function dixonColesIndependentFairValue(
  input: DixonColesFairValueInput,
): DixonColesFairValue | null {
  if (!isDixonColesValidSport(input.sportKey)) return null;
  // Still require Poisson-valid low-count sport (soccer is the intersection).
  if (!isPoissonValidSport(input.sportKey)) return null;

  const homeRates = computeTeamScoringRates(input.homeRecords, input.minGames);
  const awayRates = computeTeamScoringRates(input.awayRecords, input.minGames);
  if (!homeRates || !awayRates) return null;

  const lambdas = estimateMatchupLambdas(
    homeRates,
    awayRates,
    input.leagueAvgScored,
    input.homeAdvantage,
  );
  if (!lambdas) return null;

  const rho = clampDixonColesRho(input.rho ?? DEFAULT_DIXON_COLES_RHO);
  const { home, away } = dixonColesMoneylineProbabilities(
    lambdas.lambdaHome,
    lambdas.lambdaAway,
    rho,
    input.maxGoals ?? 12,
  );
  const twoWay = home + away;
  if (!(twoWay > 0)) return null;

  return {
    homeFairProb: round(home / twoWay),
    awayFairProb: round(away / twoWay),
    lambdaHome: round(lambdas.lambdaHome),
    lambdaAway: round(lambdas.lambdaAway),
    homeGames: homeRates.gamesUsed,
    awayGames: awayRates.gamesUsed,
    bootstrapShare: Math.max(homeRates.bootstrapShare, awayRates.bootstrapShare),
    rho,
  };
}
