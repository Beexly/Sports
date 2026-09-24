/**
 * arXiv 2506.11399v1: Time-Varying Home Field Advantage in Football: Learning from a Non-Stationary Causal Process.
 *
 * ADDITIVE utility. Not wired into any publish path (wiring changes published picks and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: DYNAMO-style non-stationary causal learner for home advantage: tracks how the home edge drifts over time as a time-varying causal quantity, feeding DYNAMO-predicted per-drive expected points into the calibration layer instead of a static home-field number.
 *
 * Improvement (wiring wave-2 slice CALIBRATE):
 * Replace the engine's static home-field number with a DYNAMO-style non-stationary causal learner that tracks how home advantage drifts over time, feeding DYNAMO-predicted per-drive expected points into the calibration layer so home edge is a time-varying causal quantity rather than a constant.
 *
 * ACCEPTANCE GATE:
 * Adopt the method for GSE only if, on the NFL reproducibility test, DYNAMO-predicted per-drive xP achieves MSE at least 10% lower than the raw-xP baseline on held-out weeks (the paper's Arsenal 2021-22 improvement, ≈29%, sets the bar; below 10% the complexity is not worth the NFL pipeline cost).
 *
 * ENABLED=false: replaces the static home-field number; needs a human call.
 */


export const ENABLED = false;

export interface DriveXP {
  /** Sequential drive index (time). */
  readonly t: number;
  /** 1 if the possessing team is home. */
  readonly isHome: 0 | 1;
  /** Realized expected points of the drive. */
  readonly xp: number;
}

/**
 * DYNAMO-lite: exponentially-weighted local linear trend of the home effect on
 * per-drive expected points. Returns the time-varying home-edge series and the
 * one-step-ahead prediction. lambda in (0,1): higher = slower adaptation.
 */
export function dynamoHomeEdge(
  drives: readonly DriveXP[],
  lambda = 0.98,
): { readonly edgeSeries: number[]; readonly predicted: number } {
  // Recursive least squares with exponential forgetting on model
  // xp_t = mu + edge_t * isHome_t, tracking edge_t.
  let edge = 0;
  let p = 1; // inverse information
  const edgeSeries: number[] = [];
  const mu = drives.length > 0
    ? drives.reduce((a, d) => a + d.xp, 0) / drives.length
    : 0;
  for (const d of drives) {
    const x = d.isHome;
    const pred = mu + edge * x;
    const err = d.xp - pred;
    const denom = lambda + p * x * x;
    const k = (p * x) / Math.max(denom, 1e-9);
    edge = edge + k * err;
    p = (p - k * x * p) / lambda;
    edgeSeries.push(edge);
  }
  return { edgeSeries, predicted: edge };
}

/** MSE of DYNAMO-predicted per-drive xP vs the raw-xP baseline on held-out drives. */
export function mseVsBaseline(
  drives: readonly DriveXP[],
  dynamoPred: readonly number[],
  baselinePred: readonly number[],
): { dynamoMse: number; baselineMse: number; relativeImprovement: number } {
  const mse = (preds: readonly number[]) =>
    drives.reduce((a, d, i) => a + (d.xp - preds[i]) * (d.xp - preds[i]), 0) /
    Math.max(drives.length, 1);
  const dynamoMse = mse(dynamoPred);
  const baselineMse = mse(baselinePred);
  return {
    dynamoMse,
    baselineMse,
    relativeImprovement:
      baselineMse > 0 ? (baselineMse - dynamoMse) / baselineMse : 0,
  };
}

/** Gate: DYNAMO MSE at least 10% lower than the raw-xP baseline on held-out weeks. */
export function meetsDynamoGate(relativeImprovement: number): boolean {
  return relativeImprovement >= 0.1;
}

/** Raw-xP baseline prediction: global mean for every drive. */
export function rawBaseline(drives: readonly DriveXP[]): number[] {
  const m = drives.length > 0
    ? drives.reduce((a, d) => a + d.xp, 0) / drives.length
    : 0;
  return drives.map(() => m);
}
