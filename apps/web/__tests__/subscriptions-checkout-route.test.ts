import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

/**
 * Behavioral tests for the subscription checkout route — the entry
 * point for every upgrade. Covers the auth gate, tier/interval
 * validation, unconfigured-price handling, the durable-write guard
 * (directive 5.2: no Stripe side effect without a durable store), the
 * fail-closed subscription lookup, the durable-attempt state machine
 * with outcome classification (directive 5.3), and the session payload.
 */

const mocks = vi.hoisted(() => ({
  auth: vi.fn<() => Promise<{ user?: { id: string; email?: string; name?: string | null } } | null>>(),
  getStripePriceId: vi.fn<(tier: string, interval: string) => string>(),
  getOrCreateStripeCustomer: vi.fn<(userId: string, email: string, name?: string | null) => Promise<string>>(),
  createCheckoutSession: vi.fn<(args: unknown) => Promise<{ id: string; url: string | null }>>(),
  retrieveOpenCheckoutSessionUrl: vi.fn<(sessionId: string) => Promise<string | null>>(),
  // Reconciliation lookup used by the inline past-TTL repair path (5.3).
  retrieveSession: vi.fn<(sessionId: string) => Promise<unknown>>(),
  listSessionsByCustomerSince: vi.fn<(customerId: string, since: Date) => Promise<unknown[]>>(),
}));

vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/stripe", () => ({
  getStripePriceId: mocks.getStripePriceId,
  // The route resolves prices through `resolveCheckoutPriceId` (lib/stripe.ts:64),
  // which superseded the direct `getStripePriceId` call but was never added to
  // this factory — so every test that reached the price lookup died on
  // `No "resolveCheckoutPriceId" export is defined on the "@/lib/stripe" mock`.
  //
  // Delegating to the existing `getStripePriceId` spy rather than introducing a
  // second seam keeps `getStripePriceId` the one place a test configures a price:
  // the `mockReturnValue("")` -> 503 case, the `not.toHaveBeenCalled()` assertion
  // on the already-subscribed short-circuit, and
  // `toHaveBeenCalledWith("PRO", "month")` all keep working untouched. The real
  // function is async, so the delegate is too.
  resolveCheckoutPriceId: async (tier: string, interval: string) =>
    mocks.getStripePriceId(tier, interval),
  getOrCreateStripeCustomer: mocks.getOrCreateStripeCustomer,
  createCheckoutSession: mocks.createCheckoutSession,
  retrieveOpenCheckoutSessionUrl: mocks.retrieveOpenCheckoutSessionUrl,
  stripeCheckoutSessionLookup: () => ({
    retrieveSession: mocks.retrieveSession,
    listSessionsByCustomerSince: mocks.listSessionsByCustomerSince,
  }),
}));
const dbMock = vi.hoisted(() => ({
  subscriptionFindUnique: vi.fn<(args: unknown) => Promise<unknown>>(),
  attemptCreate: vi.fn<(args: { data: Record<string, unknown> }) => Promise<unknown>>(),
  attemptFindUnique: vi.fn<(args: unknown) => Promise<unknown>>(),
  attemptUpdateMany: vi.fn<(args: unknown) => Promise<{ count: number }>>(),
  requireDurableWriteStore: vi.fn<(capability: string) => void>(),
}));
vi.mock("@sports/db", () => {
  /** Mirror of the real typed guard error so `instanceof` works in the route. */
  class DurableWriteStoreUnavailableError extends Error {
    readonly kind = "durable_write_store_unavailable" as const;
    readonly httpStatus = 503 as const;
    readonly capability: string;
    readonly reason: string;
    constructor(capability: string, reason: string, detail: string) {
      super(`Durable write store unavailable for capability "${capability}": ${detail}`);
      this.name = "DurableWriteStoreUnavailableError";
      this.capability = capability;
      this.reason = reason;
    }
  }
  return {
    DurableWriteStoreUnavailableError,
    requireDurableWriteStore: dbMock.requireDurableWriteStore,
    db: {
      subscription: { findUnique: dbMock.subscriptionFindUnique },
      checkoutAttempt: {
        create: dbMock.attemptCreate,
        findUnique: dbMock.attemptFindUnique,
        updateMany: dbMock.attemptUpdateMany,
      },
    },
  };
});

import { POST } from "@/app/api/subscriptions/checkout/route";
import { DurableWriteStoreUnavailableError } from "@sports/db";
import { resetRateLimits } from "@/lib/api/rate-limit";
import {
  computeRequestFingerprint,
  currentCheckoutCommercialParams,
  stripeIdempotencyKeyForAttempt,
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

/** Error shaped like a Stripe SDK error with the given `type` discriminant. */
function stripeError(type: string): Error & { type: string } {
  return Object.assign(new Error(`stripe ${type}`), { type });
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
    dbMock.requireDurableWriteStore.mockReset();
    dbMock.subscriptionFindUnique.mockResolvedValue(null); // no existing sub by default
    // Default attempt-store behavior: create echoes the row (durable echo),
    // no pre-existing attempt, updates (claim/bind/outcome) succeed.
    dbMock.attemptCreate.mockImplementation(async ({ data }) => ({ ...data }));
    dbMock.attemptFindUnique.mockResolvedValue(null);
    dbMock.attemptUpdateMany.mockResolvedValue({ count: 1 });
    // Durable store available by default; individual tests fail it closed.
    dbMock.requireDurableWriteStore.mockReturnValue(undefined);

    process.env["NEXT_PUBLIC_APP_URL"] = "https://app.example.com";

    mocks.auth.mockResolvedValue({ user });
    mocks.getStripePriceId.mockReturnValue("price_pro_monthly");
    mocks.getOrCreateStripeCustomer.mockResolvedValue("cus_123");
    mocks.retrieveOpenCheckoutSessionUrl.mockResolvedValue(null);
    mocks.createCheckoutSession.mockResolvedValue({ id: "cs_123", url: "https://checkout.stripe.com/s/123" });
    mocks.retrieveSession.mockReset();
    mocks.listSessionsByCustomerSince.mockReset();
    mocks.retrieveSession.mockResolvedValue(null);
    mocks.listSessionsByCustomerSince.mockResolvedValue([]);
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
    // The attempt was claimed (REQUEST_IN_FLIGHT) before the Stripe call…
    expect(dbMock.attemptUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "REQUEST_IN_FLIGHT" }),
      }),
    );
    // …and the session is bound back onto it for webhook reconciliation.
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

  describe("durable-write guard (5.2 — no Stripe side effect without a durable store)", () => {
    it("STUB MODE: typed 503, and the Stripe SDK is NEVER touched (no customer, no session)", async () => {
      dbMock.requireDurableWriteStore.mockImplementation(() => {
        throw new DurableWriteStoreUnavailableError(
          "stripe-checkout",
          "stub_client_active",
          "stub client active",
        );
      });

      const res = await POST(checkoutRequest({ tier: "PRO", clientIntentId: INTENT_ID }));
      const body = await res.json();

      expect(res.status).toBe(503);
      expect(body.code).toBe("durable_write_store_unavailable");
      expect(dbMock.requireDurableWriteStore).toHaveBeenCalledWith("stripe-checkout");
      // ZERO Stripe SDK calls and zero attempt writes in stub mode.
      expect(mocks.getOrCreateStripeCustomer).not.toHaveBeenCalled();
      expect(mocks.createCheckoutSession).not.toHaveBeenCalled();
      expect(dbMock.attemptCreate).not.toHaveBeenCalled();
    });

    it("guards BEFORE the subscription lookup and attempt machinery", async () => {
      dbMock.requireDurableWriteStore.mockImplementation(() => {
        throw new DurableWriteStoreUnavailableError("stripe-checkout", "database_url_not_durable", "x");
      });
      await POST(checkoutRequest({ tier: "PRO" }));
      expect(dbMock.subscriptionFindUnique).not.toHaveBeenCalled();
    });

    it("DEFENSE IN DEPTH: a non-durable attempt write (stub echo) is a typed 503, no Stripe session", async () => {
      // The store answers create() with a sentinel instead of echoing the row —
      // a write that did not happen. The route must refuse to call Stripe.
      dbMock.attemptCreate.mockResolvedValue({ id: "stub" });

      const res = await POST(checkoutRequest({ tier: "PRO", clientIntentId: INTENT_ID }));
      const body = await res.json();

      expect(res.status).toBe(503);
      expect(body.code).toBe("durable_write_store_unavailable");
      expect(mocks.createCheckoutSession).not.toHaveBeenCalled();
    });
  });

  describe("fail-closed subscription lookup (5.2)", () => {
    it("a DB lookup failure is a typed 503 with NO Stripe side effect (never fail-open)", async () => {
      dbMock.subscriptionFindUnique.mockRejectedValue(new Error("db connection refused"));
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
      try {
        const res = await POST(checkoutRequest({ tier: "PRO" }));
        const body = await res.json();

        expect(res.status).toBe(503);
        expect(body.code).toBe("subscription_lookup_unavailable");
        expect(mocks.getOrCreateStripeCustomer).not.toHaveBeenCalled();
        expect(mocks.createCheckoutSession).not.toHaveBeenCalled();
        expect(dbMock.attemptCreate).not.toHaveBeenCalled();
        // The failure is recorded as an ops incident (secret-free).
        expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("[INCIDENT]"));
      } finally {
        errorSpy.mockRestore();
      }
    });

    it("lookup success + live subscription → 409 portal; success + none → continue (contract table)", async () => {
      dbMock.subscriptionFindUnique.mockResolvedValue({ status: "TRIALING", tier: "ELITE" });
      expect((await POST(checkoutRequest({ tier: "PRO" }))).status).toBe(409);

      dbMock.subscriptionFindUnique.mockResolvedValue(null);
      expect((await POST(checkoutRequest({ tier: "PRO" }))).status).toBe(200);
    });
  });

  describe("durable checkout attempt (Phase 1P)", () => {
    /** Fingerprint the route computes for user_1 + PRO/month under current terms. */
    function proMonthlyFingerprint(): string {
      return computeRequestFingerprint(
        currentCheckoutCommercialParams({
          userId: "user_1",
          tier: "PRO",
          interval: "month",
          priceId: "price_pro_monthly",
          currency: "usd",
        }),
      );
    }

    const LIVE_ATTEMPT_ID = "ca_11111111-2222-4333-8444-555566667777";

    function liveAttempt(overrides: Record<string, unknown> = {}): Record<string, unknown> {
      return {
        id: LIVE_ATTEMPT_ID,
        originalClientIntentId: INTENT_ID,
        activeClientIntentId: INTENT_ID,
        userId: "user_1",
        subjectUserId: "user_1",
        subjectEmail: "pro@example.com",
        customerId: "cus_123",
        tier: "PRO",
        interval: "month",
        priceId: "price_pro_monthly",
        currency: "usd",
        quantity: 1,
        requestFingerprint: proMonthlyFingerprint(),
        fingerprintVersion: "v2",
        status: "SESSION_CREATED",
        lastOutcomeClass: null,
        stripeIdempotencyKey: stripeIdempotencyKeyForAttempt("user_1", LIVE_ATTEMPT_ID),
        stripeSessionId: "cs_original",
        stripeSubscriptionId: null,
        lastErrorKind: null,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        // Last write far in the past — quiet enough for the min-age
        // reconcile guard in the past-TTL tests.
        updatedAt: new Date(Date.now() - 60 * 60 * 1000),
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
      // The retry's create hits the (userId, activeClientIntentId) unique constraint.
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

    it("a past-TTL attempt whose session Stripe PROVES expired mints a fresh attempt + fresh session", async () => {
      const expired = liveAttempt({ expiresAt: new Date(Date.now() - 1000) });
      // First create collides with the stale row; the inline reconciliation
      // asks Stripe, which proves the bound session expired → the key is
      // released and the second create succeeds. Time alone NEVER releases
      // an unresolved attempt (see the unresolved tests below).
      dbMock.attemptCreate
        .mockRejectedValueOnce(p2002())
        .mockImplementation(async ({ data }) => ({ ...data }));
      dbMock.attemptFindUnique.mockResolvedValueOnce(expired);
      mocks.retrieveSession.mockResolvedValue({
        id: "cs_original",
        status: "expired",
        metadataAttemptId: expired["id"],
        subscriptionId: null,
      });

      const res = await POST(checkoutRequest({ tier: "PRO", clientIntentId: INTENT_ID }));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(mocks.retrieveSession).toHaveBeenCalledWith("cs_original");
      expect(body.url).toBe("https://checkout.stripe.com/s/123");
      // The dead row released ONLY its ACTIVE key under a terminal status —
      // originalClientIntentId is immutable and never part of the release.
      expect(dbMock.attemptUpdateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: expired["id"] }),
          data: expect.objectContaining({ activeClientIntentId: null, status: "EXPIRED" }),
        }),
      );
      const releaseCall = dbMock.attemptUpdateMany.mock.calls.find(
        (c) =>
          (c[0] as { data: Record<string, unknown> }).data["activeClientIntentId"] === null,
      );
      expect(
        (releaseCall![0] as { data: Record<string, unknown> }).data,
      ).not.toHaveProperty("originalClientIntentId");
      // …and a brand-new session was created (fresh attempt id → fresh Stripe key).
      expect(mocks.createCheckoutSession).toHaveBeenCalledTimes(1);
      const attemptId = (mocks.createCheckoutSession.mock.calls[0]![0] as { attemptId: string }).attemptId;
      expect(attemptId).not.toBe(expired["id"]);
    });

    it("a past-TTL attempt whose session is STILL OPEN replays that session — never a second payable session", async () => {
      const stale = liveAttempt({ expiresAt: new Date(Date.now() - 1000) });
      dbMock.attemptCreate.mockRejectedValue(p2002());
      // First fetch: the stale row; after reconciliation confirms the session
      // open, the loop re-reads the (unchanged) row and replays it.
      dbMock.attemptFindUnique.mockResolvedValue(stale);
      mocks.retrieveSession.mockResolvedValue({
        id: "cs_original",
        status: "open",
        metadataAttemptId: stale["id"],
        subscriptionId: null,
      });
      mocks.retrieveOpenCheckoutSessionUrl.mockResolvedValue(
        "https://checkout.stripe.com/s/original",
      );

      const res = await POST(checkoutRequest({ tier: "PRO", clientIntentId: INTENT_ID }));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.url).toBe("https://checkout.stripe.com/s/original");
      // The whole point: NO second session, NO fresh idempotency key.
      expect(mocks.createCheckoutSession).not.toHaveBeenCalled();
    });

    it("a past-TTL AMBIGUOUS attempt Stripe cannot prove anything about is a 409, never a fresh key (5.3)", async () => {
      const ambiguous = liveAttempt({
        status: "AMBIGUOUS",
        stripeSessionId: null,
        customerId: null, // nothing to search under → reconciliation cannot prove
        expiresAt: new Date(Date.now() - 1000),
      });
      dbMock.attemptCreate.mockRejectedValue(p2002());
      dbMock.attemptFindUnique.mockResolvedValue(ambiguous);

      const res = await POST(checkoutRequest({ tier: "PRO", clientIntentId: INTENT_ID }));
      const body = await res.json();

      expect(res.status).toBe(409);
      expect(body.code).toBe("checkout_attempt_unresolved");
      expect(res.headers.get("Retry-After")).toBe("60");
      expect(mocks.createCheckoutSession).not.toHaveBeenCalled();
      // The active key was never released on elapsed time alone.
      expect(dbMock.attemptUpdateMany).not.toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ activeClientIntentId: null }),
        }),
      );
    });

    it("a Stripe transport failure during inline reconciliation is a 500, not a silent release", async () => {
      const stale = liveAttempt({ expiresAt: new Date(Date.now() - 1000) });
      dbMock.attemptCreate.mockRejectedValue(p2002());
      dbMock.attemptFindUnique.mockResolvedValue(stale);
      mocks.retrieveSession.mockRejectedValue(new Error("stripe unreachable"));

      const res = await POST(checkoutRequest({ tier: "PRO", clientIntentId: INTENT_ID }));

      expect(res.status).toBe(500);
      expect(mocks.createCheckoutSession).not.toHaveBeenCalled();
      expect(dbMock.attemptUpdateMany).not.toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ activeClientIntentId: null }),
        }),
      );
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

    it("a REQUEST_IN_FLIGHT attempt is not raced: 409 in-progress, no Stripe call", async () => {
      dbMock.attemptCreate.mockRejectedValue(p2002());
      dbMock.attemptFindUnique.mockResolvedValue(liveAttempt({ status: "REQUEST_IN_FLIGHT" }));

      const res = await POST(checkoutRequest({ tier: "PRO", clientIntentId: INTENT_ID }));
      const body = await res.json();

      expect(res.status).toBe(409);
      expect(body.code).toBe("checkout_attempt_in_progress");
      expect(res.headers.get("Retry-After")).toBe("2");
      expect(mocks.createCheckoutSession).not.toHaveBeenCalled();
    });

    it("losing the claim race is a 409 in-progress, never a duplicate Stripe call", async () => {
      // The attempt exists and is claimable, but ANOTHER request wins the
      // atomic claim between our fetch and update (count 0).
      dbMock.attemptCreate.mockRejectedValue(p2002());
      dbMock.attemptFindUnique.mockResolvedValue(liveAttempt({ status: "CREATED", stripeSessionId: null }));
      dbMock.attemptUpdateMany.mockResolvedValue({ count: 0 });

      const res = await POST(checkoutRequest({ tier: "PRO", clientIntentId: INTENT_ID }));
      const body = await res.json();

      expect(res.status).toBe(409);
      expect(body.code).toBe("checkout_attempt_in_progress");
      expect(mocks.createCheckoutSession).not.toHaveBeenCalled();
    });

    it("a token-less request mints its own server attempt (safe default)", async () => {
      const res = await POST(checkoutRequest({ tier: "PRO" }));
      expect(res.status).toBe(200);
      expect(dbMock.attemptCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            originalClientIntentId: null,
            activeClientIntentId: null,
            userId: "user_1",
            subjectUserId: "user_1",
            subjectEmail: "pro@example.com",
          }),
        }),
      );
    });
  });

  describe("outcome classification on Stripe failure (5.3)", () => {
    it("an AMBIGUOUS network error keeps the attempt AND key: 503, status AMBIGUOUS, key NOT released", async () => {
      mocks.createCheckoutSession.mockRejectedValue(stripeError("StripeConnectionError"));

      const res = await POST(checkoutRequest({ tier: "PRO", clientIntentId: INTENT_ID }));
      const body = await res.json();

      expect(res.status).toBe(503);
      expect(body.code).toBe("checkout_outcome_ambiguous");
      const outcomeCall = dbMock.attemptUpdateMany.mock.calls.find(
        (c) => (c[0] as { data: Record<string, unknown> }).data["status"] === "AMBIGUOUS",
      );
      expect(outcomeCall).toBeDefined();
      const data = (outcomeCall![0] as { data: Record<string, unknown> }).data;
      expect(data["lastOutcomeClass"]).toBe("AMBIGUOUS_NETWORK_OUTCOME");
      // The active key is RETAINED — no release field in the update.
      expect(data).not.toHaveProperty("activeClientIntentId");
    });

    it("the retry of an AMBIGUOUS attempt reuses the SAME attempt id (→ same Stripe idempotency key)", async () => {
      const ambiguous = liveAmbiguousAttempt();
      dbMock.attemptCreate.mockRejectedValue(p2002());
      dbMock.attemptFindUnique.mockResolvedValue(ambiguous);

      const res = await POST(checkoutRequest({ tier: "PRO", clientIntentId: INTENT_ID }));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.url).toBe("https://checkout.stripe.com/s/123");
      expect(mocks.createCheckoutSession).toHaveBeenCalledTimes(1);
      const args = mocks.createCheckoutSession.mock.calls[0]![0] as { attemptId: string; userId: string };
      // Same attempt id → stripeIdempotencyKeyForAttempt derives the SAME key.
      expect(args.attemptId).toBe(ambiguous["id"]);
      expect(stripeIdempotencyKeyForAttempt(args.userId, args.attemptId)).toBe(
        ambiguous["stripeIdempotencyKey"],
      );
    });

    it("a CONFIGURATION failure is terminal: 502, FAILED, active key released in the same update", async () => {
      mocks.createCheckoutSession.mockRejectedValue(stripeError("StripeInvalidRequestError"));

      const res = await POST(checkoutRequest({ tier: "PRO", clientIntentId: INTENT_ID }));
      const body = await res.json();

      expect(res.status).toBe(502);
      expect(body.code).toBe("checkout_configuration_failure");
      expect(dbMock.attemptUpdateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: "FAILED",
            lastOutcomeClass: "CONFIGURATION_FAILURE",
            lastErrorKind: "stripe_session_create_failed",
            activeClientIntentId: null,
          }),
        }),
      );
    });

    it("a RETRIABLE (rate-limited) failure returns the attempt to CREATED with its key intact", async () => {
      mocks.createCheckoutSession.mockRejectedValue(stripeError("StripeRateLimitError"));

      const res = await POST(checkoutRequest({ tier: "PRO", clientIntentId: INTENT_ID }));
      const body = await res.json();

      expect(res.status).toBe(503);
      expect(body.code).toBe("checkout_retriable");
      const outcomeCall = dbMock.attemptUpdateMany.mock.calls.find(
        (c) =>
          (c[0] as { data: Record<string, unknown> }).data["lastOutcomeClass"] ===
          "RETRIABLE_NO_REQUEST_SENT",
      );
      expect(outcomeCall).toBeDefined();
      const data = (outcomeCall![0] as { data: Record<string, unknown> }).data;
      expect(data["status"]).toBe("CREATED");
      expect(data).not.toHaveProperty("activeClientIntentId");
    });

    it("an UNCLASSIFIABLE error fails safe as AMBIGUOUS (503) — never a silent fresh key", async () => {
      mocks.createCheckoutSession.mockRejectedValue(new Error("stripe unreachable"));

      const res = await POST(checkoutRequest({ tier: "PRO", clientIntentId: INTENT_ID }));
      const body = await res.json();

      expect(res.status).toBe(503);
      expect(body.code).toBe("checkout_outcome_ambiguous");
    });

    /** An AMBIGUOUS live attempt fixture for retry tests. */
    function liveAmbiguousAttempt(): Record<string, unknown> {
      const id = "ca_11111111-2222-4333-8444-555566667777";
      return {
        id,
        originalClientIntentId: INTENT_ID,
        activeClientIntentId: INTENT_ID,
        userId: "user_1",
        subjectUserId: "user_1",
        subjectEmail: "pro@example.com",
        customerId: "cus_123",
        tier: "PRO",
        interval: "month",
        priceId: "price_pro_monthly",
        currency: "usd",
        quantity: 1,
        requestFingerprint: computeRequestFingerprint(
          currentCheckoutCommercialParams({
            userId: "user_1",
            tier: "PRO",
            interval: "month",
            priceId: "price_pro_monthly",
            currency: "usd",
          }),
        ),
        fingerprintVersion: "v2",
        status: "AMBIGUOUS",
        lastOutcomeClass: "AMBIGUOUS_NETWORK_OUTCOME",
        stripeIdempotencyKey: stripeIdempotencyKeyForAttempt("user_1", id),
        stripeSessionId: null,
        stripeSubscriptionId: null,
        lastErrorKind: "stripe_session_create_failed",
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      };
    }
  });
});
