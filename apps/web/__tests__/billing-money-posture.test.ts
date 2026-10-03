import { describe, expect, it } from "vitest";
import { loadBillingMoneyPosture } from "@/lib/ops/billing-money-posture";
import { probeCheckoutMoneyPath } from "@/lib/health/live-capability-probes";

describe("loadBillingMoneyPosture", () => {
  it("reports missing secret as not creatable", () => {
    const p = loadBillingMoneyPosture({});
    expect(p.stripeSecretConfigured).toBe(false);
    expect(p.checkoutCreatable).toBe(false);
    expect(p.moneyPathReady).toBe(false);
    expect(p.envPriceSlotsTotal).toBe(6);
    expect(p.envPriceSlotsConfigured).toBe(0);
    expect(p.operatorHint).toMatch(/STRIPE_SECRET_KEY missing/i);
  });

  it("secret without webhook is creatable but not money-path ready", () => {
    const p = loadBillingMoneyPosture({ STRIPE_SECRET_KEY: "sk_test_x" });
    expect(p.checkoutCreatable).toBe(true);
    expect(p.webhookSecretConfigured).toBe(false);
    expect(p.moneyPathReady).toBe(false);
    expect(p.operatorHint).toMatch(/webhook/i);
  });

  it("counts env price slots without leaking ids", () => {
    const p = loadBillingMoneyPosture({
      STRIPE_SECRET_KEY: "sk_test_x",
      STRIPE_WEBHOOK_SECRET: "whsec_x",
      STRIPE_PRO_MONTHLY_PRICE_ID: "price_pro_m",
      STRIPE_FANTASY_MONTHLY_PRICE_ID: "price_fantasy_m",
    });
    expect(p.envPriceSlotsConfigured).toBe(2);
    expect(p.moneyPathReady).toBe(true);
    const serialized = JSON.stringify(p);
    expect(serialized).not.toContain("sk_test");
    expect(serialized).not.toContain("whsec");
    expect(serialized).not.toContain("price_pro_m");
    expect(p.priceSlots.every((s) => typeof s.lookupKey === "string")).toBe(true);
  });

  it("exposes stable API paths", () => {
    const p = loadBillingMoneyPosture({ STRIPE_SECRET_KEY: "sk" });
    expect(p.checkoutApiPath).toBe("/api/subscriptions/checkout");
    expect(p.webhookApiPath).toBe("/api/webhooks/stripe");
    expect(p.portalApiPath).toBe("/api/subscriptions/portal");
  });
});

describe("probeCheckoutMoneyPath", () => {
  it("maps missing secret to unavailable leaves", () => {
    const { checkout, revenue } = probeCheckoutMoneyPath({});
    expect(checkout.capabilityId).toBe("checkout");
    expect(checkout.status).toBe("unavailable");
    expect(revenue.capabilityId).toBe("revenue-checkout");
    expect(revenue.status).toBe("unavailable");
  });

  it("maps secret-only to degraded revenue (no webhook)", () => {
    const { checkout, revenue } = probeCheckoutMoneyPath({
      STRIPE_SECRET_KEY: "sk_test_x",
      STRIPE_PRO_MONTHLY_PRICE_ID: "price_1",
    });
    expect(checkout.status).toBe("healthy");
    expect(revenue.status).toBe("degraded");
  });

  it("maps full money path to healthy", () => {
    const { checkout, revenue } = probeCheckoutMoneyPath({
      STRIPE_SECRET_KEY: "sk_test_x",
      STRIPE_WEBHOOK_SECRET: "whsec_x",
      STRIPE_PRO_MONTHLY_PRICE_ID: "price_1",
    });
    expect(checkout.status).toBe("healthy");
    expect(revenue.status).toBe("healthy");
  });
});
