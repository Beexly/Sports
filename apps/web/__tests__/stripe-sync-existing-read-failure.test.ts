import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type Stripe from "stripe";

/**
 * Regression: syncSubscription must NOT sync with its billing guards blind.
 *
 * `syncSubscription` reads the customer's existing Subscription row ONCE and
 * reuses it for four separate protections. That read used to end in
 * `.catch(() => null)`, so a transient Postgres fault produced the exact same
 * `null` a brand-new customer produces, and `null` disables all four at once:
 *
 *   1. the out-of-order resurrection guard (needs existing.status === CANCELED)
 *   2. the superseded-subscription guard (needs existing.stripeSubscriptionId)
 *   3. the grandfathering no-downgrade guard (needs existing.tier)
 *   4. the canceledAt preservation (`existing?.canceledAt ?? new Date()`)
 *
 * Worse, the failure was inaudible: the handler ran to completion, the route
 * answered 200 `{received:true}` and recorded the event as processed, so Stripe
 * never redelivered. The whole point of these assertions is that the failure
 * PROPAGATES (500 + no write + event not marked processed), which is what puts
 * the delivery back on Stripe's retry schedule.
 */

const mocks = vi.hoisted(() => ({
  DurableWriteStoreUnavailableError: class extends Error {
    readonly kind = "durable_write_store_unavailable" as const;
    readonly httpStatus = 503 as const;
  },
  StripeConfigError: class extends Error {
    readonly name = "StripeConfigError" as const;
    constructor(public readonly capability: string) {
      super(`Stripe is not configured for "${capability}"`);
    }
  },
  constructEvent: vi.fn<(body: string, sig: string, secret: string) => Stripe.Event>(),
  subscriptionsRetrieve: vi.fn<(id: string) => Promise<unknown>>(),
  invoicesRetrieve: vi.fn<(id: string) => Promise<unknown>>(),
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
    invoices: { retrieve: mocks.invoicesRetrieve },
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
    checkoutAttempt: { updateMany: mocks.checkoutAttemptUpdateMany },
  },
}));

import { POST } from "@/app/api/webhooks/stripe/route";

const PRO_MONTHLY = "price_pro_monthly_test";
const DB_DOWN = new Error("P1001: Can't reach database server at db:5432");

function webhookRequest(body = "{}"): NextRequest {
  const headers = new Headers({
    "content-type": "application/json",
    "stripe-signature": "sig_valid",
  });
  return new NextRequest("http://localhost/api/webhooks/stripe", {
    method: "POST",
    body,
    headers,
  });
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

function armSubscriptionEvent(sub: Record<string, unknown>, id = "evt_read_fail"): void {
  mocks.constructEvent.mockReturnValue({
    id,
    type: "customer.subscription.updated",
    data: { object: sub },
  } as unknown as Stripe.Event);
  mocks.subscriptionsRetrieve.mockResolvedValue(sub);
}

describe("syncSubscription: existing-row read failure", () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    for (const m of Object.values(mocks)) {
      if (typeof m === "function" && "mockReset" in m) {
        (m as { mockReset: () => void }).mockReset();
      }
    }
    process.env["STRIPE_WEBHOOK_SECRET"] = "whsec_test";
    process.env["STRIPE_PRO_MONTHLY_PRICE_ID"] = PRO_MONTHLY;
    delete process.env["REFUND_REVOKES_ACCESS"];

    mocks.requireDurableWriteStore.mockReturnValue(undefined);
    mocks.getStripe.mockReturnValue({
      webhooks: { constructEvent: mocks.constructEvent },
      subscriptions: { retrieve: mocks.subscriptionsRetrieve },
    } as unknown as Stripe);

    mocks.webhookEventFindUnique.mockResolvedValue(null);
    mocks.webhookEventCreate.mockResolvedValue({ id: "wh_1" });
    mocks.subscriptionUpsert.mockResolvedValue({ id: "s_1" });
    mocks.subscriptionUpdateMany.mockResolvedValue({ count: 1 });
    mocks.checkoutAttemptUpdateMany.mockResolvedValue({ count: 1 });

    errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  // Restore the real console.error: a spy left installed silences every later
  // suite that runs in this worker.
  afterEach(() => {
    errorSpy.mockRestore();
  });

  it("does NOT write the subscription row when the existing-row read rejects", async () => {
    mocks.subscriptionFindUnique.mockRejectedValue(DB_DOWN);
    armSubscriptionEvent(stripeSubscription({ status: "active" }));

    await POST(webhookRequest());

    // The four guards all depend on the row this read returns. Writing without
    // them is the resurrection / superseded-clobber / silent-downgrade bug.
    expect(mocks.subscriptionUpsert).not.toHaveBeenCalled();
    expect(mocks.subscriptionUpdateMany).not.toHaveBeenCalled();
  });

  it("answers 500 so Stripe redelivers instead of acking a sync that never ran", async () => {
    mocks.subscriptionFindUnique.mockRejectedValue(DB_DOWN);
    armSubscriptionEvent(stripeSubscription({ status: "active" }));

    const res = await POST(webhookRequest());

    expect(res.status).toBe(500);
  });

  it("does NOT record the event as processed (a 200 would retire it forever)", async () => {
    mocks.subscriptionFindUnique.mockRejectedValue(DB_DOWN);
    armSubscriptionEvent(stripeSubscription({ status: "active" }));

    await POST(webhookRequest());

    expect(mocks.webhookEventCreate).not.toHaveBeenCalled();
  });

  it("logs the customer, subscription and cause of the failed read", async () => {
    mocks.subscriptionFindUnique.mockRejectedValue(DB_DOWN);
    armSubscriptionEvent(stripeSubscription({ status: "active" }));

    await POST(webhookRequest());

    const logged = errorSpy.mock.calls.map((c) => c.map(String).join(" ")).join("\n");
    expect(logged).toMatch(/syncSubscription/);
    expect(logged).toMatch(/cus_123/);
    expect(logged).toMatch(/sub_123/);
    expect(logged).toMatch(/Can't reach database server/);
  });

  it("still syncs normally when the read succeeds (no behavior change on the happy path)", async () => {
    mocks.subscriptionFindUnique.mockResolvedValue(null);
    armSubscriptionEvent(stripeSubscription({ status: "active" }), "evt_ok");

    const res = await POST(webhookRequest());

    expect(res.status).toBe(200);
    expect(mocks.subscriptionUpsert).toHaveBeenCalled();
    expect(mocks.webhookEventCreate).toHaveBeenCalled();
  });
});
