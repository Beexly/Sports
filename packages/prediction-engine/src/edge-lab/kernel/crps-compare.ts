/**
 * Discrete CRPS vs widened-Gaussian CRPS on integer outcomes.
 *
 * Discrete CRPS is the primary for integer scores (margins, totals, props).
 * Gaussian closed form is a diagnostic. This mill asks whether the
 * diagnostic ranks two models the same way the primary does, AND whether
 * the Gaussian is wrong enough on paired per-row scores to matter at our n.
 *
 * PAIRED KILL (pre-registered, before looking): Gaussian is killed as a
 * substitute for discrete CRPS iff nLicensed ≥ 272 and
 * mean_i [CRPS_N(μ_{-i},σ_{-i})(y_i) − CRPS_{empirical LOO}(y_i)] ≥ 0.5.
 * Report the paired mean and its SE, not two unpaired means. n < 272 is
 * underpowered — that is the finding, not a pass.
 *
 * TeamGameLog is still not in this sandbox. The route around that wall is
 * nflverse/nfldata games.csv (CC-BY-4.0), already an allowed source: REG
 * home−away margins. That extract is labelled nflverse-schedules, not
 * TeamGameLog. FLASH_NFLVERSE_CRPS_PAIRED is the 2026-09-18 measurement.
 *
 * SHADOW. priced false.
 */

import type { DiscreteDistribution, Rng } from "./contract.js";
import { KernelError, assertFinite, makeRng } from "./contract.js";
import { crpsDiscrete, crpsGaussian, evaluateCrpsGate, CRPS_KILL_MIN_N, CRPS_KILL_MIN_IMPROVEMENT, type CrpsGateResult } from "./slots/crps.js";

export type CrpsCompareRow = {
  readonly y: number;
  readonly discreteA: number;
  readonly discreteB: number;
  readonly gaussianA: number;
  readonly gaussianB: number;
};

export type CrpsRanking = "A" | "B" | "tie";

export type CrpsCompareReport = {
  readonly n: number;
  readonly meanDiscreteA: number;
  readonly meanDiscreteB: number;
  readonly meanGaussianA: number;
  readonly meanGaussianB: number;
  readonly discreteRanking: CrpsRanking;
  readonly gaussianRanking: CrpsRanking;
  readonly rankingsAgree: boolean;
  /** Gaussian closed form is a diagnostic. It never licenses a kill. */
  readonly gaussianLicensedAsKill: false;
  readonly priced: false;
  readonly status: "shadow";
};

function ranking(a: number, b: number, tol = 1e-12): CrpsRanking {
  if (Math.abs(a - b) <= tol) return "tie";
  return a < b ? "A" : "B";
}

function mean(xs: readonly number[]): number {
  if (xs.length === 0) throw new KernelError("EMPTY", "mean of empty CRPS series");
  return xs.reduce((s, x) => s + x, 0) / xs.length;
}

/**
 * Score two discrete predictives and their Gaussian moment-matches on the
 * same integer observations. Rankings on mean CRPS (lower better).
 */
export function compareCrpsRankings(args: {
  readonly y: readonly number[];
  readonly distA: DiscreteDistribution;
  readonly distB: DiscreteDistribution;
  readonly gaussianA: { readonly mean: number; readonly sd: number };
  readonly gaussianB: { readonly mean: number; readonly sd: number };
}): CrpsCompareReport {
  if (args.y.length === 0) {
    throw new KernelError("EMPTY", "compareCrpsRankings requires observations");
  }
  const discreteA: number[] = [];
  const discreteB: number[] = [];
  const gaussianA: number[] = [];
  const gaussianB: number[] = [];
  for (const y of args.y) {
    assertFinite(y, "y");
    if (!Number.isInteger(y)) {
      throw new KernelError("DOMAIN", `compareCrpsRankings requires integer y, got ${y}`);
    }
    discreteA.push(crpsDiscrete(args.distA, y));
    discreteB.push(crpsDiscrete(args.distB, y));
    gaussianA.push(crpsGaussian(args.gaussianA.mean, args.gaussianA.sd, y));
    gaussianB.push(crpsGaussian(args.gaussianB.mean, args.gaussianB.sd, y));
  }
  const meanDiscreteA = mean(discreteA);
  const meanDiscreteB = mean(discreteB);
  const meanGaussianA = mean(gaussianA);
  const meanGaussianB = mean(gaussianB);
  const discreteRanking = ranking(meanDiscreteA, meanDiscreteB);
  const gaussianRanking = ranking(meanGaussianA, meanGaussianB);
  return {
    n: args.y.length,
    meanDiscreteA,
    meanDiscreteB,
    meanGaussianA,
    meanGaussianB,
    discreteRanking,
    gaussianRanking,
    rankingsAgree: discreteRanking === gaussianRanking,
    gaussianLicensedAsKill: false,
    priced: false,
    status: "shadow",
  };
}

/** Integer-support dist from a finite PMF. Mass is renormalised. */
export function distFromPmf(pmf: ReadonlyMap<number, number>): DiscreteDistribution {
  const keys = [...pmf.keys()].filter((k) => Number.isInteger(k) && (pmf.get(k) ?? 0) > 0).sort((a, b) => a - b);
  if (keys.length === 0) throw new KernelError("EMPTY", "distFromPmf: no positive mass");
  let total = 0;
  for (const k of keys) total += pmf.get(k)!;
  if (!(total > 0)) throw new KernelError("DOMAIN", "distFromPmf: mass does not sum to a positive number");
  const p = new Map<number, number>();
  for (const k of keys) p.set(k, pmf.get(k)! / total);
  const min = keys[0]!;
  const max = keys[keys.length - 1]!;
  const cdfAt = (k: number): number => {
    let s = 0;
    for (const key of keys) {
      if (key <= k) s += p.get(key)!;
    }
    return s;
  };
  let meanX = 0;
  let second = 0;
  for (const k of keys) {
    const pk = p.get(k)!;
    meanX += k * pk;
    second += k * k * pk;
  }
  return {
    kind: "discrete",
    pmf: (k) => {
      if (!Number.isInteger(k)) throw new KernelError("DOMAIN", `pmf requires integer k, got ${k}`);
      return p.get(k) ?? 0;
    },
    cdf: (k) => {
      if (!Number.isFinite(k)) throw new KernelError("NOT_FINITE", "cdf");
      if (k < min) return 0;
      return Math.min(1, cdfAt(Math.floor(k)));
    },
    quantile: (q) => {
      if (!(q >= 0 && q <= 1)) throw new KernelError("DOMAIN", `quantile p in [0,1], got ${q}`);
      let acc = 0;
      for (const k of keys) {
        acc += p.get(k)!;
        if (acc >= q) return k;
      }
      return max;
    },
    sample: (rng: Rng) => {
      const u = rng();
      let acc = 0;
      for (const k of keys) {
        acc += p.get(k)!;
        if (u < acc) return k;
      }
      return max;
    },
    mean: () => meanX,
    variance: () => Math.max(0, second - meanX * meanX),
    support: () => ({ min, max }),
  };
}

function gaussianPdf(x: number, mu: number, sd: number): number {
  const z = (x - mu) / sd;
  return Math.exp(-0.5 * z * z) / (sd * Math.sqrt(2 * Math.PI));
}

/** Discretised N(μ,σ²) on {lo..hi} via PMF ∝ φ((k-μ)/σ). */
export function discretizedGaussian(mean: number, sd: number, lo: number, hi: number): DiscreteDistribution {
  assertFinite(mean, "mean");
  assertFinite(sd, "sd");
  if (!(sd > 0)) throw new KernelError("DOMAIN", `discretizedGaussian sd > 0, got ${sd}`);
  if (!Number.isInteger(lo) || !Number.isInteger(hi) || hi < lo) {
    throw new KernelError("DOMAIN", "discretizedGaussian requires integer lo ≤ hi");
  }
  const pmf = new Map<number, number>();
  for (let k = lo; k <= hi; k += 1) pmf.set(k, gaussianPdf(k, mean, sd));
  return distFromPmf(pmf);
}

/**
 * NFL-ish integer margin: discretised N(0,σ²) with extra mass at ±3 and ±7
 * (the key-number bump). Renormalised. Not a production density.
 */
export function nflKeyNumberMixture(sd = 14, bump = 1.8, lo = -40, hi = 40): DiscreteDistribution {
  const base = discretizedGaussian(0, sd, lo, hi);
  const pmf = new Map<number, number>();
  for (let k = lo; k <= hi; k += 1) {
    const extra = k === 3 || k === -3 || k === 7 || k === -7 ? bump : 1;
    pmf.set(k, base.pmf(k) * extra);
  }
  return distFromPmf(pmf);
}

export type SyntheticCrpsCompare = CrpsCompareReport & {
  readonly discreteGate: CrpsGateResult;
  readonly gaussianGate: CrpsGateResult;
};

/**
 * Draw integer y from the key-number mixture. Model A is the mixture.
 * Model B is a matching-moment discretised Gaussian (no key-number bump).
 * Gaussian CRPS uses N(0, σ) for BOTH, so the diagnostic cannot see the
 * bump — rankingsAgree is expected false (discrete A wins, Gaussian ties).
 */
export function compareNflKeyNumberVsGaussian(opts?: {
  readonly n?: number;
  readonly sd?: number;
  readonly seed?: number;
}): SyntheticCrpsCompare {
  const n = opts?.n ?? 400;
  const sd = opts?.sd ?? 14;
  const mixture = nflKeyNumberMixture(sd);
  const gaussDisc = discretizedGaussian(0, sd, -40, 40);
  const rng = makeRng(opts?.seed ?? 17);
  const y: number[] = [];
  for (let i = 0; i < n; i += 1) y.push(mixture.sample(rng));
  const report = compareCrpsRankings({
    y,
    distA: mixture,
    distB: gaussDisc,
    gaussianA: { mean: 0, sd },
    gaussianB: { mean: 0, sd },
  });
  return {
    ...report,
    discreteGate: evaluateCrpsGate(report.meanDiscreteA, report.meanDiscreteB, n),
    gaussianGate: evaluateCrpsGate(report.meanGaussianA, report.meanGaussianB, n),
  };
}

/**
 * ESTIMAND (one line, before any number): leave-one-out paired mean of
 * CRPS_N(μ_{-i},σ_{-i})(y_i) − CRPS_{empirical LOO}(y_i) on integer margins.
 * Positive ⇒ the widened Gaussian is worse (higher CRPS) than the discrete
 * empirical on the same row.
 */
export const DISCRETE_VS_GAUSSIAN_ESTIMAND =
  "LOO paired mean_i [CRPS_N(μ_{-i},σ_{-i})(y_i) − CRPS_empiricalLOO(y_i)] on integer margins. Positive ⇒ Gaussian worse. Kill as substitute iff nLicensed≥272 and mean(d)≥0.5." as const;

export const DISCRETE_VS_GAUSSIAN_KILL_DELTA = CRPS_KILL_MIN_IMPROVEMENT;
export const DISCRETE_VS_GAUSSIAN_KILL_N = CRPS_KILL_MIN_N;

export const DISCRETE_VS_GAUSSIAN_MISSING_INPUT =
  "Neon TeamGameLog.teamScore/opponentScore is still missing here (TEAM_GAME_LOG_MARGINS_SQL). nflverse/nfldata games.csv REG margins were scored 2026-09-18 as nflverse-schedules (CC-BY-4.0). Synthetic draws are labelled synthetic-nfl-shaped." as const;

export type CrpsSampleKind = "synthetic-nfl-shaped" | "caller-supplied" | "nflverse-schedules";

/**
 * 2026-09-18 extract of nflverse/nfldata games.csv REG home−away margins.
 * Data via nflverse (nflverse/nfldata), licensed CC BY 4.0.
 * Kill was pre-registered at Δ≥0.5 / n≥272 before this sample was scored.
 * Gaussian is detectably worse (z≈7) and not wrong enough to matter.
 */
export const FLASH_NFLVERSE_CRPS_PAIRED = {
  recordedAt: "2026-09-18",
  source: "https://raw.githubusercontent.com/nflverse/nfldata/master/data/games.csv",
  attribution: "Data via nflverse (nflverse/nfldata), licensed CC BY 4.0.",
  gameType: "REG",
  n: 6984,
  meanD: 0.01811,
  seD: 0.00247,
  z: 7.33,
  meanDiscrete: 8.169,
  meanGaussian: 8.187,
  verdict: "gaussian_not_killed",
  killDelta: 0.5,
  killN: 272,
  sampleKind: "nflverse-schedules",
} as const;

/** Replica extract for our Neon TeamGameLog. isHome=true so a game is not double-counted. */
export const TEAM_GAME_LOG_MARGINS_SQL = `
SELECT json_agg(t.margin)
FROM (
  SELECT (l."teamScore" - l."opponentScore") AS margin
  FROM team_game_logs l
  WHERE l."isHome" = true
    AND l."teamScore" IS NOT NULL
    AND l."opponentScore" IS NOT NULL
    AND l.sport IN ('americanfootball_nfl', 'NFL', 'nfl')
) t
`.trim();

export type PairedCrpsVerdict =
  | "underpowered"
  | "gaussian_killed_as_substitute"
  | "gaussian_not_killed";

export type PairedCrpsReport = {
  readonly n: number;
  readonly nLicensed: number;
  readonly meanDiscrete: number;
  readonly meanGaussian: number;
  /** gaussian − discrete. Positive ⇒ Gaussian is worse on the same rows. */
  readonly meanD: number;
  readonly sdD: number;
  readonly seD: number;
  readonly killDelta: typeof DISCRETE_VS_GAUSSIAN_KILL_DELTA;
  readonly killN: typeof DISCRETE_VS_GAUSSIAN_KILL_N;
  readonly killFired: boolean;
  readonly verdict: PairedCrpsVerdict;
  readonly sampleKind: CrpsSampleKind;
  readonly missingInput: typeof DISCRETE_VS_GAUSSIAN_MISSING_INPUT;
  readonly estimand: typeof DISCRETE_VS_GAUSSIAN_ESTIMAND;
  /** The Gaussian number is never a licensed model-vs-model kill. */
  readonly gaussianLicensedAsKill: false;
  readonly priced: false;
  readonly status: "shadow";
  readonly dbQueried: false;
};

function looMeanSd(
  n: number,
  mean: number,
  m2: number,
  yi: number,
): { mean: number; sd: number } | null {
  if (n < 3) return null;
  const mu = (n * mean - yi) / (n - 1);
  // (n-2) s²_{-i} = (n-1) s² − n/(n-1) (y_i − mean)², s² = m2/(n-1), m2 = Σ(y-mean)²
  const sampleVar = m2 / (n - 1);
  const leftOutVar = ((n - 1) * sampleVar - (n / (n - 1)) * (yi - mean) * (yi - mean)) / (n - 2);
  if (!(leftOutVar > 0) || !Number.isFinite(leftOutVar)) return null;
  return { mean: mu, sd: Math.sqrt(leftOutVar) };
}

/**
 * Paired discrete vs widened-Gaussian CRPS. One d_i per row. Never two
 * unpaired means. Empty / non-integer throws. n < 272 is underpowered.
 */
export function pairedDiscreteVsWidenedGaussian(args: {
  readonly y: readonly number[];
  readonly sampleKind: CrpsSampleKind;
}): PairedCrpsReport {
  const y = args.y;
  if (y.length === 0) {
    throw new KernelError("EMPTY", "pairedDiscreteVsWidenedGaussian requires observations");
  }
  let sum = 0;
  const counts = new Map<number, number>();
  for (const yi of y) {
    assertFinite(yi, "y");
    if (!Number.isInteger(yi)) {
      throw new KernelError("DOMAIN", `pairedDiscreteVsWidenedGaussian requires integer y, got ${yi}`);
    }
    sum += yi;
    counts.set(yi, (counts.get(yi) ?? 0) + 1);
  }
  const n = y.length;
  const mean = sum / n;
  let m2 = 0;
  for (const yi of y) m2 += (yi - mean) * (yi - mean);

  const d: number[] = [];
  let sumDisc = 0;
  let sumGauss = 0;
  for (const yi of y) {
    const c = counts.get(yi)!;
    if (c === 1) counts.delete(yi);
    else counts.set(yi, c - 1);
    const gauss = looMeanSd(n, mean, m2, yi);
    if (gauss != null && counts.size > 0) {
      const discrete = crpsDiscrete(distFromPmf(counts), yi);
      const gaussian = crpsGaussian(gauss.mean, gauss.sd, yi);
      d.push(gaussian - discrete);
      sumDisc += discrete;
      sumGauss += gaussian;
    }
    counts.set(yi, (counts.get(yi) ?? 0) + 1);
  }

  const nLicensed = d.length;
  const meanD = nLicensed > 0 ? d.reduce((a, b) => a + b, 0) / nLicensed : Number.NaN;
  let sdD = Number.NaN;
  if (nLicensed >= 2) {
    let ss = 0;
    for (const di of d) ss += (di - meanD) * (di - meanD);
    sdD = Math.sqrt(ss / (nLicensed - 1));
  }
  const seD = nLicensed > 0 && Number.isFinite(sdD) ? sdD / Math.sqrt(nLicensed) : Number.NaN;
  const killFired =
    nLicensed >= DISCRETE_VS_GAUSSIAN_KILL_N &&
    Number.isFinite(meanD) &&
    meanD >= DISCRETE_VS_GAUSSIAN_KILL_DELTA;
  let verdict: PairedCrpsVerdict;
  if (nLicensed < DISCRETE_VS_GAUSSIAN_KILL_N) verdict = "underpowered";
  else if (killFired) verdict = "gaussian_killed_as_substitute";
  else verdict = "gaussian_not_killed";

  return {
    n,
    nLicensed,
    meanDiscrete: nLicensed > 0 ? sumDisc / nLicensed : Number.NaN,
    meanGaussian: nLicensed > 0 ? sumGauss / nLicensed : Number.NaN,
    meanD,
    sdD,
    seD,
    killDelta: DISCRETE_VS_GAUSSIAN_KILL_DELTA,
    killN: DISCRETE_VS_GAUSSIAN_KILL_N,
    killFired,
    verdict,
    sampleKind: args.sampleKind,
    missingInput: DISCRETE_VS_GAUSSIAN_MISSING_INPUT,
    estimand: DISCRETE_VS_GAUSSIAN_ESTIMAND,
    gaussianLicensedAsKill: false,
    priced: false,
    status: "shadow",
    dbQueried: false,
  };
}

/**
 * SYNTHETIC NFL-shaped margins drawn from nflKeyNumberMixture. Not
 * TeamGameLog. sampleKind is synthetic-nfl-shaped. Production number
 * requires the missing input named on the report.
 */
export function pairedDiscreteVsGaussianSyntheticNfl(opts?: {
  readonly n?: number;
  readonly sd?: number;
  readonly seed?: number;
}): PairedCrpsReport {
  const n = opts?.n ?? 400;
  const sd = opts?.sd ?? 14;
  if (!Number.isInteger(n) || n < 1) {
    throw new KernelError("DOMAIN", `pairedDiscreteVsGaussianSyntheticNfl n integer ≥ 1, got ${n}`);
  }
  const mixture = nflKeyNumberMixture(sd);
  const rng = makeRng(opts?.seed ?? 17);
  const y: number[] = [];
  for (let i = 0; i < n; i += 1) y.push(mixture.sample(rng));
  return pairedDiscreteVsWidenedGaussian({ y, sampleKind: "synthetic-nfl-shaped" });
}

/** Integer home−away margins. Non-finite or non-integer scores are dropped, not invented. */
export function integerMarginsFromScores(
  rows: readonly { readonly homeScore: number | null; readonly awayScore: number | null }[],
): number[] {
  const out: number[] = [];
  for (const row of rows) {
    const h = row.homeScore;
    const a = row.awayScore;
    if (h == null || a == null) continue;
    if (!Number.isInteger(h) || !Number.isInteger(a)) continue;
    out.push(h - a);
  }
  return out;
}


