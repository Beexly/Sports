
export function pinballLoss(y: number, q: number, alpha: number): number {
  if (!(alpha > 0 && alpha < 1)) throw new Error("decision-weighted-pinball: alpha in (0,1) required");
  const e = y - q;
  return e >= 0 ? alpha * e : (alpha - 1) * e;
}

export interface DecisionWeightedLossOptions {
  readonly y: number;
  readonly quantiles: readonly number[];
  readonly alphas: readonly number[];
  /** Nonnegative decision weight per quantile region (e.g. expected edge). */
  readonly weights: readonly number[];
}

export function decisionWeightedPinballLoss(o: DecisionWeightedLossOptions): number {
  const k = o.quantiles.length;
  if (o.alphas.length !== k || o.weights.length !== k) {
    throw new Error("decision-weighted-pinball: quantiles/alphas/weights must align");
  }
  if (k === 0) return 0;
  const wSum = o.weights.reduce((s, w) => s + Math.max(w, 0), 0);
  if (wSum <= 0) throw new Error("decision-weighted-pinball: weights must have positive mass");
  let total = 0;
  for (let i = 0; i < k; i++) {
    total += (Math.max(o.weights[i] ?? 0, 0) / wSum) * pinballLoss(o.y, o.quantiles[i] ?? 0, o.alphas[i] ?? 0.5);
  }
  return total;
}

/** Normalize per-quantile expected edges into decision weights (negative edge -> 0, fallback uniform). */
export function decisionWeightsFromEdge(edgeByQuantile: readonly number[]): number[] {
  const pos = edgeByQuantile.map((e) => Math.max(e, 0));
  const sum = pos.reduce((s, w) => s + w, 0);
  if (sum <= 0) return edgeByQuantile.map(() => 1 / Math.max(edgeByQuantile.length, 1));
  return pos.map((w) => w / sum);
}
