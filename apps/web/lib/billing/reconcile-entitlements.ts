/**
 * Stripe → DB entitlement reconciliation backstop (self-healing).
 *
 * The Stripe webhook (`app/api/webhooks/stripe/route.ts`) is the primary — and,
 * until this module, the ONLY — writer of subscription entitlement. A single
 * missed or 500-ing webhook delivery (we saw real `customer.subscription.created`
 * 500s in production) strands a paying customer with no access and no automatic
 * recovery. This module reconciles authoritative Stripe state back into the DB on
 * a schedule (cron) and on demand (post-checkout landing).
 *
 * DESIGN INVARIANTS (do not weaken):
 *   1. FAIL-SAFE. We only ever act on POSITIVELY-confirmed Stripe state. On any
 *      Stripe API error or ambiguous status we REVOKE NOTHING — we log the
 *      discrepancy and continue. A transient list/retrieve failure must never
 *      cascade into a false downgrade.
 *   2. NEVER GRANT WITHOUT PROOF. Access is only granted when Stripe reports a
 *      live access-granting subscription (active/trialing/past_due) whose price
 *      id maps to a paid tier.
 *   3. IDEMPOTENT. When the DB already matches Stripe, no write happens.
 *
 * REUSE (this module intentionally edits NOTHING in the webhook route):
 *   - customer → user lookup: same as the webhook — `subscription.metadata.userId`,
 *     falling back to the existing DB row (both keyed on `stripeCustomerId`).
 *   - price-id → tier map: `tierForPriceId` from `lib/billing/price-ids` (the
 *     grandfathering-safe, historical-id-aware classifier). NOT hardcoded here.
 *   - the tier-write shape mirrors the webhook's `syncSubscription` upsert, but is
 *     a dedicated reconcile-side implementation (the webhook's is private to the
 *     route) so this module never imports/mutates the in-flight webhook code.
 *
 * Server-side only. Secrets come from env by NAME (STRIPE_SECRET_KEY, via the
 * shared `stripe` client). Never logs or embeds secret values.
 */

import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { db } from "@sports/db";
import { tierForPriceId, type PaidTier } from "@/lib/billing/price-ids";

/** Stripe statuses that grant entitlement in this platform (mirrors entitlements.ts). */
const ACCESS_GRANTING_STRIPE_STATUSES = ["active", "trialing", "past_due"] as const;
type GrantingStripeStatus = (typeof ACCESS_GRANTING_STRIPE_STATUSES)[number];

/** DB status a positively-confirmed granting Stripe status maps to. */
type GrantingDbStatus = "ACTIVE" | "TRIALING" | "PAST_DUE";

export interface ReconcileSummary {
  /** Subscriptions/rows examined across both phases. */
  checked: number;
  /** Rows brought UP to their confirmed paid tier (missed/failed webhook recovery). */
  granted: number;
  /** Rows dropped to FREE after POSITIVE confirmation Stripe no longer grants access. */
  downgraded: number;
  /** Count of Stripe/DB errors encountered. Nonzero ⇒ some checks were skipped fail-safe. */
  errors: number;
  /**
   * Whether the authoritative active-set list was fully retrieved. When false, the
   * downgrade phase is SKIPPED entirely — an incomplete active set must never be
   * treated as evidence a subscription is gone.
   */
  listReliable: boolean;
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function customerIdOf(subscription: Stripe.Subscription): string {
  return typeof subscription.customer === "string"
    ? subscription.customer
    : subscription.customer.id;
}

function isAccessGrantingStatus(status: Stripe.Subscription.Status): status is GrantingStripeStatus {
  return status === "active" || status === "trialing" || status === "past_due";
}

/** Only called for statuses already confirmed access-granting. */
function mapGrantingStatus(status: GrantingStripeStatus): GrantingDbStatus {
  if (status === "trialing") return "TRIALING";
  if (status === "past_due") return "PAST_DUE";
  return "ACTIVE";
}

/** True only for a Stripe "the subscription does not exist" error (positive absence). */
function isResourceMissing(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { code?: unknown; statusCode?: unknown };
  return e.code === "resource_missing" || e.statusCode === 404;
}

/**
 * Write the confirmed paid tier for a subscription. Mirrors the webhook's
 * `syncSubscription` upsert semantics (keyed on `stripeCustomerId`) but is a
 * dedicated reconcile-side write so the webhook route is left untouched.
 */
async function upsertGrant(
  subscription: Stripe.Subscription,
  userId: string,
  tier: PaidTier,
): Promise<void> {
  const customerId = customerIdOf(subscription);
  const priceId = subscription.items.data[0]?.price.id;
  const status = mapGrantingStatus(subscription.status as GrantingStripeStatus);
  const isPastDue = status === "PAST_DUE";

  const periodStart = subscription.current_period_start
    ? new Date(subscription.current_period_start * 1000)
    : null;
  const periodEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000)
    : null;
  const trialStart = subscription.trial_start ? new Date(subscription.trial_start * 1000) : null;
  const trialEnd = subscription.trial_end ? new Date(subscription.trial_end * 1000) : null;

  const base = {
    stripeSubscriptionId: subscription.id,
    stripePriceId: priceId,
    tier,
    status,
    currentPeriodStart: periodStart,
    currentPeriodEnd: periodEnd,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    trialStart,
    trialEnd,
    // A confirmed live sync means this is not a deleted row — clear any stale
    // cancellation stamp so a recovered member doesn't read as active-but-canceled.
    canceledAt: null,
    // Recovery clears the grace anchor; while PAST_DUE we preserve any existing
    // first-failure stamp (and backfill via updateMany below if missing).
    ...(isPastDue ? {} : { pastDueSince: null }),
  };

  await db.subscription.upsert({
    where: { stripeCustomerId: customerId },
    create: {
      userId,
      stripeCustomerId: customerId,
      ...base,
      ...(isPastDue ? { pastDueSince: new Date() } : {}),
    },
    update: base,
  });

  if (isPastDue) {
    // Stamp the grace anchor only where absent so retries can't slide the window.
    await db.subscription.updateMany({
      where: { stripeCustomerId: customerId, pastDueSince: null },
      data: { pastDueSince: new Date() },
    });
  }
}

/**
 * Bring one positively-confirmed active Stripe subscription into the DB.
 * Returns "granted" when a write happened, "noop" when already in sync (or the
 * price is unmapped — never downgraded here), "error" when the user is unresolvable.
 */
async function reconcileConfirmedSubscription(
  subscription: Stripe.Subscription,
): Promise<"granted" | "noop" | "error"> {
  const customerId = customerIdOf(subscription);
  const priceId = subscription.items.data[0]?.price.id;
  const intendedTier = tierForPriceId(priceId);

  if (intendedTier === "FREE") {
    // Live Stripe subscription whose price maps to no paid tier — an unmapped or
    // repointed price id (the grandfathering landmine). NEVER downgrade here and
    // NEVER grant FREE; surface it so the operator adds the historical price id to
    // the matching STRIPE_*_PRICE_ID. Treated as a no-op for the DB.
    if (priceId) {
      console.error(
        `[reconcile] active subscription ${subscription.id} has unmapped price ${priceId} — ` +
          "cannot classify a tier; leaving the DB unchanged. Add this historical price id to the " +
          "matching STRIPE_*_PRICE_ID so grandfathered members are recognized.",
      );
    }
    return "noop";
  }

  const existing = await db.subscription
    .findUnique({
      where: { stripeCustomerId: customerId },
      select: { userId: true, tier: true, status: true, stripeSubscriptionId: true },
    })
    .catch(() => null);

  const dbStatus = mapGrantingStatus(subscription.status as GrantingStripeStatus);

  // Idempotent: already in sync ⇒ no write.
  if (
    existing &&
    existing.tier === intendedTier &&
    existing.status === dbStatus &&
    existing.stripeSubscriptionId === subscription.id
  ) {
    return "noop";
  }

  const userId = subscription.metadata?.["userId"] ?? existing?.userId;
  if (!userId) {
    console.error(
      `[reconcile] cannot resolve a user for active subscription ${subscription.id} ` +
        `(customer ${customerId}) — no metadata userId and no existing DB row; skipping grant.`,
    );
    return "error";
  }

  await upsertGrant(subscription, userId, intendedTier);
  return "granted";
}

/** Paginate every access-granting subscription for one status. `ok=false` on any error. */
async function listGrantingSubscriptions(
  status: GrantingStripeStatus,
): Promise<{ subscriptions: Stripe.Subscription[]; ok: boolean }> {
  const subscriptions: Stripe.Subscription[] = [];
  let startingAfter: string | undefined;

  try {
    for (;;) {
      const params: Stripe.SubscriptionListParams = { status, limit: 100 };
      if (startingAfter) params.starting_after = startingAfter;

      const page = await stripe.subscriptions.list(params);
      subscriptions.push(...page.data);

      const last = page.data[page.data.length - 1];
      if (!page.has_more || !last) break;
      startingAfter = last.id;
    }
    return { subscriptions, ok: true };
  } catch (err) {
    console.error(
      `[reconcile] stripe.subscriptions.list(status=${status}) failed: ${errorMessage(err)}`,
    );
    return { subscriptions: [], ok: false };
  }
}

/**
 * Downgrade DB rows that still claim a paid tier but whose subscription Stripe no
 * longer grants. FAIL-SAFE: a row absent from the confirmed active-set is NOT
 * enough — we positively re-confirm the specific subscription with Stripe and only
 * revoke on a TERMINAL status (canceled / incomplete_expired) or a confirmed
 * absence. Any transient/ambiguous outcome revokes nothing.
 */
async function downgradeStaleRows(
  confirmedCustomerIds: ReadonlySet<string>,
  confirmedSubscriptionIds: ReadonlySet<string>,
): Promise<{ downgraded: number; errors: number; checked: number }> {
  let downgraded = 0;
  let errors = 0;
  let checked = 0;

  let paidRows: Array<{
    id: string;
    stripeCustomerId: string;
    stripeSubscriptionId: string | null;
    tier: string;
  }>;
  try {
    paidRows = await db.subscription.findMany({
      where: {
        tier: { in: ["PRO", "ELITE", "FANTASY"] },
        status: { in: ["ACTIVE", "TRIALING", "PAST_DUE"] },
      },
      select: { id: true, stripeCustomerId: true, stripeSubscriptionId: true, tier: true },
    });
  } catch (err) {
    console.error(`[reconcile] failed to load paid DB rows for downgrade check: ${errorMessage(err)}`);
    return { downgraded: 0, errors: 1, checked: 0 };
  }

  for (const row of paidRows) {
    checked++;

    // Confirmed active in this run ⇒ definitely keep access.
    if (confirmedCustomerIds.has(row.stripeCustomerId)) continue;
    if (row.stripeSubscriptionId && confirmedSubscriptionIds.has(row.stripeSubscriptionId)) continue;

    // Not in the confirmed active-set. We must POSITIVELY confirm before revoking.
    if (!row.stripeSubscriptionId) {
      console.error(
        `[reconcile] paid DB row ${row.id} (customer ${row.stripeCustomerId}) has no ` +
          "stripeSubscriptionId — cannot positively confirm Stripe state; NOT revoking.",
      );
      continue;
    }

    let confirmedGone = false;
    try {
      const remote = await stripe.subscriptions.retrieve(row.stripeSubscriptionId);
      if (isAccessGrantingStatus(remote.status)) {
        // The list simply missed it (pagination/race) — it is still active. Don't revoke.
        continue;
      }
      if (remote.status === "canceled" || remote.status === "incomplete_expired") {
        confirmedGone = true;
      } else {
        // incomplete / paused / unpaid — recoverable or ambiguous. Fail-safe: keep.
        console.warn(
          `[reconcile] subscription ${row.stripeSubscriptionId} is in ambiguous status ` +
            `${remote.status}; NOT revoking (fail-safe).`,
        );
        continue;
      }
    } catch (err) {
      if (isResourceMissing(err)) {
        // Stripe positively reports the subscription does not exist ⇒ safe to revoke.
        confirmedGone = true;
      } else {
        errors++;
        console.error(
          `[reconcile] could not confirm subscription ${row.stripeSubscriptionId} — transient ` +
            `error; NOT revoking (fail-safe): ${errorMessage(err)}`,
        );
        continue;
      }
    }

    if (confirmedGone) {
      try {
        await db.subscription.update({
          where: { id: row.id },
          data: { tier: "FREE", status: "CANCELED", canceledAt: new Date(), pastDueSince: null },
        });
        downgraded++;
      } catch (err) {
        errors++;
        console.error(`[reconcile] failed to downgrade row ${row.id}: ${errorMessage(err)}`);
      }
    }
  }

  return { downgraded, errors, checked };
}

/**
 * Reconcile ALL Stripe subscriptions against the DB. Grants missed upgrades and,
 * only on positive confirmation, downgrades stale paid rows. Never throws — every
 * failure is counted and reported so a caller (cron) can surface it without a retry
 * storm.
 */
export async function reconcileEntitlements(): Promise<ReconcileSummary> {
  const confirmedCustomerIds = new Set<string>();
  const confirmedSubscriptionIds = new Set<string>();
  const confirmedSubscriptions: Stripe.Subscription[] = [];

  let listReliable = true;
  let errors = 0;

  // Phase 1 — pull the authoritative access-granting set from Stripe.
  for (const status of ACCESS_GRANTING_STRIPE_STATUSES) {
    const { subscriptions, ok } = await listGrantingSubscriptions(status);
    if (!ok) {
      // An incomplete active-set means we can no longer safely infer absence.
      listReliable = false;
      errors++;
      continue;
    }
    for (const subscription of subscriptions) {
      confirmedCustomerIds.add(customerIdOf(subscription));
      confirmedSubscriptionIds.add(subscription.id);
      confirmedSubscriptions.push(subscription);
    }
  }

  let checked = 0;
  let granted = 0;

  // Phase 2 — GRANT: bring the DB up to each confirmed active subscription.
  for (const subscription of confirmedSubscriptions) {
    checked++;
    let outcome: "granted" | "noop" | "error";
    try {
      outcome = await reconcileConfirmedSubscription(subscription);
    } catch (err) {
      errors++;
      console.error(
        `[reconcile] grant sync failed for subscription ${subscription.id}: ${errorMessage(err)}`,
      );
      continue;
    }
    if (outcome === "granted") granted++;
    else if (outcome === "error") errors++;
  }

  // Phase 3 — DOWNGRADE: only when the active-set is trustworthy. Skipping this
  // when a list call failed is the core fail-safe: never revoke on partial state.
  let downgraded = 0;
  if (listReliable) {
    const result = await downgradeStaleRows(confirmedCustomerIds, confirmedSubscriptionIds);
    downgraded = result.downgraded;
    errors += result.errors;
    checked += result.checked;
  }

  return { checked, granted, downgraded, errors, listReliable };
}

/**
 * On-demand, single-user reconcile for the post-checkout landing (`/dashboard?
 * upgraded=true`). Confirms the user's live Stripe subscription and grants
 * immediately so access is instant even if the webhook is slow or failed.
 *
 * STRICTLY confirm-or-grant: it NEVER revokes (the success page must never strand
 * a buyer) and NEVER throws (a Stripe hiccup must not break the dashboard render).
 */
export async function reconcileUserEntitlement(userId: string): Promise<void> {
  try {
    const row = await db.subscription.findUnique({
      where: { userId },
      select: { stripeCustomerId: true, tier: true, status: true, stripeSubscriptionId: true },
    });

    // No Stripe customer yet ⇒ nothing has been paid for; nothing to confirm.
    if (!row?.stripeCustomerId) return;

    const list = await stripe.subscriptions.list({
      customer: row.stripeCustomerId,
      status: "all",
      limit: 20,
    });

    // The best live, paid subscription for this customer.
    const active = list.data.find(
      (s) => isAccessGrantingStatus(s.status) && tierForPriceId(s.items.data[0]?.price.id) !== "FREE",
    );
    if (!active) return; // no positively-confirmed paid subscription ⇒ never grant, never revoke

    const intendedTier = tierForPriceId(active.items.data[0]?.price.id);
    if (intendedTier === "FREE") return; // narrowing guard (unreachable given the find predicate)

    const dbStatus = mapGrantingStatus(active.status as GrantingStripeStatus);
    if (
      row.tier === intendedTier &&
      row.status === dbStatus &&
      row.stripeSubscriptionId === active.id
    ) {
      return; // already in sync
    }

    await upsertGrant(active, userId, intendedTier);
  } catch (err) {
    // Fail-safe: swallow. The scheduled reconcile is the durable backstop.
    console.error(`[reconcile] per-user reconcile failed for user ${userId}: ${errorMessage(err)}`);
  }
}
