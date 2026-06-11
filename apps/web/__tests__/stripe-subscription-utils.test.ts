import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type Stripe from "stripe";

/**
 * Unit tests for Stripe subscription utility functions.
 *
 * These pure functions map Stripe data (price IDs, subscription statuses)
 * to our internal domain types. They sit on the revenue-critical path and
 * are tested in isolation so any mapping regression is caught before
 * touching production subscription records.
 */

async function freshUtils() {
  vi.resetModules();
  return await import("@/lib/stripe/subscription-utils");
}

describe("getTierFromPriceId", () => {
  beforeEach(() => {
    process.env["STRIPE_PRO_MONTHLY_PRICE_ID"] = "price_pro_monthly";
    process.env["STRIPE_PRO_ANNUAL_PRICE_ID"] = "price_pro_annual";
    process.env["STRIPE_PRO_PRICE_ID"] = "price_pro_legacy";
    process.env["STRIPE_ELITE_MONTHLY_PRICE_ID"] = "price_elite_monthly";
    process.env["STRIPE_ELITE_ANNUAL_PRICE_ID"] = "price_elite_annual";
    process.env["STRIPE_ELITE_PRICE_ID"] = "price_elite_legacy";
  });

  afterEach(() => {
    for (const k of [
      "STRIPE_PRO_MONTHLY_PRICE_ID",
      "STRIPE_PRO_ANNUAL_PRICE_ID",
      "STRIPE_PRO_PRICE_ID",
      "STRIPE_ELITE_MONTHLY_PRICE_ID",
      "STRIPE_ELITE_ANNUAL_PRICE_ID",
      "STRIPE_ELITE_PRICE_ID",
    ]) delete process.env[k];
  });

  it("returns PRO for pro monthly price ID", async () => {
    const { getTierFromPriceId } = await freshUtils();
    expect(getTierFromPriceId("price_pro_monthly")).toBe("PRO");
  });

  it("returns PRO for pro annual price ID", async () => {
    const { getTierFromPriceId } = await freshUtils();
    expect(getTierFromPriceId("price_pro_annual")).toBe("PRO");
  });

  it("returns PRO for pro legacy price ID", async () => {
    const { getTierFromPriceId } = await freshUtils();
    expect(getTierFromPriceId("price_pro_legacy")).toBe("PRO");
  });

  it("returns ELITE for elite monthly price ID", async () => {
    const { getTierFromPriceId } = await freshUtils();
    expect(getTierFromPriceId("price_elite_monthly")).toBe("ELITE");
  });

  it("returns ELITE for elite annual price ID", async () => {
    const { getTierFromPriceId } = await freshUtils();
    expect(getTierFromPriceId("price_elite_annual")).toBe("ELITE");
  });

  it("returns ELITE for elite legacy price ID", async () => {
    const { getTierFromPriceId } = await freshUtils();
    expect(getTierFromPriceId("price_elite_legacy")).toBe("ELITE");
  });

  it("returns FREE for an unknown price ID", async () => {
    const { getTierFromPriceId } = await freshUtils();
    expect(getTierFromPriceId("price_unknown_xyz")).toBe("FREE");
  });

  it("returns FREE for undefined", async () => {
    const { getTierFromPriceId } = await freshUtils();
    expect(getTierFromPriceId(undefined)).toBe("FREE");
  });

  it("returns FREE when no env vars are set", async () => {
    for (const k of [
      "STRIPE_PRO_MONTHLY_PRICE_ID",
      "STRIPE_PRO_ANNUAL_PRICE_ID",
      "STRIPE_PRO_PRICE_ID",
      "STRIPE_ELITE_MONTHLY_PRICE_ID",
      "STRIPE_ELITE_ANNUAL_PRICE_ID",
      "STRIPE_ELITE_PRICE_ID",
    ]) delete process.env[k];
    const { getTierFromPriceId } = await freshUtils();
    expect(getTierFromPriceId("price_pro_monthly")).toBe("FREE");
  });
});

describe("mapStripeStatus", () => {
  it("maps active → ACTIVE", async () => {
    const { mapStripeStatus } = await freshUtils();
    expect(mapStripeStatus("active" as Stripe.Subscription.Status)).toBe("ACTIVE");
  });

  it("maps trialing → TRIALING", async () => {
    const { mapStripeStatus } = await freshUtils();
    expect(mapStripeStatus("trialing" as Stripe.Subscription.Status)).toBe("TRIALING");
  });

  it("maps past_due → PAST_DUE", async () => {
    const { mapStripeStatus } = await freshUtils();
    expect(mapStripeStatus("past_due" as Stripe.Subscription.Status)).toBe("PAST_DUE");
  });

  it("maps canceled → CANCELED", async () => {
    const { mapStripeStatus } = await freshUtils();
    expect(mapStripeStatus("canceled" as Stripe.Subscription.Status)).toBe("CANCELED");
  });

  it("maps incomplete_expired → CANCELED", async () => {
    const { mapStripeStatus } = await freshUtils();
    expect(mapStripeStatus("incomplete_expired" as Stripe.Subscription.Status)).toBe("CANCELED");
  });

  it("maps incomplete → INCOMPLETE", async () => {
    const { mapStripeStatus } = await freshUtils();
    expect(mapStripeStatus("incomplete" as Stripe.Subscription.Status)).toBe("INCOMPLETE");
  });

  it("maps paused → PAUSED", async () => {
    const { mapStripeStatus } = await freshUtils();
    expect(mapStripeStatus("paused" as Stripe.Subscription.Status)).toBe("PAUSED");
  });

  it("maps unpaid → PAST_DUE (treated as past-due, not canceled)", async () => {
    const { mapStripeStatus } = await freshUtils();
    expect(mapStripeStatus("unpaid" as Stripe.Subscription.Status)).toBe("PAST_DUE");
  });
});
