/**
 * arXiv:2606.18512 — Causal panel forecasting for mid-week starter exit.
 * Synthetic-control + latent factor counterfactual.
 *
 * ACCEPTANCE_GATE (HUMAN_CALL_REQUIRED — SHADOW SEAL REQUIRED):
 * Module implements prospective out-of-panel causal factor forecasting of Shen (2026, arXiv:2606.18512)
 * for single-team regime shifts (coach firing, mid-season trade, scheme overhaul).
 * Refusal / Gate Criteria before flipping CAUSAL_PANEL_FORECASTING_ENABLED / ENABLED to true:
 *   1. Placebo-in-time backtest across 31-team donor pool must beat pre-intervention RMSE floor.
 *   2. One clean Tuesday 04:00 CT shadow-seal diff must be signed off by the founder.
 */
export const ENABLED = false;
export const CAUSAL_PANEL_FORECASTING_ENABLED = false as const;
export const CAUSAL_PANEL_FORECASTING_ACCEPTANCE_GATE = {
  status: "UNEVALUATED_SHADOW_SEAL_GATE",
  paperId: "arXiv:2606.18512",
  requiresPlaceboInTimeValidation: true,
  requiresShadowSealDiff: true,
  sealBoundary: "PRE_SEAL_TUESDAY_0400_CT_ONLY",
} as const;

export type UnitObservation = {
  team: string;
  week: number;
  efficiency: number;
  starterOut: boolean;
};

/**
 * Counterfactual unit efficiency had the starter not exited.
 * Production version uses synthetic control or latent factor model.
 */
export function counterfactualEfficiency(
  history: UnitObservation[],
  team: string,
  week: number
): number {
  if (!ENABLED) {
    // Returning 0 would read as "measured zero efficiency" and be
    // indistinguishable from a real estimate. Refuse instead.
    throw new Error(
      "2606-18512: causal panel counterfactual not implemented (module disabled); refusing to return 0",
    );
  }
  const prior = history.filter((h) => h.team === team && h.week < week && !h.starterOut);
  if (prior.length === 0) return 0;
  return prior.reduce((s, h) => s + h.efficiency, 0) / prior.length;
}
