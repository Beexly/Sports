/**
 * Claims measured and killed on 2026-10-23. These are not features.
 * A caller that tries to promote one throws. Do not soften the gates.
 */

export class KilledClaimError extends Error {
  readonly feature: string;
  constructor(feature: string, reason: string) {
    super(`[KILLED] ${feature}: ${reason}`);
    this.name = "KilledClaimError";
    this.feature = feature;
  }
}

/** Cycle 3. Cell map survived. Defence-level fingerprint did not. */
export const SCHEME_FINGERPRINT = {
  verdict: "KILLED" as const,
  partialRho: 0.032,
  permutationP: 0.81,
  baselineSeparationRho: 0.408,
};

/** Cycle 4. James-Stein λ collapsed to 0. Not a rating. */
export const RED_ZONE_TD_RATE = {
  verdict: "KILLED" as const,
  offensePersistenceR: 0.081,
  defensePersistenceR: -0.047,
  partialR: -0.024,
  partialP: 0.83,
  shrinkageLambda: 0,
};

/** Cycle 2 endgame. Leading by 1–8 inside 5:00, regular season, n=550. */
export const FOUR_MINUTE_RUN_RATE = 0.422;

export function schemeFingerprintDefenceScore(): never {
  throw new KilledClaimError(
    "scheme_fingerprint_defence_predictor",
    `partial ρ ${SCHEME_FINGERPRINT.partialRho}, p ${SCHEME_FINGERPRINT.permutationP}. Baseline separation (ρ ${SCHEME_FINGERPRINT.baselineSeparationRho}) is the persistent trait.`,
  );
}

export function redZoneTotalMultiplier(
  scope: "cross-season-rating" | "current-season-market-shape",
): number {
  if (scope === "cross-season-rating") {
    throw new KilledClaimError(
      "red_zone_td_rate_cross_season_rating",
      `offense r ${RED_ZONE_TD_RATE.offensePersistenceR}, defense r ${RED_ZONE_TD_RATE.defensePersistenceR}, λ ${RED_ZONE_TD_RATE.shrinkageLambda}. Current-season only, and not as a rating.`,
    );
  }
  return 1;
}

export function fourMinuteRunPrior(claimedRunRate: number): number {
  if (claimedRunRate > 0.5) {
    throw new KilledClaimError(
      "four_minute_run_heavy_prior",
      `measured run rate is ${FOUR_MINUTE_RUN_RATE} on 550 segments. A prior above 0.5 is the narrative, not the sample.`,
    );
  }
  return FOUR_MINUTE_RUN_RATE;
}
