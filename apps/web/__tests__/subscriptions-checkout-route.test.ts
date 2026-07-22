import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

/**
 * Behavioral tests for the subscription checkout route — the entry
 * point for every upgrade. Covers the auth gate, tier/interval
 * validation, unconfigured-price handling, and the session payload.
 */

const mocks = vi.hoisted(() => ({
  auth: vi.fn<() => Promise<{ user?: { id: string; email?: string; name?: string | null } } | null>>(),
  getStripePriceId: vi.fn<(tier: string, interval: string) => string>(),
  getOrCreateStripeCustomer: vi.fn<(userId: string, email: string, name?: string | null) => Promise<string>>(),
  createCheckoutSession: vi.fn<(args: unknown) => Promise<{ id: string; url: string | null }>>(),
  retrieveOpenCheckoutSessionUrl: vi.fn<(sessionId: string) => Promise<string | null>>(),
}));

vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/stripe", () => ({
  getStripePriceId: mocks.getStripePriceId,
  getOrCreateStripeCustomer: mocks.getOrCreateStripeCustomer,
  createCheckoutSession: mocks.createCheckoutSession,
  retrieveOpenCheckoutSessionUrl: mocks.retrieveOpenCheckoutSessionUrl,
}));
const dbMock = vi.hoisted(() => ({
  subscriptionFindUnique: vi.fn<(args: unknown) => Promise<unknown>>(),
  attemptCreate: vi.fn<(args: { data: Record<string, unknown> }) => Promise<unknown>>(),
  attemptFindUnique: vi.fn<(args: unknown) => Promise<unknown>>(),
  attemptUpdateMany: vi.fn<(args: unknown) => Promise<{ count: number }>>(),
}));
vi.mock("@sports/db", () => ({
  db: {
    subscription: { findUnique: dbMock.subscriptionFindUnique },
    checkoutAttempt: {
      create: dbMock.attemptCreate,
      findUnique: dbMock.attemptFindUnique,
      updateMany: dbMock.attemptUpdateMany,
    },
  },
}));

import { POST } from "@/app/api/subscriptions/checkout/route";
import { resetRateLimits } from "@/lib/api/rate-limit";
import {
  computeRequestFingerprint,
  currentCommercialTermsVersion,
} from "@/lib/billing/checkout-attempt";

function checkoutRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/subscriptions/checkout", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

const user = { id: "user_1", email: "pro@example.com", name: "Pro User" };
const INTENT_ID = "0f1e2d3c-4b5a-4978-8877-665544332211";

/** Unique-constraint (P2002) error shaped like Prisma's, for race simulations. */
function p2002(): Error & { code: string } {
  const err = new Error("Unique constraint failed") as Error & { code: string };
  err.code = "P2002";
  return err;
}

describe("POST /api/subscriptions/checkout", () => {
  beforeEach(() => {
    resetRateLimits();
    mocks.auth.mockReset();
    mocks.getStripePriceId.mockReset();
    mocks.getOrCreateStripeCustomer.mockReset();
    mocks.createCheckoutSession.mockReset();
    mocks.retrieveOpenCheckoutSessionUrl.mockReset();
    dbMock.subscriptionFindUnique.mockReset();
    dbMock.attemptCreate.mockReset();
    dbMock.attemptFindUnique.mockReset();
    dbMock.attemptUpdateMany.mockReset();
    dbMock.subscriptionFindUnique.mockResolvedValue(null); // no existing sub by default
    // Default attempt-store behavior: create echoes the row, no pre-existing attempt.
    dbMock.attemptCreate.mockImplementation(async ({ data }) => ({ ...data }));
    dbMock.attemptFindUnique.mockResolvedValue(null);
    dbMock.attemptUpdateMany.mockResolvedValue({ count: 1 });

    process.env["NEXT_PUBLIC_APP_URL"] = "https://app.example.com";

    mocks.auth.mockResolvedValue({ user });
    mocks.getStripePriceId.mockReturnValue("price_pro_monthly");
    mocks.getOrCreateStripeCustomer.mockResolvedValue("cus_123");
    mocks.retrieveOpenCheckoutSessionUrl.mockResolvedValue(null);
    mocks.createCheckoutSession.mockResolvedValue({ id: "cs_123", url: "https://checkout.stripe.com/s/123" });
  });

  it("returns 401 for unauthenticated requests", async () => {
    mocks.auth.mockResolvedValue(null);
    const res = await POST(checkoutRequest({ tier: "PRO" }));
    expect(res.status).toBe(401);
    expect(mocks.createCheckoutSession).not.toHaveBeenCalled();
  });

  it("rejects invalid tiers with 400 (FREE is not purchasable)", async () => {
    const res = await POST(checkoutRequest({ tier: "FREE" }));
    expect(res.status).toBe(400);
    expect(mocks.getStripePriceId).not.toHaveBeenCalled();
  });

  it("rejects invalid intervals with 400", async () => {
    const res = await POST(checkoutRequest({ tier: "PRO", interval: "weekly" }));
    expect(res.status).toBe(400);
  });

  it("returns 503 when the price is not configured", async () => {
    mocks.getStripePriceId.mockReturnValue("");
    const res = await POST(checkoutRequest({ tier: "ELITE", interval: "year" }));
    expect(res.status).toBe(503);
    expect(mocks.createCheckoutSession).not.toHaveBeenCalled();
  });

  it("defaults the billing interval to month", async () => {
    await POST(checkoutRequest({ tier: "PRO" }));
    expect(mocks.getStripePriceId).toHaveBeenCalledWith("PRO", "month");
  });

  it("creates a checkout session with the user's customer id, metadata, and a durable attempt id", async () => {
    const res = await POST(checkoutRequest({ tier: "ELITE", interval: "year" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.url).toBe("https://checkout.stripe.com/s/123");
    expect(mocks.getOrCreateStripeCustomer).toHaveBeenCalledWith("user_1", "pro@example.com", "Pro User");
    expect(mocks.createCheckoutSession).toHaveBeenCalledWith({
      customerId: "cus_123",
      priceId: "price_pro_monthly",
      userId: "user_1",
      attemptId: expect.stringMatching(/^ca_[0-9a-f-]{36}$/),
      successUrl: "https://app.example.com/dashboard?upgraded=true",
      cancelUrl: "https://app.example.com/pricing",
    });
    // The session is bound back onto the attempt for webhook reconciliation.
    expect(dbMock.attemptUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "SESSION_CREATED", stripeSessionId: "cs_123" }),
      }),
    );
  });

  it("blocks a second checkout for an already-subscribed user (409, no Stripe call)", async () => {
    dbMock.subscriptionFindUnique.mockResolvedValue({ status: "ACTIVE", tier: "PRO" });
    const res = await POST(checkoutRequest({ tier: "ELITE" }));
    const body = await res.json();
    expect(res.status).toBe(409);
    expect(body.code).toBe("already_subscribed");
    expect(mocks.createCheckoutSession).not.toHaveBeenCalled();
  });

  it("allows checkout for a FREE-tier record (e.g. after cancellation)", async () => {
    dbMock.subscriptionFindUnique.mockResolvedValue({ status: "CANCELED", tier: "FREE" });
    const res = await POST(checkoutRequest({ tier: "PRO" }));
    expect(res.status).toBe(200);
    expect(mocks.createCheckoutSession).toHaveBeenCalledTimes(1);
  });

  it("returns 500 when Stripe session creation fails", async () => {
    mocks.createCheckoutSession.mockRejectedValue(new Error("stripe unreachable"));
    const res = await POST(checkoutRequest({ tier: "PRO" }));
    expect(res.status).toBe(500);
  });

  it("rate-limits runaway checkout attempts per user (429 with Retry-After)", async () => {
    for (let i = 0; i < 10; i++) {
      const res = await POST(checkoutRequest({ tier: "PRO" }));
      expect(res.status).toBe(200);
    }
    const blocked = await POST(checkoutRequest({ tier: "PRO" }));
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("Retry-After")).toBeTruthy();
    // 10 sessions were created, not 11 — the limiter stopped Stripe resource creation.
    expect(mocks.createCheckoutSession).toHaveBeenCalledTimes(10);

    // A different user is unaffected (per-user buckets).
    mocks.auth.mockResolvedValue({ user: { ...user, id: "user_2" } });
    const other = await POST(checkoutRequest({ tier: "PRO" }));
    expect(other.status).toBe(200);
  });

  describe("durable checkout attempt (Phase 1P)", () => {
    /** Fingerprint the route computes for user_1 + PRO/month under current terms. */
    function proMonthlyFingerprint(): string {
      return computeRequestFingerprint({
        userId: "user_1",
        tier: "PRO",
        interval: "month",
        priceId: "price_pro_monthly",
        currency: "usd",
        termsVersion: currentCommercialTermsVersion(),
      });
    }

    function liveAttempt(overrides: Record<string, unknown> = {}): Record<string, unknown> {
      return {
        id: "ca_11111111-2222-4333-8444-555566667777",
        clientIntentId: INTENT_ID,
        userId: "user_1",
        customerId: "cus_123",
        tier: "PRO",
        interval: "month",
        priceId: "price_pro_monthly",
        currency: "usd",
        requestFingerprint: proMonthlyFingerprint(),
        status: "SESSION_CREATED",
        stripeSessionId: "cs_original",
        stripeSubscriptionId: null,
        lastErrorKind: null,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        ...overrides,
      };
    }

    it("rejects a malformed clientIntentId with a typed 400 — nothing touches Stripe", async () => {
      const res = await POST(checkoutRequest({ tier: "PRO", clientIntentId: "not-a-uuid" }));
      const body = await res.json();
      expect(res.status).toBe(400);
      expect(body.code).toBe("invalid_client_intent_id");
      expect(mocks.getOrCreateStripeCustomer).not.toHaveBeenCalled();
      expect(mocks.createCheckoutSession).not.toHaveBeenCalled();
    });

    it("an unknown-outcome retry recovers the durable attempt and returns the SAME session URL", async () => {
      // First request created the attempt + session; the response was lost.
      // The retry's create hits the (userId, clientIntentId) unique constraint.
      dbMock.attemptCreate.mockRejectedValue(p2002());
      dbMock.attemptFindUnique.mockResolvedValue(liveAttempt());
      mocks.retrieveOpenCheckoutSessionUrl.mockResolvedValue("https://checkout.stripe.com/s/original");

      const res = await POST(checkoutRequest({ tier: "PRO", clientIntentId: INTENT_ID }));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.url).toBe("https://checkout.stripe.com/s/original");
      expect(mocks.retrieveOpenCheckoutSessionUrl).toHaveBeenCalledWith("cs_original");
      // No SECOND session was minted — that is the whole point.
      expect(mocks.createCheckoutSession).not.toHaveBeenCalled();
    });

    it("same clientIntentId with a CHANGED fingerprint → 409 conflict, never a silent key reuse", async () => {
      dbMock.attemptCreate.mockRejectedValue(p2002());
      // Existing attempt was made for PRO/month; this request asks ELITE/year.
      dbMock.attemptFindUnique.mockResolvedValue(liveAttempt());
      mocks.getStripePriceId.mockReturnValue("price_elite_annual");

      const res = await POST(
        checkoutRequest({ tier: "ELITE", interval: "year", clientIntentId: INTENT_ID }),
      );
      const body = await res.json();

      expect(res.status).toBe(409);
      expect(body.code).toBe("checkout_intent_conflict");
      expect(mocks.createCheckoutSession).not.toHaveBeenCalled();
    });

    it("an EXPIRED attempt is never reused — the retry mints a fresh attempt + fresh session", async () => {
      const expired = liveAttempt({ expiresAt: new Date(Date.now() - 1000) });
      // First create collides with the stale row; after it is released the
      // second create succeeds.
      dbMock.attemptCreate
        .mockRejectedValueOnce(p2002())
        .mockImplementation(async ({ data }) => ({ ...data }));
      dbMock.attemptFindUnique.mockResolvedValueOnce(expired);

      const res = await POST(checkoutRequest({ tier: "PRO", clientIntentId: INTENT_ID }));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.url).toBe("https://checkout.stripe.com/s/123");
      // The dead row released its intent id under a terminal status…
      expect(dbMock.attemptUpdateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: expired["id"] }),
          data: expect.objectContaining({ clientIntentId: null, status: "EXPIRED" }),
        }),
      );
      // …and a brand-new session was created (fresh attempt id → fresh Stripe key).
      expect(mocks.createCheckoutSession).toHaveBeenCalledTimes(1);
      const attemptId = (mocks.createCheckoutSession.mock.calls[0]![0] as { attemptId: string }).attemptId;
      expect(attemptId).not.toBe(expired["id"]);
    });

    it("a COMPLETED attempt refuses a new session with 409 (post-payment, pre-sync window)", async () => {
      dbMock.attemptCreate.mockRejectedValue(p2002());
      dbMock.attemptFindUnique.mockResolvedValue(
        liveAttempt({ status: "COMPLETED", stripeSubscriptionId: "sub_done" }),
      );

      const res = await POST(checkoutRequest({ tier: "PRO", clientIntentId: INTENT_ID }));
      const body = await res.json();

      expect(res.status).toBe(409);
      expect(body.code).toBe("checkout_attempt_completed");
      expect(mocks.createCheckoutSession).not.toHaveBeenCalled();
    });

    it("marks the attempt FAILED when Stripe session creation throws (retry gets a fresh attempt)", async () => {
      mocks.createCheckoutSession.mockRejectedValue(new Error("stripe unreachable"));

      const res = await POST(checkoutRequest({ tier: "PRO", clientIntentId: INTENT_ID }));

      expect(res.status).toBe(500);
      expect(dbMock.attemptUpdateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: "FAILED",
            lastErrorKind: "stripe_session_create_failed",
          }),
        }),
      );
    });

    it("a token-less request mints its own server attempt (safe default)", async () => {
      const res = await POST(checkoutRequest({ tier: "PRO" }));
      expect(res.status).toBe(200);
      expect(dbMock.attemptCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ clientIntentId: null, userId: "user_1" }),
        }),
      );
    });
  });
});
