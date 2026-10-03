/**
 * Ratio of counts vs ratio of rates in Poisson processes
 *
 * arXiv:2012.04455v1 · lane:calibration · owner:Mimo
 *
 * Improvement (IMPROVEMENT-LEDGER.jsonl):
 * Implement the closed-form ratio posterior f(rho) (eq. 76) as a GSE utility: inputs (goals_1,
 * minutes_1, goals_2, minutes_2, prior alpha_0/beta_0), outputs posterior mode/mean/sd/credible
 * interval of the scoring-rate ratio for matchup preview content ('Chiefs score at 1.31x [1.05,
 * 1.62] the rate of...'); use the Gamma sequential-update form for rolling team scoring-rate
 * posteriors (replacing ad-hoc exponential weighting); adopt the alpha_0=1.01 floor trick wherever
 * GSE fits Gamma priors on rates to exclude degenerate zero-rate posteriors.
 *
 * ACCEPTANCE GATE: Adopt the closed-form ratio posterior as a GSE utility if: on 2024-2025 data, its 80% credible
 * intervals achieve empirical coverage within [0.75, 0.85] on forward rate ratios while being
 * narrower than the Gaussian-propagation intervals. Reject if coverage is off-nominal or intervals
 * are wider than the naive baseline.
 *
 * Ingest role: feature builder (Poisson rate-ratio estimators: unbiased shrinkage + CI).
 * Live data: NO. Runs offline on nflverse aggregates / stored snapshots.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "2012.04455v1" as const;
export const LANE = "calibration" as const;

/** Numeric acceptance gate, verbatim from the ledger (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `Adopt the closed-form ratio posterior as a GSE utility if: on 2024-2025 data, its 80% credible
 * intervals achieve empirical coverage within [0.75, 0.85] on forward rate ratios while being
 * narrower than the Gaussian-propagation intervals. Reject if coverage is off-nominal or intervals
 * are wider than the naive baseline.`;

export const CONFIG = {
  enabled: false,
  priorPseudo: 0.5,
  ciLevel: 0.95,
} as const;

/** Type guard for finite numbers (rejects NaN/Infinity/non-numbers). */
function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

export interface CountExposure {
  readonly count: number;
  readonly exposure: number;
}

/** Naive ratio-of-rates vs ratio-of-counts; the paper's bias lives in the gap. */
export function rateRatio(a: CountExposure, b: CountExposure): number | null {
  if (
    !isFiniteNumber(a.count) || !isFiniteNumber(a.exposure) ||
    !isFiniteNumber(b.count) || !isFiniteNumber(b.exposure)
  ) {
    return null;
  }
  if (a.count < 0 || b.count < 0 || a.exposure <= 0 || b.exposure <= 0 || b.count === 0) return null;
  return (a.count / a.exposure) / (b.count / b.exposure);
}

/** Shrinkage estimator with pseudo-count prior (Jeffreys-ish 0.5). */
export function shrunkRateRatio(a: CountExposure, b: CountExposure, pseudo = 0.5): number | null {
  if (!isFiniteNumber(pseudo) || pseudo < 0) return null;
  return rateRatio(
    { count: a.count + pseudo, exposure: a.exposure + pseudo },
    { count: b.count + pseudo, exposure: b.exposure + pseudo },
  );
}

/** Log-rate-ratio standard error (delta method). */
export function logRatioSE(a: CountExposure, b: CountExposure): number | null {
  if (
    ![a.count, a.exposure, b.count, b.exposure].every(isFiniteNumber) ||
    a.count <= 0 || b.count <= 0 || a.exposure <= 0 || b.exposure <= 0
  ) {
    return null;
  }
  return Math.sqrt(1 / a.count + 1 / b.count);
}

/** Wald CI for the rate ratio. */
export function rateRatioCI(
  a: CountExposure,
  b: CountExposure,
  z = 1.96,
): { est: number; lo: number; hi: number } | null {
  const est = rateRatio(a, b);
  const se = logRatioSE(a, b);
  if (est === null || se === null || !isFiniteNumber(z) || z <= 0) return null;
  const l = Math.log(est);
  return { est, lo: Math.exp(l - z * se), hi: Math.exp(l + z * se) };
}

/** Paper's core diagnostic: bias of ratio-of-counts under unequal exposure. */
export function countRatioBias(countA: number, countB: number, expA: number, expB: number): number | null {
  if (![countA, countB, expA, expB].every(isFiniteNumber) || countB === 0 || expB <= 0 || expA <= 0) return null;
  const countRatio = countA / countB;
  const rr = rateRatio({ count: countA, exposure: expA }, { count: countB, exposure: expB });
  if (rr === null) return null;
  return countRatio - rr;
}
