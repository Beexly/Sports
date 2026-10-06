/**
 * Linear regression under model uncertainty
 *
 * arXiv:2108.02140v1 · lane:calibration · owner:Mimo
 *
 * Improvement (IMPROVEMENT-LEDGER.jsonl):
 * Install regime-robust trend estimation: moving-block Robust-LSE for pooled game-level regression
 * (e.g., offense/defense strength drift, weather-rest effects on margins) — rolling windows of
 * ~100-150 games, OLS per window, beta-hat from the min-MSE window, reporting (mu-hat-bar, mu-hat-
 * underbar) and (sigma-hat-bar, sigma-hat-underbar) as regime-uncertainty bounds; apply the small-
 * window centralization + max block MSE recipe to weekly engine residual streams (spread
 * residuals) as a volatility-regime dashboard feeding bet-sizing — and test a regime-weighted
 * variant (inverse-MSE-weighted blocks instead of hard min-selection) against both OLS and hard-
 * selection Robust-LSE on the synthetic NFL DGP.
 *
 * ACCEPTANCE GATE: Adopt if: Robust-LSE reduces mean |beta-hat - 1| by >= 20% relative to OLS at K=4 with T~=1000
 * injected games, AND the recovered (sigma-hat-underbar, sigma-hat-bar) bracket the injected
 * (3,10) bounds within +-1.5 points.
 *
 * Ingest role: feature builder (model-uncertainty regression: BMA weights + posterior inclusion).
 * Live data: NO. Runs offline on nflverse aggregates / stored snapshots.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "2108.02140v1" as const;
export const LANE = "calibration" as const;

/** Numeric acceptance gate, verbatim from the ledger (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `Adopt if: Robust-LSE reduces mean |beta-hat - 1| by >= 20% relative to OLS at K=4 with T~=1000
 * injected games, AND the recovered (sigma-hat-underbar, sigma-hat-bar) bracket the injected
 * (3,10) bounds within +-1.5 points.`;

export const CONFIG = {
  enabled: false,
  method: "BIC-weighted Bayesian model averaging",
  maxModels: 1024,
} as const;

/** Type guard for finite numbers (rejects NaN/Infinity/non-numbers). */
function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

export interface ModelFit {
  readonly modelId: string;
  readonly bic: number;
  readonly features: readonly string[];
  readonly r2: number;
}

/** BIC -> posterior model weights (uniform prior over models). */
export function bmaWeights(fits: readonly ModelFit[]): Array<{ modelId: string; weight: number }> | null {
  if (fits.length === 0) return null;
  if (!fits.every((f) => typeof f.modelId === "string" && isFiniteNumber(f.bic))) return null;
  const minBic = Math.min(...fits.map((f) => f.bic));
  const unnorm = fits.map((f) => Math.exp(-0.5 * (f.bic - minBic)));
  const tot = unnorm.reduce((a, b) => a + b, 0);
  if (tot === 0) return null;
  return fits.map((f, i) => ({ modelId: f.modelId, weight: (unnorm[i] ?? 0) / tot }));
}

/** Posterior inclusion probability per feature. */
export function inclusionProbs(
  fits: readonly ModelFit[],
  weights: ReadonlyArray<{ modelId: string; weight: number }>,
): Record<string, number> | null {
  if (fits.length === 0 || weights.length === 0) return null;
  const wMap = new Map(weights.map((w) => [w.modelId, w.weight]));
  const pip: Record<string, number> = {};
  for (const f of fits) {
    const w = wMap.get(f.modelId);
    if (w === undefined || !isFiniteNumber(w)) return null;
    for (const feat of f.features) pip[feat] = (pip[feat] ?? 0) + w;
  }
  return pip;
}

/** BMA-averaged coefficient for one feature (models without it contribute 0). */
export function bmaCoefficient(
  fits: ReadonlyArray<ModelFit & { coefs: Readonly<Record<string, number>> }>,
  weights: ReadonlyArray<{ modelId: string; weight: number }>,
  feature: string,
): number | null {
  if (typeof feature !== "string" || fits.length === 0) return null;
  const wMap = new Map(weights.map((w) => [w.modelId, w.weight]));
  let s = 0;
  for (const f of fits) {
    const w = wMap.get(f.modelId);
    if (w === undefined) return null;
    const c = f.coefs[feature] ?? 0;
    if (!isFiniteNumber(c)) return null;
    s += w * c;
  }
  return s;
}

/** Model-uncertainty diagnostic: entropy of the weight distribution. */
export function modelUncertainty(weights: ReadonlyArray<{ weight: number }>): number | null {
  if (weights.length === 0 || !weights.every((w) => isFiniteNumber(w.weight) && w.weight >= 0)) return null;
  let h = 0;
  for (const w of weights) if (w.weight > 0) h -= w.weight * Math.log(w.weight);
  return h;
}
