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
      mocks.constructEvent.mockReturnValue(
        stripeEvent("customer.subscription.updated", stripeSubscription({ status: "active" }), "evt_late")
      );

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
      mocks.constructEvent.mockReturnValue(
        stripeEvent("customer.subscription.updated", stripeSubscription({ id: "sub_NEW", status: "active" }), "evt_resub")
      );

      const res = await POST(webhookRequest());

      expect(res.status).toBe(200);
      expect(mocks.subscriptionUpsert).toHaveBeenCalled(); // resubscribe is not blocked
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
      mocks.constructEvent.mockReturnValue(
        stripeEvent("customer.subscription.updated", stripeSubscription(), "evt_dup")
      );
      mocks.webhookEventFindUnique.mockResolvedValue({ id: "wh_existing" });

      const res = await POST(webhookRequest());
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.skipped).toBe(true);
      expect(mocks.subscriptionUpsert).not.toHaveBeenCalled();
      expect(mocks.webhookEventCreate).not.toHaveBeenCalled();
    });

    it("records the event id after successful processing", async () => {
      mocks.constructEvent.mockReturnValue(
        stripeEvent("customer.subscription.updated", stripeSubscription(), "evt_new")
      );

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
      mocks.constructEvent.mockReturnValue(
        stripeEvent("customer.subscription.updated", stripeSubscription())
      );
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
      mocks.constructEvent.mockReturnValue(
        stripeEvent("customer.subscription.created", stripeSubscription())
      );

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
      mocks.constructEvent.mockReturnValue(
        stripeEvent(
          "customer.subscription.updated",
          stripeSubscription({ items: { data: [{ price: { id: ELITE_ANNUAL } }] } })
        )
      );

      await POST(webhookRequest());

      expect(mocks.subscriptionUpsert).toHaveBeenCalledWith(
        expect.objectContaining({ update: expect.objectContaining({ tier: "ELITE" }) })
      );
    });

    it("maps an unknown price id to FREE (never grants unpaid access) when there is no paid record", async () => {
      mocks.subscriptionFindUnique.mockResolvedValue(null);
      mocks.constructEvent.mockReturnValue(
        stripeEvent(
          "customer.subscription.updated",
          stripeSubscription({ items: { data: [{ price: { id: "price_unknown" } }] } })
        )
      );

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
      mocks.constructEvent.mockReturnValue(
        stripeEvent(
          "customer.subscription.updated",
          stripeSubscription({ status: "active", items: { data: [{ price: { id: "price_orphaned_founding" } }] } })
        )
      );

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
      mocks.constructEvent.mockReturnValue(
        stripeEvent("customer.subscription.updated", stripeSubscription({ status: stripeStatus }))
      );

      await POST(webhookRequest());

      expect(mocks.subscriptionUpsert).toHaveBeenCalledWith(
        expect.objectContaining({ update: expect.objectContaining({ status: dbStatus }) })
      );
    });

    it("clears the past-due grace anchor when the subscription recovers", async () => {
      mocks.constructEvent.mockReturnValue(
        stripeEvent("customer.subscription.updated", stripeSubscription({ status: "active" }))
      );

      await POST(webhookRequest());

      expect(mocks.subscriptionUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({ status: "ACTIVE", pastDueSince: null }),
        })
      );
    });

    it("backfills the grace anchor when a sync arrives already PAST_DUE", async () => {
      mocks.constructEvent.mockReturnValue(
        stripeEvent("customer.subscription.updated", stripeSubscription({ status: "past_due" }))
      );

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
      mocks.constructEvent.mockReturnValue(
        stripeEvent("customer.subscription.updated", stripeSubscription({ metadata: {} }))
      );

      await POST(webhookRequest());

      expect(mocks.subscriptionUpsert).not.toHaveBeenCalled();
      expect(mocks.subscriptionUpdateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { stripeCustomerId: "cus_123" } })
      );
    });

    it("resolves the customer id from an expanded customer object", async () => {
      mocks.constructEvent.mockReturnValue(
        stripeEvent(
          "customer.subscription.updated",
          stripeSubscription({ customer: { id: "cus_expanded" } })
        )
      );

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

    it("payment_failed marks the subscription PAST_DUE, stamps the first failure, and never touches a CANCELED row", async () => {
      mocks.constructEvent.mockReturnValue(
        stripeEvent("invoice.payment_failed", { subscription: "sub_123" })
      );

      await POST(webhookRequest());

      // First-failure stamp: only rows without an existing anchor —
      // retries must not slide the grace window.
      expect(mocks.subscriptionUpdateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { stripeSubscriptionId: "sub_123", pastDueSince: null, status: { not: "CANCELED" } },
          data: { pastDueSince: expect.any(Date) },
        })
      );
      // Adversarial-review regression: CANCELED is terminal and excluded, so a
      // late payment_failed after subscription.deleted cannot resurrect access.
      expect(mocks.subscriptionUpdateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { stripeSubscriptionId: "sub_123", status: { not: "CANCELED" } },
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
