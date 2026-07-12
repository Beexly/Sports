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
  return stripe.checkout.sessions.create({
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
    // Negative-option-law compliance (FTC ROSCA + state auto-renewal laws): require
    // an affirmative Terms-of-Service acceptance at the point of sale, BEFORE the
    // first recurring charge. Stripe renders the consent checkbox only once the
    // operator sets the Terms-of-Service URL in the Stripe Dashboard
    // (Public business info / Checkout settings) — that's the operator's half; this
    // flag is the code half. The proximate auto-renewal disclosure lives next to the
    // Subscribe CTA (see components/pricing/subscribe-button.tsx).
    consent_collection: { terms_of_service: "required" },
    // Short, honest acceptance line shown beside the ToS consent checkbox (Stripe
    // renders the linked Terms-of-Service on the checkbox itself from the Dashboard
    // URL). This states the recurring/auto-renew nature at the point of sale.
    custom_text: {
      terms_of_service_acceptance: {
        message:
          "I understand this is a recurring subscription that auto-renews at the price and interval shown until I cancel, and I agree to the Terms of Service.",
      },
    },
  });
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
