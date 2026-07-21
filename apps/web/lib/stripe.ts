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

/** A per-intent checkout-attempt token: a UUID the caller mints once per user
 * checkout intent and reuses only when retrying that same intent. */
const CHECKOUT_ATTEMPT_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class CheckoutAttemptIdError extends Error {
  readonly code = "INVALID_CHECKOUT_ATTEMPT_ID" as const;
  constructor() {
    super("checkoutAttemptId must be a UUID minted once per checkout intent.");
    this.name = "CheckoutAttemptIdError";
  }
}

/**
 * Create a Stripe Checkout Session for subscription upgrade.
 *
 * Idempotency is keyed on a per-intent `checkoutAttemptId` (a UUID the caller
 * mints once per user checkout intent), NOT on user+price. Stripe replays the
 * response for a repeated idempotency key within its 24h window, so a key that
 * is stable per (user, price) — as an earlier draft used — is wrong two ways:
 *   1. It REPLAYS a stale Checkout Session when the user legitimately starts a
 *      new checkout for the same plan within 24h (e.g. abandoned the first).
 *   2. It COLLAPSES two genuinely distinct purchase intents (e.g. resubscribe
 *      after cancellation) into one, hiding the second from Stripe.
 * A fresh per-intent id fixes both while still deduping a true retry of the
 * SAME intent (same id → Stripe safely returns the same session, no double
 * charge). userId is folded into the key so two users can never collide even
 * if a client supplies a duplicate id.
 */
export async function createCheckoutSession({
  customerId,
  priceId,
  userId,
  successUrl,
  cancelUrl,
  checkoutAttemptId,
}: {
  customerId: string;
  priceId: string;
  userId: string;
  successUrl: string;
  cancelUrl: string;
  checkoutAttemptId: string;
}): Promise<Stripe.Checkout.Session> {
  if (!CHECKOUT_ATTEMPT_ID_PATTERN.test(checkoutAttemptId)) {
    throw new CheckoutAttemptIdError();
  }
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

  return stripe.checkout.sessions.create(params, {
    idempotencyKey: `gse-checkout-${userId}-${checkoutAttemptId}`,
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
