import Stripe from "stripe";
import { getCurrentPricingPhase, type BillingInterval } from "@/lib/pricing/pricing-phases";

export type { BillingInterval };

export const stripe = new Stripe(process.env["STRIPE_SECRET_KEY"]!, {
  apiVersion: "2024-06-20",
  typescript: true,
});

// Stripe price IDs per tier × billing interval. The operator creates these prices
// in Stripe (test mode) and wires the env vars. The dollar amounts shown to users
// are NEVER hardcoded here — they derive from the current pricing phase
// (pricing-phases.ts), the single source of truth, so display and intent can't drift.
// The monthly interval falls back to the LEGACY single-interval vars
// (STRIPE_PRO_PRICE_ID / STRIPE_ELITE_PRICE_ID) that the env template + CLAUDE.md
// historically documented, mirroring the webhook's getTierFromPriceId tolerance.
// Without this, an operator who provisioned prod from the documented legacy vars
// would leave the _MONTHLY_ vars empty and every checkout would 503.
export const STRIPE_PRICE_IDS = {
  PRO: {
    month:
      process.env["STRIPE_PRO_MONTHLY_PRICE_ID"] ??
      process.env["STRIPE_PRO_PRICE_ID"] ??
      "",
    year: process.env["STRIPE_PRO_ANNUAL_PRICE_ID"] ?? "",
  },
  ELITE: {
    month:
      process.env["STRIPE_ELITE_MONTHLY_PRICE_ID"] ??
      process.env["STRIPE_ELITE_PRICE_ID"] ??
      "",
    year: process.env["STRIPE_ELITE_ANNUAL_PRICE_ID"] ?? "",
  },
} as const;

/** Resolve the Stripe price ID for a tier + billing interval. */
export function getStripePriceId(tier: "PRO" | "ELITE", interval: BillingInterval): string {
  return STRIPE_PRICE_IDS[tier][interval];
}

// Display prices derive from the current pricing phase (Founding by default).
// Advancing PRICING_PHASE re-prices every public surface at once.
const currentPhase = getCurrentPricingPhase();
export const PRICE_DISPLAY = {
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

  // Create new Stripe customer
  const customer = await stripe.customers.create({
    email,
    name: name ?? undefined,
    metadata: { userId },
  });

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
