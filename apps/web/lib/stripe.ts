import Stripe from "stripe";

/**
 * Thrown when a Stripe operation is attempted without STRIPE_SECRET_KEY.
 * Routes catch this and degrade (clear error / 503) instead of the whole
 * module graph crashing at import time.
 */
export class StripeConfigurationError extends Error {
  constructor(
    message = "Stripe is not configured (STRIPE_SECRET_KEY is not set) — billing is unavailable"
  ) {
    super(message);
    this.name = "StripeConfigurationError";
  }
}

let stripeClient: Stripe | null = null;

/** Presence check only — never reads or logs the key value. */
export function isStripeConfigured(): boolean {
  return Boolean(process.env["STRIPE_SECRET_KEY"]);
}

/**
 * Lazy Stripe client. Constructed on first use so a missing
 * STRIPE_SECRET_KEY degrades at call time (StripeConfigurationError →
 * 503 in routes) instead of throwing while this module is imported,
 * which would take down every route that transitively imports it.
 */
export function getStripe(): Stripe {
  if (stripeClient) return stripeClient;
  const secretKey = process.env["STRIPE_SECRET_KEY"];
  if (!secretKey) {
    throw new StripeConfigurationError();
  }
  stripeClient = new Stripe(secretKey, {
    apiVersion: "2024-06-20",
    typescript: true,
  });
  return stripeClient;
}

export const STRIPE_PRICE_IDS = {
  PRO: process.env["STRIPE_PRO_PRICE_ID"]!,
  ELITE: process.env["STRIPE_ELITE_PRICE_ID"]!,
} as const;

export const PRICE_DISPLAY = {
  PRO: { amount: 19, label: "Pro", period: "month" },
  ELITE: { amount: 49, label: "Elite", period: "month" },
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
  const customer = await getStripe().customers.create({
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
  return getStripe().checkout.sessions.create({
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
  return getStripe().billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
}
