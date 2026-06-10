import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import Stripe from "stripe";
import { NextRequest } from "next/server";

/**
 * /api/webhooks/stripe — revenue-lifecycle proof (R-08).
 *
 * Uses SYNTHETIC signed events: payloads are signed with
 * stripe.webhooks.generateTestHeaderString and a dummy secret, then verified
 * by the route's real constructEvent call. No live Stripe keys, no network.
 *
 * Contract pinned here:
 *   - bad / missing signature  → 400, no DB writes
 *   - replayed event id        → acked but skipped (idempotency)
 *   - checkout.session.completed + customer.subscription.updated
 *                              → tier flips per price mapping (PRO / ELITE)
 *   - unknown price id         → tier falls back to FREE (never silently grants)
 *   - customer.subscription.deleted → downgrade to FREE / CANCELED
 *   - unknown event types      → acked safely (200) and recorded, no tier writes
 *   - handler failure          → 500 and the event is NOT recorded (retryable)
 *   - missing webhook secret   → 503 (degrade, never crash at import)
 */

const WEBHOOK_SECRET = "whsec_test_dummy_secret";
const PRO_PRICE_ID = "price_pro_test";
const ELITE_PRICE_ID = "price_elite_test";

const mocks = vi.hoisted(() => ({
  webhookEventFindUnique: vi.fn<(args?: unknown) => Promise<unknown>>(),
  webhookEventCreate: vi.fn<(args?: unknown) => Promise<unknown>>(),
  subscriptionUpsert: vi.fn<(args?: unknown) => Promise<unknown>>(),
  subscriptionUpdateMany: vi.fn<(args?: unknown) => Promise<unknown>>(),
  subscriptionsRetrieve: vi.fn<(id?: string) => Promise<unknown>>(),
}));

vi.mock("@sports/db", () => ({
  db: {
    webhookEvent: {
      findUnique: mocks.webhookEventFindUnique,
      create: mocks.webhookEventCreate,
    },
    subscription: {
      upsert: mocks.subscriptionUpsert,
      updateMany: mocks.subscriptionUpdateMany,
    },
  },
}));

// Partial mock: keep the REAL module (lazy init, error class) but swap the
// client so signature verification stays real crypto while
// subscriptions.retrieve never touches the network.
vi.mock("@/lib/stripe", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/stripe")>();
  const { default: StripeCtor } = await import("stripe");
  const verifier = new StripeCtor("sk_test_dummy", {
    apiVersion: "2024-06-20",
    typescript: true,
  });
  return {
    ...actual,
    isStripeConfigured: (): boolean => true,
    getStripe: () =>
      ({
        webhooks: verifier.webhooks,
        subscriptions: { retrieve: mocks.subscriptionsRetrieve },
      }) as unknown as ReturnType<typeof actual.getStripe>,
  };
});

// Signer for synthetic events — dummy key, pure HMAC, no network.
const signer = new Stripe("sk_test_dummy", {
  apiVersion: "2024-06-20",
  typescript: true,
});

function signedHeader(payload: string, secret: string = WEBHOOK_SECRET): string {
  return signer.webhooks.generateTestHeaderString({ payload, secret });
}

let eventSeq = 0;

function makeEventPayload(
  type: string,
  object: Record<string, unknown>
): { id: string; payload: string } {
  eventSeq += 1;
  const id = `evt_test_${eventSeq}`;
  const payload = JSON.stringify({
    id,
    object: "event",
    api_version: "2024-06-20",
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    pending_webhooks: 0,
    request: { id: null, idempotency_key: null },
    type,
    data: { object },
  });
  return { id, payload };
}

function makeSubscription(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    id: "sub_123",
    object: "subscription",
    customer: "cus_123",
    status: "active",
    cancel_at_period_end: false,
    current_period_start: 1_750_000_000,
    current_period_end: 1_752_600_000,
    trial_start: null,
    trial_end: null,
    metadata: { userId: "user_1" },
    items: { data: [{ price: { id: PRO_PRICE_ID } }] },
    ...overrides,
  };
}

async function postWebhook(
  payload: string,
  header: string | null
): Promise<{ status: number; body: Record<string, unknown> }> {
  const mod = await import("@/app/api/webhooks/stripe/route");
  const headers = new Headers({ "content-type": "application/json" });
  if (header !== null) headers.set("stripe-signature", header);
  const res = await mod.POST(
    new NextRequest("https://gse.test/api/webhooks/stripe", {
      method: "POST",
      headers,
      body: payload,
    })
  );
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
}

describe("/api/webhooks/stripe revenue lifecycle (synthetic signed events)", () => {
  beforeEach(() => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", WEBHOOK_SECRET);
    vi.stubEnv("STRIPE_PRO_PRICE_ID", PRO_PRICE_ID);
    vi.stubEnv("STRIPE_ELITE_PRICE_ID", ELITE_PRICE_ID);

    mocks.webhookEventFindUnique.mockReset().mockResolvedValue(null);
    mocks.webhookEventCreate.mockReset().mockResolvedValue({ id: "we_row" });
    mocks.subscriptionUpsert.mockReset().mockResolvedValue({ id: "sub_row" });
    mocks.subscriptionUpdateMany.mockReset().mockResolvedValue({ count: 1 });
    mocks.subscriptionsRetrieve.mockReset().mockResolvedValue(makeSubscription());
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("signature gate", () => {
    it("rejects a request with no stripe-signature header (400) before touching the DB", async () => {
      const { payload } = makeEventPayload("customer.subscription.updated", makeSubscription());
      const { status, body } = await postWebhook(payload, null);

      expect(status).toBe(400);
      expect(body["error"]).toBe("Missing stripe-signature header");
      expect(mocks.webhookEventFindUnique).not.toHaveBeenCalled();
      expect(mocks.subscriptionUpsert).not.toHaveBeenCalled();
    });

    it("rejects a bad signature (signed with the wrong secret) with 400 and no writes", async () => {
      const { payload } = makeEventPayload("customer.subscription.updated", makeSubscription());
      const { status, body } = await postWebhook(
        payload,
        signedHeader(payload, "whsec_attacker_secret")
      );

      expect(status).toBe(400);
      expect(String(body["error"])).toMatch(/Webhook error/);
      expect(mocks.webhookEventFindUnique).not.toHaveBeenCalled();
      expect(mocks.subscriptionUpsert).not.toHaveBeenCalled();
      expect(mocks.webhookEventCreate).not.toHaveBeenCalled();
    });

    it("rejects a tampered payload (valid header for a different body) with 400", async () => {
      const { payload: signedPayload } = makeEventPayload(
        "customer.subscription.updated",
        makeSubscription()
      );
      const { payload: tampered } = makeEventPayload(
        "customer.subscription.updated",
        makeSubscription({ items: { data: [{ price: { id: ELITE_PRICE_ID } }] } })
      );

      const { status } = await postWebhook(tampered, signedHeader(signedPayload));

      expect(status).toBe(400);
      expect(mocks.subscriptionUpsert).not.toHaveBeenCalled();
    });
  });

  describe("idempotency", () => {
    it("acks an already-processed event id as skipped without re-running handlers", async () => {
      mocks.webhookEventFindUnique.mockResolvedValue({ id: "we_existing" });

      const { payload } = makeEventPayload("customer.subscription.updated", makeSubscription());
      const { status, body } = await postWebhook(payload, signedHeader(payload));

      expect(status).toBe(200);
      expect(body).toEqual({ received: true, skipped: true });
      expect(mocks.subscriptionUpsert).not.toHaveBeenCalled();
      expect(mocks.subscriptionUpdateMany).not.toHaveBeenCalled();
      expect(mocks.webhookEventCreate).not.toHaveBeenCalled();
    });
  });

  describe("tier lifecycle", () => {
    it("checkout.session.completed retrieves the subscription and flips the user to PRO", async () => {
      mocks.subscriptionsRetrieve.mockResolvedValue(makeSubscription());

      const { id, payload } = makeEventPayload("checkout.session.completed", {
        id: "cs_test_1",
        object: "checkout.session",
        subscription: "sub_123",
        metadata: { userId: "user_1" },
      });
      const { status, body } = await postWebhook(payload, signedHeader(payload));

      expect(status).toBe(200);
      expect(body).toEqual({ received: true });
      expect(mocks.subscriptionsRetrieve).toHaveBeenCalledWith("sub_123");
      expect(mocks.subscriptionUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { stripeCustomerId: "cus_123" },
          create: expect.objectContaining({ userId: "user_1", tier: "PRO" }),
          update: expect.objectContaining({ tier: "PRO", status: "ACTIVE" }),
        })
      );
      expect(mocks.webhookEventCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            stripeEventId: id,
            type: "checkout.session.completed",
          }),
        })
      );
    });

    it("customer.subscription.updated with the ELITE price flips the tier to ELITE", async () => {
      const { payload } = makeEventPayload(
        "customer.subscription.updated",
        makeSubscription({ items: { data: [{ price: { id: ELITE_PRICE_ID } }] } })
      );
      const { status } = await postWebhook(payload, signedHeader(payload));

      expect(status).toBe(200);
      expect(mocks.subscriptionsRetrieve).not.toHaveBeenCalled();
      expect(mocks.subscriptionUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            tier: "ELITE",
            status: "ACTIVE",
            stripePriceId: ELITE_PRICE_ID,
          }),
        })
      );
    });

    it("an unknown price id maps to FREE — never silently grants a paid tier", async () => {
      const { payload } = makeEventPayload(
        "customer.subscription.updated",
        makeSubscription({ items: { data: [{ price: { id: "price_unknown" } }] } })
      );
      const { status } = await postWebhook(payload, signedHeader(payload));

      expect(status).toBe(200);
      expect(mocks.subscriptionUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({ tier: "FREE" }),
        })
      );
    });

    it("customer.subscription.deleted downgrades the record to FREE / CANCELED", async () => {
      const { payload } = makeEventPayload(
        "customer.subscription.deleted",
        makeSubscription({ status: "canceled" })
      );
      const { status, body } = await postWebhook(payload, signedHeader(payload));

      expect(status).toBe(200);
      expect(body).toEqual({ received: true });
      expect(mocks.subscriptionUpdateMany).toHaveBeenCalledWith({
        where: { stripeSubscriptionId: "sub_123" },
        data: expect.objectContaining({
          tier: "FREE",
          status: "CANCELED",
          canceledAt: expect.any(Date),
        }),
      });
      expect(mocks.subscriptionUpsert).not.toHaveBeenCalled();
    });

    it("acks unknown event types safely (200, recorded, no tier writes)", async () => {
      const { id, payload } = makeEventPayload("customer.tax_id.created", {
        id: "txi_1",
        object: "tax_id",
      });
      const { status, body } = await postWebhook(payload, signedHeader(payload));

      expect(status).toBe(200);
      expect(body).toEqual({ received: true });
      expect(mocks.subscriptionUpsert).not.toHaveBeenCalled();
      expect(mocks.subscriptionUpdateMany).not.toHaveBeenCalled();
      expect(mocks.webhookEventCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ stripeEventId: id }),
        })
      );
    });

    it("returns 500 and does NOT record the event when a handler fails (stays retryable)", async () => {
      mocks.subscriptionUpsert.mockRejectedValue(new Error("db down"));

      const { payload } = makeEventPayload("customer.subscription.updated", makeSubscription());
      const { status, body } = await postWebhook(payload, signedHeader(payload));

      expect(status).toBe(500);
      expect(body["error"]).toBe("Internal error");
      expect(mocks.webhookEventCreate).not.toHaveBeenCalled();
    });
  });

  describe("configuration degradation", () => {
    it("returns 503 when STRIPE_WEBHOOK_SECRET is missing — degrade, never crash", async () => {
      vi.stubEnv("STRIPE_WEBHOOK_SECRET", "");

      const { payload } = makeEventPayload("customer.subscription.updated", makeSubscription());
      const { status, body } = await postWebhook(payload, signedHeader(payload));

      expect(status).toBe(503);
      expect(String(body["error"])).toMatch(/not configured/);
      expect(mocks.webhookEventFindUnique).not.toHaveBeenCalled();
      expect(mocks.subscriptionUpsert).not.toHaveBeenCalled();
    });
  });
});

describe("lib/stripe lazy initialization (actual module, no mock)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("imports without STRIPE_SECRET_KEY and degrades at call time with a clear error", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "");

    // importActual bypasses the partial mock above — this is the real module,
    // and importing it with no key must NOT throw (the old import-time crash).
    const actual = await vi.importActual<typeof import("@/lib/stripe")>("@/lib/stripe");

    expect(actual.isStripeConfigured()).toBe(false);
    expect(() => actual.getStripe()).toThrowError(actual.StripeConfigurationError);
    expect(() => actual.getStripe()).toThrowError(/STRIPE_SECRET_KEY/);
  });

  it("constructs the client lazily once a key is present and reuses the instance", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_dummy_lazy");

    const actual = await vi.importActual<typeof import("@/lib/stripe")>("@/lib/stripe");

    expect(actual.isStripeConfigured()).toBe(true);
    const first = actual.getStripe();
    const second = actual.getStripe();
    expect(first).toBeDefined();
    expect(second).toBe(first);
  });
});
