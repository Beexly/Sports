import { afterEach, describe, expect, it } from "vitest";
import { loadCheckoutPricePosture } from "@/lib/ops/checkout-price-posture";
import { advertisedPhaseUnitAmountCents } from "@/lib/billing/price-ids";

/**
 * loadCheckoutPricePosture (issue #822) — makes zero Stripe calls, so
 * getCurrentPricingPhaseId/advertisedPhaseUnitAmountCents read PRICING_PHASE
 * from process.env directly rather than the `env` param this module takes
 * (that param only reaches checkoutPriceId, for the env-price-id booleans).
 */
const ORIGINAL_PHASE = process.env.PRICING_PHASE;

afterEach(() => {
  if (ORIGINAL_PHASE === undefined) delete process.env.PRICING_PHASE;
  else process.env.PRICING_PHASE = ORIGINAL_PHASE;
});

describe("loadCheckoutPricePosture", () => {
  it("FOUNDING reads as the safe baseline, not the #822 risk window", () => {
    process.env.PRICING_PHASE = "FOUNDING";
    const p = loadCheckoutPricePosture({});
    expect(p.phase).toBe("FOUNDING");
    expect(p.phaseAdvancedPastFounding).toBe(false);
    expect(p.operatorHint).not.toMatch(/issue #822/);
  });

  it("a stepped-up phase flags the #822 risk window in the operator hint", () => {
    process.env.PRICING_PHASE = "PROVEN";
    const p = loadCheckoutPricePosture({});
    expect(p.phase).toBe("PROVEN");
    expect(p.phaseAdvancedPastFounding).toBe(true);
    expect(p.operatorHint).toMatch(/issue #822/);
    expect(p.operatorHint).toMatch(/immutable/i);
  });

  it("reports advertised cents + env-configured booleans for all 6 slots, never the price id value", () => {
    process.env.PRICING_PHASE = "PROVEN";
    const p = loadCheckoutPricePosture({
      STRIPE_PRO_MONTHLY_PRICE_ID: "price_super_secret_id",
    });
    expect(p.slots).toHaveLength(6);

    const proMonth = p.slots.find((s) => s.tier === "PRO" && s.interval === "month");
    expect(proMonth?.advertisedCents).toBe(1999); // PROVEN Pro monthly: $19.99
    expect(proMonth?.envPriceIdConfigured).toBe(true);

    const eliteMonth = p.slots.find((s) => s.tier === "ELITE" && s.interval === "month");
    expect(eliteMonth?.envPriceIdConfigured).toBe(false);

    const serialized = JSON.stringify(p);
    expect(serialized).not.toContain("price_super_secret_id");
  });

  it("never re-derives the advertised cents — matches advertisedPhaseUnitAmountCents exactly", () => {
    process.env.PRICING_PHASE = "ESTABLISHED";
    const p = loadCheckoutPricePosture({});
    for (const slot of p.slots) {
      expect(slot.advertisedCents).toBe(
        advertisedPhaseUnitAmountCents(slot.tier, slot.interval),
      );
    }
  });

  it("makes no Stripe or DB call — pure and synchronous", () => {
    // If this module ever grows a network/DB dependency, it stops being safe
    // on a public, unauthenticated, high-traffic route. Pinning the sync
    // return type is the cheapest guard against that regression.
    process.env.PRICING_PHASE = "FOUNDING";
    const result = loadCheckoutPricePosture({});
    expect(result).not.toBeInstanceOf(Promise);
  });
});
