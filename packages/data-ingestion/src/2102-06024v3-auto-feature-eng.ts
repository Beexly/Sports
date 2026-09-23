/**
 * Feature Selection for Multivariate Time Series via Network Pruning (NFS)
 *
 * arXiv:2102.06024v3 · lane:auto_feature_eng · verdict:ADAPT · owner:Hermes
 *
 * ADDITIVE utility. Not wired into any live ingestion path (wiring changes production data flow
 * and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: Automated feature transforms: degree-2 polynomial expansion (originals, squares, pairwise products),
 * variance-threshold column filtering, and z-score normalization with a fail-closed path on
 * zero-variance columns.
 *
 * Improvement (wiring record): Reimplement NFS: per-stream 1D-CNN (kernel covering ~4 games) over each candidate feature stream
 * (trailing-17-game window), BN layer, alpha extraction, L1 gamma=0.001, aggregation CNN ->
 * LightGBM/MLP head predicting spread cover; train on 2015-2022, select top-k (k in {15, 25, 40} by
 * validation), freeze selection, retrain downstream on selection; use large batches (full seasons) and
 * season-wise standardization so alpha reflects signal, not batch noise; improvement: season-adaptive
 * alpha_{i,s} = alpha_i * delta_{i,s} with its own sparsity penalty (a 'feature regime map').
 *
 * ACCEPTANCE GATE: Accept iff NFS top-k (best k) improves 2024 held-out log-loss by >= 0.003 over both baseline A (all
 * streams) and baseline C (hand-picked), with k <= 40 (deployment discipline). Reject if NFS selection
 * underperforms the full set, if the selected set is unstable across 5 seeds (Jaccard < 0.5), or if it
 * merely rediscovers the hand-picked set with no lift.
 *
 * Ingest role: feature engineering transforms (polynomial expansion, variance filter, z-score).
 * Live data: NO. Runs offline on stored snapshots / synthetic fixtures.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "2102.06024v3" as const;
export const LANE = "auto_feature_eng" as const;

/** Numeric acceptance gate, verbatim from the wiring record (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `Accept iff NFS top-k (best k) improves 2024 held-out log-loss by >= 0.003 over both baseline A (all streams) and baseline C (hand-picked), with k <= 40 (deployment discipline). Reject if NFS selection underperforms the full set, if the selected set is unstable across 5 seeds (Jaccard < 0.5), or if it merely rediscovers the hand-picked set with no lift.`;

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
