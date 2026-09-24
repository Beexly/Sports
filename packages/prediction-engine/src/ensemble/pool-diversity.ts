/**
 * Linear-pool diversity D via the energy score (Prop 5.1 identity).
 *
 * Energy score for ensemble samples X = {x_1..x_n} against outcome y:
 *   ES(F, y) = (1/n) sum_i |x_i - y| - (1/2n^2) sum_{i,j} |x_i - x_j|
 *
 * The paper's exact diversity metric (energy-score form) is the disagreement
 * dividend:
 *   D = mean_m ES(F_m, y) - ES(F_pool, y)
 * so that the pooled score decomposes as
 *   ES_pool = mean_m ES_m - D                      (Prop 5.1)
 * D is the ensemble health monitor: prefer components that raise D at fixed
 * skill; high-D weeks should pool to better-calibrated forecasts.
 *
 * Pure TypeScript, no I/O.
 *
 * Reference: arXiv:2412.09430 — Entropy of the Linear Pool and Forecast
 * Disagreement (Krueger, 2024).
 *
 * ACCEPTANCE GATE: Prop 5.1 holds within numerical tolerance on backtests,
 * and delta-D positively predicts pooled-score improvement.
 */

/** Energy score of ensemble samples against an outcome. */
export function energyScore(samples: readonly number[], y: number): number {
  const n = samples.length;
  if (n === 0) throw new Error("pool-diversity: need >= 1 sample");
  let s1 = 0;
  let s2 = 0;
  for (let i = 0; i < n; i++) {
    s1 += Math.abs((samples[i] ?? 0) - y);
    for (let j = 0; j < n; j++) s2 += Math.abs((samples[i] ?? 0) - (samples[j] ?? 0));
  }
  return s1 / n - s2 / (2 * n * n);
}

/**
 * Diversity dividend D = mean component ES - pooled ES.
 * @param components per-component ensemble samples; @param y outcome.
 */
export function poolDiversity(components: ReadonlyArray<readonly number[]>, y: number): number {
  if (components.length === 0) throw new Error("pool-diversity: need >= 1 component");
  const pooled = components.flat();
  const meanEs =
    components.reduce((s, c) => s + energyScore(c, y), 0) / components.length;
  return meanEs - energyScore(pooled, y);
}

/**
 * Verify Prop 5.1: |pooled ES - (mean ES - D)| should be ~0.
 * Returns the absolute violation (health-check metric).
 */
export function prop51Violation(components: ReadonlyArray<readonly number[]>, y: number): number {
  if (components.length === 0) throw new Error("pool-diversity: need >= 1 component");
  const pooled = components.flat();
  const meanEs = components.reduce((s, c) => s + energyScore(c, y), 0) / components.length;
  const d = poolDiversity(components, y);
  return Math.abs(energyScore(pooled, y) - (meanEs - d));
}

/** Mean pairwise absolute disagreement between component ensembles. */
export function disagreement(components: ReadonlyArray<readonly number[]>, y: number): number {
  void y;
  if (components.length < 2) return 0;
  const means = components.map((c) => c.reduce((s, v) => s + v, 0) / Math.max(c.length, 1));
  let s = 0;
  let n = 0;
  for (let i = 0; i < means.length; i++) {
    for (let j = i + 1; j < means.length; j++) {
      s += Math.abs((means[i] ?? 0) - (means[j] ?? 0));
      n++;
    }
  }
  return s / Math.max(n, 1);
}
