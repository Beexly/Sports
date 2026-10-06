/**
 * arXiv:2503.12107v1 — ChronosX: Adapting Pretrained Time Series Models with Exogenous Variables
 *
 * Frozen time-series backbone + lightweight exogenous adapters: the backbone stays frozen, adapter blocks
 * ingest injury/inactive/weather-nowcast covariates, and a late-news IIB update re-runs only adapters in
 * the final 60 minutes. Disabled: needs the pretrained backbone.
 *
 * Improvement: Adopt a pretrained time-series backbone with lightweight adapter blocks for exogenous covariates, keeping the backbone frozen, and add a late-news IIB update that re-runs only the adapter blocks on fresh injury/inactive/weather-nowcast inputs in the final 60 minutes before kickoff — since most covariate value arrives in the last hour.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: ADOPT into the engine if adapters beat the covariate-free fine-tuned backbone by ≥0.01 WQL on 2022–2024 AND the ablation (adapters with shuffled covariates) shows no gain; keep the frozen backbone + adapters (don't full-FT) if adapter-only is within 0.005 WQL of full-FT.
 */

/** Disabled: requires unavailable training data or model artifact. */
export const ENABLED = false;

/** Adapter block parameters (the only trainable part). */
export interface AdapterBlock {
  /** Down-projection then up-projection gain on covariates. */
  gain: number;
  /** Per-covariate weights. */
  weights: number[];
}

/** Frozen backbone forecast (opaque to this module — supplied by the host). */
export type BackboneForecast = (history: readonly number[]) => number;

/**
 * Adapter-adjusted forecast: backbone output + adapter(covariates).
 * The backbone is never touched (frozen).
 */
export function adapterForecast(
  backbone: BackboneForecast,
  adapter: AdapterBlock,
  history: readonly number[],
  covariates: readonly number[],
): number {
  if (covariates.length !== adapter.weights.length) {
    throw new Error("adapterForecast: covariate/weight length mismatch");
  }
  const adj = covariates.reduce((s, v, i) => s + v * (adapter.weights[i] ?? 0), 0);
  return backbone(history) + adapter.gain * adj;
}

/**
 * Late-news IIB update: re-run only the adapter on fresh covariates inside
 * the 60-minute window; returns the updated forecast delta.
 */
export function lateNewsUpdate(
  backbone: BackboneForecast,
  adapter: AdapterBlock,
  history: readonly number[],
  oldCov: readonly number[],
  newCov: readonly number[],
  minutesToKickoff: number,
): { delta: number; applied: boolean } {
  if (minutesToKickoff > 60) return { delta: 0, applied: false };
  const before = adapterForecast(backbone, adapter, history, oldCov);
  const after = adapterForecast(backbone, adapter, history, newCov);
  return { delta: after - before, applied: true };
}
