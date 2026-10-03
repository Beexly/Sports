/**
 * Feature Programming for Multivariate Time Series Prediction
 *
 * arXiv:2306.06252 · lane:auto_feature_eng · verdict:ADAPT · owner:Motif-lab
 *
 * ADDITIVE utility. Not wired into any live ingestion path (wiring changes production data flow
 * and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: Automated feature transforms: degree-2 polynomial expansion (originals, squares, pairwise products),
 * variance-threshold column filtering, and z-score normalization with a fail-closed path on
 * zero-variance columns.
 *
 * Improvement (wiring record): Implement the three operators as pure pandas functions on the NFL team panel: difference(s1, s2,
 * smooth_w) (rolling-mean smooth then subtract), window(s, lookback, stat) (mean/min/max/std at
 * 3/4/8-week lookbacks), shift(s, delta-tau) (bye-week and rest-differential lags) - 0th-order =
 * weekly box-score and market features, 1st-order = 4-week momentum of offensive efficiency and
 * spread-vs-closing-line drift, 2nd-order = acceleration (momentum itself accelerating), plus
 * discretionary 0th-order injections (weather, injury-report counts, travel distance) - all operators
 * AST-verified past-only, with a pruning stage the paper lacks (|corr|>0.9 dedup +
 * TreeSHAP-interventional recursion) - and ablate the order hierarchy itself: full order-upgrade rule
 * vs the same operators applied flat (matched feature count), comparing walk-forward XGBoost
 * R^2/log-loss to decide whether the {position, momentum, acceleration} discipline or just the
 * operator bank ships.
 *
 * ACCEPTANCE GATE: ADAPT if: >=0.003 held-out NFL log-loss improvement on 2025 games versus the basic-features
 * baseline, with all operators provably causal (AST-verified past-only), feature generation time <5%
 * of downstream training time, and the pruning stage removing >=50% of generated features without
 * hurting validation performance; REJECT if no gate improvement under walk-forward splits, leakage
 * scan fails, or the pruned extended set performs no better than hand-built rolling features.
 *
 * Ingest role: feature engineering transforms (polynomial expansion, variance filter, z-score).
 * Live data: NO. Runs offline on stored snapshots / synthetic fixtures.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "2306.06252" as const;
export const LANE = "auto_feature_eng" as const;

/** Numeric acceptance gate, verbatim from the wiring record (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADAPT if: >=0.003 held-out NFL log-loss improvement on 2025 games versus the basic-features baseline, with all operators provably causal (AST-verified past-only), feature generation time <5% of downstream training time, and the pruning stage removing >=50% of generated features without hurting validation performance; REJECT if no gate improvement under walk-forward splits, leakage scan fails, or the pruned extended set performs no better than hand-built rolling features.`;

/** Disabled by default: additive utility only, never auto-wired into a live ingestion path. */
export const ENABLED = false as const;

export const CONFIG = {
  enabled: false,
  method: "polynomial expansion + variance threshold + z-score",
  degree: 2,
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

/** Degree-2 polynomial expansion: originals + squares + pairwise products. */
export function polynomialFeatures(row: readonly number[]): number[] | null {
  if (row.length === 0 || !row.every(isFiniteNumber)) return null;
  const out = [...row];
  for (const v of row) out.push(v * v);
  for (let i = 0; i < row.length; i++) {
    for (let j = i + 1; j < row.length; j++) {
      out.push((row[i] ?? 0) * (row[j] ?? 0));
    }
  }
  return out;
}

/** Population variance helper for column filtering. */
function populationVariance(col: readonly number[]): number | null {
  const m = mean(col);
  if (m === null) return null;
  return col.reduce((a, v) => a + (v - m) * (v - m), 0) / col.length;
}

/** Column indices whose population variance meets the threshold. */
export function varianceThresholdColumns(
  columns: ReadonlyArray<readonly number[]>,
  threshold: number,
): number[] | null {
  if (!isFiniteNumber(threshold) || threshold < 0) return null;
  const kept: number[] = [];
  columns.forEach((col, i) => {
    const v = populationVariance(col);
    if (v !== null && v >= threshold) kept.push(i);
  });
  return kept;
}

/** Z-score normalization; null on zero-variance columns. */
export function zScoreNormalize(column: readonly number[]): number[] | null {
  if (column.length === 0 || !column.every(isFiniteNumber)) return null;
  const m = mean(column);
  const s = std(column);
  if (m === null || s === null || s === 0) return null;
  return column.map((v) => (v - m) / s);
}
