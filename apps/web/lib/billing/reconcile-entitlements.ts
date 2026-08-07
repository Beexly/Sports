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
import { tierForPriceId, tierFromPriceRef, type PaidTier, type ResolvedTier } from "@/lib/billing/price-ids";

/** Stripe statuses that grant entitlement in this platform (mirrors entitlements.ts). */
const ACCESS_GRANTING_STRIPE_STATUSES = ["active", "trialing", "past_due"] as const;
type GrantingStripeStatus = (typeof ACCESS_GRANTING_STRIPE_STATUSES)[number];

/** DB status a positively-confirmed granting Stripe status maps to. */
type GrantingDbStatus = "ACTIVE" | "TRIALING" | "PAST_DUE";

/** Paid DB statuses whose rows currently GRANT access (the downgrade-guard target). */
const PAID_DB_STATUSES = ["ACTIVE", "TRIALING", "PAST_DUE"] as const;

/**
 * Entitlement precedence for picking ONE canonical subscription per customer
 * (FINDING 4). A customer can hold several live Stripe subscriptions; the DB row is
 * keyed on `stripeCustomerId`, so without a deterministic winner an older / lower
 * sub processed last would clobber the entitlement of a newer / higher one. Highest
 * rank wins; ties break on newest (see `isMoreCanonical`).
 */
const TIER_RANK: Record<ResolvedTier, number> = { ELITE: 3, PRO: 2, FANTASY: 1, FREE: 0 };

/** Resolve tier from a Stripe Price object or id string (lookup_key aware). */
function tierFromStripePrice(price: Stripe.Price | string | undefined | null): ResolvedTier {
  if (!price) return "FREE";
  if (typeof price === "string") return tierForPriceId(price);
  return tierFromPriceRef(price.id, price.lookup_key);
}


/**
 * FINDING 2 fail-closed anchor. When a past_due grant's real first-failure time
 * cannot be reconstructed from Stripe, we stamp this UNIX-epoch sentinel instead of
 * `now()`: it is unconditionally older than any grace cutoff, so
 * `getUserEntitlements` resolves the row to FREE (grace already expired) rather than
 * minting a fresh premium grace window. Never grant premium on an unknown anchor.
 */
const UNKNOWN_PAST_DUE_ANCHOR = new Date(0);

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
 * FINDING 1 — downgrade-phase classification of a POSITIVELY-RETRIEVED Stripe
 * status. Called ONLY with a status Stripe actually returned (never on an API
 * error — errors fail SAFE at the call site by keeping the row). A definitively
 * retrieved status is authoritative, never "ambiguous":
 *
 *   "keep"      → still access-granting (active / trialing / past_due). The
 *                 active-set list merely missed it (pagination / race); do NOT
 *                 revoke. Also the fail-safe landing for any UNKNOWN future status.
 *   "downgrade" → CONFIRMED non-access. Stripe positively reports the subscription
 *                 no longer grants entitlement, so a paid GRANTING row must drop to
 *                 FREE. Covers terminal states (canceled, incomplete_expired) and
 *                 dunning-exhausted / non-billing holds (unpaid, incomplete,
 *                 paused) — none of which grant access. Leaving the row would strand
 *                 a paid tier on a dead subscription forever (every cron a no-op).
 */
function downgradeActionForRetrievedStatus(
  status: Stripe.Subscription.Status,
): "keep" | "downgrade" {
  switch (status) {
    case "active":
    case "trialing":
    case "past_due":
      return "keep";
    case "canceled":
    case "incomplete_expired":
    case "unpaid":
    case "incomplete":
    case "paused":
      return "downgrade";
    default: {
      // Exhaustiveness guard. Stripe's status set is closed and fully handled
      // above; this only fires if Stripe introduces a NEW status — which we must
      // classify explicitly, never silently revoke on. Fail SAFE (keep) + surface.
      const _exhaustive: never = status;
      console.error(
        `[reconcile] unrecognized Stripe subscription status "${String(_exhaustive)}"; ` +
          "NOT revoking (fail-safe) — classify it explicitly in reconcile-entitlements.",
      );
      return "keep";
    }
  }
}

/**
 * FINDING 2 — reconstruct the REAL past-due anchor from Stripe so a backfill never
 * renews the grace window. When an invoice payment fails, Stripe raised that
 * invoice at the current period boundary and stops advancing the period, so
 * `current_period_start` is when this unpaid cycle (and thus the failure) began —
 * a conservative anchor that is never LATER than the true first-failure time.
 * Returns null when no usable Stripe timestamp exists, so the caller FAILS CLOSED
 * (stamps `UNKNOWN_PAST_DUE_ANCHOR`) instead of inventing `now()`.
 */
function derivePastDueAnchor(subscription: Stripe.Subscription): Date | null {
  const periodStart = subscription.current_period_start;
  if (typeof periodStart === "number" && periodStart > 0) {
    return new Date(periodStart * 1000);
  }
  return null;
}

/** Sort key for canonical selection: newest subscription wins a tier tie. */
function canonicalCreatedAt(subscription: Stripe.Subscription): number {
  if (typeof subscription.created === "number") return subscription.created;
  if (typeof subscription.current_period_start === "number") {
    return subscription.current_period_start;
  }
  return 0;
}

/** FINDING 4 — true when `a` outranks `b` as the customer's canonical subscription. */
function isMoreCanonical(a: Stripe.Subscription, b: Stripe.Subscription): boolean {
  const rankA = TIER_RANK[tierFromStripePrice(a.items.data[0]?.price)];
  const rankB = TIER_RANK[tierFromStripePrice(b.items.data[0]?.price)];
  if (rankA !== rankB) return rankA > rankB;
  return canonicalCreatedAt(a) > canonicalCreatedAt(b);
}

/**
 * FINDING 4 — select the ONE canonical live subscription for a customer: highest
 * entitlement tier, tie-broken by newest. Deterministic regardless of the order
 * subscriptions were retrieved, so a lower / older sub can never overwrite the row.
 */
function canonicalSubscription(subscriptions: Stripe.Subscription[]): Stripe.Subscription {
  return subscriptions.reduce((best, current) =>
    isMoreCanonical(current, best) ? current : best,
  );
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

  // FINDING 2: anchor the grace window to a Stripe timestamp, NEVER `now()` — else
  // every reconcile of a still-past_due sub mints a fresh full grace window. If the
  // real anchor can't be reconstructed, fail closed with the epoch sentinel so
  // access resolves to FREE instead of renewing premium on an unknown anchor.
  const pastDueAnchor: Date | null = isPastDue
    ? (derivePastDueAnchor(subscription) ?? UNKNOWN_PAST_DUE_ANCHOR)
    : null;

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
      ...(isPastDue && pastDueAnchor ? { pastDueSince: pastDueAnchor } : {}),
    },
    update: base,
  });

  if (isPastDue && pastDueAnchor) {
    // Stamp the grace anchor only where absent so retries can't slide the window,
    // and use the Stripe-derived anchor (FINDING 2) — never `now()`.
    await db.subscription.updateMany({
      where: { stripeCustomerId: customerId, pastDueSince: null },
      data: { pastDueSince: pastDueAnchor },
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
  const intendedTier = tierFromStripePrice(subscription.items.data[0]?.price);

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
 * enough — we positively re-confirm the specific subscription with Stripe and revoke
 * only on a CONFIRMED non-access status (canceled / incomplete_expired / unpaid /
 * incomplete / paused — see `downgradeActionForRetrievedStatus`) or a confirmed
 * absence. The fail-safe applies to Stripe ERRORS only (a transient list/retrieve
 * failure revokes nothing); a definitively-retrieved terminal status is never
 * treated as ambiguous. The revoke write is itself guarded against a concurrent
 * resubscribe (FINDING 3).
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

    const subscriptionId = row.stripeSubscriptionId; // narrowed non-null by the guard above

    let confirmedGone = false;
    try {
      const remote = await stripe.subscriptions.retrieve(subscriptionId);
      // FINDING 1: a positively-retrieved status is authoritative, never "ambiguous".
      // "keep" only for still-granting (active/trialing/past_due) or an unknown future
      // status; every CONFIRMED non-access status (canceled / incomplete_expired /
      // unpaid / incomplete / paused) is a downgrade. The fail-safe now lives in the
      // catch below (errors only) — never on a definitively-retrieved terminal status.
      if (downgradeActionForRetrievedStatus(remote.status) === "keep") {
        continue;
      }
      confirmedGone = true;
    } catch (err) {
      if (isResourceMissing(err)) {
        // Stripe positively reports the subscription does not exist ⇒ safe to revoke.
        confirmedGone = true;
      } else {
        errors++;
        console.error(
          `[reconcile] could not confirm subscription ${subscriptionId} — transient ` +
            `error; NOT revoking (fail-safe): ${errorMessage(err)}`,
        );
        continue;
      }
    }

    if (confirmedGone) {
      try {
        // FINDING 3: guard the revoke against a concurrent resubscribe/heal. Revoke
        // ONLY the exact row we observed, still carrying the exact dead sub id and
        // still in a paid-granting status. If a webhook / post-checkout heal moved
        // the row onto a NEW active subscription between the read and here, the WHERE
        // no longer matches (count 0) and we skip — never clobbering fresh access.
        const revoke = await db.subscription.updateMany({
          where: {
            id: row.id,
            stripeSubscriptionId: subscriptionId,
            status: { in: [...PAID_DB_STATUSES] },
          },
          data: { tier: "FREE", status: "CANCELED", canceledAt: new Date(), pastDueSince: null },
        });
        if (revoke.count > 0) {
          downgraded++;
        } else {
          console.warn(
            `[reconcile] downgrade for row ${row.id} affected 0 rows — the row moved on ` +
              "(concurrent resubscribe/heal); skipping revoke (fail-safe).",
          );
        }
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

  // FINDING 4: a customer may hold several live subscriptions, but the DB row is
  // keyed on stripeCustomerId. Group by customer and reconcile only the ONE
  // canonical sub (highest tier, newest on a tie) so a lower / older sub can never
  // overwrite the entitlement of a higher / newer one, regardless of list order.
  const subscriptionsByCustomer = new Map<string, Stripe.Subscription[]>();
  for (const subscription of confirmedSubscriptions) {
    const customerId = customerIdOf(subscription);
    const bucket = subscriptionsByCustomer.get(customerId);
    if (bucket) bucket.push(subscription);
    else subscriptionsByCustomer.set(customerId, [subscription]);
  }

  // Phase 2 — GRANT: bring the DB up to each customer's canonical subscription.
  for (const subscriptions of subscriptionsByCustomer.values()) {
    const subscription = canonicalSubscription(subscriptions);
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

    // The canonical live, paid subscription for this customer: highest tier, newest
    // on a tie (FINDING 4) — mirrors the cron reconcile so a customer holding several
    // live subs is granted their BEST tier, not whichever `find` happened to hit.
    const paidLiveSubs = list.data.filter(
      (s) => isAccessGrantingStatus(s.status) && tierFromStripePrice(s.items.data[0]?.price) !== "FREE",
    );
    if (paidLiveSubs.length === 0) return; // no positively-confirmed paid subscription ⇒ never grant, never revoke
    const active = canonicalSubscription(paidLiveSubs);

    const intendedTier = tierFromStripePrice(active.items.data[0]?.price);
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
