import type Stripe from "stripe";

export type SubscriptionTier = "FREE" | "PRO" | "ELITE";
export type MappedStatus = "ACTIVE" | "TRIALING" | "PAST_DUE" | "CANCELED" | "INCOMPLETE" | "PAUSED";

/**
 * Resolve subscription tier from a Stripe price ID.
 *
 * Checks all price ID env vars (monthly, annual, and the legacy single-interval
 * STRIPE_*_PRICE_ID) so that any valid price maps to its tier. Unknown IDs and
 * undefined fall back to FREE.
 */
export function getTierFromPriceId(priceId: string | undefined): SubscriptionTier {
  if (!priceId) return "FREE";
  const eliteIds = [
    process.env["STRIPE_ELITE_MONTHLY_PRICE_ID"],
    process.env["STRIPE_ELITE_ANNUAL_PRICE_ID"],
    process.env["STRIPE_ELITE_PRICE_ID"],
  ];
  const proIds = [
    process.env["STRIPE_PRO_MONTHLY_PRICE_ID"],
    process.env["STRIPE_PRO_ANNUAL_PRICE_ID"],
    process.env["STRIPE_PRO_PRICE_ID"],
  ];
  if (eliteIds.includes(priceId)) return "ELITE";
  if (proIds.includes(priceId)) return "PRO";
  return "FREE";
}

/** Map a Stripe subscription status string to our internal status enum. */
export function mapStripeStatus(status: Stripe.Subscription.Status): MappedStatus {
  switch (status) {
    case "active":
      return "ACTIVE";
    case "trialing":
      return "TRIALING";
    case "past_due":
      return "PAST_DUE";
    case "canceled":
    case "incomplete_expired":
      return "CANCELED";
    case "incomplete":
      return "INCOMPLETE";
    case "paused":
      return "PAUSED";
    case "unpaid":
      return "PAST_DUE";
    default:
      return "ACTIVE";
  }
}
