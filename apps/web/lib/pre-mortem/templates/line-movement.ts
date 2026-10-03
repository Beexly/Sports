/**
 * Pre-mortem failure mode: line movement.
 *
 * Triggers when line movement is a top-3 contributor (factor score > 0.4).
 * Bullet calls out that if sharp money moves the line >2 points against us,
 * we published too early.
 */

import type { FailureModeTemplate } from "./types";

export const lineMovementTemplate: FailureModeTemplate = {
  factorKey: "lineMovement",
  severityRank: 2,

  triggerCondition: (snapshot) => {
    const value = snapshot.factors.lineMovement;
    return value !== undefined && value > 0.4;
  },

  generateBullet: (_snapshot, pick, _game) => {
    // Threshold scales with pick kind — totals move differently than spreads.
    const threshold =
      pick.pickKind === "TOTAL" ? "1.5 points" : "2 points";

    return `If sharp money moves the line >${threshold} against us in the next 4 hours, the consensus we saw at publish doesn't hold and we published too early.`;
  },
};
