import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { db, DurableWriteStoreUnavailableError, requireDurableWriteStore } from "@sports/db";
import { tierFromPriceRef } from "@/lib/billing/price-ids";

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

  // DURABLE DATABASE IS A HARD PRECONDITION for entitlement writes
  // (directive 5.2 / section 14): the stub Prisma client would "record" the
  // event and "sync" the subscription while persisting nothing — silently
  // acking Stripe and losing the entitlement forever. Fail closed with 503:
  // Stripe retries the delivery with backoff, which IS the durable path.
  // Placed after signature verification so only authentic Stripe traffic can
  // observe store health; the guard records the ops incident line.
  try {
    requireDurableWriteStore("stripe-webhook-entitlement");
  } catch (err) {
    if (err instanceof DurableWriteStoreUnavailableError) {
      return NextResponse.json(
        {
          error: "Durable store unavailable; retry delivery",
          code: "durable_write_store_unavailable",
        },
        { status: 503 },
      );
    }
    throw err;
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
      // Reconcile the durable CheckoutAttempt (Phase 1P). Best-effort by
      // design: an unknown attempt id (pre-rollout session, replay, manual
      // Dashboard checkout) is a warn, never a webhook failure — the
      // subscription sync above is the entitlement-critical path.
      await reconcileCheckoutAttempt(session);
      break;
    }

    case "checkout.session.expired": {
      // The Checkout Session lapsed unpaid (Stripe expires them ~24h in, or
      // on explicit expiry). Converge the durable attempt: terminal EXPIRED,
      // active intent key RELEASED (originalClientIntentId is immutable and
      // stays for audit) so the member's next attempt mints a fresh
      // generation + fresh Stripe idempotency key. Never throws: a miss/DB
      // hiccup is picked up durably by the repair job, not a webhook 500.
      const session = event.data.object as Stripe.Checkout.Session;
      await reconcileExpiredCheckoutAttempt(session);
      break;
    }

    case "customer.subscription.created":
    case "customer.subscription.updated": {
      // NEVER sync the embedded snapshot. Stripe does not guarantee delivery
      // order, so a delayed `updated` event can carry an OLDER subscription
      // state (previous tier, stale past_due) and silently regress a member
      // who has since upgraded or recovered. Re-retrieving by id makes every
      // sync converge on Stripe's CURRENT state regardless of arrival order —
      // the same pattern the checkout + invoice handlers already use. A
      // retrieval failure throws → 500 → Stripe retries the event, so we fail
      // closed instead of applying a possibly-stale snapshot.
      const embedded = event.data.object as Stripe.Subscription;
      const subscription = await stripe.subscriptions.retrieve(embedded.id);
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
        //
        // CANCELED is terminal and excluded (adversarial-review finding): Stripe
        // delivers a dunning-cancellation burst UNORDERED, so a late
        // payment_failed can arrive after subscription.deleted. Without this
        // guard it flips a CANCELED row back to PAST_DUE — which grants access —
        // and the subsequent updated-event resurrection guard (which requires
        // existing.status === "CANCELED") no longer matches, restoring paid tier
        // permanently on a subscription that is dead in Stripe.
        await db.$transaction([
          db.subscription.updateMany({
            where: { stripeSubscriptionId: subId, pastDueSince: null, status: { not: "CANCELED" } },
            data: { pastDueSince: new Date() },
          }),
          db.subscription.updateMany({
            where: { stripeSubscriptionId: subId, status: { not: "CANCELED" } },
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

/** OR-lookup for a session's attempt: metadata attempt id and/or session id. */
function attemptLookupsForSession(session: Stripe.Checkout.Session): Record<string, unknown>[] {
  const attemptId = session.metadata?.["checkoutAttemptId"];
  const lookups: Record<string, unknown>[] = [];
  if (attemptId) lookups.push({ id: attemptId });
  if (session.id) lookups.push({ stripeSessionId: session.id });
  return lookups;
}

/**
 * Mark the durable CheckoutAttempt for a completed Checkout Session as
 * COMPLETED and attach the resulting subscription id. Looks the attempt up by
 * the id stamped into session metadata at creation time OR by stripeSessionId
 * — the metadata path also REPAIRS an attempt whose session bind failed (the
 * session id is written here). NEVER throws: attempt reconciliation must not
 * 500 the webhook and trigger a Stripe retry storm — a missed reconcile here
 * is retried DURABLY by the repair job (lib/billing/checkout-attempt-repair),
 * which converges completed-but-sync-lagging attempts from Stripe's state.
 */
async function reconcileCheckoutAttempt(session: Stripe.Checkout.Session): Promise<void> {
  try {
    const attemptId = session.metadata?.["checkoutAttemptId"];
    const lookups = attemptLookupsForSession(session);
    if (lookups.length === 0) return;

    const subscriptionId =
      typeof session.subscription === "string"
        ? session.subscription
        : session.subscription?.id ?? null;

    const updated = await db.checkoutAttempt.updateMany({
      where: { OR: lookups },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        // Repair a failed session bind: completion proves the session's identity.
        ...(session.id ? { stripeSessionId: session.id } : {}),
        ...(subscriptionId ? { stripeSubscriptionId: subscriptionId } : {}),
      },
    });
    if (updated.count === 0) {
      console.warn(
        `[stripe] checkout.session.completed for unknown checkout attempt ` +
          `${attemptId ?? "(none)"} (session ${session.id}) — nothing to reconcile`,
      );
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.warn(
      `[stripe] checkout-attempt reconciliation failed for session ${session.id}: ${message}`,
    );
  }
}

/**
 * Converge the durable CheckoutAttempt for an EXPIRED Checkout Session:
 * status EXPIRED, active intent key released in the SAME update (the
 * immutable originalClientIntentId keeps the audit trail — directive 5.4).
 * Only non-terminal states are touched so a completed attempt can never be
 * regressed by a late expiry event. NEVER throws (same doctrine as
 * reconcileCheckoutAttempt; the repair job is the durable backstop).
 */
async function reconcileExpiredCheckoutAttempt(session: Stripe.Checkout.Session): Promise<void> {
  try {
    const lookups = attemptLookupsForSession(session);
    if (lookups.length === 0) return;

    const updated = await db.checkoutAttempt.updateMany({
      where: {
        OR: lookups,
        status: { in: ["CREATED", "REQUEST_IN_FLIGHT", "SESSION_CREATED", "AMBIGUOUS"] },
      },
      data: {
        status: "EXPIRED",
        activeClientIntentId: null,
        lastErrorKind: "session_expired",
      },
    });
    if (updated.count === 0) {
      console.warn(
        `[stripe] checkout.session.expired for unknown/terminal checkout attempt ` +
          `(session ${session.id}) — nothing to reconcile`,
      );
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.warn(
      `[stripe] checkout-attempt expiry reconciliation failed for session ${session.id}: ${message}`,
    );
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

  // Superseded-subscription guard. There is ONE subscription row per customer
  // (keyed by stripeCustomerId), so an event about ANY of the customer's
  // subscription ids overwrites the whole row. When the row already tracks a
  // DIFFERENT subscription (the member cancelled sub_OLD and resubscribed as
  // sub_NEW), a delayed event for the old id must not clobber the new one —
  // syncing sub_OLD's state over the active sub_NEW row would drag the row back
  // onto the dead subscription and, on sub_OLD's eventual cancel, revoke a
  // paying member's access.
  //
  // A DIFFERENT-id event may ADOPT the row (replace the tracked subscription)
  // ONLY when its authoritative (re-retrieved) status is genuinely CURRENT —
  // ACTIVE or TRIALING — because that is the real resubscribe/upgrade path.
  // PAST_DUE is deliberately EXCLUDED here: a late `updated` for a superseded
  // sub_OLD whose current Stripe state is past_due must NOT adopt the row away
  // from the paying sub_NEW. It "grants access", but it is stale dunning noise
  // from a dead subscription — adopting it would stamp a grace window on sub_OLD
  // and let sub_OLD's later cancel revoke the paying member. Every other
  // non-current status for a different id — PAST_DUE, UNPAID, CANCELED,
  // INCOMPLETE, INCOMPLETE_EXPIRED, PAUSED — is likewise superseded noise and is
  // skipped. Fail-safe: when in doubt, do NOT adopt a different-id, non-active
  // event. Same-id events are unaffected and continue to flow through exactly as
  // before.
  const incomingCanAdoptRow =
    incomingStatus === "ACTIVE" || incomingStatus === "TRIALING";
  if (
    existing &&
    existing.stripeSubscriptionId != null &&
    existing.stripeSubscriptionId !== stripeSubscription.id &&
    !incomingCanAdoptRow
  ) {
    console.warn(
      `[stripe] ignoring ${incomingStatus} event for superseded subscription ` +
        `${stripeSubscription.id} — customer ${customerId}'s row tracks ${existing.stripeSubscriptionId}`,
    );
    return;
  }

  const priceObj = stripeSubscription.items.data[0]?.price;
  const priceId = typeof priceObj === "string" ? priceObj : priceObj?.id;
  const lookupKey = typeof priceObj === "string" ? null : priceObj?.lookup_key ?? null;
  const status = mapStripeStatus(stripeSubscription.status);
  let tier = getTierFromPriceId(priceId, lookupKey);

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
  const isCanceled = status === "CANCELED";

  const updateData = {
    stripeSubscriptionId: stripeSubscription.id,
    stripePriceId: priceId,
    // A CANCELED sync converges on the SAME terminal state the delete handler
    // writes (tier FREE, cancellation stamp preserved-or-set) — a late
    // `updated` event carrying the canceled object must not rewrite the
    // terminal row as a paid-tier record with no cancellation timestamp.
    tier: isCanceled ? ("FREE" as const) : tier,
    status,
    currentPeriodStart: periodStart,
    currentPeriodEnd: periodEnd,
    cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
    trialStart,
    trialEnd,
    // A LIVE sync means this is not a canceled row, so clear any stale
    // cancellation stamp from a prior lifecycle — otherwise a reactivated
    // member reads as active-but-canceled in reporting/churn logic. A
    // CANCELED sync preserves the delete handler's stamp (or sets one when
    // the cancellation arrives via `updated` before/without a delete event).
    canceledAt: isCanceled ? (existing?.canceledAt ?? new Date()) : null,
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

function getTierFromPriceId(
  priceId: string | undefined,
  lookupKey?: string | null,
): "FREE" | "FANTASY" | "PRO" | "ELITE" {
  // Env historical price ids first; then Stripe lookup_key (gse-*-monthly/annual).
  // lookup_key path is required when checkout resolved price without env IDs.
  return tierFromPriceRef(priceId, lookupKey);
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
