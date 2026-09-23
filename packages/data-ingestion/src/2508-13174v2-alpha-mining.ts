/**
 * AlphaEval: A Comprehensive and Efficient Evaluation Framework for Formula Alpha Mining
 *
 * arXiv:2508.13174v2 · lane:signal_discovery_alpha_mining · verdict:ADAPT · owner:Motif-lab · doctrine:PROPRIETARY_EDGE
 *
 * Mechanism: Alpha-mining screens: Pearson information coefficient between predictions and realizations, cross-sectional demeaning, walk-forward train/test splits, and correlation-threshold feature screening.
 *
 * Improvement (record):
 * GSE adopts AlphaEval as its standard signal-validation harness: PPS (IC/RankIC vs cover residual), RRE (week-to-week rank stability), PFS (perturbation/shock robustness), and LLM plausibility scoring into one integrated selection score.
 *
 * ACCEPTANCE GATE:
 * ADAPT->build if integrated-score selection beats IC-only selection by >=0.002 Brier on 2022-2025 AND evaluation runs >=10x faster than the equivalent walk-forward backtest; REJECT if dimensions are mutually redundant (pairwise |corr|>0.8).
 *
 * ADDITIVE utility. Not wired into any live ingestion path (wiring changes production data flow and is a NEEDS HUMAN CALL).
 * Ingest role: alpha screen / factor builder. Live data: NO — pure offline transforms over stored snapshots / synthetic fixtures.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null.
 */

export const ARXIV_ID = "2508.13174v2" as const;
export const LANE = "signal_discovery_alpha_mining" as const;
export const VERDICT = "ADAPT" as const;

/** Numeric acceptance gate, verbatim from the record (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADAPT->build if integrated-score selection beats IC-only selection by >=0.002 Brier on 2022-2025 AND evaluation runs >=10x faster than the equivalent walk-forward backtest; REJECT if dimensions are mutually redundant (pairwise |corr|>0.8).`;

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

/** Walk-forward split with inclusive index ranges. */
export interface WalkForwardSplit {
  train: [number, number];
  test: [number, number];
}

/** Pearson correlation (information coefficient) between two series. */
export function pearsonIc(predicted: number[], realized: number[]): number | null {
  if (predicted.length !== realized.length || predicted.length < 2) return null;
  const all = [...predicted, ...realized];
  if (!all.every(isFiniteNumber)) return null;
  const mp = predicted.reduce((s, v) => s + v, 0) / predicted.length;
  const mr = realized.reduce((s, v) => s + v, 0) / realized.length;
  let cov = 0;
  let vp = 0;
  let vr = 0;
  for (let i = 0; i < predicted.length; i++) {
    const dp = (predicted[i] as number) - mp;
    const dr = (realized[i] as number) - mr;
    cov += dp * dr;
    vp += dp * dp;
    vr += dr * dr;
  }
  if (vp === 0 || vr === 0) return null;
  return cov / Math.sqrt(vp * vr);
}

/** Cross-sectional demeaning (factor neutralization lite). */
export function demean(values: number[]): number[] | null {
  if (values.length === 0 || !values.every(isFiniteNumber)) return null;
  const m = values.reduce((s, v) => s + v, 0) / values.length;
  return values.map((v) => v - m);
}

/**
 * Walk-forward splits: each fold trains on everything before its test block.
 * testSize = floor(n / (folds + 1)).
 */
export function walkForwardSplits(n: number, folds: number): WalkForwardSplit[] | null {
  if (!Number.isInteger(n) || !Number.isInteger(folds)) return null;
  if (n <= 0 || folds < 1 || folds >= n) return null;
  const testSize = Math.floor(n / (folds + 1));
  if (testSize < 1) return null;
  const out: WalkForwardSplit[] = [];
  for (let f = 0; f < folds; f++) {
    const testStart = (f + 1) * testSize;
    out.push({
      train: [0, testStart - 1],
      test: [testStart, Math.min(testStart + testSize - 1, n - 1)],
    });
  }
  return out;
}

/** Keep feature indices whose |IC| vs the target meets the threshold. */
export function correlationScreen(features: number[][], target: number[], threshold: number): number[] | null {
  if (!isFiniteNumber(threshold) || threshold < 0) return null;
  const keep: number[] = [];
  for (let i = 0; i < features.length; i++) {
    const ic = pearsonIc(features[i] as number[], target);
    if (ic !== null && Math.abs(ic) >= threshold) keep.push(i);
  }
  return keep;
}
