/**
 * arXiv:2606.18512 — Causal panel forecasting for mid-week starter exit.
 * Synthetic-control + latent factor counterfactual.
 *
 * Layers on top of Sinkhorn target reallocation.
 * ENABLED = false until the Tuesday seal and injury pipeline are wired.
 */
export const ENABLED = false;

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
