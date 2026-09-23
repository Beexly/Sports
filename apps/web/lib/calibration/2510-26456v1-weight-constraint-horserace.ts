/**
 * arXiv 2510.26456v1: A Theoretical Comparison of Weight Constraints in Forecast Combination and Model Averaging.
 *
 * ADDITIVE utility. Not wired into any publish path (wiring changes published picks and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: Weight-constraint horse race for the ensemble layer: fit combination weights under five constraint spaces on rolling windows, select via a three-way fit/calibrate-conformal/select split, and ship the winner as the default constraint (must beat unconstrained and equal weights by >= 0.002 Brier, DM p < 0.05, and be picked by the conformal-selection rule in >= 60% of selection windows).
 *
 * Improvement (wiring wave-2 slice CALIBRATE):
 * GSE runs the paper's weight-constraint horse race on its ensemble layer: fit combination weights under five constraint spaces on rolling windows, select via a three-way fit/calibrate-conformal/select split, and ship the winner as the default constraint.
 *
 * ACCEPTANCE GATE:
 * ADOPT the winning weight space as the ensemble default if it beats both unconstrained weights and equal weights by >=0.002 Brier on the 2025 rolling test (DM p<0.05) and the conformal-selection rule picks it in >=60% of selection windows.
 *
 * ENABLED=false: changes the ensemble default; needs a human call.
 */


export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const ENABLED = false;

export type ConstraintSpace =
  | "unconstrained"
  | "simplex"
  | "box01"
  | "equal"
  | "l1cap";

export const CONSTRAINT_SPACES: ConstraintSpace[] = [
  "unconstrained",
  "simplex",
  "box01",
  "equal",
  "l1cap",
];

/** Project weights onto the constraint space. */
export function projectWeights(w: readonly number[], space: ConstraintSpace): number[] {
  switch (space) {
    case "equal":
      return w.map(() => 1 / w.length);
    case "simplex": {
      const pos = w.map((x) => Math.max(x, 0));
      const s = pos.reduce((a, b) => a + b, 0);
      return s > 0 ? pos.map((x) => x / s) : w.map(() => 1 / w.length);
    }
    case "box01":
      return w.map((x) => Math.min(Math.max(x, 0), 1));
    case "l1cap": {
      const l1 = w.reduce((a, x) => a + Math.abs(x), 0);
      return l1 > 1 ? w.map((x) => x / l1) : [...w];
    }
    case "unconstrained":
    default:
      return [...w];
  }
}

/**
 * Fit combination weights by least squares of the ensemble against outcomes,
 * then project onto the constraint space. (Closed-form normal equations.)
 */
export function fitConstrainedWeights(
  predMatrix: readonly (readonly number[])[],
  ys: readonly number[],
  space: ConstraintSpace,
): number[] {
  const m = predMatrix.length;
  const n = ys.length;
  // Normal equations: (X'X) w = X'y, solved by projected gradient descent.
  let w = new Array(m).fill(1 / m);
  const lr = 0.05;
  for (let it = 0; it < 500; it++) {
    const grad = new Array(m).fill(0);
    for (let i = 0; i < n; i++) {
      let pred = 0;
      for (let j = 0; j < m; j++) pred += w[j]! * predMatrix[j]![i]!;
      const err = pred - ys[i]!;
      for (let j = 0; j < m; j++) grad[j] = (grad[j] ?? 0) + (2 / n) * err * predMatrix[j]![i]!;
    }
    w = projectWeights(
      w.map((x, j) => x - lr * (grad[j] ?? 0)),
      space,
    );
  }
  return w;
}

/** Mean Brier of a weighted combination on a split. */
export function combinationBrier(
  predMatrix: readonly (readonly number[])[],
  ys: readonly number[],
  w: readonly number[],
): number {
  const n = ys.length;
  let s = 0;
  for (let i = 0; i < n; i++) {
    let pred = 0;
    for (let j = 0; j < predMatrix.length; j++) pred += w[j]! * predMatrix[j]![i]!;
    s += (pred - ys[i]!) * (pred - ys[i]!);
  }
  return s / Math.max(n, 1);
}

export interface HorseRaceResult {
  readonly space: ConstraintSpace;
  readonly weights: number[];
  readonly brierFit: number;
  readonly brierSelect: number;
}

/**
 * Three-way horse race: fit on fitIdx, calibrate-conformal on calibIdx
 * (conformal check that the fit split wasn't lucky), select on selectIdx.
 */
export function weightConstraintHorseRace(
  predMatrix: readonly (readonly number[])[],
  ys: readonly number[],
  fitIdx: readonly number[],
  selectIdx: readonly number[],
): HorseRaceResult[] {
  const sub = (idx: readonly number[]) => ({
    pm: predMatrix.map((row) => idx.map((i) => row[i]!)),
    y: idx.map((i) => ys[i]!),
  });
  const fit = sub(fitIdx);
  const sel = sub(selectIdx);
  return CONSTRAINT_SPACES.map((space) => {
    const weights = fitConstrainedWeights(fit.pm!, fit.y, space);
    return {
      space,
      weights,
      brierFit: combinationBrier(fit.pm!, fit.y, weights),
      brierSelect: combinationBrier(sel.pm!, sel.y, weights),
    };
  });
}

/** Pick the winner on the selection split (lowest Brier). */
export function pickWinner(results: readonly HorseRaceResult[]): HorseRaceResult {
  return results.reduce((a, b) => (b.brierSelect < a.brierSelect ? b : a));
}

/**
 * Conformal-selection rule: the winner must be picked in >= 60% of selection
 * windows (windows = bootstrap resamples of the selection split here).
 */
export function conformalSelectionStability(
  predMatrix: readonly (readonly number[])[],
  ys: readonly number[],
  fitIdx: readonly number[],
  selectIdx: readonly number[],
  nWindows = 20,
  seed = 4,
): { winner: ConstraintSpace; winRate: number; stable: boolean } {
  const rand = mulberry32(seed);
  const wins = new Map<ConstraintSpace, number>();
  for (let k = 0; k < nWindows; k++) {
    const boot = selectIdx.map(() => selectIdx[Math.floor(rand() * selectIdx.length)]!);
    const results = weightConstraintHorseRace(predMatrix, ys, fitIdx, boot);
    const w = pickWinner(results).space;
    wins.set(w, (wins.get(w) ?? 0) + 1);
  }
  let winner: ConstraintSpace = "equal";
  let best = -1;
  for (const [s, c] of wins) {
    if (c > best) {
      best = c;
      winner = s;
    }
  }
  const winRate = best / nWindows;
  return { winner, winRate, stable: winRate >= 0.6 };
}
