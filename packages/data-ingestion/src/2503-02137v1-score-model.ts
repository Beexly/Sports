/**
 * What Influences the Field Goal Attempts of Professional Players in Basketball? A Spatially Varying Joint Model
 *
 * arXiv:2503.02137v1 · lane:win_spread_total · verdict:ADAPT · owner:Motif-lab · doctrine:PROPRIETARY_EDGE
 *
 * Mechanism: Score-distribution modeling: Poisson PMF for goal counts, Abramowitz-Stegun normal CDF for spread/total win probabilities, and Dixon-Coles low-score correlation adjustments.
 *
 * Improvement (record):
 * Model route-target selection as a spatial point process (JSVLGCP 1D port) and extend it to a marked point process with EPA as the mark — E[target EPA | location, covariates] modeled jointly with attempt intensity — producing a spatial expected-points surface for route concepts that feeds GSE's EPA machinery.
 *
 * ACCEPTANCE GATE:
 * ADOPT the 1D port if, before running: JSVLGCP held-out NLL beats KDE by ≥ 0.02 nats/attempt with SE excluding zero across the 10 seeds, AND the estimated β surfaces show coherent structure (e.g., deeper targets vs weak opponents). REJECT the port if the NLL gap is < 0.01 nats/attempt or the surfaces are noise.
 *
 * ADDITIVE utility. Not wired into any live ingestion path (wiring changes production data flow and is a NEEDS HUMAN CALL).
 * Ingest role: score-distribution feature builder. Live data: NO — pure offline transforms over stored snapshots / synthetic fixtures.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null.
 */

export const ARXIV_ID = "2503.02137v1" as const;
export const LANE = "win_spread_total" as const;
export const VERDICT = "ADAPT" as const;

/** Numeric acceptance gate, verbatim from the record (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADOPT the 1D port if, before running: JSVLGCP held-out NLL beats KDE by ≥ 0.02 nats/attempt with SE excluding zero across the 10 seeds, AND the estimated β surfaces show coherent structure (e.g., deeper targets vs weak opponents). REJECT the port if the NLL gap is < 0.01 nats/attempt or the surfaces are noise.`;

/**
 * Disabled by default: the acceptance gate above requires live/backtest data not
 * available inside this module. Flip only after the gate is evaluated offline and
 * a human approves wiring into a live ingestion path.
 */
export const ENABLED = false;
/** Type guard for finite numbers (rejects NaN/Infinity/non-numbers). */
function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

function factorial(n: number): number {
  let f = 1;
  for (let i = 2; i <= n; i++) f *= i;
  return f;
}

/** Poisson probability of exactly k events with rate lambda. */
export function poissonPmf(k: number, lambda: number): number | null {
  if (!Number.isInteger(k) || k < 0 || !isFiniteNumber(lambda) || lambda <= 0) return null;
  return (Math.exp(-lambda) * Math.pow(lambda, k)) / factorial(k);
}

/** Standard normal CDF via the Abramowitz-Stegun erf approximation. */
export function normalCdf(x: number): number | null {
  if (!isFiniteNumber(x)) return null;
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp(-(x * x) / 2);
  let p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  if (x > 0) p = 1 - p;
  return p;
}

/**
 * Win probability from a point spread (negative spread = favorite),
 * assuming margin ~ Normal(-spread, sd).
 */
export function spreadToWinProb(spread: number, sd = 13.5): number | null {
  if (!isFiniteNumber(spread) || !isFiniteNumber(sd) || sd <= 0) return null;
  return normalCdf(-spread / sd);
}

/** Over probability from a total line and a projection, sd = total volatility. */
export function totalToOverProb(total: number, projection: number, sd = 10): number | null {
  if (!isFiniteNumber(total) || !isFiniteNumber(projection) || !isFiniteNumber(sd) || sd <= 0) return null;
  const c = normalCdf((total - projection) / sd);
  if (c === null) return null;
  return 1 - c;
}

/**
 * Dixon-Coles tau adjustment for low scorelines (0-0, 0-1, 1-0, 1-1);
 * 1 elsewhere. rho is the dependence parameter (negative in the paper).
 */
export function dixonColesAdjustment(homeGoals: number, awayGoals: number, rho = -0.1): number | null {
  if (!isFiniteNumber(homeGoals) || !isFiniteNumber(awayGoals) || !isFiniteNumber(rho)) return null;
  if (homeGoals === 0 && awayGoals === 0) return 1 - rho;
  if (homeGoals === 0 && awayGoals === 1) return 1 + rho;
  if (homeGoals === 1 && awayGoals === 0) return 1 + rho;
  if (homeGoals === 1 && awayGoals === 1) return 1 - rho;
  return 1;
}
