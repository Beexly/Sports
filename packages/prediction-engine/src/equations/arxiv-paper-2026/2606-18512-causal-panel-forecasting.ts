/**
 * arXiv:2606.18512 — Causal panel forecasting for mid-week starter exit.
 * Synthetic-control + latent factor counterfactual.
 *
 * Layers on top of Sinkhorn target reallocation.
 * ENABLED = false until the Tuesday seal and injury pipeline are wired.
 */
export const ENABLED = false;

export const ACCEPTANCE_GATE = {
  status: "UNEVALUATED_SHADOW_SEAL_GATE",
  paperId: "arXiv:2606.18512",
  title: "Causal panel forecasting for mid-week starter exit",
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
  if (!ENABLED) return 0;
  const prior = history.filter((h) => h.team === team && h.week < week && !h.starterOut);
  if (prior.length === 0) return 0;
  return prior.reduce((s, h) => s + h.efficiency, 0) / prior.length;
}
