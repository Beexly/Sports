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

export function questionableBurstMultiplier(): never {
  throw new KilledClaimError(
    "questionable_burst_haircut",
    "2021 weeks 1–8: Questionable player-games sit +0.6% of their own peak acceleration, p=0.56 vs healthy. The tag is not a burst haircut.",
  );
}

export function blendWinAndClv(): never {
  throw new KilledClaimError(
    "blend_mfp_and_confidence",
    "Win rank is marketFairProb. CLV tag is confidence. Blending them made the test Brier worse (0.251 vs 0.241).",
  );
}

export function singleCopulaFamily(): never {
  throw new KilledClaimError(
    "single_copula_family",
    "No family wins on PIT. QB–WR1 tau is +0.385, QB–TE1 +0.307, QB–RB1 −0.020. The sign is the pairing.",
  );
}

export function nickelSlotSuppression(): never {
  throw new KilledClaimError(
    "nickel_slot_suppression",
    "A slot corner on the field raises slot target share by 6.18 points (p=1.8e-10). Suppression is the wrong sign.",
  );
}

export function ilbTightEndFunnel(): never {
  throw new KilledClaimError(
    "ilb_te_funnel",
    "An ILB being out moves tight-end target share by 0.18 points (p=0.86).",
  );
}

export function offensiveLineTotalPenalty(): never {
  throw new KilledClaimError(
    "ol_penalty_on_totals",
    "The offensive-line penalty on totals is the wrong sign, then null. It does not enter a projected total.",
  );
}

export function bocpdRookieBreakpoint(): never {
  throw new KilledClaimError(
    "bocpd_rookie_breakpoint",
    "A per-player breakpoint beats noise for 27.4% of rookies. Early share does not predict the later gain (r=−0.054).",
  );
}

export function flatKickingEnvelope(points: number): never {
  throw new KilledClaimError(
    "flat_kicking_envelope",
    `Refusing +${points} points. Calm make rates are 0.826 / 0.677 / 0.682 / 0.571 by 40–44 / 45–49 / 50–54 / 55–59. Not a flat add to the total.`,
  );
}

export function rankForWin<T extends { readonly marketFairProb: number }>(rows: readonly T[]): T[] {
  return [...rows].sort((a, b) => b.marketFairProb - a.marketFairProb);
}

/** Confidence is a tag for whether the price moved. It does not change the win rank. */
export function clvTag(confidence: number): number {
  return confidence;
}

/** A feature timestamped after the day-before lock cannot enter the price. */
export function assertKnownByLock(knownAtIso: string, lockIso: string): void {
  const known = Date.parse(knownAtIso);
  const lock = Date.parse(lockIso);
  if (!Number.isFinite(known) || !Number.isFinite(lock)) {
    throw new Error("[FAIL-CLOSED] day-before lock requires two timestamps");
  }
  if (known > lock) {
    throw new Error(`[FAIL-CLOSED] known at ${knownAtIso} is after the lock ${lockIso}`);
  }
}
