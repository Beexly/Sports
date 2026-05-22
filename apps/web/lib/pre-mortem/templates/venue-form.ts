/**
 * Pre-mortem failure mode: venue form.
 *
 * Triggers when venue form is a top-3 contributor (factor score > 0.6).
 * Bullet calls out the small-sample-size risk specific to venue-form reads —
 * if the sample is shallow, we may have overweighted this factor.
 */

import type { FailureModeTemplate } from "./types";

export const venueFormTemplate: FailureModeTemplate = {
  factorKey: "venueForm",
  severityRank: 4,

  triggerCondition: (snapshot) => {
    const value = snapshot.factors.venueForm;
    return value !== undefined && value > 0.6;
  },

  generateBullet: (_snapshot, _pick, _game) => {
    return `If the venue-form signal is weaker than the sample size suggests — fewer than 8 recent meaningful games at this venue, or distribution skewed by one outlier — we overweighted this factor.`;
  },
};
