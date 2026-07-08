import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { db } from "@sports/db";
import { tierForPriceId } from "@/lib/billing/price-ids";

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
    // Don't echo verifier internals (timestamp/signing detail) back to the caller.
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
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
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`Error handling Stripe event ${event.type}: ${message}`);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }

  // Record the processed event. A concurrent delivery of the SAME event id can land
  // between the findUnique check above and here → a unique-constraint violation on
  // stripeEventId is benign (the event is handled, and the syncs are idempotent), so
  // ack 200 rather than 500-ing into a Stripe retry storm at launch traffic.
  try {
    await db.webhookEvent.create({
      data: {
        stripeEventId: event.id,
        type: event.type,
        payload: JSON.parse(JSON.stringify(event)),
      },
    });
  } catch (err) {
    if (isStripeEventIdConflict(err)) {
      return NextResponse.json({ received: true, skipped: true });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`Failed to record Stripe event ${event.id}: ${message}`);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

/** True only for a Prisma P2002 unique-constraint violation on the stripeEventId column. */
function isStripeEventIdConflict(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { code?: unknown; meta?: { target?: unknown } };
  if (e.code !== "P2002") return false;
  const target = e.meta?.target;
  if (Array.isArray(target)) return target.includes("stripeEventId");
  if (typeof target === "string") return target.includes("stripeEventId");
  return true; // P2002 with no target detail — the only unique key on this table is stripeEventId
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
          // Clear the dunning anchor — a canceled row is no longer past-due.
          pastDueSince: null,
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

    case "invoice.payment_action_required": {
      // Payment needs customer action (3D Secure / card challenge).
      // Re-sync so the DB reflects Stripe's status (past_due/incomplete)
      // — the grace window and the dashboard billing banner take over
      // from there, pointing the member at the billing portal.
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
        const subId = invoice.subscription as string;
        // Atomic: stamp the first-failure anchor (only where null — retries must
        // not slide the grace window entitlements compute from pastDueSince) AND
        // set PAST_DUE together, so a crash between them can't leave a member
        // past-due-but-still-ACTIVE.
        await db.$transaction([
          db.subscription.updateMany({
            where: { stripeSubscriptionId: subId, pastDueSince: null },
            data: { pastDueSince: new Date() },
          }),
          db.subscription.updateMany({
            where: { stripeSubscriptionId: subId },
            data: { status: "PAST_DUE" },
          }),
        ]);
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

  // Out-of-order guard. `customer.subscription.deleted` is TERMINAL, but Stripe does not
  // guarantee delivery order — a delayed `customer.subscription.updated` carrying an older
  // active snapshot can arrive AFTER the delete. Never let it resurrect a subscription we
  // have already recorded as cancelled-by-delete (same id) — that would re-grant premium
  // for free. A genuine resubscribe is a new subscription id (and/or comes via checkout),
  // so it is unaffected.
  const incomingStatus = mapStripeStatus(stripeSubscription.status);
  // One read of the existing row, reused by the out-of-order guard AND the
  // defensive no-downgrade guard below.
  const existing = await db.subscription
    .findUnique({
      where: { stripeCustomerId: customerId },
      select: { status: true, canceledAt: true, stripeSubscriptionId: true, tier: true },
    })
    .catch(() => null);

  if (incomingStatus !== "CANCELED") {
    if (
      existing &&
      existing.status === "CANCELED" &&
      existing.canceledAt != null &&
      existing.stripeSubscriptionId === stripeSubscription.id
    ) {
      console.warn(
        `[stripe] ignoring out-of-order reactivation of cancelled subscription ${stripeSubscription.id} for customer ${customerId}`,
      );
      return;
    }
  }

  const priceId = stripeSubscription.items.data[0]?.price.id;
  const status = mapStripeStatus(stripeSubscription.status);
  let tier = getTierFromPriceId(priceId);

  // Defensive no-downgrade guard (grandfathering safety net). If a NON-EMPTY price
  // id maps to no configured tier (an operator repointed a STRIPE_*_PRICE_ID and
  // dropped the historical id), do NOT downgrade a currently-paid member to FREE —
  // that would silently revoke a grandfathered subscriber's access on renewal.
  // Retain their recorded paid tier and alert. Only applies to access-granting
  // statuses; a genuinely canceled/incomplete sub still resolves to FREE normally.
  const statusGrantsAccess = status === "ACTIVE" || status === "TRIALING" || status === "PAST_DUE";
  const existingIsPaid = existing?.tier === "PRO" || existing?.tier === "ELITE" || existing?.tier === "FANTASY";
  if (tier === "FREE" && priceId && statusGrantsAccess && existingIsPaid) {
    console.error(
      `[stripe] unmapped priceId ${priceId} on an active PAID subscription — retaining tier ` +
        `${existing!.tier} instead of downgrading to FREE. Add this historical price id to the ` +
        "matching STRIPE_*_PRICE_ID (comma-separated) so grandfathered members keep access.",
    );
    tier = existing!.tier as "FANTASY" | "PRO" | "ELITE";
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

  const isPastDue = status === "PAST_DUE";

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
    // A live sync (created/updated/payment) means this is not a deleted row, so
    // clear any stale cancellation stamp from a prior lifecycle — otherwise a
    // reactivated member reads as active-but-canceled in reporting/churn logic.
    // (canceledAt is only stamped by customer.subscription.deleted.)
    canceledAt: null,
    // Recovery clears the grace anchor. While PAST_DUE the existing
    // first-failure stamp is preserved (and backfilled below if a sync
    // arrives before any invoice.payment_failed event).
    ...(isPastDue ? {} : { pastDueSince: null }),
  };

  if (isPastDue) {
    await db.subscription.updateMany({
      where: { stripeCustomerId: customerId, pastDueSince: null },
      data: { pastDueSince: new Date() },
    });
  }

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
        ...(isPastDue ? { pastDueSince: new Date() } : {}),
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

function getTierFromPriceId(priceId: string | undefined): "FREE" | "FANTASY" | "PRO" | "ELITE" {
  // Recognizes CURRENT and HISTORICAL price ids (comma-separated env values) so a
  // grandfathered member's original price id still maps to their paid tier after a
  // phase advance. A non-empty-but-unmapped id resolving to FREE is logged by the
  // caller's defensive guard (it has the subscription's paid/active context).
  return tierForPriceId(priceId);
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
      // Fail CLOSED. Stripe's status set is closed and fully handled above, so
      // this only fires if Stripe introduces a new status — in which case the
      // safe default for a billing gate is "no entitlement granted", never the
      // access-granting ACTIVE.
      return "INCOMPLETE";
  }
}
