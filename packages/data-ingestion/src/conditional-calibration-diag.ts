/**
 * Regression Diagnostics meets Forecast Evaluation: Conditional Calibration, Reliability Diagrams, and Coefficient of Determination
 *
 * arXiv:2108.03210v3 · lane:calibration · owner:Mimo
 *
 * Improvement (IMPROVEMENT-LEDGER.jsonl):
 * Adopt CORP as the standard diagnostics suite for the GSE engine: after each training run
 * (XGBoost / tabular models on nflverse features), compute CORP T-reliability diagrams for mean
 * forecasts (margin/spread-total under squared error) and for quantile forecasts (win-probability
 * tails, alpha=0.1/0.5/0.9 under pinball loss) via the PAV algorithm; report MCB/DSC/UNC + R* per
 * model version in the run log — replacing ad-hoc R^2 for quantile heads; extend to ensemble
 * comparison (cross-fitted out-of-fold isotonic recalibration of the ensemble mean vs each
 * constituent, PAV-recalibrated values per game); stratify CORP diagrams by market regime
 * (closing-line favorite vs underdog) and week-block to test whether miscalibration concentrates
 * in specific regimes.
 *
 * ACCEPTANCE GATE: Adopt (ADAPT) if: on the 2025 out-of-sample window, CORP diagnostics detect miscalibration in
 * the current engine (M-hat-CB >= 0.15 x UNC, i.e., >=15% of score variance is recalibratable
 * bias) OR the engine's current diagnostics cannot separate calibration from discrimination.
 *
 * Ingest role: feature builder (conditional calibration: reliability diagrams + CORP + R2 decomposition).
 * Live data: NO. Runs offline on nflverse aggregates / stored snapshots.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "2108.03210v3" as const;
export const LANE = "calibration" as const;

/** Numeric acceptance gate, verbatim from the ledger (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `Adopt (ADAPT) if: on the 2025 out-of-sample window, CORP diagnostics detect miscalibration in
 * the current engine (M-hat-CB >= 0.15 x UNC, i.e., >=15% of score variance is recalibratable
 * bias) OR the engine's current diagnostics cannot separate calibration from discrimination.`;

export const CONFIG = {
  enabled: false,
  method: "CORP reliability diagrams",
  isotonic: "PAV",
} as const;

/** Type guard for finite numbers (rejects NaN/Infinity/non-numbers). */
function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

export interface ProbOutcome {
  readonly p: number;
  readonly y: 0 | 1;
}

/** PAV isotonic regression (non-decreasing). */
export function pavIsotonic(ys: readonly number[]): number[] | null {
  if (ys.length === 0 || !ys.every(isFiniteNumber)) return null;
  const blocks: Array<{ sum: number; n: number }> = ys.map((y) => ({ sum: y, n: 1 }));
  let i = 0;
  while (i < blocks.length - 1) {
    const a = blocks[i]!;
    const b = blocks[i + 1]!;
    if (a.sum / a.n > b.sum / b.n + 1e-12) {
      blocks.splice(i, 2, { sum: a.sum + b.sum, n: a.n + b.n });
      if (i > 0) i--;
    } else {
      i++;
    }
  }
  const out: number[] = [];
  for (const bl of blocks) for (let k = 0; k < bl.n; k++) out.push(bl.sum / bl.n);
  return out;
}

/** CORP reliability curve: isotonic regression of y on sorted p. */
export function corpCurve(pairs: ReadonlyArray<ProbOutcome>): Array<{ p: number; calP: number }> | null {
  const v = pairs.filter((e) => isFiniteNumber(e.p) && (e.y === 0 || e.y === 1) && e.p >= 0 && e.p <= 1);
  if (v.length === 0) return null;
  const sorted = [...v].sort((a, b) => a.p - b.p);
  const cal = pavIsotonic(sorted.map((e) => e.y));
  if (!cal) return null;
  return sorted.map((e, i) => ({ p: e.p, calP: cal[i] ?? 0 }));
}

/** Miscalibration area: mean |p - calP| (CORP miscalibration diagnostic). */
export function miscalibrationArea(pairs: ReadonlyArray<ProbOutcome>): number | null {
  const curve = corpCurve(pairs);
  if (!curve) return null;
  return curve.reduce((s, e) => s + Math.abs(e.p - e.calP), 0) / curve.length;
}

/** R2 decomposition: 1 - MSE/var(y). */
export function r2Score(yTrue: readonly number[], yPred: readonly number[]): number | null {
  if (yTrue.length !== yPred.length || yTrue.length < 2) return null;
  if (!yTrue.every(isFiniteNumber) || !yPred.every(isFiniteNumber)) return null;
  const m = yTrue.reduce((a, b) => a + b, 0) / yTrue.length;
  const ssTot = yTrue.reduce((a, y) => a + (y - m) * (y - m), 0);
  if (ssTot === 0) return null;
  const ssRes = yTrue.reduce((a, y, i) => a + (y - (yPred[i] ?? 0)) * (y - (yPred[i] ?? 0)), 0);
  return 1 - ssRes / ssTot;
}

/** Discrimination component: variance of the recalibrated probs. */
export function discriminationComponent(pairs: ReadonlyArray<ProbOutcome>): number | null {
  const curve = corpCurve(pairs);
  if (!curve) return null;
  const m = curve.reduce((s, e) => s + e.calP, 0) / curve.length;
  return curve.reduce((s, e) => s + (e.calP - m) * (e.calP - m), 0) / curve.length;
}
