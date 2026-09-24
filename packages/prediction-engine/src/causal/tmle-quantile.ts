
/** IPW-weighted tau-quantile. */
export function weightedQuantile(values: readonly number[], weights: readonly number[], tau: number): number {
  if (values.length !== weights.length || values.length === 0) throw new Error("tmle-quantile: aligned non-empty inputs");
  if (!(tau > 0 && tau < 1)) throw new Error("tmle-quantile: tau in (0,1) required");
  const order = values.map((_, i) => i).sort((a, b) => (values[a] ?? 0) - (values[b] ?? 0));
  const total = weights.reduce((s, w) => s + Math.max(w, 0), 0);
  let acc = 0;
  for (const i of order) {
    acc += Math.max(weights[i] ?? 0, 0);
    if (acc >= tau * total) return values[i] ?? 0;
  }
  return values[order[order.length - 1] ?? 0] ?? 0;
}

/** Gaussian-kernel density estimate at x (for the EIF denominator f(q)). */
export function kdeAt(x: number, values: readonly number[], weights: readonly number[], bw: number): number {
  if (!(bw > 0)) throw new Error("tmle-quantile: bw must be positive");
  const total = weights.reduce((s, w) => s + Math.max(w, 0), 0);
  if (total <= 0) throw new Error("tmle-quantile: weights must have positive mass");
  let num = 0;
  for (let i = 0; i < values.length; i++) {
    const z = (x - (values[i] ?? 0)) / bw;
    num += Math.max(weights[i] ?? 0, 0) * Math.exp(-0.5 * z * z);
  }
  return num / (total * bw * Math.sqrt(2 * Math.PI));
}

export interface QuantileEffect {
  readonly tau: number;
  readonly q1: number;
  readonly q0: number;
  readonly effect: number;
  readonly se: number;
  readonly ciLower: number;
  readonly ciUpper: number;
}

/**
 * Quantile treatment effect at tau via IPW-weighted quantiles, with an EIF-based
 * standard error: IF_tau = (tau - 1{Y <= q}) / f(q), se from the weighted IF variance.
 */
export function quantileTreatmentEffect(
  y: readonly number[],
  t: readonly number[],
  ps: readonly number[],
  tau: number,
  bw?: number,
): QuantileEffect {
  if (y.length !== t.length || y.length !== ps.length || y.length === 0) {
    throw new Error("tmle-quantile: aligned non-empty inputs required");
  }
  const w1 = y.map((_, i) => ((t[i] ?? 0) === 1 ? 1 / Math.max(ps[i] ?? 0.5, 1e-6) : 0));
  const w0 = y.map((_, i) => ((t[i] ?? 0) === 0 ? 1 / Math.max(1 - (ps[i] ?? 0.5), 1e-6) : 0));
  const q1 = weightedQuantile(y, w1, tau);
  const q0 = weightedQuantile(y, w0, tau);
  const h = bw ?? 1.06 * Math.pow(y.length, -0.2); // Silverman fallback scale
  const f1 = Math.max(kdeAt(q1, y, w1, Math.max(h, 1e-6)), 1e-9);
  const f0 = Math.max(kdeAt(q0, y, w0, Math.max(h, 1e-6)), 1e-9);
  const se1 = Math.sqrt(tau * (1 - tau)) / (f1 * Math.sqrt(Math.max(w1.reduce((s, w) => s + w, 0), 1)));
  const se0 = Math.sqrt(tau * (1 - tau)) / (f0 * Math.sqrt(Math.max(w0.reduce((s, w) => s + w, 0), 1)));
  const se = Math.sqrt(se1 * se1 + se0 * se0);
  const effect = q1 - q0;
  return { tau, q1, q0, effect, se, ciLower: effect - 1.96 * se, ciUpper: effect + 1.96 * se };
}
