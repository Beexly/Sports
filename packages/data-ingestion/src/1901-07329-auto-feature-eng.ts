/**
 * The autofeat Python Library for Automated Feature Engineering and Selection
 *
 * arXiv:1901.07329 · lane:auto_feature_eng · verdict:ADAPT · owner:Motif-lab
 *
 * ADDITIVE utility. Not wired into any live ingestion path (wiring changes production data flow
 * and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: Automated feature transforms: degree-2 polynomial expansion (originals, squares, pairwise products),
 * variance-threshold column filtering, and z-score normalization with a fail-closed path on
 * zero-variance columns.
 *
 * Improvement (wiring record): Build the GSE-AutoFeat-Select selection layer: 2-step unit-typed symbolic feature expansion with
 * knockoff-FDR (10%) noise-feature selection; emit a <=40-feature set to the production GBM and a
 * standardized-coefficient list for public write-ups.
 *
 * ACCEPTANCE GATE: ADOPT the autofeat selection layer iff (a) the selected <=40-feature set matches the full candidate
 * pool's 2024 test log-loss within 0.002 (selection is lossless), AND (b) the linear model on selected
 * features beats the hand-built linear baseline by >= 0.003 log-loss, AND (c) no selected feature
 * fails the unit-legality/time-safety audit.
 *
 * Ingest role: feature engineering transforms (polynomial expansion, variance filter, z-score).
 * Live data: NO. Runs offline on stored snapshots / synthetic fixtures.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "1901.07329" as const;
export const LANE = "auto_feature_eng" as const;

/** Numeric acceptance gate, verbatim from the wiring record (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADOPT the autofeat selection layer iff (a) the selected <=40-feature set matches the full candidate pool's 2024 test log-loss within 0.002 (selection is lossless), AND (b) the linear model on selected features beats the hand-built linear baseline by >= 0.003 log-loss, AND (c) no selected feature fails the unit-legality/time-safety audit.`;

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
