/**
 * Stripe price-id resolution — the grandfathering-safe layer.
 *
 * Stripe Price objects are immutable: to charge new members a higher phase rate,
 * the operator creates a NEW Price and repoints the env var. But existing members
 * keep their ORIGINAL price id forever (that IS how "founding rate locked for life"
 * is enforced). So webhook tier-recognition must map EVERY price id a tier has ever
 * used — not just the current one — or a grandfathered member's renewal would map to
 * an unknown price → FREE → silent downgrade (the exact H1 landmine).
 *
 * Mechanism: each STRIPE_*_PRICE_ID env var may hold a COMMA-SEPARATED list. The
 * FIRST entry is the current price (what checkout charges new members); ALL entries
 * are recognized when classifying an existing subscription's price id. Advancing a
 * phase = prepend the new id, keep the old ones.
 *
 * Lookup keys: when env price IDs are empty, checkout may resolve Stripe prices by
 * stable lookup_key (gse-fantasy-monthly, etc.). Env IDs remain preferred when set.
 *
 * Pure + env-injectable → fully unit-tested without Stripe or a live env.
 */

export type PaidTier = "FANTASY" | "PRO" | "ELITE";
export type ResolvedTier = "FREE" | PaidTier;
export type BillingInterval = "month" | "year";

type Env = Record<string, string | undefined>;

/**
 * Stable Stripe Price.lookup_key values for GSE paid tiers.
 * Operators attach these in the Stripe Dashboard; checkout resolves by key when
 * STRIPE_*_PRICE_ID envs are missing (fewer Vercel env landmines).
 */
export const STRIPE_LOOKUP_KEYS: Record<
  PaidTier,
  Record<BillingInterval, string>
> = {
  FANTASY: {
    month: "gse-fantasy-monthly",
    year: "gse-fantasy-annual",
  },
  PRO: {
    month: "gse-pro-monthly",
    year: "gse-pro-annual",
  },
  ELITE: {
    month: "gse-elite-monthly",
    year: "gse-elite-annual",
  },
} as const;

/** Lookup key for a tier × interval (for Stripe prices.list). */
export function stripeLookupKeyFor(
  tier: PaidTier,
  interval: BillingInterval,
): string {
  return STRIPE_LOOKUP_KEYS[tier][interval];
}

/** Split a comma-separated price-id env value into trimmed, non-empty ids. */
export function splitPriceIds(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/** The CURRENT price id (first entry) for checkout, with a legacy-var fallback chain. */
export function currentPriceId(...rawValues: Array<string | undefined>): string {
  for (const raw of rawValues) {
    const ids = splitPriceIds(raw);
    if (ids.length > 0) return ids[0]!;
  }
  return "";
}

/** Every price id (current + historical) configured for a tier, across all its env vars. */
function allTierPriceIds(env: Env, ...keys: string[]): string[] {
  return keys.flatMap((k) => splitPriceIds(env[k]));
}

const TIER_ENV_KEYS: Record<PaidTier, readonly string[]> = {
  ELITE: ["STRIPE_ELITE_MONTHLY_PRICE_ID", "STRIPE_ELITE_ANNUAL_PRICE_ID", "STRIPE_ELITE_PRICE_ID"],
  PRO: ["STRIPE_PRO_MONTHLY_PRICE_ID", "STRIPE_PRO_ANNUAL_PRICE_ID", "STRIPE_PRO_PRICE_ID"],
  FANTASY: ["STRIPE_FANTASY_MONTHLY_PRICE_ID", "STRIPE_FANTASY_ANNUAL_PRICE_ID"],
};

/**
 * Classify a subscription's price id to its tier, recognizing historical ids so a
 * grandfathered member is never mis-mapped to FREE on a phase advance. Returns FREE
 * for an empty or genuinely unknown id (the caller decides whether that unknown id
 * on a PAID subscription should downgrade — see the webhook's defensive guard).
 */
export function tierForPriceId(priceId: string | undefined, env: Env = process.env): ResolvedTier {
  if (!priceId) return "FREE";
  // Order matters: ELITE before PRO before FANTASY (highest entitlement wins if an
  // operator ever double-lists an id, which would itself be a misconfiguration).
  for (const tier of ["ELITE", "PRO", "FANTASY"] as const) {
    if (allTierPriceIds(env, ...TIER_ENV_KEYS[tier]).includes(priceId)) return tier;
  }
  return "FREE";
}

/** The current checkout price id for a tier + interval (first/current entry only). */
export function checkoutPriceId(tier: PaidTier, interval: BillingInterval, env: Env = process.env): string {
  if (tier === "PRO") {
    return interval === "month"
      ? currentPriceId(env["STRIPE_PRO_MONTHLY_PRICE_ID"], env["STRIPE_PRO_PRICE_ID"])
      : currentPriceId(env["STRIPE_PRO_ANNUAL_PRICE_ID"]);
  }
  if (tier === "ELITE") {
    return interval === "month"
      ? currentPriceId(env["STRIPE_ELITE_MONTHLY_PRICE_ID"], env["STRIPE_ELITE_PRICE_ID"])
      : currentPriceId(env["STRIPE_ELITE_ANNUAL_PRICE_ID"]);
  }
  return interval === "month"
    ? currentPriceId(env["STRIPE_FANTASY_MONTHLY_PRICE_ID"])
    : currentPriceId(env["STRIPE_FANTASY_ANNUAL_PRICE_ID"]);
}
