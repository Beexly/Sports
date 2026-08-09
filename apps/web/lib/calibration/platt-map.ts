/**
 * Platt scaling — MLE and MAP (Gaussian prior on A,B). Offline R&D.
 * sigmoid(A * logit(p) + B). Does not write production maps.
 */

export interface PlattParams {
  readonly A: number;
  readonly B: number;
}

export interface ProbOutcome {
  readonly p: number;
  readonly y: 0 | 1;
}

function clampP(p: number): number {
  return Math.min(1 - 1e-6, Math.max(1e-6, p));
}

function logit(p: number): number {
  const x = clampP(p);
  return Math.log(x / (1 - x));
}

function sigmoid(z: number): number {
  if (z >= 0) {
    const ez = Math.exp(-z);
    return 1 / (1 + ez);
  }
  const ez = Math.exp(z);
  return ez / (1 + ez);
}

export function applyPlatt(p: number, params: PlattParams): number {
  return sigmoid(params.A * logit(p) + params.B);
}

/**
 * Gradient descent MLE / MAP for Platt.
 * MAP: prior A~N(1, sigmaA^2), B~N(0, sigmaB^2) (soft identity prior).
 */
export function fitPlatt(
  samples: readonly ProbOutcome[],
  options?: {
    readonly map?: boolean;
    readonly sigmaA?: number;
    readonly sigmaB?: number;
    readonly steps?: number;
    readonly lr?: number;
  },
): PlattParams {
  const map = options?.map === true;
  const sigmaA = options?.sigmaA ?? 1.0;
  const sigmaB = options?.sigmaB ?? 1.0;
  const steps = options?.steps ?? 200;
  const lr = options?.lr ?? 0.05;

  let A = 1;
  let B = 0;
  if (samples.length === 0) return { A, B };

  for (let s = 0; s < steps; s++) {
    let gA = 0;
    let gB = 0;
    for (const row of samples) {
      const z = A * logit(row.p) + B;
      const pred = sigmoid(z);
      const err = pred - row.y;
      gA += err * logit(row.p);
      gB += err;
    }
    gA /= samples.length;
    gB /= samples.length;
    if (map) {
      gA += (A - 1) / (sigmaA * sigmaA);
      gB += B / (sigmaB * sigmaB);
    }
    A -= lr * gA;
    B -= lr * gB;
  }
  return { A, B };
}

/** Alias for MAP fit with soft identity prior. */
export function fitPlattMap(
  samples: readonly ProbOutcome[],
  options?: { readonly sigmaA?: number; readonly sigmaB?: number },
): PlattParams {
  return fitPlatt(samples, { map: true, ...options });
}

/**
 * Optional group-intercept stub: shared A,B plus per-group bias (offline only).
 * Returns global Platt + map of group → intercept; empty groups ignored.
 */
export function fitPlattMapWithGroupIntercepts(
  samples: readonly (ProbOutcome & { readonly groupKey: string })[],
  options?: { readonly sigmaA?: number; readonly sigmaB?: number; readonly sigmaG?: number },
): { readonly global: PlattParams; readonly groupIntercept: Readonly<Record<string, number>> } {
  const global = fitPlattMap(samples, options);
  const sigmaG = options?.sigmaG ?? 1.0;
  const groups = new Map<string, ProbOutcome[]>();
  for (const s of samples) {
    const arr = groups.get(s.groupKey) ?? [];
    arr.push(s);
    groups.set(s.groupKey, arr);
  }
  const groupIntercept: Record<string, number> = {};
  for (const [g, rows] of groups) {
    if (rows.length < 10) {
      groupIntercept[g] = 0;
      continue;
    }
    // Residual mean logit correction (shrink to 0)
    let sum = 0;
    for (const r of rows) {
      const pred = applyPlatt(r.p, global);
      const y = r.y;
      // rough residual in probability space → intercept nudge
      sum += y - pred;
    }
    const mean = sum / rows.length;
    const shrink = rows.length / (rows.length + 1 / (sigmaG * sigmaG));
    groupIntercept[g] = mean * shrink * 0.5;
  }
  return { global, groupIntercept };
}
