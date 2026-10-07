import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import Stripe from "stripe";

/**
 * Money-path integrity tests for the Stripe webhook route.
 *
 * Deliberately a SEPARATE file from `stripe-webhook-route.test.ts`: that file is
 * concurrently edited by other in-flight work, and these cases cover invariants
 * that are orthogonal to its per-event-type coverage.
 *
 * Two invariants are locked here:
 *
 *  1. SIGNATURE IS VERIFIED AGAINST THE RAW REQUEST BODY. The Next.js App Router
 *     failure mode is `await req.json()` (or any parse/re-serialize round trip):
 *     it produces semantically identical JSON whose BYTES differ, and Stripe's
 *     HMAC is over the bytes. So this file does not merely assert "a bad
 *     signature throws" — it drives the REAL `stripe.webhooks.constructEvent`
 *     over a real generated signature header and proves the raw text VERIFIES
 *     while the round-tripped text does NOT.
 *
 *  2. DUNNING STATE IS NEVER WRITTEN FROM AN UNVERIFIED EVENT PAYLOAD. Stripe
 *     does not guarantee webhook ordering and redelivers failed deliveries with
 *     backoff for up to three days, so an `invoice.payment_failed` can arrive
 *     long after the retry it refers to already succeeded. PAST_DUE +
 *     `pastDueSince` is an entitlement-affecting write (it opens, and therefore
 *     also starts the clock on, the PAST_DUE_GRACE_DAYS window), so it must be
 *     driven by Stripe's CURRENT subscription state, not by the arriving event.
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

/**
 * A REAL Stripe SDK instance, used only for its webhook signing/verification
 * helpers (`generateTestHeaderString` / `constructEvent`). It performs no
 * network I/O — both are pure HMAC over the payload — so no live Stripe call is
 * ever made and the dummy key below is never transmitted anywhere.
 */
const realStripe = new Stripe("sk_test_not_a_real_key", { apiVersion: "2024-06-20" });

function webhookRequest(body = "{}", signature: string | null = "sig_valid"): NextRequest {
  const headers = new Headers({ "content-type": "application/json" });
  if (signature !== null) headers.set("stripe-signature", signature);
  return new NextRequest("http://localhost/api/webhooks/stripe", {
    method: "POST",
    body,
    headers,
  });
}

function stripeEvent(type: string, object: Record<string, unknown>, id = "evt_integrity_1"): Stripe.Event {
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

/** Every `subscription.updateMany` call whose `data` sets the given field. */
function updateManyCallsWriting(field: string): Array<{ where?: Record<string, unknown>; data?: Record<string, unknown> }> {
  return mocks.subscriptionUpdateMany.mock.calls
    .map((call) => call[0] as { where?: Record<string, unknown>; data?: Record<string, unknown> })
    .filter((args) => args.data !== undefined && field in args.data);
}

describe("Stripe webhook — money-path integrity", () => {
  beforeEach(() => {
    for (const fn of [
      mocks.constructEvent,
      mocks.subscriptionsRetrieve,
      mocks.invoicesRetrieve,
      mocks.webhookEventFindUnique,
      mocks.webhookEventCreate,
      mocks.subscriptionUpsert,
      mocks.subscriptionUpdateMany,
      mocks.subscriptionFindUnique,
      mocks.checkoutAttemptUpdateMany,
      mocks.requireDurableWriteStore,
      mocks.getStripe,
    ]) {
      fn.mockReset();
    }

    process.env["STRIPE_WEBHOOK_SECRET"] = "whsec_test";
    process.env["STRIPE_SECRET_KEY"] = "sk_test_not_a_real_key";
    process.env["STRIPE_PRO_MONTHLY_PRICE_ID"] = PRO_MONTHLY;

    mocks.requireDurableWriteStore.mockReturnValue(undefined);
    mocks.getStripe.mockReturnValue({
      webhooks: { constructEvent: mocks.constructEvent },
      subscriptions: { retrieve: mocks.subscriptionsRetrieve },
    } as unknown as Stripe);

    mocks.webhookEventFindUnique.mockResolvedValue(null);
    mocks.webhookEventCreate.mockResolvedValue({ id: "wh_1" });
    mocks.subscriptionUpsert.mockResolvedValue({ id: "s_1" });
    mocks.subscriptionUpdateMany.mockResolvedValue({ count: 1 });
    mocks.subscriptionFindUnique.mockResolvedValue(null);
    mocks.checkoutAttemptUpdateMany.mockResolvedValue({ count: 1 });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("signature verification is over the RAW request body", () => {
    // Non-canonical formatting on purpose: newlines, indentation and a key
    // order that `JSON.stringify(JSON.parse(...))` will not reproduce. This is
    // what makes the round-trip detectable at the byte level.
    const RAW_BODY =
      '{\n  "type": "customer.created",\n  "id": "evt_raw_body_1",\n  "data": { "object": { "id": "cus_123" } }\n}';
    const ROUND_TRIPPED = JSON.stringify(JSON.parse(RAW_BODY));
    const SECRET = "whsec_raw_body_integrity_test";

    it("a raw body VERIFIES and its JSON.parse/stringify round trip does NOT (the real HMAC, not a mock)", () => {
      // Control assertion, at RUNTIME: prove the two byte strings really do
      // differ and that the round trip really does break verification. Without
      // this the route-level test below would prove nothing.
      expect(ROUND_TRIPPED).not.toBe(RAW_BODY);

      const header = realStripe.webhooks.generateTestHeaderString({
        payload: RAW_BODY,
        secret: SECRET,
      });

      // Raw bytes: verifies.
      const verified = realStripe.webhooks.constructEvent(RAW_BODY, header, SECRET);
      expect(verified.id).toBe("evt_raw_body_1");

      // Same JSON, re-serialized: rejected. This is exactly what `req.json()`
      // followed by re-stringifying would hand the verifier.
      expect(() => realStripe.webhooks.constructEvent(ROUND_TRIPPED, header, SECRET)).toThrow(
        /No signatures found matching the expected signature/,
      );
    });

    it("the route passes the untouched request bytes to constructEvent, so a real signature verifies", async () => {
      const header = realStripe.webhooks.generateTestHeaderString({
        payload: RAW_BODY,
        secret: SECRET,
      });
      process.env["STRIPE_WEBHOOK_SECRET"] = SECRET;

      // Delegate to the REAL verifier: if the route reads the body in any way
      // that re-serializes it, this throws and the route answers 400.
      mocks.constructEvent.mockImplementation((body, sig, secret) =>
        realStripe.webhooks.constructEvent(body, sig, secret),
      );

      const res = await POST(webhookRequest(RAW_BODY, header));

      expect(res.status).toBe(200);
      // And assert the bytes directly: what reached the verifier is the raw
      // text, NOT the round trip.
      const passedBody = mocks.constructEvent.mock.calls[0]?.[0];
      expect(passedBody).toBe(RAW_BODY);
      expect(passedBody).not.toBe(ROUND_TRIPPED);
    });
  });

  describe("STRIPE_WEBHOOK_SECRET is a hard precondition", () => {
    it("returns 503 naming STRIPE_WEBHOOK_SECRET, and never attempts verification, when the secret is absent", async () => {
      const saved = process.env["STRIPE_WEBHOOK_SECRET"];
      delete process.env["STRIPE_WEBHOOK_SECRET"];
      const errSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
      try {
        mocks.constructEvent.mockReturnValue(stripeEvent("customer.created", {}));

        const res = await POST(webhookRequest());

        // 503, not 400: the delivery was fine, our configuration is not.
        expect(res.status).toBe(503);
        // Verification must not even be attempted — there is nothing to verify
        // against, so no code path may observe an "event".
        expect(mocks.constructEvent).not.toHaveBeenCalled();
        expect(mocks.webhookEventFindUnique).not.toHaveBeenCalled();
        expect(mocks.subscriptionUpsert).not.toHaveBeenCalled();
        expect(mocks.subscriptionUpdateMany).not.toHaveBeenCalled();
        // The operator-facing log must name the actual missing variable.
        const logged = errSpy.mock.calls.map((c) => String(c[0])).join(" ");
        expect(logged).toContain("STRIPE_WEBHOOK_SECRET");
      } finally {
        errSpy.mockRestore();
        if (saved !== undefined) process.env["STRIPE_WEBHOOK_SECRET"] = saved;
      }
    });

    it("treats a blank/whitespace-only secret the same as an absent one", async () => {
      const saved = process.env["STRIPE_WEBHOOK_SECRET"];
      process.env["STRIPE_WEBHOOK_SECRET"] = "   ";
      const errSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
      try {
        mocks.constructEvent.mockReturnValue(stripeEvent("customer.created", {}));

        const res = await POST(webhookRequest());

        expect(res.status).toBe(503);
        expect(mocks.constructEvent).not.toHaveBeenCalled();
      } finally {
        errSpy.mockRestore();
        if (saved !== undefined) process.env["STRIPE_WEBHOOK_SECRET"] = saved;
      }
    });
  });

  describe("invoice.payment_failed converges on Stripe's CURRENT subscription state", () => {
    /**
     * The out-of-order case that costs a paying member. Stripe's smart retry
     * collected the payment and the subscription is `active` again, but the
     * ORIGINAL `invoice.payment_failed` delivery (which failed the first time
     * and is redelivered with backoff) only lands now.
     *
     * Writing PAST_DUE + a fresh `pastDueSince` here starts a grace clock on a
     * member who is fully paid up, and puts a "your payment failed" banner in
     * front of them. Nothing in the webhook clears it again until their NEXT
     * successful invoice — a month away on monthly, a YEAR away on annual.
     */
    it("does NOT write PAST_DUE or stamp a grace anchor when Stripe reports the subscription ACTIVE", async () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      try {
        mocks.constructEvent.mockReturnValue(
          stripeEvent("invoice.payment_failed", { subscription: "sub_123" }, "evt_late_pf"),
        );
        // Stripe's authoritative answer: this subscription is ACTIVE right now.
        mocks.subscriptionsRetrieve.mockResolvedValue(stripeSubscription({ status: "active" }));

        const res = await POST(webhookRequest());

        expect(res.status).toBe(200);
        // The handler must have ASKED Stripe rather than trusting the payload.
        expect(mocks.subscriptionsRetrieve).toHaveBeenCalledWith("sub_123");

        // No dunning write of any kind.
        const statusWrites = updateManyCallsWriting("status");
        expect(statusWrites.map((c) => c.data?.["status"])).not.toContain("PAST_DUE");
        const anchorWrites = updateManyCallsWriting("pastDueSince").filter(
          (c) => c.data?.["pastDueSince"] instanceof Date,
        );
        expect(anchorWrites).toEqual([]);

        // Instead it converged on Stripe's real state: ACTIVE, anchor cleared.
        expect(mocks.subscriptionUpsert).toHaveBeenCalledWith(
          expect.objectContaining({
            update: expect.objectContaining({ status: "ACTIVE", pastDueSince: null }),
          }),
        );
      } finally {
        warnSpy.mockRestore();
      }
    });

    /**
     * The other direction of the same root cause: a late `payment_failed` for a
     * subscription Stripe has since CANCELED. PAST_DUE is access-GRANTING for
     * PAST_DUE_GRACE_DAYS, so stamping it on a dead subscription hands out paid
     * access. (The route's row-level terminal-status guard only helps once the
     * DB row itself is already terminal; here the row is still ACTIVE because
     * the cancel event has not been processed yet.)
     */
    it("does NOT open a grace window when Stripe reports the subscription CANCELED", async () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      try {
        mocks.subscriptionFindUnique.mockResolvedValue({
          status: "ACTIVE",
          canceledAt: null,
          stripeSubscriptionId: "sub_123",
          tier: "PRO",
        });
        mocks.constructEvent.mockReturnValue(
          stripeEvent("invoice.payment_failed", { subscription: "sub_123" }, "evt_pf_dead"),
        );
        mocks.subscriptionsRetrieve.mockResolvedValue(stripeSubscription({ status: "canceled" }));

        const res = await POST(webhookRequest());

        expect(res.status).toBe(200);
        const statusWrites = updateManyCallsWriting("status");
        expect(statusWrites.map((c) => c.data?.["status"])).not.toContain("PAST_DUE");
        // Converged terminal instead: FREE / CANCELED.
        expect(mocks.subscriptionUpsert).toHaveBeenCalledWith(
          expect.objectContaining({
            update: expect.objectContaining({ status: "CANCELED", tier: "FREE" }),
          }),
        );
      } finally {
        warnSpy.mockRestore();
      }
    });

    /**
     * Regression lock in the OTHER direction: the guard must not have disarmed
     * genuine dunning. When Stripe confirms the subscription really is
     * `past_due`, both writes still happen, with their existing WHERE guards.
     */
    it("still stamps the anchor and flips to PAST_DUE when Stripe confirms past_due", async () => {
      mocks.constructEvent.mockReturnValue(
        stripeEvent("invoice.payment_failed", { subscription: "sub_123" }, "evt_pf_real"),
      );
      mocks.subscriptionsRetrieve.mockResolvedValue(stripeSubscription({ status: "past_due" }));

      const res = await POST(webhookRequest());

      expect(res.status).toBe(200);
      const anchorWrite = updateManyCallsWriting("pastDueSince").find(
        (c) => c.data?.["pastDueSince"] instanceof Date,
      );
      expect(anchorWrite).toBeDefined();
      // Anchor is stamped only where none exists — retries must not slide the
      // grace window forward.
      expect(anchorWrite?.where?.["pastDueSince"]).toBeNull();
      expect(anchorWrite?.where?.["stripeSubscriptionId"]).toBe("sub_123");

      const statusWrite = updateManyCallsWriting("status").find(
        (c) => c.data?.["status"] === "PAST_DUE",
      );
      expect(statusWrite).toBeDefined();
      expect(statusWrite?.where?.["stripeSubscriptionId"]).toBe("sub_123");
      // And the write is still keyed to the subscription id, so a late event for
      // a superseded subscription cannot touch the row that replaced it.
      expect(mocks.subscriptionUpsert).not.toHaveBeenCalled();
    });

    /**
     * Documented fail-soft: if Stripe itself cannot be reached we fall back to
     * the pre-existing unconditional dunning write rather than throwing.
     *
     * This is deliberately NOT "fail closed by skipping": PAST_DUE is
     * access-GRANTING for the grace window, so the fallback write can never
     * revoke anyone — whereas skipping it would silently drop a real dunning
     * signal on every Stripe blip. Locked by a test so the choice is explicit
     * and cannot be changed by accident.
     */
    it("falls back to the unconditional dunning write when the Stripe re-retrieve fails", async () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      try {
        mocks.constructEvent.mockReturnValue(
          stripeEvent("invoice.payment_failed", { subscription: "sub_123" }, "evt_pf_outage"),
        );
        mocks.subscriptionsRetrieve.mockRejectedValue(new Error("stripe api unreachable"));

        const res = await POST(webhookRequest());

        expect(res.status).toBe(200);
        const statusWrite = updateManyCallsWriting("status").find(
          (c) => c.data?.["status"] === "PAST_DUE",
        );
        expect(statusWrite).toBeDefined();
        expect(mocks.subscriptionUpsert).not.toHaveBeenCalled();
      } finally {
        warnSpy.mockRestore();
      }
    });

    it("still ignores an invoice with no subscription (no Stripe call, no write)", async () => {
      mocks.constructEvent.mockReturnValue(
        stripeEvent("invoice.payment_failed", { subscription: null }, "evt_pf_nosub"),
      );

      const res = await POST(webhookRequest());

      expect(res.status).toBe(200);
      expect(mocks.subscriptionsRetrieve).not.toHaveBeenCalled();
      expect(mocks.subscriptionUpdateMany).not.toHaveBeenCalled();
    });
  });
});
