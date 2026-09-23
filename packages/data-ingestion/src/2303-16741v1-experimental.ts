/**
 * Who You Play Affects How You Play: Predicting Sports Performance Using Graph Attention Networks With Temporal Convolution
 *
 * arXiv:2303.16741v1 · lane:experimental · verdict:ADAPT · owner:Motif-lab
 *
 * ADDITIVE utility. Not wired into any live ingestion path (wiring changes production data flow
 * and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: Experiment statistics: Welch's two-sample t-statistic for A/B comparisons without assuming equal
 * variance, a chi-square sample-ratio-mismatch check for randomization integrity, and a
 * normal-approximation minimum detectable effect for proportion outcomes.
 *
 * Improvement (wiring record): Build an NFL analog: nodes = key players per matchup (skill players, QBs, pass rushers, coverage
 * defenders); weighted edges from FTN charting (coverage matchup minutes, alignment, shadow-coverage
 * indicators) instead of the paper's binary complete graph; node features from nflverse
 * per-player-per-game aggregates; GATv2 + TCN on 8-17 week windows; target = next-week player
 * fantasy/prop-relevant stats - with a market-conditioning head (de-vigged prop line embeddings
 * concatenated to node features so attention routes around mispriced lines) and a multi-task target
 * (yards + receptions + TD jointly).
 *
 * ACCEPTANCE GATE: Adopt as GSE's prop-graph lane if GATv2-TCN beats the TCN-only baseline by >=5% MAE reduction on
 * 2024 WR receiving yards AND CORR improves by >=0.03 absolute on the test window, with no MAPE
 * deterioration >10%; reject the graph component if it fails to beat TCN; reject the whole approach if
 * it fails to beat GSE's existing per-player features.
 *
 * Ingest role: experimentation stats (Welch t, SRM check, MDE).
 * Live data: NO. Runs offline on stored snapshots / synthetic fixtures.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "2303.16741v1" as const;
export const LANE = "experimental" as const;

/** Numeric acceptance gate, verbatim from the wiring record (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `Adopt as GSE's prop-graph lane if GATv2-TCN beats the TCN-only baseline by >=5% MAE reduction on 2024 WR receiving yards AND CORR improves by >=0.03 absolute on the test window, with no MAPE deterioration >10%; reject the graph component if it fails to beat TCN; reject the whole approach if it fails to beat GSE's existing per-player features.`;

/** Disabled by default: additive utility only, never auto-wired into a live ingestion path. */
export const ENABLED = false as const;

export const CONFIG = {
  enabled: false,
  method: "Welch t, chi-square SRM, normal-approx MDE",
} as const;
/** Numeric guard: rejects NaN, Infinity, and non-numbers. */
function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

/** Population mean, or null on empty/malformed input. */
function mean(xs: readonly number[]): number | null {
  if (xs.length === 0 || !xs.every(isFiniteNumber)) return null;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

/** Population standard deviation, or null on empty/malformed input. */
function std(xs: readonly number[]): number | null {
  const m = mean(xs);
  if (m === null) return null;
  return Math.sqrt(xs.reduce((a, v) => a + (v - m) * (v - m), 0) / xs.length);
}

/** Sample variance (n-1), or null on <2 points/malformed input. */
function sampleVariance(xs: readonly number[]): number | null {
  if (xs.length < 2 || !xs.every(isFiniteNumber)) return null;
  const m = xs.reduce((a, b) => a + b, 0) / xs.length;
  return xs.reduce((a, v) => a + (v - m) * (v - m), 0) / (xs.length - 1);
}

/** Welch's two-sample t-statistic. Null on degenerate input. */
export function welchT(a: readonly number[], b: readonly number[]): number | null {
  if (a.length < 2 || b.length < 2) return null;
  if (!a.every(isFiniteNumber) || !b.every(isFiniteNumber)) return null;
  const ma = mean(a);
  const mb = mean(b);
  const va = sampleVariance(a);
  const vb = sampleVariance(b);
  if (ma === null || mb === null || va === null || vb === null) return null;
  const se = Math.sqrt(va / a.length + vb / b.length);
  if (se === 0) return null;
  return (ma - mb) / se;
}

/** Chi-square sample-ratio-mismatch statistic for observed vs expected arm counts. */
export function sampleRatioMismatch(observed: readonly number[], expected: readonly number[]): number | null {
  if (observed.length !== expected.length || observed.length === 0) return null;
  if (!observed.every((v) => isFiniteNumber(v) && v >= 0)) return null;
  if (!expected.every((v) => isFiniteNumber(v) && v > 0)) return null;
  let acc = 0;
  for (let i = 0; i < observed.length; i++) {
    const e = expected[i] ?? 1;
    const o = observed[i] ?? 0;
    acc += ((o - e) * (o - e)) / e;
  }
  return acc;
}

/**
 * Minimum detectable absolute effect for a proportion outcome (normal approximation,
 * alpha = 0.05 two-sided, power = 0.8, equal arm sizes).
 */
export function minDetectableEffect(baselineRate: number, nPerArm: number): number | null {
  if (!isFiniteNumber(baselineRate) || baselineRate <= 0 || baselineRate >= 1) return null;
  if (!Number.isInteger(nPerArm) || nPerArm <= 0) return null;
  const z = 1.96 + 0.84;
  return z * Math.sqrt((2 * baselineRate * (1 - baselineRate)) / nPerArm);
}
