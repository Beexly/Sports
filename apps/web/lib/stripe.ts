import Stripe from "stripe";

// Lazy Stripe client. Instantiating Stripe eagerly at module load crashes the
// entire app if STRIPE_SECRET_KEY isn't set, even on routes that don't touch
// Stripe (admin dashboard, picks, etc). This proxy defers construction until
// the first actual call site — that call site is always a subscription or
// webhook route, so if the key is missing the failure is routed there with
// a clean error instead of a startup crash.
class StripeNotConfiguredError extends Error {
  constructor() {
    super(
      "Stripe is not configured. Set STRIPE_SECRET_KEY in .env to enable billing."
    );
    this.name = "StripeNotConfiguredError";
  }
}

let _stripe: Stripe | null = null;
function getStripe(): Stripe {
  if (_stripe) return _stripe;
  const key = process.env["STRIPE_SECRET_KEY"];
  if (!key) throw new StripeNotConfiguredError();
  _stripe = new Stripe(key, { apiVersion: "2024-06-20", typescript: true });
  return _stripe;
}

// Proxy keeps the existing `import { stripe }` call sites working transparently.
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    const client = getStripe();
    const value = (client as unknown as Record<string | symbol, unknown>)[prop];
    return typeof value === "function"
      ? (value as (...args: unknown[]) => unknown).bind(client)
      : value;
  },
});

export const STRIPE_PRICE_IDS = {
  get PRO() {
    return process.env["STRIPE_PRO_PRICE_ID"] ?? "";
  },
  get ELITE() {
    return process.env["STRIPE_ELITE_PRICE_ID"] ?? "";
  },
} as const;

export const PRICE_DISPLAY = {
  PRO: { amount: 9.99, label: "Pro", period: "week" },
  ELITE: { amount: 13.99, label: "Elite", period: "week" },
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
