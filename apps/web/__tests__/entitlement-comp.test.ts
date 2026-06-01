import { describe, it, expect } from "vitest";
import { resolveEntitlementTier } from "@/lib/entitlements";

describe("resolveEntitlementTier — comp precedence + billing", () => {
  it("a comp overrides billing entirely, even with no/inactive subscription", () => {
    expect(
      resolveEntitlementTier({ compedTier: "ELITE", subscriptionTier: null, subscriptionStatus: null })
    ).toBe("ELITE");
    expect(
      resolveEntitlementTier({
        compedTier: "VIP",
        subscriptionTier: "PRO",
        subscriptionStatus: "CANCELED",
      })
    ).toBe("VIP");
  });

  it("a comp does not get downgraded by a lower billing tier", () => {
    expect(
      resolveEntitlementTier({
        compedTier: "ELITE",
        subscriptionTier: "PRO",
        subscriptionStatus: "ACTIVE",
      })
    ).toBe("ELITE");
  });

  it("without a comp, paid access requires ACTIVE or TRIALING", () => {
    expect(
      resolveEntitlementTier({ subscriptionTier: "ELITE", subscriptionStatus: "ACTIVE" })
    ).toBe("ELITE");
    expect(
      resolveEntitlementTier({ subscriptionTier: "PRO", subscriptionStatus: "TRIALING" })
    ).toBe("PRO");
  });

  it("without a comp, a non-active subscription is FREE (no leaked access)", () => {
    for (const status of ["CANCELED", "PAST_DUE", "INCOMPLETE", "PAUSED", null]) {
      expect(
        resolveEntitlementTier({ subscriptionTier: "ELITE", subscriptionStatus: status })
      ).toBe("FREE");
    }
  });

  it("no comp and no subscription is FREE", () => {
    expect(resolveEntitlementTier({})).toBe("FREE");
  });
});
