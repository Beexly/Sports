/**
 * Stats API entitlement map — Stripe product tiers → API surfaces.
 *
 * Stripe (live Galaxy Sports Network):
 *  - FREE (no sub) → public_api only
 *  - FANTASY (prod Fantasy) → public_api only for stats-api (fantasy suite is separate)
 *  - PRO (gse-pro) → public_api + pro_api
 *  - ELITE (gse-elite) → public_api + pro_api + elite_api
 *
 * Dark / internal_only never leave the server regardless of tier.
 */

import type { PublicSurface } from "./rights.js";
import type { MetricDef } from "./catalog-types.js";

export type BillingTier = "FREE" | "FANTASY" | "PRO" | "ELITE";

/** Surfaces a tier may read definitions + values for. */
export function surfacesForTier(tier: BillingTier): readonly PublicSurface[] {
  switch (tier) {
    case "ELITE":
      return ["public_api", "pro_api", "elite_api"];
    case "PRO":
      return ["public_api", "pro_api"];
    case "FANTASY":
    case "FREE":
    default:
      return ["public_api"];
  }
}

export function metricVisibleToTier(metric: MetricDef, tier: BillingTier): boolean {
  if (!metric.publicApi) return false; // dark/blocked always refuse
  return (surfacesForTier(tier) as readonly string[]).includes(metric.rights.surface);
}

export function parseBillingTier(raw: string | null | undefined): BillingTier {
  const t = (raw ?? "FREE").toUpperCase();
  if (t === "PRO" || t === "ELITE" || t === "FANTASY" || t === "FREE") return t;
  return "FREE";
}

export function filterMetricsForTier(
  metrics: readonly MetricDef[],
  tier: BillingTier,
): MetricDef[] {
  return metrics.filter((m) => metricVisibleToTier(m, tier));
}

/** Stripe product metadata.tier values observed live. */
export const STRIPE_PRODUCT_TIER_MAP = {
  FANTASY: "prod_Ur6RIZ0AzmKKiT",
  ELITE: "prod_Ud980MnXT07nOv",
  PRO: "prod_Ud95br56Qtsfiq",
} as const;

export function entitlementSummary(tier: BillingTier) {
  return {
    tier,
    surfaces: surfacesForTier(tier),
    stripeProducts: STRIPE_PRODUCT_TIER_MAP,
    law: [
      "dark metrics refuse for all tiers",
      "FANTASY does not unlock pro/elite stats surfaces",
      "LIVE_BOARD still founder-gated independent of tier",
    ],
  };
}
