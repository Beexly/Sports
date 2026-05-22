/**
 * Pre-mortem failure mode: cross-market.
 *
 * Triggers when cross-market signal is a top-3 contributor (factor score > 0.45).
 * Bullet calls out that if alt-line markets disagree more sharply than at
 * publish, we missed something those markets saw.
 */

import type { FailureModeTemplate } from "./types";

export const crossMarketTemplate: FailureModeTemplate = {
  factorKey: "crossMarket",
  severityRank: 5,

  triggerCondition: (snapshot) => {
    const value = snapshot.factors.crossMarket;
    return value !== undefined && value > 0.45;
  },

  generateBullet: (_snapshot, _pick, _game) => {
    return `If the alt-line market — totals, alternate spreads, player props — disagrees more sharply with our pick than it did at publish, we missed something the alt market saw and the primary line we took is the wrong read.`;
  },
};
