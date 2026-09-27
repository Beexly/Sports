/**
 * Pregame context logistic bridge.
 *
 * Fit on rows the caller already restricted to seasons before the holdout.
 * The probability is the fitted sigmoid. The sample count is the number of
 * rows in that fit. A missing feature refuses the row. A probability that
 * lands on 0 or 1 is refused, not clamped.
 *
 * homeSign is the sign of the fitted coefficient for that feature. It is not
 * a hand-set direction.
 */

export const BRIDGE_FEATURES = [
  "margin_diff",
  "scored_diff",
  "allowed_diff",
  "opp_scored_diff",
  "opp_allowed_diff",
  "rest_diff",
  "dome",
  "neutral",
] as const;

export type BridgeFeature = (typeof BRIDGE_FEATURES)[number];

/** Numerical ridge on the Hessian so a separated column does not explode. Not a sample and not a probability. */
export const NUMERICAL_RIDGE = 1e-6;

export const MIN_FIT_ROWS = 200;

export interface BridgeModel {
  readonly method: "logistic-irls";
  readonly sampleCount: number;
  readonly features: readonly BridgeFeature[];
  readonly intercept: number;
  readonly coefficients: Readonly<Record<BridgeFeature, number>>;
  readonly center: Readonly<Record<BridgeFeature, number>>;
  readonly scale: Readonly<Record<BridgeFeature, number>>;
  readonly homeSign: Readonly<Record<BridgeFeature, -1 | 0 | 1>>;
}

export type BridgeOutcome<T> = { readonly ok: true; readonly data: T } | { readonly ok: false; readonly reason: string };

export interface BridgePrediction {
  readonly outcome: "home";
  readonly probability: number;
  readonly sampleCount: number;
  readonly method: "logistic-irls";
  readonly homeSign: BridgeModel["homeSign"];
}

function fail(reason: string): BridgeOutcome<never> {
  return { ok: false, reason };
}

function sigmoid(x: number): number {
  if (x > 30) return 1;
  if (x < -30) return 0;
  return 1 / (1 + Math.exp(-x));
}

function signOf(value: number): -1 | 0 | 1 {
  if (Math.abs(value) < 1e-8) return 0;
  return value > 0 ? 1 : -1;
}

function solve(matrix: number[][], target: number[]): number[] | null {
  const n = target.length;
  const m = matrix.map((row, i) => [...row, target[i]!]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(m[row]![col]!) > Math.abs(m[pivot]![col]!)) pivot = row;
    }
    if (Math.abs(m[pivot]![col]!) < 1e-12) return null;
    const swap = m[col]!;
    m[col] = m[pivot]!;
    m[pivot] = swap;
    const div = m[col]![col]!;
    for (let c = col; c <= n; c++) m[col]![c] = m[col]![c]! / div;
    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = m[row]![col]!;
      for (let c = col; c <= n; c++) m[row]![c] = m[row]![c]! - factor * m[col]![c]!;
    }
  }
  return m.map((row) => row[n]!);
}

export function fitBridge(rows: readonly { features: Readonly<Record<BridgeFeature, number>>; homeWin: boolean }[]): BridgeOutcome<BridgeModel> {
  if (rows.length < MIN_FIT_ROWS) return fail(`bridge fit: ${rows.length} rows is below ${MIN_FIT_ROWS}`);
  const center = {} as Record<BridgeFeature, number>;
  const scale = {} as Record<BridgeFeature, number>;
  for (const feature of BRIDGE_FEATURES) {
    let sum = 0;
    for (const row of rows) {
      const value = row.features[feature];
      if (!Number.isFinite(value)) return fail(`bridge fit: ${feature} is not finite`);
      sum += value;
    }
    const mean = sum / rows.length;
    let varSum = 0;
    for (const row of rows) {
      const d = row.features[feature] - mean;
      varSum += d * d;
    }
    const sd = Math.sqrt(varSum / rows.length);
    if (sd < 1e-12) return fail(`bridge fit: ${feature} has no variance`);
    center[feature] = mean;
    scale[feature] = sd;
  }

  const x = rows.map((row) => [1, ...BRIDGE_FEATURES.map((feature) => (row.features[feature] - center[feature]) / scale[feature])]);
  const y = rows.map((row) => (row.homeWin ? 1 : 0));
  const width = BRIDGE_FEATURES.length + 1;
  let beta = new Array<number>(width).fill(0);
  let converged = false;
  for (let iter = 0; iter < 80; iter++) {
    const mu = x.map((row) => sigmoid(row.reduce((sum, value, i) => sum + value * beta[i]!, 0)));
    const xtwx = Array.from({ length: width }, () => new Array<number>(width).fill(0));
    const xtwz = new Array<number>(width).fill(0);
    for (let i = 0; i < x.length; i++) {
      const p = mu[i]!;
      if (!(p > 0 && p < 1)) return fail("bridge fit: a training probability hit 0 or 1");
      const w = p * (1 - p);
      const z = x[i]!.reduce((sum, value, k) => sum + value * beta[k]!, 0) + (y[i]! - p) / w;
      for (let a = 0; a < width; a++) {
        xtwz[a] = xtwz[a]! + x[i]![a]! * w * z;
        for (let b = 0; b < width; b++) xtwx[a]![b] = xtwx[a]![b]! + x[i]![a]! * w * x[i]![b]!;
      }
    }
    for (let a = 0; a < width; a++) xtwx[a]![a] = xtwx[a]![a]! + NUMERICAL_RIDGE;
    const next = solve(xtwx, xtwz);
    if (!next || next.some((value) => !Number.isFinite(value))) return fail("bridge fit: the weighted solve failed");
    const delta = next.reduce((sum, value, i) => sum + Math.abs(value - beta[i]!), 0);
    beta = next;
    if (delta < 1e-8) {
      converged = true;
      break;
    }
  }
  if (!converged) return fail("bridge fit: did not converge");

  const coefficients = {} as Record<BridgeFeature, number>;
  const homeSign = {} as Record<BridgeFeature, -1 | 0 | 1>;
  BRIDGE_FEATURES.forEach((feature, index) => {
    coefficients[feature] = beta[index + 1]!;
    homeSign[feature] = signOf(beta[index + 1]!);
  });
  return {
    ok: true,
    data: {
      method: "logistic-irls",
      sampleCount: rows.length,
      features: BRIDGE_FEATURES,
      intercept: beta[0]!,
      coefficients,
      center,
      scale,
      homeSign,
    },
  };
}

export function predictBridge(model: BridgeModel, features: Readonly<Record<BridgeFeature, number>>): BridgeOutcome<BridgePrediction> {
  if (model.sampleCount < MIN_FIT_ROWS) return fail(`bridge predict: sample count ${model.sampleCount} is below ${MIN_FIT_ROWS}`);
  let eta = model.intercept;
  for (const feature of BRIDGE_FEATURES) {
    const value = features[feature];
    if (!Number.isFinite(value)) return fail(`bridge predict: ${feature} is not finite`);
    eta += ((value - model.center[feature]) / model.scale[feature]) * model.coefficients[feature];
  }
  const probability = sigmoid(eta);
  if (!(probability > 0 && probability < 1)) return fail(`bridge predict: probability ${probability} is not inside (0, 1) and was not clamped`);
  return {
    ok: true,
    data: {
      outcome: "home",
      probability,
      sampleCount: model.sampleCount,
      method: model.method,
      homeSign: model.homeSign,
    },
  };
}
