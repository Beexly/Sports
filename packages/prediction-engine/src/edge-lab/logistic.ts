/**
 * Deterministic ridge-regularized logistic regression — the edge-lab's
 * reference trainer. Deliberately simple: the Phase-0 acceptance gate is
 * about the PIPELINE (leak-freedom), not model sophistication, and a
 * deterministic closed-loop trainer keeps every reported number exactly
 * reproducible (handoff §2 P0, P2). Phase-3 models replace this; the
 * harness contract (`Trainer`) stays.
 *
 * Features are standardized on the TRAINING fold only (mean/sd frozen and
 * applied to test rows) — test-fold statistics never touch training, which
 * is itself a leak class. Missing feature values (absent key) impute to the
 * training mean (i.e. 0 after standardization).
 */

export interface LabeledExample {
  /** Feature vector (absent key = missing at decision time). */
  readonly features: ReadonlyMap<string, number>;
  /** Binary outcome (1 = modeled side won). */
  readonly y: 0 | 1;
}

export type Predictor = (features: ReadonlyMap<string, number>) => number;

export interface Trainer {
  (train: readonly LabeledExample[]): Predictor;
}

export interface LogisticOptions {
  readonly featureKeys: readonly string[];
  readonly lambda?: number; // ridge strength (default 1e-2)
  readonly learningRate?: number; // default 0.5
  readonly iterations?: number; // default 300
}

function sigmoid(z: number): number {
  if (z >= 0) {
    const e = Math.exp(-z);
    return 1 / (1 + e);
  }
  const e = Math.exp(z);
  return e / (1 + e);
}

/** Build a deterministic ridge-logistic trainer over the given feature keys. */
export function logisticTrainer(opts: LogisticOptions): Trainer {
  const lambda = opts.lambda ?? 1e-2;
  const lr = opts.learningRate ?? 0.5;
  const iters = opts.iterations ?? 300;
  const keys = [...opts.featureKeys];

  return (train: readonly LabeledExample[]): Predictor => {
    const n = train.length;
    if (n === 0) return () => 0.5;

    // Standardization constants from the TRAINING fold only.
    const mean = new Array(keys.length).fill(0);
    const count = new Array(keys.length).fill(0);
    for (const ex of train) {
      keys.forEach((k, j) => {
        const v = ex.features.get(k);
        if (v !== undefined && Number.isFinite(v)) {
          mean[j] = (mean[j] ?? 0) + v;
          count[j] = (count[j] ?? 0) + 1;
        }
      });
    }
    keys.forEach((_, j) => {
      const c = count[j] ?? 0;
      mean[j] = c > 0 ? (mean[j] ?? 0) / c : 0;
    });
    const sd = new Array(keys.length).fill(0);
    for (const ex of train) {
      keys.forEach((k, j) => {
        const v = ex.features.get(k);
        if (v !== undefined && Number.isFinite(v)) sd[j] = (sd[j] ?? 0) + (v - (mean[j] ?? 0)) ** 2;
      });
    }
    keys.forEach((_, j) => {
      const c = count[j] ?? 0;
      sd[j] = c > 1 ? Math.sqrt((sd[j] ?? 0) / (c - 1)) : 1;
      if (!((sd[j] ?? 0) > 1e-12)) sd[j] = 1; // constant feature -> no scale
    });

    const encode = (features: ReadonlyMap<string, number>): number[] =>
      keys.map((k, j) => {
        const v = features.get(k);
        if (v === undefined || !Number.isFinite(v)) return 0; // = training mean
        return (v - (mean[j] ?? 0)) / (sd[j] ?? 1);
      });

    const X = train.map((ex) => encode(ex.features));
    const Y = train.map((ex) => ex.y);

    // Batch gradient descent on ridge-penalized log-loss (intercept unpenalized).
    let b0 = 0;
    const w = new Array(keys.length).fill(0);
    for (let it = 0; it < iters; it++) {
      let g0 = 0;
      const g = new Array(keys.length).fill(0);
      for (let i = 0; i < n; i++) {
        const xi = X[i]!;
        const z = b0 + xi.reduce((acc, x, j) => acc + x * (w[j] ?? 0), 0);
        const err = sigmoid(z) - (Y[i] ?? 0);
        g0 += err;
        for (let j = 0; j < keys.length; j++) g[j] = (g[j] ?? 0) + err * (xi[j] ?? 0);
      }
      b0 -= (lr * g0) / n;
      for (let j = 0; j < keys.length; j++) {
        w[j] = (w[j] ?? 0) - lr * ((g[j] ?? 0) / n + lambda * (w[j] ?? 0));
      }
    }

    return (features: ReadonlyMap<string, number>): number => {
      const x = encode(features);
      const z = b0 + x.reduce((acc, xi, j) => acc + xi * (w[j] ?? 0), 0);
      return sigmoid(z);
    };
  };
}
