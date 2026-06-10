import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { StripeConfigurationError } from "@/lib/stripe";

/**
 * /api/subscriptions/checkout + /api/subscriptions/portal — guard proof (R-08).
 *
 * lib/stripe and lib/auth are mocked so the routes' own guards are tested in
 * isolation (no Stripe client, no DB, no network):
 *   - unauthenticated → 401 before any billing work
 *   - invalid tier    → 400 (only PRO / ELITE are purchasable)
 *   - unconfigured    → 503 (StripeConfigurationError / presence check)
 *   - happy path      → checkout URL for the mapped price id
 *   - portal          → 404 without a billing record, 200 with one
 */

const mocks = vi.hoisted(() => ({
  auth: vi.fn<() => Promise<unknown>>(),
  isStripeConfigured: vi.fn<() => boolean>(),
  getOrCreateStripeCustomer: vi.fn<(...args: unknown[]) => Promise<string>>(),
  createCheckoutSession: vi.fn<(args?: unknown) => Promise<unknown>>(),
  createPortalSession: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
  subscriptionFindUnique: vi.fn<(args?: unknown) => Promise<unknown>>(),
}));

vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));

vi.mock("@/lib/stripe", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/stripe")>();
  return {
    ...actual, // keeps the real StripeConfigurationError class identity
    STRIPE_PRICE_IDS: { PRO: "price_pro_test", ELITE: "price_elite_test" },
    isStripeConfigured: mocks.isStripeConfigured,
    getOrCreateStripeCustomer: mocks.getOrCreateStripeCustomer,
    createCheckoutSession: mocks.createCheckoutSession,
    createPortalSession: mocks.createPortalSession,
  };
});

vi.mock("@sports/db", () => ({
  db: { subscription: { findUnique: mocks.subscriptionFindUnique } },
}));

async function postCheckout(
  body: unknown
): Promise<{ status: number; body: Record<string, unknown> }> {
  const mod = await import("@/app/api/subscriptions/checkout/route");
  const res = await mod.POST(
    new NextRequest("https://gse.test/api/subscriptions/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    })
  );
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
}

async function postPortal(): Promise<{ status: number; body: Record<string, unknown> }> {
  const mod = await import("@/app/api/subscriptions/portal/route");
  const res = await mod.POST(
    new NextRequest("https://gse.test/api/subscriptions/portal", { method: "POST" })
  );
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
}

beforeEach(() => {
  mocks.auth
    .mockReset()
    .mockResolvedValue({
      user: { id: "user_1", email: "user@example.com", name: "Test User" },
    });
  mocks.isStripeConfigured.mockReset().mockReturnValue(true);
  mocks.getOrCreateStripeCustomer.mockReset().mockResolvedValue("cus_test_1");
  mocks.createCheckoutSession
    .mockReset()
    .mockResolvedValue({ url: "https://checkout.stripe.com/c/pay_test" });
  mocks.createPortalSession
    .mockReset()
    .mockResolvedValue({ url: "https://billing.stripe.com/p/session_test" });
  mocks.subscriptionFindUnique
    .mockReset()
    .mockResolvedValue({ stripeCustomerId: "cus_test_1" });
});

describe("/api/subscriptions/checkout guards", () => {
  it("returns 401 for unauthenticated requests before any billing work", async () => {
    mocks.auth.mockResolvedValue(null);

    const { status, body } = await postCheckout({ tier: "PRO" });

    expect(status).toBe(401);
    expect(body["error"]).toBe("Unauthorized");
    expect(mocks.getOrCreateStripeCustomer).not.toHaveBeenCalled();
    expect(mocks.createCheckoutSession).not.toHaveBeenCalled();
  });

  it("returns 401 when the session has no user id", async () => {
    mocks.auth.mockResolvedValue({ user: {} });

    const { status } = await postCheckout({ tier: "PRO" });

    expect(status).toBe(401);
    expect(mocks.getOrCreateStripeCustomer).not.toHaveBeenCalled();
  });

  it("rejects tiers outside PRO/ELITE with 400 (FREE is not purchasable)", async () => {
    const { status, body } = await postCheckout({ tier: "FREE" });

    expect(status).toBe(400);
    expect(body["error"]).toBe("Invalid tier");
    expect(mocks.getOrCreateStripeCustomer).not.toHaveBeenCalled();
  });

  it("rejects garbage bodies with 400", async () => {
    const { status } = await postCheckout({ tier: "PLATINUM", admin: true });
    expect(status).toBe(400);
    expect(mocks.createCheckoutSession).not.toHaveBeenCalled();
  });

  it("returns 503 when Stripe is not configured instead of attempting checkout", async () => {
    mocks.isStripeConfigured.mockReturnValue(false);

    const { status, body } = await postCheckout({ tier: "PRO" });

    expect(status).toBe(503);
    expect(body["error"]).toBe("Billing is not configured");
    expect(mocks.getOrCreateStripeCustomer).not.toHaveBeenCalled();
  });

  it("creates a PRO checkout session with the PRO price id for the authed user", async () => {
    const { status, body } = await postCheckout({ tier: "PRO" });

    expect(status).toBe(200);
    expect(body["url"]).toBe("https://checkout.stripe.com/c/pay_test");
    expect(mocks.getOrCreateStripeCustomer).toHaveBeenCalledWith(
      "user_1",
      "user@example.com",
      "Test User"
    );
    expect(mocks.createCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({
        customerId: "cus_test_1",
        priceId: "price_pro_test",
        userId: "user_1",
      })
    );
  });

  it("creates an ELITE checkout session with the ELITE price id", async () => {
    const { status } = await postCheckout({ tier: "ELITE" });

    expect(status).toBe(200);
    expect(mocks.createCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({ priceId: "price_elite_test" })
    );
  });

  it("maps a StripeConfigurationError thrown mid-flight to 503, not 500", async () => {
    mocks.getOrCreateStripeCustomer.mockRejectedValue(new StripeConfigurationError());

    const { status, body } = await postCheckout({ tier: "PRO" });

    expect(status).toBe(503);
    expect(String(body["error"])).toMatch(/not configured/i);
  });

  it("maps unexpected errors to 500", async () => {
    mocks.createCheckoutSession.mockRejectedValue(new Error("stripe exploded"));

    const { status } = await postCheckout({ tier: "PRO" });

    expect(status).toBe(500);
  });
});

describe("/api/subscriptions/portal guards", () => {
  it("returns 401 for unauthenticated requests", async () => {
    mocks.auth.mockResolvedValue(null);

    const { status } = await postPortal();

    expect(status).toBe(401);
    expect(mocks.createPortalSession).not.toHaveBeenCalled();
  });

  it("returns 404 when the user has no billing account", async () => {
    mocks.subscriptionFindUnique.mockResolvedValue(null);

    const { status, body } = await postPortal();

    expect(status).toBe(404);
    expect(body["error"]).toBe("No billing account found");
    expect(mocks.createPortalSession).not.toHaveBeenCalled();
  });

  it("maps a StripeConfigurationError to 503", async () => {
    mocks.createPortalSession.mockRejectedValue(new StripeConfigurationError());

    const { status } = await postPortal();

    expect(status).toBe(503);
  });

  it("returns the portal URL for a user with a billing account", async () => {
    const { status, body } = await postPortal();

    expect(status).toBe(200);
    expect(body["url"]).toBe("https://billing.stripe.com/p/session_test");
    expect(mocks.createPortalSession).toHaveBeenCalledWith(
      "cus_test_1",
      expect.stringContaining("/dashboard")
    );
  });
});
