import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

/**
 * Behavioral tests for the Stripe billing-portal route.
 *
 * This is a money path: the portal is where a subscriber changes their card,
 * upgrades, or cancels. Before this file nothing in the suite executed this
 * handler — `billing-money-posture.test.ts` only asserts that a posture
 * constant equals the string "/api/subscriptions/portal", which would keep
 * passing even if the handler returned 200 to anonymous callers.
 *
 * The failure modes that cost money or trust, all covered below:
 *   - the auth gate (an anonymous caller must never mint a portal session)
 *   - the customer<->user linkage (a user with no Stripe customer must 404,
 *     never reach Stripe with an undefined/foreign customer id)
 *   - the per-user rate limit (a looping client billing Stripe resources)
 *   - the durable-write guard (typed 503, no Stripe side effect)
 *   - error-message containment (internal detail must not reach the client)
 *
 * Runtime assertions only: apps/web/tsconfig.json excludes __tests__ from
 * typechecking, so a type-level assertion here would prove nothing.
 */

const mocks = vi.hoisted(() => ({
  auth: vi.fn<() => Promise<{ user?: { id: string } } | null>>(),
  createPortalSession: vi.fn<(customerId: string, returnUrl: string) => Promise<{ url: string }>>(),
}));

vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/stripe", () => ({ createPortalSession: mocks.createPortalSession }));

const dbMock = vi.hoisted(() => ({
  subscriptionFindUnique: vi.fn<(args: unknown) => Promise<unknown>>(),
}));

vi.mock("@sports/db", () => {
  /** Mirror of the real typed guard error so the route's `instanceof` matches. */
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
    db: { subscription: { findUnique: dbMock.subscriptionFindUnique } },
  };
});

import { POST } from "@/app/api/subscriptions/portal/route";
import { DurableWriteStoreUnavailableError } from "@sports/db";
import { resetRateLimits } from "@/lib/api/rate-limit";

function portalRequest(): NextRequest {
  return new NextRequest("http://localhost/api/subscriptions/portal", { method: "POST" });
}

const USER = { id: "user_portal_1" };

describe("POST /api/subscriptions/portal", () => {
  beforeEach(() => {
    resetRateLimits();
    mocks.auth.mockReset();
    mocks.createPortalSession.mockReset();
    dbMock.subscriptionFindUnique.mockReset();

    process.env["NEXT_PUBLIC_APP_URL"] = "https://app.example.com";
    mocks.auth.mockResolvedValue({ user: USER });
    dbMock.subscriptionFindUnique.mockResolvedValue({ stripeCustomerId: "cus_portal_1" });
    mocks.createPortalSession.mockResolvedValue({ url: "https://billing.stripe.com/p/session_1" });
  });

  describe("auth gate", () => {
    it("returns 401 for an anonymous caller and never touches Stripe or the DB", async () => {
      mocks.auth.mockResolvedValue(null);

      const res = await POST(portalRequest());

      expect(res.status).toBe(401);
      expect(mocks.createPortalSession).not.toHaveBeenCalled();
      expect(dbMock.subscriptionFindUnique).not.toHaveBeenCalled();
    });

    it("returns 401 when the session exists but carries no user id", async () => {
      mocks.auth.mockResolvedValue({ user: undefined });

      const res = await POST(portalRequest());

      expect(res.status).toBe(401);
      expect(mocks.createPortalSession).not.toHaveBeenCalled();
    });
  });

  describe("customer <-> user linkage", () => {
    it("returns 404 with NO Stripe call when the user has no subscription row", async () => {
      dbMock.subscriptionFindUnique.mockResolvedValue(null);

      const res = await POST(portalRequest());
      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body.error).toBe("No billing account found");
      // The guard that matters: never open a portal without a linked customer.
      expect(mocks.createPortalSession).not.toHaveBeenCalled();
    });

    it("returns 404 when the subscription row exists but has a null stripeCustomerId", async () => {
      dbMock.subscriptionFindUnique.mockResolvedValue({ stripeCustomerId: null });

      const res = await POST(portalRequest());

      expect(res.status).toBe(404);
      expect(mocks.createPortalSession).not.toHaveBeenCalled();
    });

    it("scopes the customer lookup to the CALLER's own user id", async () => {
      await POST(portalRequest());

      expect(dbMock.subscriptionFindUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: "user_portal_1" } }),
      );
    });

    it("opens the portal for the caller's own customer id and returns its url", async () => {
      const res = await POST(portalRequest());
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.url).toBe("https://billing.stripe.com/p/session_1");
      expect(mocks.createPortalSession).toHaveBeenCalledWith(
        "cus_portal_1",
        "https://app.example.com/dashboard",
      );
    });
  });

  describe("rate limit (Stripe resource creation per user)", () => {
    it("allows 10 portal sessions then 429s with Retry-After, per-user", async () => {
      for (let i = 0; i < 10; i++) {
        expect((await POST(portalRequest())).status).toBe(200);
      }

      const blocked = await POST(portalRequest());
      expect(blocked.status).toBe(429);
      expect(blocked.headers.get("Retry-After")).toBeTruthy();
      // 10 Stripe sessions were minted, not 11.
      expect(mocks.createPortalSession).toHaveBeenCalledTimes(10);

      // A different user has their own bucket.
      mocks.auth.mockResolvedValue({ user: { id: "user_portal_2" } });
      expect((await POST(portalRequest())).status).toBe(200);
    });

    it("rate-limits AFTER the auth gate, so anonymous floods cannot exhaust a user bucket", async () => {
      mocks.auth.mockResolvedValue(null);
      for (let i = 0; i < 15; i++) {
        expect((await POST(portalRequest())).status).toBe(401);
      }

      // The real user's bucket is untouched by the anonymous flood.
      mocks.auth.mockResolvedValue({ user: USER });
      expect((await POST(portalRequest())).status).toBe(200);
    });
  });

  describe("failure containment", () => {
    it("maps the durable-write guard to a typed 503", async () => {
      mocks.createPortalSession.mockRejectedValue(
        new DurableWriteStoreUnavailableError("stripe-portal", "stub_client_active", "stub client active"),
      );

      const res = await POST(portalRequest());
      const body = await res.json();

      expect(res.status).toBe(503);
      expect(body.code).toBe("durable_write_store_unavailable");
    });

    it("returns a generic 500 and does NOT leak the internal Stripe error to the client", async () => {
      const secretish = "No such customer: cus_leaked_internal_id";
      mocks.createPortalSession.mockRejectedValue(new Error(secretish));
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

      try {
        const res = await POST(portalRequest());
        const body = await res.json();

        expect(res.status).toBe(500);
        expect(body.error).toBe("Billing portal could not be opened.");
        // The internal detail is logged server-side but never serialized out.
        expect(JSON.stringify(body)).not.toContain("cus_leaked_internal_id");
        expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining(secretish));
      } finally {
        errorSpy.mockRestore();
      }
    });

    it("a non-Error rejection still yields a generic 500 rather than crashing the route", async () => {
      mocks.createPortalSession.mockRejectedValue("plain string rejection");
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

      try {
        const res = await POST(portalRequest());
        expect(res.status).toBe(500);
      } finally {
        errorSpy.mockRestore();
      }
    });
  });
});
