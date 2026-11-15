/**
 * Galaxy Sports Edge — Parlay MRI Copula Engine, Pre-Kickoff Commitment Verifier & Two-Door Storefront
 * Target Monorepo Path: packages/prediction-engine/src/parlay/parlay_mri_and_store_credit.ts
 *
 * Implements Sections 11.3 & 12.1 of master_overall_plan.md:
 * 1. Exact Shin (1991, 1993) de-vigging from American / Decimal odds with guarded bisection
 *    (strictly enforcing decimal odds > 1 and zero-margin multiplicative fallback).
 * 2. Empirically grounded NFL Same-Game Parlay (SGP) pairwise correlation matrix:
 *    - QB Pass Yds Over + WR1 Rec Yds Over: +0.48
 *    - QB Pass TDs Over + Team Total Over: +0.42
 *    - RB1 Rush Attempts Over + Team Favorite Spread: +0.36
 *    - RB1 Rush TD Inside-5 + QB Pass TD Inside-5: -0.22 (cannibalistic red-zone pair)
 *    - Game Total Under + QB Pass Yds Over: -0.38 (negative script pair)
 *    plus automatic Jacobi eigenvalue PSD projection + Cholesky factorization for 2-to-5 legs.
 * 3. Multivariate Student-t4 (df=4) tail-dependent copula + Gaussian copula joint probability
 *    via deterministic Genz (1992) / Genz-Bretz (1999) separation-of-variables over Halton
 *    quasi-Monte Carlo + 24-node Gauss-Legendre chi-square(4) scale-mixture quadrature,
 *    alongside seeded antithetic Monte Carlo cross-check.
 * 4. Plain-English SGP Hidden Correlation Hold % diagnostic with strict compliance & anti-jargon
 *    guards (zero Sinkhorn, JEV, Romano CQR, tau_hat, 62-23-1, lock, guaranteed win, risk-free,
 *    or % confidence).
 * 5. Pre-Kickoff SHA-256 Commitment Receipt generation & verification + Two-Door Storefront catalog.
 */

import { createHash } from 'crypto';
import * as StoreCreditLedger from './store-credit-ledger';

export { StoreCreditLedger };
export * from './store-credit-ledger';

export const STUDENT_T_DEGREES_OF_FREEDOM = 4 as const;
export const DEFAULT_TWO_WAY_OVERROUND = 1 / 21; // ~4.7619% (-110 / -110 baseline two-way vig)

export type NflSgpLegArchetype =
  | 'QB_PASS_YDS_OVER'
  | 'QB_PASS_YDS_UNDER'
  | 'WR1_REC_YDS_OVER'
  | 'WR1_REC_YDS_UNDER'
  | 'WR2_REC_YDS_OVER'
  | 'TE1_REC_YDS_OVER'
  | 'QB_PASS_TDS_OVER'
  | 'QB_PASS_TD_INSIDE_5'
  | 'RB1_RUSH_ATT_OVER'
  | 'RB1_RUSH_YDS_OVER'
  | 'RB1_RUSH_TD_INSIDE_5'
  | 'TEAM_TOTAL_OVER'
  | 'TEAM_TOTAL_UNDER'
  | 'TEAM_FAV_SPREAD'
  | 'TEAM_DOG_SPREAD'
  | 'GAME_TOTAL_OVER'
  | 'GAME_TOTAL_UNDER'
  | 'OPP_WR1_REC_YDS_OVER';

export interface SgpLegInput {
  readonly legId: string;
  readonly label: string;
  readonly archetype: NflSgpLegArchetype;
  /** Team identifier ('HOME' | 'AWAY' | 'GAME') used to distinguish same-team vs opponent legs. */
  readonly teamSide?: 'HOME' | 'AWAY' | 'GAME';
  /** Quoted American odds for this leg (e.g., -110, +145). */
  readonly americanOdds: number;
  /**
   * Optional opposite-side American odds for exact 2-way Shin de-vigging (e.g., -110, -175).
   * When omitted, constructs a standard two-way market using DEFAULT_TWO_WAY_OVERROUND.
   */
  readonly counterAmericanOdds?: number;
}

export interface ShinDevigResult {
  readonly fairProbabilities: readonly number[];
  readonly rawImpliedProbabilities: readonly number[];
  readonly overround: number;
  readonly shinZ: number;
  readonly methodUsed: 'shin_bisection' | 'multiplicative_fallback';
}

export interface EvaluatedSgpLeg {
  readonly legId: string;
  readonly label: string;
  readonly archetype: NflSgpLegArchetype;
  readonly teamSide: 'HOME' | 'AWAY' | 'GAME';
  readonly americanOdds: number;
  readonly decimalOdds: number;
  readonly rawImpliedProb: number;
  readonly shinFairProb: number;
  readonly shinZ: number;
}

export interface PairwiseLegCorrelationSummary {
  readonly legIndexA: number;
  readonly legIndexB: number;
  readonly labelA: string;
  readonly labelB: string;
  readonly rawRho: number;
  readonly psdAdjustedRho: number;
  readonly studentT4UpperTailDependence: number;
  readonly relationshipPlainEnglish: string;
}

export interface ParlayMriDiagnosis {
  readonly legs: readonly EvaluatedSgpLeg[];
  readonly quotedSgpAmericanOdds: number;
  readonly quotedSgpDecimalOdds: number;
  readonly bookImpliedProb: number;
  /** Naive product of per-leg Shin fair probabilities (ignores correlation). */
  readonly naiveIndependentProb: number;
  readonly naiveIndependentAmericanOdds: number;
  /** Multivariate Gaussian copula joint probability. */
  readonly gaussianCopulaProb: number;
  readonly gaussianFairAmericanOdds: number;
  /** Multivariate Student-t4 (df=4) tail-dependent copula joint probability (primary truth). */
  readonly studentT4CopulaProb: number;
  readonly studentT4FairDecimalOdds: number;
  readonly studentT4FairAmericanOdds: number;
  /**
   * Expected Sportsbook Hold % on stake: (1 - studentT4CopulaProb * quotedSgpDecimalOdds) * 100.
   * E.g., 22.4 means the sportsbook retains $22.40 per $100 wagered at the quoted SGP price.
   */
  readonly hiddenCorrelationHoldPct: number;
  /** Book Implied Probability minus True Student-t4 Probability (percentage points). */
  readonly impliedProbMarkupPctPoints: number;
  /** Expected dollars kept by the sportsbook per $100 stake. */
  readonly expectedHouseKeepPer100Dollars: number;
  /** Correlation lift/drag relative to naive multiplication: (p_t4 / p_indep - 1) * 100. */
  readonly correlationMultiplierPct: number;
  readonly psdProjectionApplied: boolean;
  readonly correlationMatrixPsd: readonly (readonly number[])[];
  readonly pairwiseSummaries: readonly PairwiseLegCorrelationSummary[];
  readonly gradeSeverity: 'FAIR_OR_PLUS_EV' | 'MODERATE_TAX' | 'HEAVY_HIDDEN_TAX' | 'EXTREME_SGP_TRAP';
  readonly plainEnglishHeadline: string;
  readonly plainEnglishExplanation: string;
}

// ============================================================================
// 1. ODDS CONVERSION & EXACT SHIN (1991, 1993) DE-VIGGING
// ============================================================================

export function americanToDecimal(americanOdds: number): number {
  if (!Number.isFinite(americanOdds) || (americanOdds > -100 && americanOdds < 100)) {
    throw new RangeError(
      `Invalid American odds ${americanOdds}. Expected finite value <= -100 or >= +100.`,
    );
  }
  return americanOdds >= 100 ? 1 + americanOdds / 100 : 1 + 100 / Math.abs(americanOdds);
}

export function decimalToAmerican(decimalOdds: number): number {
  if (!Number.isFinite(decimalOdds) || decimalOdds <= 1) {
    throw new RangeError(`Invalid decimal odds ${decimalOdds}. Expected finite value > 1.`);
  }
  if (decimalOdds >= 2.0) {
    return Math.round((decimalOdds - 1) * 100);
  }
  return -Math.round(100 / (decimalOdds - 1));
}

export function formatAmericanOdds(americanOdds: number): string {
  const rounded = Math.round(americanOdds);
  return rounded > 0 ? `+${rounded}` : `${rounded}`;
}

/**
 * De-vigs an n-way decimal odds vector using Shin's (1991, 1993) insider-trading model
 * via guarded bisection on z in (0, 1). Strictly rejects decimal odds <= 1.
 */
export function shinDevigDecimalOdds(decimalOdds: readonly number[]): ShinDevigResult {
  if (decimalOdds.length < 2) {
    throw new RangeError('shinDevigDecimalOdds requires at least 2 market outcomes.');
  }
  for (const d of decimalOdds) {
    if (!Number.isFinite(d) || d <= 1) {
      throw new RangeError(`shinDevigDecimalOdds requires finite decimal odds > 1, got ${d}.`);
    }
  }

  const rawImplied = decimalOdds.map((d) => 1 / d);
  const sumImplied = rawImplied.reduce((acc, p) => acc + p, 0);
  const overround = sumImplied - 1;

  if (overround <= 1e-12) {
    const fair = rawImplied.map((p) => p / sumImplied);
    return {
      fairProbabilities: fair,
      rawImpliedProbabilities: rawImplied,
      overround,
      shinZ: 0,
      methodUsed: 'multiplicative_fallback',
    };
  }

  const shinSumAtZ = (z: number): number => {
    const denom = 2 * (1 - z);
    let total = 0;
    for (const pi of rawImplied) {
      const term = Math.sqrt(z * z + (4 * (1 - z) * pi * pi) / sumImplied) - z;
      total += term / denom;
    }
    return total;
  };

  let lo = 0;
  let hi = 1 - 1e-12;
  const fLo = shinSumAtZ(lo) - 1;
  const fHi = shinSumAtZ(hi) - 1;

  if (!(fLo > 0 && fHi < 0)) {
    const fair = rawImplied.map((p) => p / sumImplied);
    return {
      fairProbabilities: fair,
      rawImpliedProbabilities: rawImplied,
      overround,
      shinZ: 0,
      methodUsed: 'multiplicative_fallback',
    };
  }

  let mid = 0;
  for (let iter = 0; iter < 72; iter += 1) {
    mid = 0.5 * (lo + hi);
    const fMid = shinSumAtZ(mid) - 1;
    if (Math.abs(fMid) <= 1e-13 || hi - lo <= 1e-13) {
      break;
    }
    if (fMid > 0) {
      lo = mid;
    } else {
      hi = mid;
    }
  }

  const denom = 2 * (1 - mid);
  const unnormalized = rawImplied.map((pi) =>
    Math.max(0, (Math.sqrt(mid * mid + (4 * (1 - mid) * pi * pi) / sumImplied) - mid) / denom),
  );
  const normSum = unnormalized.reduce((acc, v) => acc + v, 0);
  if (!Number.isFinite(normSum) || normSum <= 0) {
    return {
      fairProbabilities: rawImplied.map((p) => p / sumImplied),
      rawImpliedProbabilities: rawImplied,
      overround,
      shinZ: 0,
      methodUsed: 'multiplicative_fallback',
    };
  }

  return {
    fairProbabilities: unnormalized.map((v) => v / normSum),
    rawImpliedProbabilities: rawImplied,
    overround,
    shinZ: mid,
    methodUsed: 'shin_bisection',
  };
}

/**
 * Computes exact Shin de-vigged fair win probability for an SGP leg from American odds.
 */
export function devigSgpLegAmerican(
  americanOdds: number,
  counterAmericanOdds?: number,
  assumedTwoWayOverround: number = DEFAULT_TWO_WAY_OVERROUND,
): { decimalOdds: number; rawImpliedProb: number; shinFairProb: number; shinZ: number } {
  const d1 = americanToDecimal(americanOdds);
  const pi1 = 1 / d1;

  if (counterAmericanOdds !== undefined) {
    const d2 = americanToDecimal(counterAmericanOdds);
    const res = shinDevigDecimalOdds([d1, d2]);
    return {
      decimalOdds: d1,
      rawImpliedProb: pi1,
      shinFairProb: res.fairProbabilities[0]!,
      shinZ: res.shinZ,
    };
  }

  const targetSum = Math.max(1 + Math.max(0, assumedTwoWayOverround), pi1 + 0.015);
  const pi2 = Math.min(0.992, Math.max(0.008, targetSum - pi1));
  const d2 = 1 / pi2;
  const res = shinDevigDecimalOdds([d1, d2]);

  return {
    decimalOdds: d1,
    rawImpliedProb: pi1,
    shinFairProb: res.fairProbabilities[0]!,
    shinZ: res.shinZ,
  };
}

// ============================================================================
// 2. EMPIRICAL NFL SGP CORRELATION MATRIX & JACOBI PSD PROJECTION
// ============================================================================

const CANONICAL_SAME_TEAM_PAIRS: Readonly<Record<string, number>> = {
  // Exact empirical anchors specified in master_overall_plan.md Sections 11.3 & 12.1:
  'QB_PASS_YDS_OVER|WR1_REC_YDS_OVER': 0.48,
  'QB_PASS_TDS_OVER|TEAM_TOTAL_OVER': 0.42,
  'RB1_RUSH_ATT_OVER|TEAM_FAV_SPREAD': 0.36,
  'QB_PASS_TD_INSIDE_5|RB1_RUSH_TD_INSIDE_5': -0.22,
  'GAME_TOTAL_UNDER|QB_PASS_YDS_OVER': -0.38,

  // Supporting empirical same-game NFL structure:
  'QB_PASS_YDS_OVER|WR2_REC_YDS_OVER': 0.34,
  'QB_PASS_YDS_OVER|TE1_REC_YDS_OVER': 0.29,
  'QB_PASS_YDS_OVER|QB_PASS_TDS_OVER': 0.52,
  'QB_PASS_YDS_OVER|QB_PASS_TD_INSIDE_5': 0.26,
  'QB_PASS_YDS_OVER|TEAM_TOTAL_OVER': 0.39,
  'QB_PASS_YDS_OVER|GAME_TOTAL_OVER': 0.38,
  'QB_PASS_YDS_OVER|TEAM_TOTAL_UNDER': -0.39,
  'QB_PASS_YDS_OVER|RB1_RUSH_ATT_OVER': -0.24,
  'QB_PASS_YDS_OVER|RB1_RUSH_YDS_OVER': -0.14,
  'QB_PASS_YDS_OVER|RB1_RUSH_TD_INSIDE_5': -0.09,
  'QB_PASS_YDS_OVER|TEAM_FAV_SPREAD': 0.12,
  'QB_PASS_YDS_OVER|TEAM_DOG_SPREAD': -0.12,
  'QB_PASS_YDS_OVER|OPP_WR1_REC_YDS_OVER': 0.22,
  'QB_PASS_YDS_OVER|WR1_REC_YDS_UNDER': -0.48,

  'WR1_REC_YDS_OVER|QB_PASS_TDS_OVER': 0.33,
  'WR1_REC_YDS_OVER|TEAM_TOTAL_OVER': 0.31,
  'WR1_REC_YDS_OVER|GAME_TOTAL_OVER': 0.30,
  'WR1_REC_YDS_OVER|GAME_TOTAL_UNDER': -0.30,
  'WR1_REC_YDS_OVER|WR2_REC_YDS_OVER': -0.08,
  'WR1_REC_YDS_OVER|TE1_REC_YDS_OVER': -0.06,
  'WR1_REC_YDS_OVER|RB1_RUSH_ATT_OVER': -0.18,
  'WR1_REC_YDS_OVER|RB1_RUSH_YDS_OVER': -0.12,
  'WR1_REC_YDS_OVER|RB1_RUSH_TD_INSIDE_5': -0.11,
  'WR1_REC_YDS_OVER|QB_PASS_TD_INSIDE_5': 0.21,
  'WR1_REC_YDS_OVER|TEAM_FAV_SPREAD': 0.14,
  'WR1_REC_YDS_OVER|OPP_WR1_REC_YDS_OVER': 0.18,

  'QB_PASS_TDS_OVER|GAME_TOTAL_OVER': 0.40,
  'QB_PASS_TDS_OVER|GAME_TOTAL_UNDER': -0.40,
  'QB_PASS_TDS_OVER|TEAM_TOTAL_UNDER': -0.42,
  'QB_PASS_TDS_OVER|TEAM_FAV_SPREAD': 0.31,
  'QB_PASS_TDS_OVER|RB1_RUSH_TD_INSIDE_5': -0.19,
  'QB_PASS_TDS_OVER|QB_PASS_TD_INSIDE_5': 0.58,
  'QB_PASS_TDS_OVER|TE1_REC_YDS_OVER': 0.25,
  'QB_PASS_TDS_OVER|WR2_REC_YDS_OVER': 0.27,

  'RB1_RUSH_ATT_OVER|RB1_RUSH_YDS_OVER': 0.68,
  'RB1_RUSH_ATT_OVER|RB1_RUSH_TD_INSIDE_5': 0.32,
  'RB1_RUSH_ATT_OVER|TEAM_TOTAL_OVER': 0.22,
  'RB1_RUSH_ATT_OVER|GAME_TOTAL_UNDER': 0.14,
  'RB1_RUSH_ATT_OVER|GAME_TOTAL_OVER': -0.14,
  'RB1_RUSH_ATT_OVER|TEAM_DOG_SPREAD': -0.36,
  'RB1_RUSH_ATT_OVER|QB_PASS_TD_INSIDE_5': -0.16,

  'RB1_RUSH_YDS_OVER|TEAM_FAV_SPREAD': 0.33,
  'RB1_RUSH_YDS_OVER|RB1_RUSH_TD_INSIDE_5': 0.34,
  'RB1_RUSH_YDS_OVER|TEAM_TOTAL_OVER': 0.26,
  'RB1_RUSH_YDS_OVER|GAME_TOTAL_OVER': 0.08,
  'RB1_RUSH_YDS_OVER|GAME_TOTAL_UNDER': -0.08,
  'RB1_RUSH_YDS_OVER|QB_PASS_TD_INSIDE_5': -0.15,

  'RB1_RUSH_TD_INSIDE_5|TEAM_TOTAL_OVER': 0.35,
  'RB1_RUSH_TD_INSIDE_5|GAME_TOTAL_OVER': 0.24,
  'RB1_RUSH_TD_INSIDE_5|GAME_TOTAL_UNDER': -0.24,
  'RB1_RUSH_TD_INSIDE_5|TEAM_FAV_SPREAD': 0.29,

  'QB_PASS_TD_INSIDE_5|TEAM_TOTAL_OVER': 0.34,
  'QB_PASS_TD_INSIDE_5|GAME_TOTAL_OVER': 0.26,
  'QB_PASS_TD_INSIDE_5|GAME_TOTAL_UNDER': -0.26,
  'QB_PASS_TD_INSIDE_5|TEAM_FAV_SPREAD': 0.22,

  'TEAM_FAV_SPREAD|TEAM_TOTAL_OVER': 0.46,
  'TEAM_FAV_SPREAD|TEAM_TOTAL_UNDER': -0.46,
  'TEAM_FAV_SPREAD|GAME_TOTAL_OVER': 0.14,
  'TEAM_FAV_SPREAD|GAME_TOTAL_UNDER': -0.14,
  'TEAM_FAV_SPREAD|OPP_WR1_REC_YDS_OVER': 0.19,

  'GAME_TOTAL_OVER|TEAM_TOTAL_OVER': 0.64,
  'GAME_TOTAL_UNDER|TEAM_TOTAL_OVER': -0.64,
  'GAME_TOTAL_UNDER|TEAM_TOTAL_UNDER': 0.64,
  'GAME_TOTAL_OVER|OPP_WR1_REC_YDS_OVER': 0.30,
  'GAME_TOTAL_UNDER|OPP_WR1_REC_YDS_OVER': -0.30,

  'QB_PASS_YDS_UNDER|WR1_REC_YDS_UNDER': 0.48,
  'QB_PASS_YDS_UNDER|WR1_REC_YDS_OVER': -0.48,
  'QB_PASS_YDS_UNDER|GAME_TOTAL_UNDER': 0.38,
  'QB_PASS_YDS_UNDER|GAME_TOTAL_OVER': -0.38,
  'QB_PASS_YDS_UNDER|TEAM_TOTAL_OVER': -0.39,
  'QB_PASS_YDS_UNDER|QB_PASS_TDS_OVER': -0.52,
};

const DIRECT_OPPOSITES: ReadonlySet<string> = new Set([
  'QB_PASS_YDS_OVER|QB_PASS_YDS_UNDER',
  'WR1_REC_YDS_OVER|WR1_REC_YDS_UNDER',
  'TEAM_TOTAL_OVER|TEAM_TOTAL_UNDER',
  'GAME_TOTAL_OVER|GAME_TOTAL_UNDER',
  'TEAM_FAV_SPREAD|TEAM_DOG_SPREAD',
]);

/**
 * Looks up the empirically grounded pairwise latent correlation rho in [-0.88, +0.88]
 * between two NFL SGP legs, respecting team side alignment.
 */
export function lookupPairwiseFootballRho(legA: SgpLegInput, legB: SgpLegInput): number {
  if (legA.legId === legB.legId) return 1.0;

  const sideA = legA.teamSide ?? 'HOME';
  const sideB = legB.teamSide ?? 'HOME';
  const sameTeamOrGlobal = sideA === sideB || sideA === 'GAME' || sideB === 'GAME';

  const keyAB = `${legA.archetype}|${legB.archetype}`;
  const keyBA = `${legB.archetype}|${legA.archetype}`;

  if (sameTeamOrGlobal && (DIRECT_OPPOSITES.has(keyAB) || DIRECT_OPPOSITES.has(keyBA))) {
    return -0.88;
  }

  if (legA.archetype === legB.archetype) {
    if (sideA === sideB) return 0.85;
    if (
      legA.archetype === 'QB_PASS_YDS_OVER' ||
      legA.archetype === 'WR1_REC_YDS_OVER' ||
      legA.archetype === 'QB_PASS_TDS_OVER'
    ) {
      return 0.21;
    }
    if (legA.archetype === 'RB1_RUSH_ATT_OVER') {
      return -0.28;
    }
    return 0.0;
  }

  const direct = CANONICAL_SAME_TEAM_PAIRS[keyAB] ?? CANONICAL_SAME_TEAM_PAIRS[keyBA];
  if (direct !== undefined) {
    if (sameTeamOrGlobal) {
      return direct;
    }
    const passingPair =
      (legA.archetype.includes('PASS') || legA.archetype.includes('REC')) &&
      (legB.archetype.includes('PASS') || legB.archetype.includes('REC'));
    return passingPair ? Number((direct * 0.42).toFixed(4)) : Number((-direct * 0.35).toFixed(4));
  }

  return 0.0;
}

export function describePairwiseCorrelationPlainEnglish(rho: number): string {
  if (rho >= 0.4) {
    return 'Strong positive game-script link: when one hits, the other surges with it (books heavily shade payout).';
  }
  if (rho >= 0.18) {
    return 'Moderate positive link: both legs benefit from the same offensive flow.';
  }
  if (rho <= -0.3) {
    return 'Strong conflict: these legs fight the same game script, quietly slashing your true hit rate.';
  }
  if (rho <= -0.12) {
    return 'Cannibalistic pair: one player or script steals scoring/volume opportunities from the other.';
  }
  return 'Mostly independent legs: minimal shared game-flow overlap.';
}

/**
 * Exact symmetric Jacobi eigenvalue decomposition + PSD repair for k x k correlation matrices (k <= 5).
 * Ensures unit diagonal and strictly positive eigenvalues >= minEigenvalue so Cholesky always succeeds.
 */
export function ensurePositiveDefiniteCorrelation(
  rawMatrix: readonly (readonly number[])[],
  minEigenvalue = 1e-4,
): { matrix: number[][]; cholesky: number[][]; projected: boolean } {
  const n = rawMatrix.length;
  const a: number[][] = rawMatrix.map((row, i) =>
    row.map((v, j) => (i === j ? 1.0 : Math.max(-0.95, Math.min(0.95, v)))),
  );
  const vMat: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (__, j) => (i === j ? 1.0 : 0.0)),
  );

  for (let sweep = 0; sweep < 40; sweep += 1) {
    let maxOffDiag = 0;
    let p = 0;
    let q = 1;
    for (let i = 0; i < n; i += 1) {
      for (let j = i + 1; j < n; j += 1) {
        const absVal = Math.abs(a[i]![j]!);
        if (absVal > maxOffDiag) {
          maxOffDiag = absVal;
          p = i;
          q = j;
        }
      }
    }
    if (maxOffDiag < 1e-14) break;

    const app = a[p]![p]!;
    const aqq = a[q]![q]!;
    const apq = a[p]![q]!;
    const tau = (aqq - app) / (2 * apq);
    const t = tau >= 0 ? 1 / (tau + Math.sqrt(1 + tau * tau)) : -1 / (-tau + Math.sqrt(1 + tau * tau));
    const c = 1 / Math.sqrt(1 + t * t);
    const s = t * c;

    a[p]![p] = app - t * apq;
    a[q]![q] = aqq + t * apq;
    a[p]![q] = 0;
    a[q]![p] = 0;

    for (let k = 0; k < n; k += 1) {
      if (k !== p && k !== q) {
        const akp = a[k]![p]!;
        const akq = a[k]![q]!;
        a[k]![p] = c * akp - s * akq;
        a[p]![k] = a[k]![p]!;
        a[k]![q] = s * akp + c * akq;
        a[q]![k] = a[k]![q]!;
      }
      const vkp = vMat[k]![p]!;
      const vkq = vMat[k]![q]!;
      vMat[k]![p] = c * vkp - s * vkq;
      vMat[k]![q] = s * vkp + c * vkq;
    }
  }

  let projected = false;
  const eig = Array.from({ length: n }, (_, i) => {
    const val = a[i]![i]!;
    if (val < minEigenvalue) {
      projected = true;
      return minEigenvalue;
    }
    return val;
  });

  const repaired: number[][] = Array.from({ length: n }, () => Array<number>(n).fill(0));
  if (!projected) {
    for (let i = 0; i < n; i += 1) {
      for (let j = 0; j < n; j += 1) {
        repaired[i]![j] = i === j ? 1.0 : Math.max(-0.95, Math.min(0.95, rawMatrix[i]![j]!));
      }
    }
  } else {
    for (let i = 0; i < n; i += 1) {
      for (let j = 0; j < n; j += 1) {
        let sum = 0;
        for (let k = 0; k < n; k += 1) {
          sum += vMat[i]![k]! * eig[k]! * vMat[j]![k]!;
        }
        repaired[i]![j] = sum;
      }
    }
    const diagInvSqrt = repaired.map((row, i) => 1 / Math.sqrt(Math.max(1e-12, row[i]!)));
    for (let i = 0; i < n; i += 1) {
      for (let j = 0; j < n; j += 1) {
        repaired[i]![j] = i === j ? 1.0 : repaired[i]![j]! * diagInvSqrt[i]! * diagInvSqrt[j]!;
      }
    }
  }

  const cholesky: number[][] = Array.from({ length: n }, () => Array<number>(n).fill(0));
  for (let i = 0; i < n; i += 1) {
    for (let j = 0; j <= i; j += 1) {
      let sum = repaired[i]![j]!;
      for (let k = 0; k < j; k += 1) {
        sum -= cholesky[i]![k]! * cholesky[j]![k]!;
      }
      if (i === j) {
        cholesky[i]![i] = Math.sqrt(Math.max(1e-12, sum));
      } else {
        cholesky[i]![j] = sum / cholesky[j]![j]!;
      }
    }
  }

  return { matrix: repaired, cholesky, projected };
}

// ============================================================================
// 3. UNIVARIATE & MULTIVARIATE COPULA NUMERICS (GAUSSIAN + STUDENT-t4 df=4)
// ============================================================================

export function standardNormalCdf(x: number): number {
  if (x <= -38) return 0;
  if (x >= 38) return 1;
  const absX = Math.abs(x) / Math.SQRT2;
  const t = 1 / (1 + 0.5 * absX);
  const tau =
    t *
    Math.exp(
      -absX * absX -
        1.26551223 +
        t *
          (1.00002368 +
            t *
              (0.37409196 +
                t *
                  (0.09678418 +
                    t *
                      (-0.18628806 +
                        t *
                          (0.27886807 +
                            t *
                              (-1.13520398 +
                                t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))),
    );
  const erfcVal = absX >= 0 ? tau : 2 - tau;
  return x >= 0 ? 1 - 0.5 * erfcVal : 0.5 * erfcVal;
}

export function standardNormalQuantile(p: number): number {
  if (p <= 0) return -38;
  if (p >= 1) return 38;

  const a1 = -3.969683028665376e1;
  const a2 = 2.209460984245205e2;
  const a3 = -2.759285104469687e2;
  const a4 = 1.38357751867269e2;
  const a5 = -3.066479806614716e1;
  const a6 = 2.506628277459239;

  const b1 = -5.447609879822406e1;
  const b2 = 1.615858368580409e2;
  const b3 = -1.556989798598866e2;
  const b4 = 6.680131188771972e1;
  const b5 = -1.328068155288572e1;

  const c1 = -7.784894002430293e-3;
  const c2 = -3.223964580411365e-1;
  const c3 = -2.400758277161838;
  const c4 = -2.549732539343734;
  const c5 = 4.374664141464968;
  const c6 = 2.938163982698783;

  const d1 = 7.784695709041462e-3;
  const d2 = 3.224671290700398e-1;
  const d3 = 2.445134137142996;
  const d4 = 3.754408661907416;

  const pLow = 0.02425;
  const pHigh = 1 - pLow;

  if (p < pLow) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (
      (((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) /
      ((((d1 * q + d2) * q + d3) * q + d4) * q + 1)
    );
  }
  if (p <= pHigh) {
    const q = p - 0.5;
    const r = q * q;
    return (
      ((((((a1 * r + a2) * r + a3) * r + a4) * r + a5) * r + a6) * q) /
      (((((b1 * r + b2) * r + b3) * r + b4) * r + b5) * r + 1)
    );
  }
  const q = Math.sqrt(-2 * Math.log(1 - p));
  return -(
    (((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) /
    ((((d1 * q + d2) * q + d3) * q + d4) * q + 1)
  );
}

/**
 * Exact closed-form univariate Student-t4 (df=4) CDF:
 * F_t4(t) = 1/2 + t * (t^2 + 6) / (2 * (t^2 + 4)^(3/2))
 */
export function studentT4Cdf(t: number): number {
  if (!Number.isFinite(t)) return t < 0 ? 0 : 1;
  const t2 = t * t;
  const denom = 2 * Math.pow(t2 + 4, 1.5);
  return Math.min(1, Math.max(0, 0.5 + (t * (t2 + 6)) / denom));
}

/**
 * Exact closed-form univariate Student-t4 (df=4) inverse CDF (Shaw 2006 trigonometric root).
 */
export function studentT4Quantile(p: number): number {
  if (p <= 0 || p >= 1 || !Number.isFinite(p)) {
    throw new RangeError(`studentT4Quantile requires p in (0, 1), got ${p}.`);
  }
  if (Math.abs(p - 0.5) < 1e-15) return 0;
  const alpha = 4 * p * (1 - p);
  const sqrtAlpha = Math.sqrt(alpha);
  const q = Math.cos(Math.acos(Math.min(1, Math.max(-1, sqrtAlpha))) / 3) / sqrtAlpha;
  const mag = 2 * Math.sqrt(Math.max(0, q - 1));
  return p > 0.5 ? mag : -mag;
}

/**
 * Exact closed-form univariate Student-t5 (df=5) CDF for Student-t4 upper-tail dependence.
 */
export function studentT5Cdf(t: number): number {
  const theta = Math.atan(t / Math.sqrt(5));
  const cosTheta = Math.cos(theta);
  const sinTheta = Math.sin(theta);
  return 0.5 + (theta + sinTheta * cosTheta * (1 + (2 / 3) * cosTheta * cosTheta)) / Math.PI;
}

export function studentT4UpperTailDependence(rho: number): number {
  if (rho <= -0.999999) return 0;
  if (rho >= 0.999999) return 1;
  const arg = -Math.sqrt((5 * (1 - rho)) / (1 + rho));
  return Math.min(1, Math.max(0, 2 * studentT5Cdf(arg)));
}

const GL24_NODES_01: readonly number[] = [
  0.002406389560964431, 0.012635721696966628, 0.030862723934399817, 0.05679223648607558,
  0.08999900702096378, 0.12993790397897156, 0.17595317407419576, 0.22728926430133018,
  0.2831032461070091, 0.34247866013215524, 0.4044405663042829, 0.4679715573364964,
  0.5320284426635036, 0.5955594336957171, 0.6575213398678448, 0.7168967538929909,
  0.7727107356986698, 0.8240468259258042, 0.8700620960210284, 0.9100009929790362,
  0.9432077635139244, 0.9691372760656002, 0.9873642783030334, 0.9975936104390356,
];

const GL24_WEIGHTS_01: readonly number[] = [
  0.006170614899993585, 0.014265694314466832, 0.022138719408709903, 0.029649292457718394,
  0.03667324070554015, 0.04309508076597664, 0.04880932605205694, 0.05372213505798284,
  0.0577528340268628, 0.0608352364639017, 0.06291872817341414, 0.06396909767337608,
  0.06396909767337608, 0.06291872817341414, 0.0608352364639017, 0.0577528340268628,
  0.05372213505798284, 0.04880932605205694, 0.04309508076597664, 0.03667324070554015,
  0.029649292457718394, 0.022138719408709903, 0.014265694314466832, 0.006170614899993585,
];

const PRIMES = [2, 3, 5, 7, 11] as const;

function haltonRadicalInverse(index: number, base: number): number {
  let result = 0;
  let f = 1 / base;
  let i = index;
  while (i > 0) {
    result += f * (i % base);
    i = Math.floor(i / base);
    f /= base;
  }
  return result;
}

const QMC_POINTS_COUNT = 1024;
const HALTON_4D: readonly (readonly [number, number, number, number])[] = Array.from(
  { length: QMC_POINTS_COUNT },
  (_, idx) => {
    const n = idx + 1;
    return [
      haltonRadicalInverse(n, PRIMES[0]),
      haltonRadicalInverse(n, PRIMES[1]),
      haltonRadicalInverse(n, PRIMES[2]),
      haltonRadicalInverse(n, PRIMES[3]),
    ] as const;
  },
);

/**
 * Evaluates Multivariate Normal lower-orthant probability P(X <= upperBounds)
 * for X ~ N_k(0, L * L^T), 2 <= k <= 5, using Genz (1992) separation-of-variables.
 */
export function multivariateNormalOrthantFromCholesky(
  upperBounds: readonly number[],
  cholesky: readonly (readonly number[])[],
): number {
  const k = upperBounds.length;
  if (k === 1) {
    return standardNormalCdf(upperBounds[0]! / cholesky[0]![0]!);
  }

  const d0 = standardNormalCdf(upperBounds[0]! / cholesky[0]![0]!);
  if (d0 <= 1e-15) return 0;

  if (k === 2) {
    const l10 = cholesky[1]![0]!;
    const l11 = cholesky[1]![1]!;
    const b1 = upperBounds[1]!;
    let integral = 0;
    for (let m = 0; m < GL24_NODES_01.length; m += 1) {
      const u0 = GL24_NODES_01[m]! * d0;
      const y0 = standardNormalQuantile(Math.min(1 - 1e-15, Math.max(1e-15, u0)));
      const d1 = standardNormalCdf((b1 - l10 * y0) / l11);
      integral += GL24_WEIGHTS_01[m]! * d1;
    }
    return Math.min(1, Math.max(0, d0 * integral));
  }

  const y = new Array<number>(k - 1).fill(0);
  let sum = 0;
  for (let pIdx = 0; pIdx < QMC_POINTS_COUNT; pIdx += 1) {
    const h = HALTON_4D[pIdx]!;
    for (let mirror = 0; mirror < 2; mirror += 1) {
      let weight = d0;
      let prevD = d0;
      for (let i = 1; i < k; i += 1) {
        const uCoord = mirror === 0 ? h[i - 1]! : 1 - h[i - 1]!;
        const u = Math.min(1 - 1e-14, Math.max(1e-14, uCoord * prevD));
        y[i - 1] = standardNormalQuantile(u);

        let dot = 0;
        const row = cholesky[i]!;
        for (let j = 0; j < i; j += 1) {
          dot += row[j]! * y[j]!;
        }
        const di = standardNormalCdf((upperBounds[i]! - dot) / row[i]!);
        weight *= di;
        prevD = di;
        if (weight <= 1e-15) break;
      }
      sum += weight;
    }
  }

  return Math.min(1, Math.max(0, sum / (2 * QMC_POINTS_COUNT)));
}

/**
 * Evaluates Gaussian Copula joint probability for marginal probabilities p_1..p_k (2 <= k <= 5).
 */
export function evaluateGaussianCopulaJointProb(
  marginalProbs: readonly number[],
  cholesky: readonly (readonly number[])[],
): number {
  const upperBounds = marginalProbs.map((p) =>
    standardNormalQuantile(Math.min(1 - 1e-12, Math.max(1e-12, p))),
  );
  return multivariateNormalOrthantFromCholesky(upperBounds, cholesky);
}

/**
 * Evaluates Multivariate Student-t4 (df=4) Copula joint probability for marginal probabilities p_1..p_k.
 * Note: For a Student-t4 copula, the joint distribution of (U_1, ..., U_k) has correlation matrix R.
 * Even when off-diagonal rho_ij = 0, a multivariate Student-t4 shares a common chi-square(4) radial
 * shock W across coordinates (giving radial heavy-tail co-movement), and for non-zero rho_ij it
 * captures NFL shootout & red-zone tail dependence (lambda_U > 0).
 */
export function evaluateStudentT4CopulaJointProb(
  marginalProbs: readonly number[],
  cholesky: readonly (readonly number[])[],
): number {
  const k = marginalProbs.length;
  const tBounds = marginalProbs.map((p) =>
    studentT4Quantile(Math.min(1 - 1e-12, Math.max(1e-12, p))),
  );

  if (k === 2) {
    const scaledBounds = [0, 0];
    let total = 0;
    for (let s = 0; s < GL24_NODES_01.length; s += 1) {
      const v = GL24_NODES_01[s]!;
      const negLnV = -Math.log(v);
      const scale = Math.sqrt(0.5 * negLnV);
      scaledBounds[0] = tBounds[0]! * scale;
      scaledBounds[1] = tBounds[1]! * scale;
      const condProb = multivariateNormalOrthantFromCholesky(scaledBounds, cholesky);
      total += GL24_WEIGHTS_01[s]! * negLnV * condProb;
    }
    return Math.min(1, Math.max(0, total));
  }

  const qmcSubset = 256;
  const y = new Array<number>(k - 1).fill(0);
  let outerTotal = 0;

  for (let s = 0; s < GL24_NODES_01.length; s += 1) {
    const v = GL24_NODES_01[s]!;
    const negLnV = -Math.log(v);
    const scale = Math.sqrt(0.5 * negLnV);

    const b0 = tBounds[0]! * scale;
    const d0 = standardNormalCdf(b0 / cholesky[0]![0]!);
    if (d0 <= 1e-15) continue;

    let innerSum = 0;
    for (let pIdx = 0; pIdx < qmcSubset; pIdx += 1) {
      const h = HALTON_4D[pIdx]!;
      for (let mirror = 0; mirror < 2; mirror += 1) {
        let weight = d0;
        let prevD = d0;
        for (let i = 1; i < k; i += 1) {
          const uCoord = mirror === 0 ? h[i - 1]! : 1 - h[i - 1]!;
          const u = Math.min(1 - 1e-14, Math.max(1e-14, uCoord * prevD));
          y[i - 1] = standardNormalQuantile(u);

          let dot = 0;
          const row = cholesky[i]!;
          for (let j = 0; j < i; j += 1) {
            dot += row[j]! * y[j]!;
          }
          const bi = tBounds[i]! * scale;
          const di = standardNormalCdf((bi - dot) / row[i]!);
          weight *= di;
          prevD = di;
          if (weight <= 1e-15) break;
        }
        innerSum += weight;
      }
    }
    const condProb = innerSum / (2 * qmcSubset);
    outerTotal += GL24_WEIGHTS_01[s]! * negLnV * condProb;
  }

  return Math.min(1, Math.max(0, outerTotal));
}

/**
 * Companion seeded antithetic Monte Carlo Student-t4 copula simulator (Mulberry32 PRNG)
 * for direct empirical simulation cross-checks in tests and audit diagnostics.
 */
export function simulateStudentT4CopulaMonteCarlo(
  marginalProbs: readonly number[],
  cholesky: readonly (readonly number[])[],
  numTrials = 40000,
  seed = 20261113,
): number {
  const k = marginalProbs.length;
  const thresholds = marginalProbs.map((p) => studentT4Quantile(p));
  let state = seed >>> 0;
  const nextUniform = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return (((t ^ (t >>> 14)) >>> 0) + 0.5) / 4294967296;
  };

  const z = new Array<number>(k).fill(0);
  let hits = 0;
  const halfTrials = Math.max(1, Math.floor(numTrials / 2));

  for (let trial = 0; trial < halfTrials; trial += 1) {
    const uChi1 = nextUniform();
    const uChi2 = nextUniform();
    const w = -2 * (Math.log(uChi1) + Math.log(uChi2));
    const denom = Math.sqrt(w / 4);

    for (let i = 0; i < k; i += 1) {
      z[i] = standardNormalQuantile(nextUniform());
    }

    let hitPos = true;
    let hitNeg = true;
    for (let i = 0; i < k; i += 1) {
      let correlatedZ = 0;
      const row = cholesky[i]!;
      for (let j = 0; j <= i; j += 1) {
        correlatedZ += row[j]! * z[j]!;
      }
      const tPos = correlatedZ / denom;
      const tNeg = -correlatedZ / denom;
      if (tPos > thresholds[i]!) hitPos = false;
      if (tNeg > thresholds[i]!) hitNeg = false;
      if (!hitPos && !hitNeg) break;
    }
    if (hitPos) hits += 1;
    if (hitNeg) hits += 1;
  }

  return hits / (2 * halfTrials);
}

// ============================================================================
// 4. COMPLETE PARLAY MRI DIAGNOSTIC ENGINE ("X-Ray Your SGP Before You Bet It")
// ============================================================================

export function evaluateParlayMri(params: {
  legs: readonly SgpLegInput[];
  quotedSgpAmericanOdds: number;
  assumedTwoWayOverround?: number;
}): ParlayMriDiagnosis {
  const { legs, quotedSgpAmericanOdds, assumedTwoWayOverround = DEFAULT_TWO_WAY_OVERROUND } = params;
  if (legs.length < 2 || legs.length > 5) {
    throw new RangeError(`Parlay MRI supports 2 to 5 SGP legs, received ${legs.length}.`);
  }

  const quotedSgpDecimalOdds = americanToDecimal(quotedSgpAmericanOdds);
  const bookImpliedProb = 1 / quotedSgpDecimalOdds;

  const evaluatedLegs: EvaluatedSgpLeg[] = legs.map((leg) => {
    const devigged = devigSgpLegAmerican(
      leg.americanOdds,
      leg.counterAmericanOdds,
      assumedTwoWayOverround,
    );
    return {
      legId: leg.legId,
      label: leg.label,
      archetype: leg.archetype,
      teamSide: leg.teamSide ?? 'HOME',
      americanOdds: leg.americanOdds,
      decimalOdds: devigged.decimalOdds,
      rawImpliedProb: devigged.rawImpliedProb,
      shinFairProb: devigged.shinFairProb,
      shinZ: devigged.shinZ,
    };
  });

  const k = evaluatedLegs.length;
  const rawMatrix: number[][] = Array.from({ length: k }, (_, i) =>
    Array.from({ length: k }, (__, j) =>
      i === j ? 1.0 : lookupPairwiseFootballRho(legs[i]!, legs[j]!),
    ),
  );

  const { matrix: psdMatrix, cholesky, projected } = ensurePositiveDefiniteCorrelation(rawMatrix);
  const marginalProbs = evaluatedLegs.map((l) => l.shinFairProb);

  const naiveIndependentProb = marginalProbs.reduce((acc, p) => acc * p, 1);
  const gaussianCopulaProb = evaluateGaussianCopulaJointProb(marginalProbs, cholesky);
  const studentT4CopulaProb = evaluateStudentT4CopulaJointProb(marginalProbs, cholesky);

  const safeClampProb = (p: number): number => Math.min(0.995, Math.max(0.0005, p));
  const studentT4FairDecimalOdds = 1 / safeClampProb(studentT4CopulaProb);
  const studentT4FairAmericanOdds = decimalToAmerican(studentT4FairDecimalOdds);
  const gaussianFairAmericanOdds = decimalToAmerican(1 / safeClampProb(gaussianCopulaProb));
  const naiveIndependentAmericanOdds = decimalToAmerican(1 / safeClampProb(naiveIndependentProb));

  const hiddenCorrelationHoldPct = Number(
    ((1 - studentT4CopulaProb * quotedSgpDecimalOdds) * 100).toFixed(2),
  );
  const impliedProbMarkupPctPoints = Number(
    ((bookImpliedProb - studentT4CopulaProb) * 100).toFixed(2),
  );
  const expectedHouseKeepPer100Dollars = Number(hiddenCorrelationHoldPct.toFixed(2));
  const correlationMultiplierPct = Number(
    ((studentT4CopulaProb / naiveIndependentProb - 1) * 100).toFixed(2),
  );

  const pairwiseSummaries: PairwiseLegCorrelationSummary[] = [];
  for (let i = 0; i < k; i += 1) {
    for (let j = i + 1; j < k; j += 1) {
      const psdRho = Number(psdMatrix[i]![j]!.toFixed(4));
      pairwiseSummaries.push({
        legIndexA: i,
        legIndexB: j,
        labelA: evaluatedLegs[i]!.label,
        labelB: evaluatedLegs[j]!.label,
        rawRho: rawMatrix[i]![j]!,
        psdAdjustedRho: psdRho,
        studentT4UpperTailDependence: Number(studentT4UpperTailDependence(psdRho).toFixed(4)),
        relationshipPlainEnglish: describePairwiseCorrelationPlainEnglish(psdRho),
      });
    }
  }

  let gradeSeverity: ParlayMriDiagnosis['gradeSeverity'];
  let plainEnglishHeadline: string;

  if (hiddenCorrelationHoldPct <= 4.0) {
    gradeSeverity = 'FAIR_OR_PLUS_EV';
    plainEnglishHeadline =
      hiddenCorrelationHoldPct <= 0
        ? `Rare Mispriced Ticket: +${Math.abs(hiddenCorrelationHoldPct).toFixed(1)}% Player Edge vs Fair Value`
        : `Low House Margin: ${hiddenCorrelationHoldPct.toFixed(1)}% Hold (Near Single-Bet Pricing)`;
  } else if (hiddenCorrelationHoldPct < 15.0) {
    gradeSeverity = 'MODERATE_TAX';
    plainEnglishHeadline = `Moderate SGP Tax: ${hiddenCorrelationHoldPct.toFixed(1)}% Hidden Hold`;
  } else if (hiddenCorrelationHoldPct <= 28.0) {
    gradeSeverity = 'HEAVY_HIDDEN_TAX';
    plainEnglishHeadline = `Heavy SGP Markup: ${hiddenCorrelationHoldPct.toFixed(1)}% Hidden Correlation Hold`;
  } else {
    gradeSeverity = 'EXTREME_SGP_TRAP';
    plainEnglishHeadline = `Severe SGP Tax Trap: ${hiddenCorrelationHoldPct.toFixed(1)}% Hidden Hold`;
  }

  const fairStr = formatAmericanOdds(studentT4FairAmericanOdds);
  const bookStr = formatAmericanOdds(quotedSgpAmericanOdds);
  const keepAbs = Math.abs(expectedHouseKeepPer100Dollars).toFixed(2);

  const plainEnglishExplanation =
    hiddenCorrelationHoldPct > 0
      ? `After stripping single-leg vig and modeling how NFL game flow links these ${k} legs (including extreme fourth-quarter shootout and red-zone swings), this parlay hits ${(studentT4CopulaProb * 100).toFixed(1)}% of the time — a true fair price of ${fairStr}. At the sportsbook's ${bookStr} quote, the house keeps $${keepAbs} of every $100 wagered (${hiddenCorrelationHoldPct.toFixed(1)}% hidden hold).`
      : `After stripping single-leg vig and modeling shared NFL game scripts across all ${k} legs, this parlay hits ${(studentT4CopulaProb * 100).toFixed(1)}% of the time (fair price ${fairStr}). The sportsbook's ${bookStr} quote actually pays above fair value (+$${keepAbs} expected edge per $100 staked).`;

  return {
    legs: evaluatedLegs,
    quotedSgpAmericanOdds,
    quotedSgpDecimalOdds,
    bookImpliedProb,
    naiveIndependentProb,
    naiveIndependentAmericanOdds,
    gaussianCopulaProb,
    gaussianFairAmericanOdds,
    studentT4CopulaProb,
    studentT4FairDecimalOdds,
    studentT4FairAmericanOdds,
    hiddenCorrelationHoldPct,
    impliedProbMarkupPctPoints,
    expectedHouseKeepPer100Dollars,
    correlationMultiplierPct,
    psdProjectionApplied: projected,
    correlationMatrixPsd: psdMatrix,
    pairwiseSummaries,
    gradeSeverity,
    plainEnglishHeadline,
    plainEnglishExplanation,
  };
}

// ============================================================================
// 5. COMPLIANCE FORMATTING & PUBLIC SURFACE ANTI-JARGON GUARDRAILS
// ============================================================================

const BANNED_PUBLIC_PATTERNS: readonly { id: string; regex: RegExp; reason: string }[] = [
  { id: 'jargon_sinkhorn', regex: /\bsinkhorn\b/i, reason: 'Internal optimal-transport jargon banned on public UI.' },
  { id: 'jargon_jev', regex: /\bjev\b|\bjevkit\b/i, reason: 'Internal JEV runtime name banned on public UI.' },
  { id: 'jargon_romano_cqr', regex: /\bromano\s*cqr\b|\bcqr\b/i, reason: 'Internal conformal jargon banned on public UI.' },
  { id: 'jargon_tau_hat', regex: /\btau_hat\b|\btau\s*hat\b/i, reason: 'Internal residual symbol tau_hat banned on public UI.' },
  { id: 'jargon_glass_ledger', regex: /\bglass\s+ledger\b/i, reason: 'Retired Glass Ledger brand banned on public UI.' },
  { id: 'voided_record_62_23_1', regex: /\b62\s*[-–]\s*23\s*[-–]\s*1\b/, reason: 'Legacy 62-23-1 string banned on public storefront.' },
  { id: 'tout_guaranteed_win', regex: /\bguaranteed\s+win(s|ner|ners)?\b/i, reason: 'Banned tout phrase: guaranteed win.' },
  { id: 'tout_lock', regex: /\block(s)?\b/i, reason: 'Banned tout phrase: lock.' },
  { id: 'tout_risk_free', regex: /\brisk[\s-]*free\b/i, reason: 'Banned regulatory phrase: risk-free.' },
  { id: 'tout_cant_lose', regex: /\bcan['’]?t\s+lose\b|\bsure\s+thing\b/i, reason: 'Banned tout certainty claim.' },
  { id: 'pct_confidence', regex: /\b\d+(\.\d+)?\s*%\s*confidence\b|\bconfidence\s*:\s*\d+(\.\d+)?\s*%/i, reason: 'Percentage confidence banned; use integer XX/100 conviction.' },
];

/**
 * Formats model conviction strictly as an integer 'XX/100' string (never '%').
 */
export function formatIntegerConviction(score: number): string {
  if (!Number.isFinite(score) || score < 0 || score > 100) {
    throw new RangeError(`Conviction score must be in [0, 100], got ${score}.`);
  }
  return `${Math.round(score)}/100`;
}

/**
 * Scans rendered public UI text against GSE compliance & anti-jargon rules.
 */
export function scanPublicUiCompliance(text: string): {
  passed: boolean;
  violations: readonly { id: string; match: string; reason: string }[];
} {
  const violations: { id: string; match: string; reason: string }[] = [];
  for (const rule of BANNED_PUBLIC_PATTERNS) {
    const m = rule.regex.exec(text);
    if (m) {
      violations.push({ id: rule.id, match: m[0], reason: rule.reason });
    }
  }
  return { passed: violations.length === 0, violations };
}

// ============================================================================
// 6. PRE-KICKOFF SHA-256 COMMITMENT RECEIPT SIGNER & VERIFIER
// ============================================================================

export interface PreKickoffCommitmentPayload {
  readonly schemaVersion: 'gse.commitment.v1';
  readonly packId: string;
  readonly week: number;
  readonly matchupCode: string;
  readonly kickoffUtc: string;
  readonly sealedBeforeKickoffUtc: string;
  readonly integerConviction: string; // e.g., '78/100'
  readonly plays: readonly {
    readonly playId: string;
    readonly selection: string;
    readonly americanOdds: number;
    readonly riskUnits: number;
  }[];
  readonly saltNonce: string;
}

export function canonicalizeCommitmentPayload(payload: PreKickoffCommitmentPayload): string {
  if (!/^\d{1,3}\/100$/.test(payload.integerConviction)) {
    throw new RangeError(
      `PreKickoffCommitmentPayload requires integer 'XX/100' conviction format, got '${payload.integerConviction}'.`,
    );
  }
  const canonicalObj = {
    integerConviction: payload.integerConviction,
    kickoffUtc: payload.kickoffUtc,
    matchupCode: payload.matchupCode,
    packId: payload.packId,
    plays: payload.plays.map((p) => ({
      americanOdds: p.americanOdds,
      playId: p.playId,
      riskUnits: Number(p.riskUnits.toFixed(2)),
      selection: p.selection,
    })),
    saltNonce: payload.saltNonce,
    schemaVersion: payload.schemaVersion,
    sealedBeforeKickoffUtc: payload.sealedBeforeKickoffUtc,
    week: payload.week,
  };
  return JSON.stringify(canonicalObj);
}

export function createPreKickoffCommitmentReceipt(payload: PreKickoffCommitmentPayload): {
  canonicalJson: string;
  commitmentSha256: string;
  sealedBeforeKickoff: boolean;
} {
  const sealedMs = Date.parse(payload.sealedBeforeKickoffUtc);
  const kickoffMs = Date.parse(payload.kickoffUtc);
  if (!Number.isFinite(sealedMs) || !Number.isFinite(kickoffMs) || sealedMs >= kickoffMs) {
    throw new RangeError(
      `Commitment timestamp (${payload.sealedBeforeKickoffUtc}) must be strictly prior to kickoff (${payload.kickoffUtc}).`,
    );
  }
  const canonicalJson = canonicalizeCommitmentPayload(payload);
  const commitmentSha256 = createHash('sha256').update(canonicalJson, 'utf8').digest('hex');
  return {
    canonicalJson,
    commitmentSha256,
    sealedBeforeKickoff: true,
  };
}

export function verifyPreKickoffCommitmentReceipt(
  canonicalJson: string,
  expectedSha256: string,
): { verified: boolean; computedSha256: string } {
  const computedSha256 = createHash('sha256').update(canonicalJson, 'utf8').digest('hex');
  return {
    verified: computedSha256.toLowerCase() === expectedSha256.trim().toLowerCase(),
    computedSha256,
  };
}
