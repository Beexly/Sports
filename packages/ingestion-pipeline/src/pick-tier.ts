/**
 * Lane C — pick tier fail-closed resolution.
 *
 * Schema default is `@default(FREE)` on Pick.tier. Route patches that filter
 * `tier: FREE` for bare B2B keys are useless if the generation pipeline ever
 * stamps a high-confidence pick as FREE — the premium confidence + factor
 * breakdown would still be stored FREE and leak to every key.
 *
 * This helper is the ONLY place that decides stored tier. Persistence paths
 * MUST call it rather than trusting a possibly-missing pick.tier.
 */
import type { PickTier } from "@sports/types";

/** Must match packages/prediction-engine/src/constants.ts PREMIUM_CONFIDENCE_THRESHOLD. */
export const PREMIUM_CONFIDENCE_THRESHOLD = 70;

export type TierStampablePick = {
  readonly confidence?: number | null;
  readonly tier?: PickTier | string | null;
};

/**
 * Fail-closed tier stamp.
 * PREMIUM when confidence is at/above the threshold OR the engine already
 * said PREMIUM. Missing/non-finite confidence never upgrades to PREMIUM.
 */
export function resolveStoredPickTier(pick: TierStampablePick): PickTier {
  const engineTier =
    typeof pick.tier === "string" ? pick.tier.trim().toUpperCase() : "";
  if (engineTier === "PREMIUM") return "PREMIUM";
  const confidence = Number(pick.confidence);
  if (Number.isFinite(confidence) && confidence >= PREMIUM_CONFIDENCE_THRESHOLD) {
    return "PREMIUM";
  }
  return "FREE";
}

/** True when a bare (free-scope) B2B key must not see this row. */
export function isPremiumPickRow(pick: TierStampablePick): boolean {
  return resolveStoredPickTier(pick) === "PREMIUM";
}
