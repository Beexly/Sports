/**
 * Pre-mortem failure mode: consensus.
 *
 * Triggers when consensus is a top-3 contributor (factor score > 0.6).
 * Bullet calls out that if consensus drops materially, the edge we caught
 * was a fluke of timing.
 */

import type { FailureModeTemplate } from "./types";

export const consensusTemplate: FailureModeTemplate = {
  factorKey: "consensus",
  severityRank: 3,

  triggerCondition: (snapshot) => {
    const value = snapshot.factors.consensus;
    return value !== undefined && value > 0.6;
  },

  generateBullet: (snapshot, _pick, _game) => {
    const consensus = snapshot.factors.consensus ?? 0;
    const consensusPct = Math.round(consensus * 100);
    const dropThreshold = Math.max(50, consensusPct - 10);

    return `If consensus drops below ${dropThreshold}% before game time, the edge we caught was a timing fluke and not a real market read.`;
  },
};
