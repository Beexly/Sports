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

  generateBullet: (_snapshot, _pick, _game) => {
    // NOTE: snapshot.factors.consensus is a factor CONTRIBUTION score in [0,1],
    // not the share of the market/books on our side. Do not multiply it by 100
    // and present it as a market-consensus percentage — that fabricates a stat
    // we never measured. State the failure mode qualitatively instead, mirroring
    // volatility.ts / cross-market.ts.
    return `If book consensus softens materially before game time (noticeably fewer books landing on our side than when we published), the edge we caught was a timing fluke and not a real market read.`;
  },
};
