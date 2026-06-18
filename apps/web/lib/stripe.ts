import Stripe from "stripe";
import {
  getCurrentPricingPhase,
  getNewSubscriberRates,
  type BillingInterval,
} from "@/lib/pricing/pricing-phases";

export type { BillingInterval };

// Reference getCurrentPricingPhase so the phase ladder stays wired here even
// though display now derives from getNewSubscriberRates (which itself reads the
// FOUNDING phase by default). Keeps the proof-gated phase as the founding floor.
void getCurrentPricingPhase;

export const stripe = new Stripe(process.env["STRIPE_SECRET_KEY"]!, {
  apiVersion: "2024-06-20",
  typescript: true,
});

// Stripe price IDs per tier × billing interval. The operator creates these prices
// in Stripe (test mode) and wires the env vars. The dollar amounts shown to users
// are NEVER hardcoded here — they derive from the current pricing phase
// (pricing-phases.ts), the single source of truth, so display and intent can't drift.
export const STRIPE_PRICE_IDS = {
  PRO: {
    month: process.env["STRIPE_PRO_MONTHLY_PRICE_ID"] ?? "",
    year: process.env["STRIPE_PRO_ANNUAL_PRICE_ID"] ?? "",
  },
  ELITE: {
    month: process.env["STRIPE_ELITE_MONTHLY_PRICE_ID"] ?? "",
    year: process.env["STRIPE_ELITE_ANNUAL_PRICE_ID"] ?? "",
  },
  // Founding Desk beta — a separate introductory product; env var must be set
  // by the operator in Stripe before the CTA activates. Absent env → "" →
  // checkout route returns a clean 503, never a fake session.
  FOUNDING_DESK: {
    month: process.env["STRIPE_FOUNDING_DESK_MONTHLY_PRICE_ID"] ?? "",
    year: process.env["STRIPE_FOUNDING_DESK_ANNUAL_PRICE_ID"] ?? "",
  },
} as const;

// Apex add-on price IDs — the per-pick and 5-pack one-time purchases that sit
// ABOVE Elite (not a recurring tier). Operator creates these prices in Stripe and
// wires the env vars; empty string until then.
export const STRIPE_APEX_PRICE_IDS = {
  perPick: process.env["STRIPE_APEX_PERPICK_PRICE_ID"] ?? "",
  fivePack: process.env["STRIPE_APEX_5PACK_PRICE_ID"] ?? "",
} as const;

/** Resolve the Stripe price ID for a tier + billing interval. */
export function getStripePriceId(
  tier: "PRO" | "ELITE" | "FOUNDING_DESK",
  interval: BillingInterval,
): string {
  return STRIPE_PRICE_IDS[tier][interval];
}

/** Resolve the Stripe price ID for an Apex add-on purchase. */
export function getApexPriceId(kind: "perPick" | "fivePack"): string {
  return STRIPE_APEX_PRICE_IDS[kind];
}

// Display prices derive from the rates a NEW subscriber is quoted — the live
// FOUNDING phase by default, or STANDARD_RATES once the owner flips PRICING_MODE.
// One flip re-prices every public surface at once; grandfathered subscribers keep
// their Stripe price regardless.
const newSubscriberRates = getNewSubscriberRates();
export const PRICE_DISPLAY = {
  PRO: { monthly: newSubscriberRates.pro.monthly, annual: newSubscriberRates.pro.annual, label: "Pro" },
  ELITE: { monthly: newSubscriberRates.elite.monthly, annual: newSubscriberRates.elite.annual, label: "Elite" },
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
