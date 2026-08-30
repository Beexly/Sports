import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type Stripe from "stripe";

/**
 * Integration tests for the money-in / product-out seam: the Stripe webhook
 * handler's entitlement-grant correctness.
 *
 * These tests verify the LAUNCH-CRITICAL invariant: a customer who pays receives
 * the correct tier, and a customer who cancels/downgrades loses access — with
 * idempotent, signature-guarded handling so duplicates never double-grant.
 *
 * They focus on assertions the existing `stripe-webhook-route.test.ts` does NOT
 * make (e.g. the EXACT tier value in the upsert, not just that upsert ran).
 * Tests that overlap with existing coverage are omitted to avoid duplication.
 */

const mocks = vi.hoisted(() => ({
  DurableWriteStoreUnavailableError: class extends Error {
    readonly kind = "durable_write_store_unavailable" as const;
    readonly httpStatus = 503 as const;
  },
  StripeConfigError: class extends Error {
    readonly name = "StripeConfigError" as const;
    constructor(public readonly capability: string) {
      super(
        `Stripe is not configured for \"${capability}\" (STRIPE_SECRET_KEY is missing or blank)`,
      );
    }
  },
  constructEvent: vi.fn<(body: string, sig: string, secret: string) => Stripe.Event>(),
  subscriptionsRetrieve: vi.fn<(id: string) => Promise<unknown>>(),
  webhookEventFindUnique: vi.fn<(args: unknown) => Promise<unknown>>(),
  webhookEventCreate: vi.fn<(args: unknown) => Promise<unknown>>(),
  subscriptionUpsert: vi.fn<(args: unknown) => Promise<unknown>>(),
  subscriptionUpdateMany: vi.fn<(args: unknown) => Promise<{ count: number }>>(),
  subscriptionFindUnique: vi.fn<(args: unknown) => Promise<unknown>>(),
  checkoutAttemptUpdateMany: vi.fn<(args: unknown) => Promise<{ count: number }>>(),
  requireDurableWriteStore: vi.fn<(capability: string) => void>(),
  getStripe: vi.fn<() => Stripe>(),
}));

vi.mock("@/lib/stripe", () => ({
  stripe: {
    webhooks: { constructEvent: mocks.constructEvent },
    subscriptions: { retrieve: mocks.subscriptionsRetrieve },
  },
  getStripe: mocks.getStripe,
  StripeConfigError: mocks.StripeConfigError,
  __esModule: true,
}));

vi.mock("@sports/db", () => ({
  requireDurableWriteStore: mocks.requireDurableWriteStore,
  DurableWriteStoreUnavailableError: mocks.DurableWriteStoreUnavailableError,
  db: {
    $transaction: (ops: Promise<unknown>[]) => Promise.all(ops),
    webhookEvent: {
      findUnique: mocks.webhookEventFindUnique,
      create: mocks.webhookEventCreate,
    },
    subscription: {
      upsert: mocks.subscriptionUpsert,
      updateMany: mocks.subscriptionUpdateMany,
      findUnique: mocks.subscriptionFindUnique,
    },
    checkoutAttempt: {
      updateMany: mocks.checkoutAttemptUpdateMany,
    },
  },
}));

import { POST } from "@/app/api/webhooks/stripe/route";

const PRO_MONTHLY = "price_pro_monthly_test";
const ELITE_ANNUAL = "price_elite_annual_test";

function webhookRequest(body = "{}", signature: string | null = "sig_valid"): NextRequest {
  const headers = new Headers({ "content-type": "application/json" });
  if (signature !== null) headers.set("stripe-signature", signature);
  return new NextRequest("http://localhost/api/webhooks/stripe", {
    method: "POST",
    body,
    headers,
  });
}

function stripeEvent(type: string, object: Record<string, unknown>, id = "evt_test_1"): Stripe.Event {
  return { id, type, data: { object } } as unknown as Stripe.Event;
}

function stripeSubscription(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "sub_123",
    customer: "cus_123",
    status: "active",
    items: { data: [{ price: { id: PRO_MONTHLY } }] },
    current_period_start: 1760000000,
    current_period_end: 1762600000,
    cancel_at_period_end: false,
    trial_start: null,
    trial_end: null,
    metadata: { userId: "user_1" },
    ...overrides,
  };
}

describe("P9.5-05 — Entitlement grant correctness (journey)", () => {
  beforeEach(() => {
    mocks.constructEvent.mockReset();
    mocks.subscriptionsRetrieve.mockReset();
    mocks.webhookEventFindUnique.mockReset();
    mocks.webhookEventCreate.mockReset();
    mocks.subscriptionUpsert.mockReset();
    mocks.subscriptionUpdateMany.mockReset();
    mocks.subscriptionFindUnique.mockReset();
    mocks.checkoutAttemptUpdateMany.mockReset();
    mocks.requireDurableWriteStore.mockReset();
    mocks.requireDurableWriteStore.mockReturnValue(undefined);
    mocks.getStripe.mockReset();

    process.env["STRIPE_WEBHOOK_SECRET"] = "whsec_test";
    process.env["STRIPE_PRO_MONTHLY_PRICE_ID"] = PRO_MONTHLY;
    process.env["STRIPE_ELITE_ANNUAL_PRICE_ID"] = ELITE_ANNUAL;

    const stripeClient = {
      webhooks: { constructEvent: mocks.constructEvent },
      subscriptions: { retrieve: mocks.subscriptionsRetrieve },
    };
    mocks.getStripe.mockReturnValue(stripeClient as unknown as Stripe);

    mocks.webhookEventFindUnique.mockResolvedValue(null);
    mocks.webhookEventCreate.mockResolvedValue({ id: "wh_1" });
    mocks.subscriptionUpsert.mockResolvedValue({ id: "s_1" });
    mocks.subscriptionUpdateMany.mockResolvedValue({ count: 1 });
    mocks.subscriptionFindUnique.mockResolvedValue(null);
    mocks.checkoutAttemptUpdateMany.mockResolvedValue({ count: 1 });
  });

  /**
   * 1. checkout.session.completed grants the CORRECT tier.
   *    The existing stripe-webhook-route.test.ts asserts subscriptionUpsert is
   *    "called" but never checks the tier value. Here we assert PRO for a PRO
   *    price and ELITE for an ELITE price — the actual entitlement granted.
   */
  it("checkout.session.completed grants the correct tier (PRO for a PRO price)", async () => {
    mocks.constructEvent.mockReturnValue(
      stripeEvent("checkout.session.completed", { subscription: "sub_123" })
    );
    mocks.subscriptionsRetrieve.mockResolvedValue(stripeSubscription());

    const res = await POST(webhookRequest());

    expect(res.status).toBe(200);
    expect(mocks.subscriptionUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          stripeSubscriptionId: "sub_123",
          stripePriceId: PRO_MONTHLY,
          tier: "PRO",
          status: "ACTIVE",
        }),
      })
    );
  });

  it("checkout.session.completed grants ELITE tier for an ELITE annual price", async () => {
    mocks.constructEvent.mockReturnValue(
      stripeEvent("checkout.session.completed", { subscription: "sub_123" })
    );
    mocks.subscriptionsRetrieve.mockResolvedValue(
      stripeSubscription({
        items: { data: [{ price: { id: ELITE_ANNUAL } }] },
      })
    );

    const res = await POST(webhookRequest());

    expect(res.status).toBe(200);
    expect(mocks.subscriptionUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          tier: "ELITE",
          stripePriceId: ELITE_ANNUAL,
        }),
      })
    );
  });

  /**
   * 2. customer.subscription.deleted revokes access to FREE.
   *    (Already covered at the route level, but restated here as the seam
   *    invariant: payment cancellation → no entitlement.)
   */
  it("customer.subscription.deleted revokes paid tier to FREE / CANCELED", async () => {
    mocks.constructEvent.mockReturnValue(
      stripeEvent("customer.subscription.deleted", stripeSubscription())
    );

    const res = await POST(webhookRequest());

    expect(res.status).toBe(200);
    expect(mocks.subscriptionUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        // C-11 no-re-stamp guard: an already-CANCELED row must not be
        // re-stamped, or the original canceledAt would be overwritten.
        where: { stripeSubscriptionId: "sub_123", status: { not: "CANCELED" } },
        data: expect.objectContaining({
          tier: "FREE",
          status: "CANCELED",
        }),
      })
    );
  });

  /**
   * 3. The SAME webhook delivered twice grants exactly once (idempotency).
   *    The idempotency is event-agnostic (any event id), but here we focus on the
   *    entitlement seam: the second checkout.session.completed must NOT re-upsert
   *    a tier — the member must not be "re-granted" or touched again.
   */
  it("a duplicate checkout.session.completed grants exactly once (no second upsert)", async () => {
    mocks.constructEvent.mockReturnValue(
      stripeEvent("checkout.session.completed", { subscription: "sub_123" }, "evt_dup_1")
    );
    mocks.subscriptionsRetrieve.mockResolvedValue(stripeSubscription());

    // First delivery: not yet recorded.
    mocks.webhookEventFindUnique.mockResolvedValueOnce(null);
    const res1 = await POST(webhookRequest());
    expect(res1.status).toBe(200);

    // Second delivery of the SAME event id: already processed → skipped.
    mocks.webhookEventFindUnique.mockResolvedValueOnce({ id: "wh_existing" });
    const res2 = await POST(webhookRequest());
    const body2 = await res2.json();

    expect(res2.status).toBe(200);
    expect(body2.skipped).toBe(true);
    // The entitlement sync must not run again — exactly one grant.
    expect(mocks.subscriptionsRetrieve).toHaveBeenCalledTimes(1);
    expect(mocks.subscriptionUpsert).toHaveBeenCalledTimes(1);
  });

  /**
   * 4. A webhook for an UNKNOWN price id does NOT silently downgrade a paying member.
   *    The defensive no-downgrade guard in syncSubscription retains the existing paid
   *    tier when a repointed/unknown price id is seen on an active subscription.
   *    (This is the "charged but FREE" H1 landmine.)
   */
  it("an unknown price id on an active subscription retains the existing paid tier (no downgrade)", async () => {
    // DB already has this customer on PRO.
    mocks.subscriptionFindUnique.mockResolvedValue({
      status: "ACTIVE",
      canceledAt: null,
      stripeSubscriptionId: "sub_123",
      tier: "PRO",
    });

    mocks.constructEvent.mockReturnValue(
      stripeEvent("checkout.session.completed", { subscription: "sub_123" })
    );
    // Stripe's current state: active subscription, but the price id is unknown
    // (operator repointed the env var and dropped the historical price id).
    mocks.subscriptionsRetrieve.mockResolvedValue(
      stripeSubscription({
        status: "active",
        items: { data: [{ price: { id: "price_orphaned_founding" } }] },
      })
    );

    const res = await POST(webhookRequest());

    expect(res.status).toBe(200);
    // The upsert must RETAIN PRO, not downgrade to FREE.
    expect(mocks.subscriptionUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          tier: "PRO",
        }),
      })
    );
  });

  /**
   * 5. A webhook with a FAILING signature grants nothing.
   *    An invalid signature must not touch the subscription table at all — no
   *    entitlement is granted, no DB write happens, the event is not recorded.
   */
  it("a webhook with a failing signature grants nothing (no DB writes)", async () => {
    mocks.constructEvent.mockImplementation(() => {
      throw new Error("No signatures found matching the expected signature");
    });

    const res = await POST(webhookRequest("{}", "sig_bad"));

    expect(res.status).toBe(400);
    expect(mocks.subscriptionsRetrieve).not.toHaveBeenCalled();
    expect(mocks.subscriptionUpsert).not.toHaveBeenCalled();
    expect(mocks.subscriptionUpdateMany).not.toHaveBeenCalled();
    expect(mocks.webhookEventCreate).not.toHaveBeenCalled();
  });
});

/**
 * P9.5-06 — Cancellation, downgrade, and refund path.
 *
 * Tests what the code ACTUALLY does, per the task directive: "Read the real
 * implementation first and TEST WHAT IT ACTUALLY DOES. If real behavior differs
 * from what a paying customer would reasonably expect, that mismatch is a finding."
 *
 * Findings are documented in the journal, not silently encoded as "correct".
 */
describe("P9.5-06 — Cancellation / dunning / refund", () => {
  beforeEach(() => {
    mocks.constructEvent.mockReset();
    mocks.subscriptionsRetrieve.mockReset();
    mocks.webhookEventFindUnique.mockReset();
    mocks.webhookEventCreate.mockReset();
    mocks.subscriptionUpsert.mockReset();
    mocks.subscriptionUpdateMany.mockReset();
    mocks.subscriptionFindUnique.mockReset();
    mocks.checkoutAttemptUpdateMany.mockReset();
    mocks.requireDurableWriteStore.mockReset();
    mocks.requireDurableWriteStore.mockReturnValue(undefined);
    mocks.getStripe.mockReset();

    process.env["STRIPE_WEBHOOK_SECRET"] = "whsec_test";
    process.env["STRIPE_PRO_MONTHLY_PRICE_ID"] = PRO_MONTHLY;
    process.env["STRIPE_ELITE_ANNUAL_PRICE_ID"] = ELITE_ANNUAL;

    const stripeClient = {
      webhooks: { constructEvent: mocks.constructEvent },
      subscriptions: { retrieve: mocks.subscriptionsRetrieve },
    };
    mocks.getStripe.mockReturnValue(stripeClient as unknown as Stripe);

    mocks.webhookEventFindUnique.mockResolvedValue(null);
    mocks.webhookEventCreate.mockResolvedValue({ id: "wh_1" });
    mocks.subscriptionUpsert.mockResolvedValue({ id: "s_1" });
    mocks.subscriptionUpdateMany.mockResolvedValue({ count: 1 });
    mocks.subscriptionFindUnique.mockResolvedValue(null);
    mocks.checkoutAttemptUpdateMany.mockResolvedValue({ count: 1 });
  });

  /**
   * 1. Cancellation revokes access immediately (customer.subscription.deleted).
   *
   * The code calls subscriptionUpdateMany with status: "CANCELED", tier: "FREE",
   * canceledAt: <Date>. There is NO period-end retention check in the webhook
   * handler — revocation is immediate. (Stripe itself delays the `deleted` event
   * until the period ends when the customer cancels "at period end", so period-end
   * retention works via Stripe's lifecycle, not via an app-side grace check.)
   */
  it("customer.subscription.deleted revokes access immediately to FREE / CANCELED", async () => {
    mocks.constructEvent.mockReturnValue(
      stripeEvent("customer.subscription.deleted", stripeSubscription())
    );

    const res = await POST(webhookRequest());

    expect(res.status).toBe(200);
    expect(mocks.subscriptionUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        // C-11 no-re-stamp guard: an already-CANCELED row must not be
        // re-stamped, or the original canceledAt would be overwritten.
        where: { stripeSubscriptionId: "sub_123", status: { not: "CANCELED" } },
        data: expect.objectContaining({
          status: "CANCELED",
          tier: "FREE",
          canceledAt: expect.any(Date),
        }),
      })
    );
  });

  /**
   * 2. Cancel-at-period-end keeps the subscription ACTIVE (no early revocation).
   *
   * When a customer chooses "cancel at period end", Stripe sets
   * cancel_at_period_end=true but keeps the subscription active until the period
   * ends. The webhook's syncSubscription stores cancelAtPeriodEnd on the row
   * and the subscription stays ACTIVE. The customer retains access until
   * Stripe sends the `deleted` event at period end.
   *
   * This verifies the code does NOT prematurely downgrade a cancel-at-period-end
   * subscription — it keeps the paid tier while ACTIVE.
   */
  it("cancel_at_period_end=true keeps the subscription ACTIVE (no early downgrade)", async () => {
    mocks.constructEvent.mockReturnValue(
      stripeEvent(
        "customer.subscription.updated",
        stripeSubscription({ cancel_at_period_end: true })
      )
    );
    // customer.subscription.updated triggers a fresh retrieve from Stripe.
    mocks.subscriptionsRetrieve.mockResolvedValue(
      stripeSubscription({ cancel_at_period_end: true })
    );

    const res = await POST(webhookRequest());

    expect(res.status).toBe(200);
    // The sync must NOT downgrade to CANCELED — the sub is still active.
    expect(mocks.subscriptionUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          status: "ACTIVE",
          tier: "PRO",
        }),
      })
    );
  });

  /**
   * 3. Failed payment enters dunning with a PAST_DUE anchor (invoice.payment_failed).
   *
   * The webhook stamps first-failure time (pastDueSince) on the first failure,
   * and subsequent retry failures must NOT slide the anchor (WHERE pastDueSince: null
   * ensures only the first write lands). This is what backs the 7-day grace window
   * in getUserEntitlements (entitlements.ts:PAST_DUE_GRACE_DAYS).
   */
  it("invoice.payment_failed stamps the first-failure anchor once (PAST_DUE, no repeated slide)", async () => {
    mocks.constructEvent.mockReturnValue(
      stripeEvent("invoice.payment_failed", { subscription: "sub_123" })
    );
    mocks.subscriptionsRetrieve.mockResolvedValue(stripeSubscription());

    const res = await POST(webhookRequest());

    expect(res.status).toBe(200);
    // First failure: stamps pastDueSince.
    expect(mocks.subscriptionUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          stripeSubscriptionId: "sub_123",
          pastDueSince: null,
          status: { not: "CANCELED" },
        },
        data: { pastDueSince: expect.any(Date) },
      })
    );
  });

  it("a retry payment_failed does NOT slide an existing pastDueSince anchor", async () => {
    // Simulate an existing row already past due (anchor already stamped).
    mocks.subscriptionUpdateMany.mockImplementation(async (args) => {
      const w = (args as { where?: Record<string, unknown> }).where || {};
      // The first-failure stamp only writes where pastDueSince IS null —
      // an existing anchor means count 0 (no slide).
      if (w["pastDueSince"] === null) return { count: 0 };
      return { count: 1 };
    });

    mocks.constructEvent.mockReturnValue(
      stripeEvent("invoice.payment_failed", { subscription: "sub_123" })
    );
    mocks.subscriptionsRetrieve.mockResolvedValue(stripeSubscription());

    await POST(webhookRequest());

    // The first-failure stamp was attempted but affected 0 rows (anchor already exists).
    const firstFailureCall = mocks.subscriptionUpdateMany.mock.calls.find(
      (call) =>
        (call[0] as { where?: Record<string, unknown> }).where?.["pastDueSince"] === null
    );
    expect(firstFailureCall).toBeDefined();
    // The status flip to PAST_DUE still runs (it has no pastDueSince: null where).
    expect(mocks.subscriptionUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { stripeSubscriptionId: "sub_123", status: { not: "CANCELED" } },
        data: { status: "PAST_DUE" },
      })
    );
  });

  /**
   * 4. A late invoice.payment_failed AFTER subscription.deleted does NOT resurrect access.
   *
   * Stripe may deliver a burst of dunning events after the cancel event. The
   * terminal-CANCELED guard (status: { not: "CANCELED" } in the WHERE) ensures a
   * late payment_failed cannot flip a CANCELED row back to PAST_DUE (which is
   * access-granting in getUserEntitlements).
   */
  it("a late invoice.payment_failed AFTER subscription.deleted cannot resurrect access", async () => {
    mocks.subscriptionUpdateMany.mockImplementation(async (args) => {
      const w = (args as { where?: Record<string, unknown> }).where || {};
      const statusNot = w["status"] as { not?: string } | undefined;
      const statusGuard = statusNot?.not;
      // If the row is CANCELED and the WHERE excludes CANCELED, it must not match.
      if (statusGuard === "CANCELED") return { count: 0 };
      return { count: 1 };
    });

    mocks.constructEvent.mockReturnValue(
      stripeEvent("invoice.payment_failed", { subscription: "sub_123" })
    );
    mocks.subscriptionsRetrieve.mockResolvedValue(stripeSubscription());

    const res = await POST(webhookRequest());
    expect(res.status).toBe(200);
    // The PAST_DUE status flip is guarded by status: { not: "CANCELED" }.
    const pastDueCall = mocks.subscriptionUpdateMany.mock.calls.find(
      (call) =>
        (call[0] as { data?: Record<string, unknown> }).data?.["status"] === "PAST_DUE"
    );
    expect(pastDueCall).toBeDefined();
    const where = (pastDueCall![0] as { where?: Record<string, unknown> }).where;
    expect(where?.["status"]).toEqual({ not: "CANCELED" });
  });

  /**
   * 5. REFUND GAP — charge.refunded is NOT handled by the webhook.
   *
   * The route's switch handles: checkout.session.completed, checkout.session.expired,
   * customer.subscription.* (created/updated/deleted), invoice.payment_*.
   * There is NO charge.refunded case. A full refund of a subscription payment
   * therefore does NOT trigger any entitlement revocation.
   *
   * This is a real finding for LAUNCH_BLOCKERS.md: a refunded customer retains
   * access until the next status churn (e.g. until their next invoice fails or
   * the subscription eventually cancels). The test asserts the GAP — that the
   * handler acknowledges the event (acks 200) but makes NO entitlement change.
   */
  it("REFUND GAP: charge.refunded is acknowledged but makes NO entitlement change (no handler exists)", async () => {
    mocks.constructEvent.mockReturnValue(
      stripeEvent("charge.refunded", {
        id: "ch_123",
        amount_refunded: 999,
        subscription: "sub_123",
      })
    );

    const res = await POST(webhookRequest());

    // The event is acked 200 (unknown types hit the default case) — but no
    // entitlement revocation occurs because there is no charge.refunded case.
    expect(res.status).toBe(200);
    expect(mocks.subscriptionUpsert).not.toHaveBeenCalled();
    expect(mocks.subscriptionUpdateMany).not.toHaveBeenCalled();
    // Only the idempotency record is written.
    expect(mocks.webhookEventCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          stripeEventId: "evt_test_1",
          type: "charge.refunded",
        }),
      })
    );
    // Documented as a launch-blocking finding: a refunded paying customer keeps
    // access until their subscription status otherwise changes.
  });
});
