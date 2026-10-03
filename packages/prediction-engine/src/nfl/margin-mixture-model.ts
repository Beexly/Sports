/**
 * NFL margin mixture — Stern-normal continuous component mixed with discrete
 * point masses at the classic key numbers 3, 7, 6, and 10 (both signs).
 *
 * FIRST-PARTY. Not a port of stepmix / MixMod / any EM library. Closed-form
 * method of moments + Laplace-smoothed empirical key masses, same posture as
 * `dispersion/estimate-phi.ts`: evidence in, no live scoring wire.
 *
 * Data access matches the prediction-engine pattern used by estimate-phi and
 * team-rates: this module is pure. Callers pass settled home margins
 * (`homeScore - awayScore`) as `readonly number[]`, or `TeamGameRecord`
 * rows (`teamScore` / `opponentScore`) from TeamGameLog. No Prisma. No schema.
 *
 * Spread convention (GSE internal): `spreadHome` is HOME-perspective,
 * negative = home favored (scoring.ts / clv.ts / nfl-games.ts). Home covers
 * iff margin + spreadHome > 0. A mass exactly at −spreadHome is a push.
 *
 * References:
 *   Stern, H. (1991). On the Probability of Winning a Football Game.
 *     The American Statistician 45(3), 179–183. (normal approximation to NFL
 *     score difference.)
 *   Glickman, M. E. & Stern, H. S. (1998). A State-Space Model for National
 *     Football League Scores. JASA 93(441), 25–35.
 *
 * NOT wired into live pick scoring. MODEL_VERSION is untouched.
 */

import { normalCdf } from "../performance-ci.js";
import type { TeamGameRecord } from "../team-rates.js";

/** Classic NFL key-number magnitudes (field goal, TD, FG+FG, TD+FG). */
export const NFL_KEY_NUMBERS = [3, 7, 6, 10] as const;

/** Signed landing spots: a home win by 3 and a home loss by 3 are both keys. */
export const NFL_SIGNED_KEY_NUMBERS = [-10, -7, -6, -3, 3, 6, 7, 10] as const;

/**
 * Below this many finite margins we will not claim a mixture. NFL regular
 * season is ~272 games; 64 is enough for 8 key bins without inventing a fit
 * off a handful of scores.
 */
export const MIN_SAMPLES_FOR_MARGIN_MIXTURE = 64;

/** Laplace addend so every key mass is strictly positive even if unseen. */
const KEY_MASS_ALPHA = 0.5;

const SQRT_2PI = Math.sqrt(2 * Math.PI);

export type MarginMixtureVerdict = "fitted" | "insufficient-data" | "degenerate";

export interface KeyNumberMass {
  readonly margin: number;
  readonly mass: number;
  readonly count: number;
}

export interface NflMarginMixtureFit {
  readonly verdict: MarginMixtureVerdict;
  readonly n: number;
  /** Stern-normal location of the continuous remainder. */
  readonly mu: number;
  /** Stern-normal scale of the continuous remainder. Null unless fitted. */
  readonly sigma: number | null;
  /** Weight on the continuous Stern-normal component. */
  readonly continuousWeight: number;
  /** Discrete masses at signed key numbers; sum + continuousWeight = 1 when fitted. */
  readonly keyMasses: readonly KeyNumberMass[];
  readonly reason: string;
}

function isSignedKey(margin: number): boolean {
  return (NFL_SIGNED_KEY_NUMBERS as readonly number[]).includes(margin);
}

function meanOf(xs: readonly number[]): number {
  let s = 0;
  for (const x of xs) s += x;
  return s / xs.length;
}

function sampleSd(xs: readonly number[], mean: number): number {
  if (xs.length < 2) return 0;
  let ss = 0;
  for (const x of xs) {
    const d = x - mean;
    ss += d * d;
  }
  return Math.sqrt(ss / (xs.length - 1));
}

function normalPdf(x: number, mu: number, sigma: number): number {
  const z = (x - mu) / sigma;
  return Math.exp(-0.5 * z * z) / (sigma * SQRT_2PI);
}

/**
 * Convert TeamGameLog-shaped records (team-rates `TeamGameRecord`) into signed
 * margins. Callers that have both home and away rows for the same game must
 * pass one side only or the game is double-counted.
 */
export function marginsFromTeamGameRecords(
  records: readonly TeamGameRecord[],
): number[] {
  const out: number[] = [];
  for (const r of records) {
    if (!Number.isFinite(r.teamScore) || !Number.isFinite(r.opponentScore)) continue;
    out.push(r.teamScore - r.opponentScore);
  }
  return out;
}

/**
 * Fit the NFL margin mixture from settled home margins.
 *
 * Discrete masses: Laplace-smoothed empirical frequencies at signed key
 * numbers. Continuous component: unbiased mean/sd of the leftover (non-key)
 * margins — Stern's normal approximation to the score difference. If leftover
 * n < 2, fall back to all finite margins; if that sd is 0, fail closed.
 */
export function fitNflMarginMixture(
  margins: readonly number[],
): NflMarginMixtureFit {
  const clean = margins.filter((m) => Number.isFinite(m));
  const n = clean.length;

  if (n < MIN_SAMPLES_FOR_MARGIN_MIXTURE) {
    return {
      verdict: "insufficient-data",
      n,
      mu: n > 0 ? meanOf(clean) : 0,
      sigma: null,
      continuousWeight: 0,
      keyMasses: [],
      reason: `n=${n} < ${MIN_SAMPLES_FOR_MARGIN_MIXTURE}; mixture would be dominated by sampling noise.`,
    };
  }

  const counts = new Map<number, number>();
  for (const k of NFL_SIGNED_KEY_NUMBERS) counts.set(k, 0);
  const leftover: number[] = [];
  for (const m of clean) {
    if (isSignedKey(m)) {
      counts.set(m, (counts.get(m) ?? 0) + 1);
    } else {
      leftover.push(m);
    }
  }

  const kCount = NFL_SIGNED_KEY_NUMBERS.length;
  const denom = n + KEY_MASS_ALPHA * kCount;
  const keyMasses: KeyNumberMass[] = NFL_SIGNED_KEY_NUMBERS.map((margin) => {
    const count = counts.get(margin) ?? 0;
    return {
      margin,
      count,
      mass: (count + KEY_MASS_ALPHA) / denom,
    };
  });

  const discreteWeight = keyMasses.reduce((s, km) => s + km.mass, 0);
  const continuousWeight = Math.max(0, 1 - discreteWeight);

  const continuousSample = leftover.length >= 2 ? leftover : clean;
  const mu = meanOf(continuousSample);
  const sigma = sampleSd(continuousSample, mu);

  if (!(sigma > 0) || !Number.isFinite(sigma) || continuousWeight <= 0) {
    return {
      verdict: "degenerate",
      n,
      mu,
      sigma: null,
      continuousWeight,
      keyMasses,
      reason:
        "Continuous Stern-normal is unidentifiable (zero leftover variance or non-positive continuous weight).",
    };
  }

  return {
    verdict: "fitted",
    n,
    mu,
    sigma,
    continuousWeight,
    keyMasses,
    reason: `Stern-normal(μ=${mu.toFixed(3)}, σ=${sigma.toFixed(3)}) weight=${continuousWeight.toFixed(4)} + ${kCount} key masses.`,
  };
}

export function keyMassAt(fit: NflMarginMixtureFit, margin: number): number {
  const hit = fit.keyMasses.find((km) => km.margin === margin);
  return hit?.mass ?? 0;
}

/**
 * Continuous Stern-normal density (does not include discrete masses).
 * Zero unless the fit is usable.
 */
export function continuousDensity(fit: NflMarginMixtureFit, margin: number): number {
  if (fit.verdict !== "fitted" || fit.sigma === null || fit.sigma <= 0) return 0;
  return fit.continuousWeight * normalPdf(margin, fit.mu, fit.sigma);
}

/**
 * Mixture CDF P(M ≤ t). Discrete masses at t are included (right-continuous).
 */
export function mixtureCdf(fit: NflMarginMixtureFit, t: number): number {
  if (fit.verdict !== "fitted" || fit.sigma === null || fit.sigma <= 0) return NaN;
  let p = fit.continuousWeight * normalCdf((t - fit.mu) / fit.sigma);
  for (const km of fit.keyMasses) {
    if (km.margin <= t) p += km.mass;
  }
  return p;
}

export interface CoverProbability {
  readonly home: number;
  readonly away: number;
  readonly push: number;
}

/**
 * Cover probabilities for a HOME-perspective spread (negative = home favored).
 * Home covers iff M > −spreadHome. Push is the discrete mass at −spreadHome
 * (zero on half-point lines). Away covers the rest. Sums to 1 when fitted.
 */
export function coverProbability(
  fit: NflMarginMixtureFit,
  spreadHome: number,
): CoverProbability | null {
  if (
    fit.verdict !== "fitted" ||
    fit.sigma === null ||
    fit.sigma <= 0 ||
    !Number.isFinite(spreadHome)
  ) {
    return null;
  }

  const threshold = -spreadHome;
  const push = keyMassAt(fit, threshold);

  // Continuous P(M > t) = 1 − Φ((t − μ)/σ). Point masses at t are push, not cover.
  const contCoverHome = fit.continuousWeight * (1 - normalCdf((threshold - fit.mu) / fit.sigma));
  let discCoverHome = 0;
  let discCoverAway = 0;
  for (const km of fit.keyMasses) {
    if (km.margin > threshold) discCoverHome += km.mass;
    else if (km.margin < threshold) discCoverAway += km.mass;
  }
  const home = contCoverHome + discCoverHome;
  const away = 1 - home - push;
  return { home, away, push };
}

/** Convenience: P(home covers) or null if the fit is not usable. */
export function homeCoverProbability(
  fit: NflMarginMixtureFit,
  spreadHome: number,
): number | null {
  return coverProbability(fit, spreadHome)?.home ?? null;
}
