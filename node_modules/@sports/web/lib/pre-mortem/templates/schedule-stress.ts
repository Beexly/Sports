/**
 * Pre-mortem failure mode: schedule stress.
 *
 * Triggers when schedule stress is a top-3 contributor (factor score > 0.6).
 * Bullet calls out that if our read on a team's schedule density was wrong —
 * back-to-backs, travel, density of recent games — the line we took is too
 * steep for the actual fatigue picture.
 */

import type { FailureModeTemplate } from "./types";

export const scheduleStressTemplate: FailureModeTemplate = {
  factorKey: "scheduleStress",
  severityRank: 2,

  triggerCondition: (snapshot) => {
    const value = snapshot.factors.scheduleStress;
    return value !== undefined && value > 0.6;
  },

  generateBullet: (_snapshot, pick, game) => {
    // Identify which side we're picking — if we're picking the team with
    // the rest advantage, the failure mode is "they're more fatigued than
    // we read." If picking the team against the rest advantage, the failure
    // mode is "their density was lower than we read."
    const sideRef = pick.side === "HOME" ? game.homeTeamShort : game.awayTeamShort;

    return `If schedule density on ${sideRef} misread (they may be more fatigued than the factor reads after a late-night travel or roster-cycling situation), the line we took is too steep.`;
  },
};
