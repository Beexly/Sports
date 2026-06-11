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
  createCheckoutSession: vi.fn<(args: unknown) => Promise<{ url: string | null }>>(),
}));

vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/stripe", () => ({
  getStripePriceId: mocks.getStripePriceId,
  getOrCreateStripeCustomer: mocks.getOrCreateStripeCustomer,
  createCheckoutSession: mocks.createCheckoutSession,
}));

import { POST } from "@/app/api/subscriptions/checkout/route";

function checkoutRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/subscriptions/checkout", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

const user = { id: "user_1", email: "pro@example.com", name: "Pro User" };

describe("POST /api/subscriptions/checkout", () => {
  beforeEach(() => {
    mocks.auth.mockReset();
    mocks.getStripePriceId.mockReset();
    mocks.getOrCreateStripeCustomer.mockReset();
    mocks.createCheckoutSession.mockReset();

    process.env["NEXT_PUBLIC_APP_URL"] = "https://app.example.com";

    mocks.auth.mockResolvedValue({ user });
    mocks.getStripePriceId.mockReturnValue("price_pro_monthly");
    mocks.getOrCreateStripeCustomer.mockResolvedValue("cus_123");
    mocks.createCheckoutSession.mockResolvedValue({ url: "https://checkout.stripe.com/s/123" });
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

  it("creates a checkout session with the user's customer id and metadata", async () => {
    const res = await POST(checkoutRequest({ tier: "ELITE", interval: "year" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.url).toBe("https://checkout.stripe.com/s/123");
    expect(mocks.getOrCreateStripeCustomer).toHaveBeenCalledWith("user_1", "pro@example.com", "Pro User");
    expect(mocks.createCheckoutSession).toHaveBeenCalledWith({
      customerId: "cus_123",
      priceId: "price_pro_monthly",
      userId: "user_1",
      successUrl: "https://app.example.com/dashboard?upgraded=true",
      cancelUrl: "https://app.example.com/pricing",
    });
  });

  it("returns 500 when Stripe session creation fails", async () => {
    mocks.createCheckoutSession.mockRejectedValue(new Error("stripe unreachable"));
    const res = await POST(checkoutRequest({ tier: "PRO" }));
    expect(res.status).toBe(500);
  });
});
