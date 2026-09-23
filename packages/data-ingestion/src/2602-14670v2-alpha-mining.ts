/**
 * FactorMiner: A Self-Evolving Agent with Skills and Experience Memory for Financial Alpha Discovery
 *
 * arXiv:2602.14670v2 · lane:signal_discovery_alpha_mining · verdict:ADAPT · owner:Motif-lab · doctrine:PROPRIETARY_EDGE
 *
 * Mechanism: Alpha-mining screens: Pearson information coefficient between predictions and realizations, cross-sectional demeaning, walk-forward train/test splits, and correlation-threshold feature screening.
 *
 * Improvement (record):
 * GSE packages its mining pipeline as an invocable skill with a persistent experience memory (successful templates + forbidden high-correlation families) that directs the LLM generator to fill gaps in the signal zoo rather than re-mine known families.
 *
 * ACCEPTANCE GATE:
 * ADAPT->build if Ralph-Loop mining keeps avg |rho| <= 0.35 as the zoo grows past 100 signals while session-independent mining's |rho| rises above 0.5, with test RankIC at parity or better.
 *
 * ADDITIVE utility. Not wired into any live ingestion path (wiring changes production data flow and is a NEEDS HUMAN CALL).
 * Ingest role: alpha screen / factor builder. Live data: NO — pure offline transforms over stored snapshots / synthetic fixtures.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null.
 */

export const ARXIV_ID = "2602.14670v2" as const;
export const LANE = "signal_discovery_alpha_mining" as const;
export const VERDICT = "ADAPT" as const;

/** Numeric acceptance gate, verbatim from the record (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADAPT->build if Ralph-Loop mining keeps avg |rho| <= 0.35 as the zoo grows past 100 signals while session-independent mining's |rho| rises above 0.5, with test RankIC at parity or better.`;

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
