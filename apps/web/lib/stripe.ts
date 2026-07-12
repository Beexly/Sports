import Stripe from "stripe";
import { getCurrentPricingPhase, type BillingInterval } from "@/lib/pricing/pricing-phases";
import { checkoutPriceId, currentPriceId } from "@/lib/billing/price-ids";

export type { BillingInterval };

export const stripe = new Stripe(process.env["STRIPE_SECRET_KEY"]!, {
  apiVersion: "2024-06-20",
  typescript: true,
});

// Stripe price IDs per tier × billing interval. The operator creates these prices
// in Stripe and wires the env vars. The dollar amounts shown to users are NEVER
// hardcoded here — they derive from the current pricing phase (pricing-phases.ts),
// the single source of truth, so display and intent can't drift.
//
// Each env var may hold a COMMA-SEPARATED list of price ids: the FIRST is the
// current price (what new checkouts charge); older entries stay so a grandfathered
// member's price id is still RECOGNIZED by the webhook (see lib/billing/price-ids.ts).
// The monthly interval also falls back to the LEGACY single-interval vars
// (STRIPE_PRO_PRICE_ID / STRIPE_ELITE_PRICE_ID) so an operator who provisioned prod
// from the documented legacy vars isn't left with empty _MONTHLY_ vars → 503.
export const STRIPE_PRICE_IDS = {
  PRO: {
    month: currentPriceId(process.env["STRIPE_PRO_MONTHLY_PRICE_ID"], process.env["STRIPE_PRO_PRICE_ID"]),
    year: currentPriceId(process.env["STRIPE_PRO_ANNUAL_PRICE_ID"]),
  },
  ELITE: {
    month: currentPriceId(process.env["STRIPE_ELITE_MONTHLY_PRICE_ID"], process.env["STRIPE_ELITE_PRICE_ID"]),
    year: currentPriceId(process.env["STRIPE_ELITE_ANNUAL_PRICE_ID"]),
  },
  FANTASY: {
    month: currentPriceId(process.env["STRIPE_FANTASY_MONTHLY_PRICE_ID"]),
    year: currentPriceId(process.env["STRIPE_FANTASY_ANNUAL_PRICE_ID"]),
  },
} as const;

/** Resolve the CURRENT Stripe price ID for a tier + billing interval (for checkout). */
export function getStripePriceId(tier: "FANTASY" | "PRO" | "ELITE", interval: BillingInterval): string {
  return checkoutPriceId(tier, interval);
}

// Display prices derive from the current pricing phase (Founding by default).
// Advancing PRICING_PHASE re-prices every public surface at once.
const currentPhase = getCurrentPricingPhase();
export const PRICE_DISPLAY = {
  FANTASY: { monthly: currentPhase.fantasy.monthly, annual: currentPhase.fantasy.annual, label: "Fantasy" },
  PRO: { monthly: currentPhase.pro.monthly, annual: currentPhase.pro.annual, label: "Pro" },
  ELITE: { monthly: currentPhase.elite.monthly, annual: currentPhase.elite.annual, label: "Elite" },
} as const;

/**
 * Get or create a Stripe customer for a user.
 * Always checks the database first to avoid duplicates.
 */
export async function getOrCreateStripeCustomer(
  userId: string,
  email: string,
  name?: string | null
): Promise<string> {
  const { db } = await import("@sports/db");

  // Check if customer already exists
  const existing = await db.subscription.findUnique({
    where: { userId },
    select: { stripeCustomerId: true },
  });

  if (existing?.stripeCustomerId) {
    return existing.stripeCustomerId;
  }

  // Create new Stripe customer. The idempotency key (keyed on userId) makes two
  // concurrent first-checkouts (double-click / two tabs) return the SAME customer
  // instead of minting duplicates — a duplicate customer can strand a paid user
  // (webhook upsert keyed on stripeCustomerId misses, sync fails, charged-but-
  // not-entitled). Stripe replays the first result for a repeated key.
  const customer = await stripe.customers.create(
    {
      email,
      name: name ?? undefined,
      metadata: { userId },
    },
    { idempotencyKey: `gse-customer-${userId}` },
  );

  // Upsert subscription record with customer ID
  await db.subscription.upsert({
    where: { userId },
    create: {
      userId,
      stripeCustomerId: customer.id,
      tier: "FREE",
      status: "ACTIVE",
    },
    update: {
      stripeCustomerId: customer.id,
    },
  });

  return customer.id;
}

/**
 * Create a Stripe Checkout Session for subscription upgrade.
 */
export async function createCheckoutSession({
  customerId,
  priceId,
  userId,
  successUrl,
  cancelUrl,
}: {
  customerId: string;
  priceId: string;
  userId: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<Stripe.Checkout.Session> {
  const params: Stripe.Checkout.SessionCreateParams = {
    customer: customerId,
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    mode: "subscription",
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { userId },
    subscription_data: {
      metadata: { userId },
    },
    // Honest recurring-billing line rendered NEAR THE SUBMIT BUTTON on the
    // Stripe-hosted page. Unlike custom_text.terms_of_service_acceptance (removed),
    // custom_text.submit does NOT replace Stripe's default ToS-acceptance copy, so
    // the linked Terms-of-Service checkbox text stays intact. It needs no Dashboard
    // configuration, so it is always safe to send. The proximate auto-renewal
    // disclosure also lives next to the Subscribe CTA in our own UI (see
    // components/pricing/subscribe-button.tsx).
    custom_text: {
      submit: {
        message:
          "You're starting a recurring subscription that auto-renews at the price and interval shown until you cancel. Cancel anytime.",
      },
    },
  };

  // Point-of-sale Terms-of-Service consent (FTC ROSCA + state auto-renewal laws).
  // OPT-IN, DEFAULT OFF. Stripe REJECTS the Checkout Session (→ generic 500) when
  // consent_collection.terms_of_service is "required" but the account has no public
  // Terms-of-Service URL configured in the Stripe Dashboard (Public business info /
  // Checkout settings). To avoid breaking every checkout on deploy, this is gated
  // behind STRIPE_TERMS_CONSENT_ENABLED: the owner sets the Dashboard Terms URL
  // FIRST, THEN flips this flag to "true". When the flag is not "true" we omit
  // consent_collection entirely, so checkout behaves exactly as it did before.
  if (process.env["STRIPE_TERMS_CONSENT_ENABLED"] === "true") {
    params.consent_collection = { terms_of_service: "required" };
  }

  return stripe.checkout.sessions.create(params);
}

/**
 * Create a Stripe Customer Portal session for managing subscriptions.
 */
export async function createPortalSession(
  customerId: string,
  returnUrl: string
): Promise<Stripe.BillingPortal.Session> {
  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
}
