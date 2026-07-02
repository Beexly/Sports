/**
 * Pre-mortem failure mode: data quality.
 *
 * Triggers when data quality is a top-3 contributor — meaning the pick
 * survived gating with non-trivial reliance on data freshness or coverage.
 * This is a "we published right at the edge" failure mode.
 *
 * Note: usually data quality is a GATE, not a factor in a published pick.
 * If it shows up as a top-3 contributor in a published pick, that's a yellow
 * flag worth surfacing.
 */

import type { FailureModeTemplate } from "./types";

export const dataQualityTemplate: FailureModeTemplate = {
  factorKey: "dataQuality",
  severityRank: 6,

  triggerCondition: (snapshot) => {
    const value = snapshot.factors.dataQuality;
    // Only fires when data quality is a top contributor (factor > 0.5) —
    // typically only happens when the pick is borderline on evidence.
    return value !== undefined && value > 0.5 && value < 0.85;
  },

  generateBullet: (_snapshot, _pick, _game) => {
    return `If data quality drops below grade B between publish and game time (a feed lag, a missing late update, or a source quality flag), we should be considered to have published prematurely.`;
  },
};
