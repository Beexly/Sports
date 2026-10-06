/**
 * On Elo based prediction models for the FIFA Worldcup 2018
 *
 * arXiv:1806.01930v1 · lane:team_ratings · owner:Mimo
 *
 * Improvement (IMPROVEMENT-LEDGER.jsonl):
 * Port the FIFA Worldcup Elo/Poisson machinery to NFL scores: (1) nested-score formulation --
 * favorite's points ~ quasi-Poisson/NB regression on opponent defensive strength, then underdog's
 * points ~ regression on favorite's Elo plus favorite's realized points (game-script dependence,
 * Eq. 2.4 analog); evaluate against the independent bivariate Poisson baseline; win probability
 * from simulated scorelines, spread/total lines from score quantiles. Team-specific attack/defense
 * Poisson regression with shared Elo-strength covariates is new to the corpus. (2) E1/E2 ordinal
 * tournament scorers: adapt result(T) in {1..7} (SB winner ... miss playoffs) to evaluate GSE's
 * playoff-stage probability forecasts -- the corpus has Brier/RPS/log-loss but no stage-reaching
 * ordinal scorers for survivor/pick'em products. Improvement beyond the paper: regime separation
 * -- fit the nested model separately on playoff games vs regular-season games and test whether
 * playoff-only parameters (tighter spreads, favorite-heavy script) predict postseason outcomes
 * better than full-season fits, formalizing the paper's qualitative 'championship matches behave
 * differently' claim into a measurable test serving GSE's playoff betting edge.
 *
 * ACCEPTANCE GATE: Adopt the nested formulation iff on the 2015-2025 walk-forward: (a) nested log loss beats
 * independent Poisson by >= 0.005; AND (b) E2 ordinal score on playoff-stage probabilities beats
 * the engine baseline (strict improvement); AND (c) the model is stable to +/-2-year training-
 * window shifts. Otherwise keep independent Poisson and note nested conditioning as overfit on
 * soccer.
 *
 * Ingest role: feature builder (GP covariance kernels: outcome kernel + wind kernel + kernel algebra).
 * Live data: NO. Runs offline on nflverse aggregates / stored snapshots.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "1806.01930v1" as const;
export const LANE = "team_ratings" as const;

/** Numeric acceptance gate, verbatim from the ledger (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `Adopt the nested formulation iff on the 2015-2025 walk-forward: (a) nested log loss beats
 * independent Poisson by >= 0.005; AND (b) E2 ordinal score on playoff-stage probabilities beats
 * the engine baseline (strict improvement); AND (c) the model is stable to +/-2-year training-
 * window shifts. Otherwise keep independent Poisson and note nested conditioning as overfit on
 * soccer.`;

export const CONFIG = {
  enabled: false,
  bMax: 40,
  logLossGainThreshold: 0.003,
  kernel: "outcome-kernel x wind-kernel",
} as const;

/** Type guard for finite numbers (rejects NaN/Infinity/non-numbers). */
function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

/** Squared-exponential (RBF) kernel. */
export function rbfKernel(a: readonly number[], b: readonly number[], lengthScale: number, variance = 1): number | null {
  if (!isFiniteNumber(lengthScale) || lengthScale <= 0 || !isFiniteNumber(variance) || variance <= 0) return null;
  if (a.length !== b.length || !a.every(isFiniteNumber) || !b.every(isFiniteNumber)) return null;
  let s = 0;
  for (let i = 0; i < a.length; i++) {
    const d = (a[i] ?? 0) - (b[i] ?? 0);
    s += d * d;
  }
  return variance * Math.exp(-s / (2 * lengthScale * lengthScale));
}

/** Linear (dot-product) kernel. */
export function linearKernel(a: readonly number[], b: readonly number[], variance = 1): number | null {
  if (a.length !== b.length || !a.every(isFiniteNumber) || !b.every(isFiniteNumber)) return null;
  if (!isFiniteNumber(variance) || variance <= 0) return null;
  return variance * a.reduce((s, v, i) => s + v * (b[i] ?? 0), 0);
}

/** Kernel algebra: sum and product of kernels (Gram matrices). */
export function kernelSum(K1: readonly number[][], K2: readonly number[][]): number[][] | null {
  if (K1.length !== K2.length || K1.length === 0) return null;
  return K1.map((row, i) => row.map((v, j) => v + (K2[i]?.[j] ?? NaN)));
}

export function kernelProduct(K1: readonly number[][], K2: readonly number[][]): number[][] | null {
  if (K1.length !== K2.length || K1.length === 0) return null;
  return K1.map((row, i) => row.map((v, j) => v * (K2[i]?.[j] ?? NaN)));
}

/** Build Gram matrix for one kernel over the feature rows. */
export function gramMatrix(
  rows: readonly number[][],
  kernel: (a: readonly number[], b: readonly number[]) => number | null,
): number[][] | null {
  if (rows.length === 0) return null;
  const K: number[][] = [];
  for (let i = 0; i < rows.length; i++) {
    const row: number[] = [];
    for (let j = 0; j < rows.length; j++) {
      const v = kernel(rows[i] ?? [], rows[j] ?? []);
      if (v === null) return null;
      row.push(v);
    }
    K.push(row);
  }
  return K;
}

/** Outcome kernel (RBF on box-score features) x wind kernel (RBF on wind features). */
export function outcomeWindKernel(
  outcomeA: readonly number[],
  outcomeB: readonly number[],
  windA: readonly number[],
  windB: readonly number[],
  ls = 1,
): number | null {
  const ko = rbfKernel(outcomeA, outcomeB, ls);
  const kw = rbfKernel(windA, windB, ls);
  if (ko === null || kw === null) return null;
  return ko * kw;
}

/** Gram PSD sanity: all diagonals non-negative and symmetric. */
export function gramSanity(K: readonly number[][]): boolean {
  return K.every((row, i) => row.length === K.length && row.every((v, j) => isFiniteNumber(v) && Math.abs(v - (K[j]?.[i] ?? NaN)) < 1e-9) && (row[i] ?? -1) >= -1e-9);
}
