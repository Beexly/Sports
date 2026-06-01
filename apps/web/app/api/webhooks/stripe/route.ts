import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { db } from "@sports/db";

// IMPORTANT: This route must receive the raw body for Stripe signature verification.
// Next.js App Router does not parse the body automatically for route handlers.

export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env["STRIPE_WEBHOOK_SECRET"]!
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`Stripe webhook signature verification failed: ${message}`);
    return NextResponse.json({ error: `Webhook error: ${message}` }, { status: 400 });
  }

  // Idempotency: skip already-processed events
  const alreadyProcessed = await db.webhookEvent.findUnique({
    where: { stripeEventId: event.id },
  });
  if (alreadyProcessed) {
    return NextResponse.json({ received: true, skipped: true });
  }

  try {
    await handleStripeEvent(event);

    // Record processed event
    await db.webhookEvent.create({
      data: {
        stripeEventId: event.id,
        type: event.type,
        payload: JSON.parse(JSON.stringify(event)),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`Error handling Stripe event ${event.type}: ${message}`);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function handleStripeEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed": {
      // Fires when a user completes checkout. The subscription record may not
      // have the subscriptionId yet — retrieve and sync it now.
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.subscription) {
        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string
        );
        await syncSubscription(subscription);
      }
      break;
    }

    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      await syncSubscription(subscription);
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      await db.subscription.updateMany({
        where: { stripeSubscriptionId: subscription.id },
        data: {
          status: "CANCELED",
          tier: "FREE",
          canceledAt: new Date(),
        },
      });
      break;
    }

    case "invoice.payment_succeeded": {
      const invoice = event.data.object as Stripe.Invoice;
      if (invoice.subscription) {
        const subscription = await stripe.subscriptions.retrieve(
          invoice.subscription as string
        );
        await syncSubscription(subscription);
      }
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      if (invoice.subscription) {
        await db.subscription.updateMany({
          where: { stripeSubscriptionId: invoice.subscription as string },
          data: { status: "PAST_DUE" },
        });
      }
      break;
    }

    default:
      // Unhandled event type — ignore
      break;
  }
}

async function syncSubscription(stripeSubscription: Stripe.Subscription): Promise<void> {
  const customerId =
    typeof stripeSubscription.customer === "string"
      ? stripeSubscription.customer
      : stripeSubscription.customer.id;

  const price = stripeSubscription.items.data[0]?.price;
  const priceId = price?.id;
  const resolvedTier = resolveTierFromPrice(price);
  const status = mapStripeStatus(stripeSubscription.status);

  // Never strip paid entitlements just because a subscription sits on a price
  // we can't positively identify (e.g. a legacy price created before the
  // metadata.tier convention, or after the env IDs were rotated to a new
  // ladder). Preserve the customer's current tier in that case — genuine
  // cancellations arrive via customer.subscription.deleted, handled above.
  let tier: "FREE" | "PRO" | "ELITE" | "VIP";
  if (resolvedTier) {
    tier = resolvedTier;
  } else {
    const existing = await db.subscription.findUnique({
      where: { stripeCustomerId: customerId },
      select: { tier: true },
    });
    tier = existing?.tier ?? "FREE";
    console.warn(
      `[stripe] syncSubscription: unrecognized price ${priceId ?? "(none)"} for customer ${customerId}; preserving tier=${tier}`
    );
  }

  const periodStart = stripeSubscription.current_period_start
    ? new Date(stripeSubscription.current_period_start * 1000)
    : null;
  const periodEnd = stripeSubscription.current_period_end
    ? new Date(stripeSubscription.current_period_end * 1000)
    : null;
  const trialStart = stripeSubscription.trial_start
    ? new Date(stripeSubscription.trial_start * 1000)
    : null;
  const trialEnd = stripeSubscription.trial_end
    ? new Date(stripeSubscription.trial_end * 1000)
    : null;

  const updateData = {
    stripeSubscriptionId: stripeSubscription.id,
    stripePriceId: priceId,
    tier,
    status,
    currentPeriodStart: periodStart,
    currentPeriodEnd: periodEnd,
    cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
    trialStart,
    trialEnd,
  };

  // userId is embedded in subscription metadata during checkout session creation
  const userId = stripeSubscription.metadata?.["userId"];

  if (userId) {
    // Upsert by stripeCustomerId — safe even if the subscription record was
    // created by getOrCreateStripeCustomer (update path) or is brand new (create path)
    await db.subscription.upsert({
      where: { stripeCustomerId: customerId },
      create: {
        userId,
        stripeCustomerId: customerId,
        ...updateData,
      },
      update: updateData,
    });
  } else {
    // No userId in metadata — fall back to updateMany (handles legacy records)
    const updated = await db.subscription.updateMany({
      where: { stripeCustomerId: customerId },
      data: updateData,
    });
    if (updated.count === 0) {
      console.warn(`[stripe] syncSubscription: no subscription record for customer ${customerId} — subscription ${stripeSubscription.id} not synced`);
    }
  }
}

/**
 * Resolve the subscription tier from a Stripe price, preferring durable
 * metadata over environment configuration so the mapping survives a price
 * rotation:
 *   1. price.metadata.tier — set on every price we create
 *      (scripts/seed-stripe-prices.mjs). Durable; rotation-proof.
 *   2. env-var price-ID match — the currently-configured ladder.
 * Returns null when the price can't be positively identified, so the caller
 * can preserve an existing paid subscriber rather than downgrade to FREE.
 */
function resolveTierFromPrice(
  price: Stripe.Price | undefined
): "PRO" | "ELITE" | "VIP" | null {
  const meta = price?.metadata?.["tier"]?.toUpperCase();
  if (meta === "PRO" || meta === "ELITE" || meta === "VIP") return meta;

  const id = price?.id;
  if (id && id === process.env["STRIPE_VIP_PRICE_ID"]) return "VIP";
  if (id && id === process.env["STRIPE_ELITE_PRICE_ID"]) return "ELITE";
  if (id && id === process.env["STRIPE_PRO_PRICE_ID"]) return "PRO";
  return null;
}

function mapStripeStatus(
  status: Stripe.Subscription.Status
): "ACTIVE" | "TRIALING" | "PAST_DUE" | "CANCELED" | "INCOMPLETE" | "PAUSED" {
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
