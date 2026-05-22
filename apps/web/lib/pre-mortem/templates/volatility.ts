/**
 * Pre-mortem failure mode: volatility.
 *
 * Triggers when volatility is a top-3 contributor (factor score > 0.5) — note
 * that high volatility usually GATES a pick rather than publishing it; if the
 * factor is in a published pick's top-3 contributors, that's a flag worth
 * surfacing in the pre-mortem.
 */

import type { FailureModeTemplate } from "./types";

export const volatilityTemplate: FailureModeTemplate = {
  factorKey: "volatility",
  severityRank: 5,

  triggerCondition: (snapshot) => {
    const value = snapshot.factors.volatility;
    return value !== undefined && value > 0.5;
  },

  generateBullet: (_snapshot, _pick, _game) => {
    return `If volatility spikes — this market normally moves under a certain band and is now moving outside it — our read is unstable and the publish was on the edge.`;
  },
};
