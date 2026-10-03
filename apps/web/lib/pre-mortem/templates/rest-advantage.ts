/**
 * Pre-mortem failure mode: rest advantage.
 *
 * Triggers when rest advantage is a top-3 contributor (factor score > 0.65).
 * Highest severity — rest advantage is one of the most-cited factor signals
 * and one of the most common late-injury upset modes.
 */

import type { FailureModeTemplate } from "./types";

export const restAdvantageTemplate: FailureModeTemplate = {
  factorKey: "restAdvantage",
  severityRank: 1,

  triggerCondition: (snapshot) => {
    const value = snapshot.factors.restAdvantage;
    return value !== undefined && value > 0.65;
  },

  generateBullet: (_snapshot, _pick, game) => {
    return `If rest advantage flips (${game.homeTeamShort} catches a same-day travel issue, or ${game.awayTeamShort}'s fatigue projection updates downward, or a late starter scratch reshuffles the picture), our edge on this pick evaporates.`;
  },
};
