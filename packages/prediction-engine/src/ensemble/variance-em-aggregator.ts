/**
 * Variance-EM probability-aggregation operator.
 *
 * Collects per-game win probabilities from GSE's sources (engine,
 * market-implied, crowd feed, analyst overrides) into a panel and runs the EM
 * (paper equations 1–2) to produce the published probability, tracking
 * per-source σᵢ² over time as a source-reliability dashboard. Each source is
 * pre-calibrated (Platt/isotonic on trailing 2 seasons) before aggregating.
 *
 * E-step: consensus μ = precision-weighted mean of sources.
 * M-step: σᵢ² ← (pᵢ − μ)² (MLE under the Gaussian error model).
 *
 * @see arXiv:1206.6814 — "An Empirical Comparison of Algorithms for Aggregating Expert Predictions"
 *
 * ACCEPTANCE GATE: adopt Variance-EM iff it beats simple averaging on Brier
 * score over 2024–2025 by ≥ 0.002 with no calibration-curve degradation
 * (ECE within 0.005 of the best baseline); reject on tie/loss. The gate is a
 * backtest concern; this module is the pure EM kernel, not wired live.
 */

export interface VarianceEMResult {
  /** Consensus (published) probability. */
  mu: number;
  /** Per-source error variances σᵢ² — the reliability dashboard. */
  sourceVariances: number[];
  /** Iterations run. */
  iterations: number;
  /** Converged before maxIter. */
  converged: boolean;
}

const EPS = 1e-9;

/**
 * Run Variance-EM over one game's source panel.
 * @param panel per-source probabilities for a single game (length ≥ 1)
 */
export function varianceEM(
  panel: readonly number[],
  maxIter = 100,
  tol = 1e-10,
  initVariance = 0.01,
): VarianceEMResult {
  if (panel.length === 0) throw new Error("varianceEM: empty panel");
  for (const p of panel) {
    if (!Number.isFinite(p) || p < 0 || p > 1) {
      throw new Error(`varianceEM: source probability out of range: ${p}`);
    }
  }
  let variances = panel.map(() => initVariance);
  let mu = panel.reduce((a, b) => a + b, 0) / panel.length;
  let converged = false;
  let iterations = 0;
  for (let it = 0; it < maxIter; it++) {
    iterations = it + 1;
    // E-step: precision-weighted consensus
    const precisions = variances.map((v) => 1 / Math.max(v, EPS));
    const precSum = precisions.reduce((a, b) => a + b, 0);
    const nextMu = panel.reduce((acc, p, i) => acc + (precisions[i] ?? 0) * p, 0) / precSum;
    // M-step: per-source MLE variance
    const nextVar = panel.map((p) => Math.max((p - nextMu) * (p - nextMu), EPS));
    const shift = Math.abs(nextMu - mu);
    mu = nextMu;
    variances = nextVar;
    if (shift < tol) {
      converged = true;
      break;
    }
  }
  return { mu, sourceVariances: variances, iterations, converged };
}

/**
 * Simple-average baseline for the gate's head-to-head comparison.
 */
export function simpleAverage(panel: readonly number[]): number {
  if (panel.length === 0) throw new Error("simpleAverage: empty panel");
  return panel.reduce((a, b) => a + b, 0) / panel.length;
}

/**
 * Reliability summary: mean σᵢ² per source over many games (lower = more
 * reliable). Input: rows = games, columns = sources (post-EM variances).
 */
export function sourceReliabilityDashboard(
  perGameVariances: ReadonlyArray<readonly number[]>,
): number[] {
  if (perGameVariances.length === 0) return [];
  const nSources = perGameVariances[0]?.length ?? 0;
  const sums = new Array<number>(nSources).fill(0);
  perGameVariances.forEach((row) => {
    row.forEach((v, i) => {
      sums[i] = (sums[i] ?? 0) + v;
    });
  });
  return sums.map((s) => s / perGameVariances.length);
}
