/**
 * arXiv:2504.19612v1 — Relative Advantage: Quantifying Performance in Noisy Competitive Settings
 *
 * Relative-advantage with differential environmental sensitivity: team stats are first de-weathered with
 * team-specific loadings eta_i = lambda_i * eta, then differenced, so a dome team's wind-game stats are
 * discounted more.
 *
 * Improvement: Replace absolute team-stat features with relative-difference features and model differential environmental sensitivity: estimate team-specific environmental loadings η_i = λ_i·η and use the adjusted relative metric R_adj = (X_A − λ̂_A η̂) − (X_B − λ̂_B η̂), so a dome team's stats in wind are discounted differently than its opponent's — the heterogeneous-environment extension the authors list as future work.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: Adopt the principle if relative-difference features beat the two-feature absolute baseline on held-out 2024–2025 NFL games by ≥ 0.01 AUC on log-loss-neutral comparison.
 */

/** Team environmental loading: how much raw stat X moves with environment eta. */
export interface EnvLoading { team: string; lambda: number }

/**
 * Environment-adjusted relative metric:
 * R_adj = (X_A - lA*eta) - (X_B - lB*eta).
 */
export function adjustedRelativeMetric(
  xA: number,
  xB: number,
  loadA: EnvLoading,
  loadB: EnvLoading,
  eta: number,
): number {
  return (xA - loadA.lambda * eta) - (xB - loadB.lambda * eta);
}

/**
 * Estimate a team's loading by OLS of its stat on the environmental index.
 * Returns lambda_hat = Cov(X, eta) / Var(eta).
 */
export function estimateLoading(
  stats: readonly number[],
  env: readonly number[],
): number {
  if (stats.length !== env.length || stats.length < 2) {
    throw new Error("estimateLoading: need >= 2 paired observations");
  }
  const n = stats.length;
  const mS = stats.reduce((a, b) => a + b, 0) / n;
  const mE = env.reduce((a, b) => a + b, 0) / n;
  let cov = 0;
  let varE = 0;
  for (let i = 0; i < n; i++) {
    cov += ((stats[i] ?? 0) - mS) * ((env[i] ?? 0) - mE);
    varE += ((env[i] ?? 0) - mE) ** 2;
  }
  if (varE < 1e-12) throw new Error("estimateLoading: no env variance");
  return cov / varE;
}
