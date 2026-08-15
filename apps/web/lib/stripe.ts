import Stripe from "stripe";
import { getCurrentPricingPhase, type BillingInterval } from "@/lib/pricing/pricing-phases";
import {
  checkoutPriceId,
  currentPriceId,
  stripeLookupKeyFor,
  type PaidTier,
} from "@/lib/billing/price-ids";
import {
  CheckoutAttemptIdError,
  isValidCheckoutAttemptId,
  stripeIdempotencyKeyForAttempt,
} from "@/lib/billing/checkout-attempt";
import {
  repairUnresolvedCheckoutAttempts,
  type CheckoutAttemptRepairDb,
  type CheckoutAttemptRepairReport,
  type CheckoutSessionLookup,
  type RepairSessionView,
} from "@/lib/billing/checkout-attempt-repair";

export type { BillingInterval };

/**
 * Typed, fail-closed error for any Stripe operation attempted without a
 * configured secret key. Thrown by `getStripe()` (the explicit entry point) so
 * a misconfigured deploy surfaces as a typed guard — never as an opaque SDK
 * error or, worse, a crash at module import time.
 */
export class StripeConfigError extends Error {
  readonly name = "StripeConfigError" as const;
  constructor(public readonly capability: string) {
    super(
      `Stripe is not configured for "${capability}" (STRIPE_SECRET_KEY is missing or blank)`,
    );
  }
}

/** The effective Stripe secret key, trimmed and blank-checked. */
function getStripeSecretKey(): string | null {
  const raw = process.env["STRIPE_SECRET_KEY"];
  const trimmed = typeof raw === "string" ? raw.trim() : "";
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Lazily construct + cache the Stripe client. Throws the typed `StripeConfigError`
 * when STRIPE_SECRET_KEY is missing or blank — so a caller that opts into this
 * entry point fails CLOSED at the call site with a recognizable error instead of
 * throwing at import time or producing an opaque SDK error mid-request.
 */
export function getStripe(): Stripe {
  const key = getStripeSecretKey();
  if (!key) {
    throw new StripeConfigError("stripe");
  }
  if (!stripeClientCache) {
    stripeClientCache = new Stripe(key, {
      apiVersion: "2024-06-20",
      typescript: true,
    });
  }
  return stripeClientCache;
}

let stripeClientCache: Stripe | null = null;

/**
 * Backwards-compatible `stripe` export with DEFERRED construction. The client is
 * built on first property access (and cached thereafter) instead of at module
 * import — so this module NEVER constructs a Stripe client (and never throws)
 * at import time, even when STRIPE_SECRET_KEY is absent. This is what makes the
 * checkout + webhook routes boot-safe on a misconfigured deploy: import succeeds,
 * and any Stripe call then fails closed with the typed StripeConfigError via
 * `getStripe()` rather than crashing the route handler's module load.
 *
 * Property access is proxied to the real (lazily-built) client with correct
 * `this` binding, so `stripe.webhooks.constructEvent(...)`, `stripe.customers.*`,
 * `stripe.checkout.sessions.*`, etc. all keep their current signatures.
 */
export const stripe: Stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    // Fail CLOSED: if STRIPE_SECRET_KEY is missing or blank, throw the typed
    // StripeConfigError at property-access time so the backwards-compatible
    // `stripe.*` export surfaces a recognizable error at the call site instead
    // of silently constructing a client with an empty key (which would produce
    // an opaque SDK error mid-request, or worse, crash at import time).
    if (!stripeClientCache) {
      const key = getStripeSecretKey();
      if (!key) throw new StripeConfigError("stripe");
      stripeClientCache = new Stripe(key, {
        apiVersion: "2024-06-20",
        typescript: true,
      });
    }
    const client = stripeClientCache;
    const value = client[prop as keyof Stripe];
    if (typeof value === "function") return value.bind(client);
    return value;
  },
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

/** Resolve the CURRENT Stripe price ID for a tier + billing interval (env only, sync). */
export function getStripePriceId(tier: "FANTASY" | "PRO" | "ELITE", interval: BillingInterval): string {
  return checkoutPriceId(tier, interval);
}

/**
 * Resolve checkout price: prefer env STRIPE_*_PRICE_ID, else Stripe lookup_key.
 * Fail-closed empty string if neither env nor an active price with the key exists.
 */
export async function resolveCheckoutPriceId(
  tier: PaidTier,
  interval: BillingInterval,
  env: NodeJS.ProcessEnv = process.env,
): Promise<string> {
  const fromEnv = checkoutPriceId(tier, interval, env);
  if (fromEnv) return fromEnv;

  if (!process.env["STRIPE_SECRET_KEY"]) {
    return "";
  }

  const lookupKey = stripeLookupKeyFor(tier, interval);
  try {
    const listed = await stripe.prices.list({
      lookup_keys: [lookupKey],
      active: true,
      limit: 1,
    });
    const price = listed.data[0];
    return price?.id ?? "";
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    console.error(
      `[checkout] lookup_key resolve failed for ${lookupKey}: ${message}`,
    );
    return "";
  }
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
 *
 * Requires a DURABLE checkout-attempt id (see lib/billing/checkout-attempt.ts):
 *  - it derives the Stripe idempotency key, so an unknown-network-outcome
 *    retry against the same attempt replays the SAME session instead of
 *    minting a duplicate;
 *  - it is stamped into BOTH session metadata and subscription_data.metadata,
 *    so the checkout.session.completed webhook can reconcile the attempt row.
 * A malformed attempt id is a typed CheckoutAttemptIdError (programmer /
 * caller error), never a silent tokenless session.
 */
export async function createCheckoutSession({
  customerId,
  priceId,
  userId,
  attemptId,
  successUrl,
  cancelUrl,
}: {
  customerId: string;
  priceId: string;
  userId: string;
  attemptId: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<Stripe.Checkout.Session> {
  if (typeof attemptId !== "string" || !isValidCheckoutAttemptId(attemptId)) {
    throw new CheckoutAttemptIdError(
      "createCheckoutSession requires a valid durable checkout-attempt id (ca_<uuid>).",
    );
  }
  const params: Stripe.Checkout.SessionCreateParams = {
    customer: customerId,
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    mode: "subscription",
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { userId, checkoutAttemptId: attemptId },
    subscription_data: {
      metadata: { userId, checkoutAttemptId: attemptId },
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

  // Durable idempotency: the key derives from (userId, attemptId) — stable
  // across reloads/devices — so within Stripe's ~24h window a retried attempt
  // replays the ORIGINAL session instead of creating a second one.
  return stripe.checkout.sessions.create(params, {
    idempotencyKey: stripeIdempotencyKeyForAttempt(userId, attemptId),
  });
}

/**
 * Best-effort retrieval of an attempt's existing Checkout Session URL for an
 * idempotent retry. Returns the URL only while the session is still OPEN
 * (completed/expired sessions have nothing safe to redirect to); returns null
 * on any error so the caller falls through to the idempotent create path.
 */
export async function retrieveOpenCheckoutSessionUrl(
  sessionId: string,
): Promise<string | null> {
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.status === "open" && session.url) return session.url;
    return null;
  } catch {
    return null;
  }
}

/**
 * Stripe lookup adapter for the checkout-attempt repair job (directive 5.6).
 * `listSessionsByCustomerSince` paginates the customer's Checkout Sessions to
 * EXHAUSTION down to the cutoff — completeness is what lets the repair job
 * treat "no session found" as proof of absence. `retrieveSession` maps a
 * definitive resource_missing to null; every other failure throws so the
 * repair job leaves the attempt unresolved (fail closed) for the next pass.
 */
export function stripeCheckoutSessionLookup(): CheckoutSessionLookup {
  const toView = (session: Stripe.Checkout.Session): RepairSessionView => ({
    id: session.id,
    status: session.status ?? "open",
    metadataAttemptId: session.metadata?.["checkoutAttemptId"] ?? null,
    subscriptionId:
      typeof session.subscription === "string"
        ? session.subscription
        : session.subscription?.id ?? null,
  });

  return {
    async listSessionsByCustomerSince(customerId, since) {
      const sinceEpoch = Math.floor(since.getTime() / 1000);
      const views: RepairSessionView[] = [];
      let startingAfter: string | undefined;
      // Stripe lists sessions newest-first; stop once a page dips below the
      // cutoff. Hard page cap guards against a pathological account.
      for (let page = 0; page < 20; page++) {
        const batch = await stripe.checkout.sessions.list({
          customer: customerId,
          limit: 100,
          ...(startingAfter ? { starting_after: startingAfter } : {}),
        });
        let reachedCutoff = false;
        for (const session of batch.data) {
          if (session.created < sinceEpoch) {
            reachedCutoff = true;
            break;
          }
          views.push(toView(session));
        }
        if (reachedCutoff || !batch.has_more || batch.data.length === 0) return views;
        startingAfter = batch.data[batch.data.length - 1]!.id;
      }
      throw new Error(
        `checkout-session listing for customer did not terminate within the page cap`,
      );
    },
    async retrieveSession(sessionId) {
      try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        return toView(session);
      } catch (err) {
        const code = (err as { code?: unknown }).code;
        if (code === "resource_missing") return null;
        throw err;
      }
    },
  };
}

/**
 * Production entrypoint for the checkout-attempt repair job (directive 5.3 /
 * 5.6). Invoked on a schedule by the cron route
 * `/api/cron/repair-checkout-attempts` (declared in `vercel.json`) and
 * callable server-side by an operator. Fails closed via the durable-write
 * guard before touching Stripe. Unresolved ambiguity is surfaced to the
 * DURABLE owner queue (deduplicated CockpitTask review items), not just logs.
 */
export async function runCheckoutAttemptRepair(): Promise<CheckoutAttemptRepairReport> {
  const { db, requireDurableWriteStore } = await import("@sports/db");
  requireDurableWriteStore("stripe-checkout");
  const { cockpitCheckoutRepairOwnerQueue } = await import(
    "@/lib/billing/checkout-repair-owner-queue"
  );
  return repairUnresolvedCheckoutAttempts({
    db: db as unknown as CheckoutAttemptRepairDb,
    stripeSessions: stripeCheckoutSessionLookup(),
    ownerQueue: cockpitCheckoutRepairOwnerQueue(db) ?? undefined,
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
