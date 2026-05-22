/**
 * Pre-mortem failure mode: depth.
 *
 * Triggers when depth is a top-3 contributor (factor score > 0.55).
 * Bullet calls out that if depth shifts toward the opposing side, the line
 * we caught is no longer the line.
 */

import type { FailureModeTemplate } from "./types";

export const depthTemplate: FailureModeTemplate = {
  factorKey: "depth",
  severityRank: 4,

  triggerCondition: (snapshot) => {
    const value = snapshot.factors.depth;
    return value !== undefined && value > 0.55;
  },

  generateBullet: (snapshot, _pick, _game) => {
    const depth = snapshot.factors.depth ?? 0;
    const depthPct = Math.round(depth * 100);

    return `If depth shifts toward the opposing side and the dollar-weighted balance drops below ${depthPct - 15}%, the line we caught is no longer the line.`;
  },
};
