import { describe, it, expect } from "vitest";
import {
  requireEntitlement,
  EntitlementError,
  getEntitlements,
} from "@/lib/entitlements";
import type { Entitlements } from "@/lib/entitlements";

// In stub mode (no DATABASE_URL), db.subscription.findFirst returns null,
// so getUserEntitlements falls back to FREE for any non-dev-admin userId.
// Tests below use that behaviour to exercise requireEntitlement without
// mocking the DB layer.

describe("EntitlementError", () => {
  it("is an instance of Error", () => {
    const err = new EntitlementError("test message");
    expect(err).toBeInstanceOf(Error);
  });

  it("has name 'EntitlementError'", () => {
    const err = new EntitlementError("denied");
    expect(err.name).toBe("EntitlementError");
  });

  it("carries the provided message", () => {
    const err = new EntitlementError("Subscription required for this feature");
    expect(err.message).toBe("Subscription required for this feature");
  });

  it("is catchable as EntitlementError", () => {
    expect(() => {
      throw new EntitlementError("access denied");
    }).toThrowError(EntitlementError);
  });
});

describe("requireEntitlement — check passes", () => {
  it("returns entitlements when the check function is satisfied", async () => {
    // FREE tier can see edge score — check should pass
    const ent = await requireEntitlement("some-user-id", (e) => e.canSeeEdgeScore);
    expect(ent).toBeDefined();
    expect(ent.tier).toBe("FREE");
    expect(ent.canSeeEdgeScore).toBe(true);
  });

  it("returns a full Entitlements object (not a partial)", async () => {
    const ent = await requireEntitlement("some-user-id", () => true);
    expect(typeof ent.canSeePremiumPicks).toBe("boolean");
    expect(typeof ent.canSeeConfidence).toBe("boolean");
    expect(typeof ent.canSeeLineMovement).toBe("boolean");
    expect(typeof ent.canSeeEdgeScore).toBe("boolean");
  });
});

describe("requireEntitlement — check fails", () => {
  it("throws EntitlementError when the check function returns false", async () => {
    // FREE users cannot see premium picks — check should fail
    await expect(
      requireEntitlement("some-user-id", (e) => e.canSeePremiumPicks)
    ).rejects.toThrowError(EntitlementError);
  });

  it("throws EntitlementError with the standard access message", async () => {
    await expect(
      requireEntitlement("some-user-id", () => false)
    ).rejects.toThrow("Subscription required for this feature");
  });

  it("does not return when the check fails", async () => {
    let returned = false;
    try {
      await requireEntitlement("some-user-id", () => false);
      returned = true;
    } catch (_) {
      // expected
    }
    expect(returned).toBe(false);
  });
});

describe("getEntitlements (re-export from @sports/types)", () => {
  it("FREE tier has dailyPickLimit of 1", () => {
    const ent: Entitlements = getEntitlements("FREE");
    expect(ent.dailyPickLimit).toBe(1);
    expect(ent.canSeePremiumPicks).toBe(false);
  });

  it("PRO tier has no daily pick limit and can see premium picks", () => {
    const ent = getEntitlements("PRO");
    expect(ent.dailyPickLimit).toBeNull();
    expect(ent.canSeePremiumPicks).toBe(true);
    expect(ent.canSeeConfidence).toBe(true);
    expect(ent.canGetAlerts).toBe(false);
  });

  it("ELITE tier can get alerts and has no daily pick limit", () => {
    const ent = getEntitlements("ELITE");
    expect(ent.canGetAlerts).toBe(true);
    expect(ent.dailyPickLimit).toBeNull();
    expect(ent.canSeeFactorBreakdown).toBe(true);
  });

  it("canSeeEdgeScore is true for all tiers", () => {
    expect(getEntitlements("FREE").canSeeEdgeScore).toBe(true);
    expect(getEntitlements("PRO").canSeeEdgeScore).toBe(true);
    expect(getEntitlements("ELITE").canSeeEdgeScore).toBe(true);
  });
});
