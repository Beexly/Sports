import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type Stripe from "stripe";

/**
 * Behavioral tests for the Stripe webhook handler — the critical path
 * that keeps subscription tier/status in the DB aligned with Stripe.
 *
 * Covers: signature verification, idempotency, every handled event
 * type, price→tier mapping, Stripe→DB status mapping, the
 * userId-metadata upsert path, and the legacy updateMany fallback.
 */

const mocks = vi.hoisted(() => ({
  constructEvent: vi.fn<(body: string, sig: string, secret: string) => Stripe.Event>(),
  subscriptionsRetrieve: vi.fn<(id: string) => Promise<unknown>>(),
  webhookEventFindUnique: vi.fn<(args: unknown) => Promise<unknown>>(),
  webhookEventCreate: vi.fn<(args: unknown) => Promise<unknown>>(),
  subscriptionUpsert: vi.fn<(args: unknown) => Promise<unknown>>(),
  subscriptionUpdateMany: vi.fn<(args: unknown) => Promise<{ count: number }>>(),
  subscriptionFindUnique: vi.fn<(args: unknown) => Promise<unknown>>(),
}));

vi.mock("@/lib/stripe", () => ({
  stripe: {
    webhooks: { constructEvent: mocks.constructEvent },
    subscriptions: { retrieve: mocks.subscriptionsRetrieve },
  },
}));

vi.mock("@sports/db", () => ({
  db: {
    // $transaction([...]) executes the array of prisma promises atomically in prod;
    // the mock just awaits them so the underlying updateMany calls are recorded.
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

/**
 * Arm a subscription lifecycle event AND the fresh re-retrieve the handler
 * performs on it (M-F5: embedded snapshots are never synced directly).
 * `retrieved` defaults to the embedded snapshot; pass a different object to
 * simulate a stale event whose current Stripe state has moved on.
 */
function armSubscriptionEvent(
  type: "customer.subscription.created" | "customer.subscription.updated",
  sub: Record<string, unknown>,
  id = "evt_test_1",
  retrieved: Record<string, unknown> = sub,
): void {
  mocks.constructEvent.mockReturnValue(stripeEvent(type, sub, id));
  mocks.subscriptionsRetrieve.mockResolvedValue(retrieved);
}

describe("POST /api/webhooks/stripe", () => {
  beforeEach(() => {
    mocks.constructEvent.mockReset();
    mocks.subscriptionsRetrieve.mockReset();
    mocks.webhookEventFindUnique.mockReset();
    mocks.webhookEventCreate.mockReset();
    mocks.subscriptionUpsert.mockReset();
    mocks.subscriptionUpdateMany.mockReset();
    mocks.subscriptionFindUnique.mockReset();

    process.env["STRIPE_WEBHOOK_SECRET"] = "whsec_test";
    process.env["STRIPE_PRO_MONTHLY_PRICE_ID"] = PRO_MONTHLY;
    process.env["STRIPE_ELITE_ANNUAL_PRICE_ID"] = ELITE_ANNUAL;

    // Default: event not yet processed, no prior subscription row, writes succeed
    mocks.webhookEventFindUnique.mockResolvedValue(null);
    mocks.webhookEventCreate.mockResolvedValue({ id: "wh_1" });
    mocks.subscriptionUpsert.mockResolvedValue({ id: "s_1" });
    mocks.subscriptionUpdateMany.mockResolvedValue({ count: 1 });
    mocks.subscriptionFindUnique.mockResolvedValue(null);
  });

  describe("out-of-order delivery", () => {
    it("does NOT reactivate a subscription already cancelled-by-delete (same id)", async () => {
      // Our DB already recorded the terminal delete for sub_123.
      mocks.subscriptionFindUnique.mockResolvedValue({
        status: "CANCELED",
        canceledAt: new Date(),
        stripeSubscriptionId: "sub_123",
      });
      // A delayed updated event arrives with an OLD active snapshot of the SAME sub.
      armSubscriptionEvent("customer.subscription.updated", stripeSubscription({ status: "active" }), "evt_late");

      const res = await POST(webhookRequest());

      expect(res.status).toBe(200);
      // The reactivation must be skipped — no write that re-grants premium.
      expect(mocks.subscriptionUpsert).not.toHaveBeenCalled();
      expect(mocks.subscriptionUpdateMany).not.toHaveBeenCalled();
    });

    it("still syncs a genuinely NEW subscription id for a previously-cancelled customer", async () => {
      mocks.subscriptionFindUnique.mockResolvedValue({
        status: "CANCELED",
        canceledAt: new Date(),
        stripeSubscriptionId: "sub_OLD",
      });
      armSubscriptionEvent("customer.subscription.updated", stripeSubscription({ id: "sub_NEW", status: "active" }), "evt_resub");

      const res = await POST(webhookRequest());

      expect(res.status).toBe(200);
      expect(mocks.subscriptionUpsert).toHaveBeenCalled(); // resubscribe is not blocked
    });

    it("ignores a late event for a SUPERSEDED subscription — sub_OLD noise cannot revoke sub_NEW (Codex P1)", async () => {
      // The member cancelled sub_OLD and resubscribed as sub_NEW (row is active).
      mocks.subscriptionFindUnique.mockResolvedValue({
        status: "ACTIVE",
        canceledAt: null,
        stripeSubscriptionId: "sub_NEW",
        tier: "ELITE",
      });
      // A delayed `updated` for sub_OLD arrives; Stripe's current state for it
      // is canceled. Syncing it would overwrite the sub_NEW row as CANCELED.
      armSubscriptionEvent(
        "customer.subscription.updated",
        stripeSubscription({ id: "sub_OLD", status: "canceled" }),
        "evt_superseded",
      );

      const res = await POST(webhookRequest());

      expect(res.status).toBe(200);
      expect(mocks.subscriptionUpsert).not.toHaveBeenCalled();
      expect(mocks.subscriptionUpdateMany).not.toHaveBeenCalled();
    });

    it("a late same-id canceled update CONVERGES on the delete handler's terminal state (Codex P2)", async () => {
      const stampedAt = new Date("2026-07-01T00:00:00Z");
      // The delete handler already recorded the terminal state.
      mocks.subscriptionFindUnique.mockResolvedValue({
        status: "CANCELED",
        canceledAt: stampedAt,
        stripeSubscriptionId: "sub_123",
        tier: "FREE",
      });
      // A delayed `updated` for the SAME id retrieves the canceled object,
      // which still carries the old paid price.
      armSubscriptionEvent(
        "customer.subscription.updated",
        stripeSubscription({ status: "canceled" }),
        "evt_late_cancel",
      );

      const res = await POST(webhookRequest());

      expect(res.status).toBe(200);
      // Terminal record preserved: FREE tier, original cancellation stamp —
      // never a paid-tier canceled row with canceledAt wiped to null.
      expect(mocks.subscriptionUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            tier: "FREE",
            status: "CANCELED",
            canceledAt: stampedAt,
          }),
        }),
      );
    });

    it("an immediate cancel arriving via `updated` stamps canceledAt and drops to FREE", async () => {
      mocks.subscriptionFindUnique.mockResolvedValue({
        status: "ACTIVE",
        canceledAt: null,
        stripeSubscriptionId: "sub_123",
        tier: "PRO",
      });
      armSubscriptionEvent(
        "customer.subscription.updated",
        stripeSubscription({ status: "canceled" }),
        "evt_immediate_cancel",
      );

      await POST(webhookRequest());

      expect(mocks.subscriptionUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            tier: "FREE",
            status: "CANCELED",
            canceledAt: expect.any(Date),
          }),
        }),
      );
    });

    it("syncs the RETRIEVED current state, never the embedded snapshot (stale event cannot regress tier)", async () => {
      // A delayed `updated` event carries the OLD state: PRO + past_due.
      // Stripe's CURRENT state (the member upgraded and recovered): ELITE + active.
      armSubscriptionEvent(
        "customer.subscription.updated",
        stripeSubscription({ status: "past_due" }), // embedded stale snapshot (PRO price)
        "evt_stale",
        stripeSubscription({
          status: "active",
          items: { data: [{ price: { id: ELITE_ANNUAL } }] },
        }),
      );

      const res = await POST(webhookRequest());

      expect(res.status).toBe(200);
      expect(mocks.subscriptionsRetrieve).toHaveBeenCalledWith("sub_123");
      // The write reflects CURRENT Stripe state — the stale snapshot's
      // PRO/PAST_DUE regression never reaches the DB.
      expect(mocks.subscriptionUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({ tier: "ELITE", status: "ACTIVE" }),
        }),
      );
    });

    it("fails closed (500, event unrecorded) when the fresh retrieve fails — Stripe retries", async () => {
      mocks.constructEvent.mockReturnValue(
        stripeEvent("customer.subscription.updated", stripeSubscription(), "evt_retrieve_down"),
      );
      mocks.subscriptionsRetrieve.mockRejectedValue(new Error("stripe api unreachable"));

      const res = await POST(webhookRequest());

      expect(res.status).toBe(500);
      // Not recorded as processed — the retry must not be idempotency-skipped.
      expect(mocks.webhookEventCreate).not.toHaveBeenCalled();
      expect(mocks.subscriptionUpsert).not.toHaveBeenCalled();
    });
  });

  describe("signature verification", () => {
    it("returns 400 when the stripe-signature header is missing", async () => {
      const res = await POST(webhookRequest("{}", null));
      expect(res.status).toBe(400);
      expect(mocks.constructEvent).not.toHaveBeenCalled();
    });

    it("returns 400 when signature verification fails", async () => {
      mocks.constructEvent.mockImplementation(() => {
        throw new Error("No signatures found matching the expected signature");
      });
      const res = await POST(webhookRequest("{}", "sig_bad"));
      expect(res.status).toBe(400);
      expect(mocks.webhookEventFindUnique).not.toHaveBeenCalled();
    });

    it("verifies against the configured webhook secret and raw body", async () => {
      mocks.constructEvent.mockReturnValue(stripeEvent("unhandled.event", {}));
      await POST(webhookRequest('{"raw":true}', "sig_valid"));
      expect(mocks.constructEvent).toHaveBeenCalledWith('{"raw":true}', "sig_valid", "whsec_test");
    });
  });

  describe("idempotency", () => {
    it("skips events that were already processed", async () => {
      armSubscriptionEvent("customer.subscription.updated", stripeSubscription(), "evt_dup");
      mocks.webhookEventFindUnique.mockResolvedValue({ id: "wh_existing" });

      const res = await POST(webhookRequest());
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.skipped).toBe(true);
      expect(mocks.subscriptionUpsert).not.toHaveBeenCalled();
      expect(mocks.webhookEventCreate).not.toHaveBeenCalled();
    });

    it("records the event id after successful processing", async () => {
      armSubscriptionEvent("customer.subscription.updated", stripeSubscription(), "evt_new");

      const res = await POST(webhookRequest());
      expect(res.status).toBe(200);
      expect(mocks.webhookEventCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            stripeEventId: "evt_new",
            type: "customer.subscription.updated",
          }),
        })
      );
    });

    it("returns 500 and does NOT record the event when handling fails (Stripe will retry)", async () => {
      armSubscriptionEvent("customer.subscription.updated", stripeSubscription());
      mocks.subscriptionUpsert.mockRejectedValue(new Error("db down"));

      const res = await POST(webhookRequest());
      expect(res.status).toBe(500);
      expect(mocks.webhookEventCreate).not.toHaveBeenCalled();
    });
  });

  describe("checkout.session.completed", () => {
    it("retrieves the subscription and syncs it", async () => {
      mocks.constructEvent.mockReturnValue(
        stripeEvent("checkout.session.completed", { subscription: "sub_123" })
      );
      mocks.subscriptionsRetrieve.mockResolvedValue(stripeSubscription());

      const res = await POST(webhookRequest());
      expect(res.status).toBe(200);
      expect(mocks.subscriptionsRetrieve).toHaveBeenCalledWith("sub_123");
      expect(mocks.subscriptionUpsert).toHaveBeenCalled();
    });

    it("ignores sessions without a subscription (one-time payments)", async () => {
      mocks.constructEvent.mockReturnValue(
        stripeEvent("checkout.session.completed", { subscription: null })
      );
      const res = await POST(webhookRequest());
      expect(res.status).toBe(200);
      expect(mocks.subscriptionsRetrieve).not.toHaveBeenCalled();
    });
  });

  describe("customer.subscription.created / updated — syncSubscription", () => {
    it("upserts by stripeCustomerId with PRO tier for a pro monthly price", async () => {
      armSubscriptionEvent("customer.subscription.created", stripeSubscription());

      await POST(webhookRequest());

      expect(mocks.subscriptionUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { stripeCustomerId: "cus_123" },
          create: expect.objectContaining({
            userId: "user_1",
            stripeCustomerId: "cus_123",
            tier: "PRO",
            status: "ACTIVE",
          }),
          update: expect.objectContaining({
            stripeSubscriptionId: "sub_123",
            stripePriceId: PRO_MONTHLY,
            tier: "PRO",
            status: "ACTIVE",
            currentPeriodStart: new Date(1760000000 * 1000),
            currentPeriodEnd: new Date(1762600000 * 1000),
            cancelAtPeriodEnd: false,
          }),
        })
      );
    });

    it("maps an elite annual price to the ELITE tier", async () => {
      armSubscriptionEvent("customer.subscription.updated", stripeSubscription({ items: { data: [{ price: { id: ELITE_ANNUAL } }] } }));

      await POST(webhookRequest());

      expect(mocks.subscriptionUpsert).toHaveBeenCalledWith(
        expect.objectContaining({ update: expect.objectContaining({ tier: "ELITE" }) })
      );
    });

    it("maps an unknown price id to FREE (never grants unpaid access) when there is no paid record", async () => {
      mocks.subscriptionFindUnique.mockResolvedValue(null);
      armSubscriptionEvent("customer.subscription.updated", stripeSubscription({ items: { data: [{ price: { id: "price_unknown" } }] } }));

      await POST(webhookRequest());

      expect(mocks.subscriptionUpsert).toHaveBeenCalledWith(
        expect.objectContaining({ update: expect.objectContaining({ tier: "FREE" }) })
      );
    });

    it("does NOT downgrade a grandfathered PAID member to FREE on an unmapped (repointed) price id", async () => {
      // A member whose original price id was dropped from the env after a phase
      // advance: the sub is still active + paid, so retain their tier, don't revoke.
      mocks.subscriptionFindUnique.mockResolvedValue({
        status: "ACTIVE",
        canceledAt: null,
        stripeSubscriptionId: "sub_test",
        tier: "PRO",
      });
      armSubscriptionEvent("customer.subscription.updated", stripeSubscription({ status: "active", items: { data: [{ price: { id: "price_orphaned_founding" } }] } }));

      await POST(webhookRequest());

      expect(mocks.subscriptionUpsert).toHaveBeenCalledWith(
        expect.objectContaining({ update: expect.objectContaining({ tier: "PRO" }) })
      );
    });

    it.each([
      ["trialing", "TRIALING"],
      ["past_due", "PAST_DUE"],
      ["unpaid", "PAST_DUE"],
      ["canceled", "CANCELED"],
      ["incomplete_expired", "CANCELED"],
      ["incomplete", "INCOMPLETE"],
      ["paused", "PAUSED"],
    ])("maps Stripe status %s to %s", async (stripeStatus, dbStatus) => {
      armSubscriptionEvent("customer.subscription.updated", stripeSubscription({ status: stripeStatus }));

      await POST(webhookRequest());

      expect(mocks.subscriptionUpsert).toHaveBeenCalledWith(
        expect.objectContaining({ update: expect.objectContaining({ status: dbStatus }) })
      );
    });

    it("clears the past-due grace anchor when the subscription recovers", async () => {
      armSubscriptionEvent("customer.subscription.updated", stripeSubscription({ status: "active" }));

      await POST(webhookRequest());

      expect(mocks.subscriptionUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({ status: "ACTIVE", pastDueSince: null }),
        })
      );
    });

    it("backfills the grace anchor when a sync arrives already PAST_DUE", async () => {
      armSubscriptionEvent("customer.subscription.updated", stripeSubscription({ status: "past_due" }));

      await POST(webhookRequest());

      expect(mocks.subscriptionUpdateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { stripeCustomerId: "cus_123", pastDueSince: null },
          data: { pastDueSince: expect.any(Date) },
        })
      );
      // The sync itself must not overwrite an existing anchor.
      expect(mocks.subscriptionUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.not.objectContaining({ pastDueSince: expect.anything() }),
        })
      );
    });

    it("falls back to updateMany by stripeCustomerId when userId metadata is missing", async () => {
      armSubscriptionEvent("customer.subscription.updated", stripeSubscription({ metadata: {} }));

      await POST(webhookRequest());

      expect(mocks.subscriptionUpsert).not.toHaveBeenCalled();
      expect(mocks.subscriptionUpdateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { stripeCustomerId: "cus_123" } })
      );
    });

    it("resolves the customer id from an expanded customer object", async () => {
      armSubscriptionEvent("customer.subscription.updated", stripeSubscription({ customer: { id: "cus_expanded" } }));

      await POST(webhookRequest());

      expect(mocks.subscriptionUpsert).toHaveBeenCalledWith(
        expect.objectContaining({ where: { stripeCustomerId: "cus_expanded" } })
      );
    });
  });

  describe("customer.subscription.deleted", () => {
    it("downgrades to FREE / CANCELED and stamps canceledAt", async () => {
      mocks.constructEvent.mockReturnValue(
        stripeEvent("customer.subscription.deleted", stripeSubscription())
      );

      await POST(webhookRequest());

      expect(mocks.subscriptionUpdateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { stripeSubscriptionId: "sub_123" },
          data: expect.objectContaining({
            status: "CANCELED",
            tier: "FREE",
            canceledAt: expect.any(Date),
          }),
        })
      );
    });
  });

  describe("invoice events", () => {
    it("payment_succeeded re-syncs the subscription from Stripe", async () => {
      mocks.constructEvent.mockReturnValue(
        stripeEvent("invoice.payment_succeeded", { subscription: "sub_123" })
      );
      mocks.subscriptionsRetrieve.mockResolvedValue(stripeSubscription());

      const res = await POST(webhookRequest());
      expect(res.status).toBe(200);
      expect(mocks.subscriptionsRetrieve).toHaveBeenCalledWith("sub_123");
      expect(mocks.subscriptionUpsert).toHaveBeenCalled();
    });

    it("payment_failed marks the subscription PAST_DUE and stamps the first failure", async () => {
      mocks.constructEvent.mockReturnValue(
        stripeEvent("invoice.payment_failed", { subscription: "sub_123" })
      );

      await POST(webhookRequest());

      // First-failure stamp: only rows without an existing anchor —
      // retries must not slide the grace window.
      expect(mocks.subscriptionUpdateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { stripeSubscriptionId: "sub_123", pastDueSince: null },
          data: { pastDueSince: expect.any(Date) },
        })
      );
      expect(mocks.subscriptionUpdateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { stripeSubscriptionId: "sub_123" },
          data: { status: "PAST_DUE" },
        })
      );
    });

    it("payment_action_required re-syncs so the DB captures the pending status", async () => {
      mocks.constructEvent.mockReturnValue(
        stripeEvent("invoice.payment_action_required", { subscription: "sub_123" })
      );
      mocks.subscriptionsRetrieve.mockResolvedValue(stripeSubscription({ status: "past_due" }));

      const res = await POST(webhookRequest());
      expect(res.status).toBe(200);
      expect(mocks.subscriptionsRetrieve).toHaveBeenCalledWith("sub_123");
      expect(mocks.subscriptionUpsert).toHaveBeenCalledWith(
        expect.objectContaining({ update: expect.objectContaining({ status: "PAST_DUE" }) })
      );
    });

    it("ignores invoices without a subscription", async () => {
      mocks.constructEvent.mockReturnValue(
        stripeEvent("invoice.payment_failed", { subscription: null })
      );

      const res = await POST(webhookRequest());
      expect(res.status).toBe(200);
      expect(mocks.subscriptionUpdateMany).not.toHaveBeenCalled();
    });
  });

  describe("unhandled events", () => {
    it("acknowledges unknown event types without touching subscriptions", async () => {
      mocks.constructEvent.mockReturnValue(stripeEvent("customer.created", {}));

      const res = await POST(webhookRequest());
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.received).toBe(true);
      expect(mocks.subscriptionUpsert).not.toHaveBeenCalled();
      expect(mocks.subscriptionUpdateMany).not.toHaveBeenCalled();
      // Still recorded for idempotency
      expect(mocks.webhookEventCreate).toHaveBeenCalled();
    });
  });
});
