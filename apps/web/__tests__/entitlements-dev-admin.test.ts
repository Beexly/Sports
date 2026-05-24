import { describe, it, expect, beforeEach } from "vitest";
import { getUserEntitlements, EntitlementError, requireEntitlement } from "@/lib/entitlements";

describe("getUserEntitlements DEV_FAKE_ADMIN shortcut", () => {
  beforeEach(() => {
    process.env["DEV_FAKE_ADMIN"] = "true";
  });

  it("returns ELITE entitlements for the synthetic dev-admin user", async () => {
    const ent = await getUserEntitlements("dev-admin");
    expect(ent.tier).toBe("ELITE");
    expect(ent.canSeeConfidence).toBe(true);
    expect(ent.canSeePremiumPicks).toBe(true);
    expect(ent.canSeeFactorBreakdown).toBe(true);
  });

  it("does not apply the shortcut to other user ids", async () => {
    // For non-dev-admin users, the function would normally hit the DB.
    // Under stub mode db.subscription.findFirst returns null, so the
    // user falls back to FREE.
    const ent = await getUserEntitlements("real-user-123");
    expect(ent.tier).toBe("FREE");
  });

  it("disables the shortcut when DEV_FAKE_ADMIN is not 'true'", async () => {
    process.env["DEV_FAKE_ADMIN"] = "false";
    const ent = await getUserEntitlements("dev-admin");
    expect(ent.tier).toBe("FREE");
  });
});

describe("requireEntitlement", () => {
  beforeEach(() => {
    process.env["DEV_FAKE_ADMIN"] = "true";
  });

  it("returns entitlements when the check passes (dev-admin → ELITE)", async () => {
    const ent = await requireEntitlement("dev-admin", (e) => e.canGetAlerts);
    expect(ent.tier).toBe("ELITE");
    expect(ent.canGetAlerts).toBe(true);
  });

  it("throws EntitlementError when the check fails (FREE tier cannot get alerts)", async () => {
    // real-user-123 → stub returns null → FREE tier → canGetAlerts=false
    await expect(
      requireEntitlement("real-user-123", (e) => e.canGetAlerts)
    ).rejects.toBeInstanceOf(EntitlementError);
  });

  it("thrown EntitlementError carries the standard subscription-required message", async () => {
    let caught: unknown;
    try {
      await requireEntitlement("real-user-123", () => false);
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(EntitlementError);
    expect((caught as EntitlementError).message).toContain("Subscription required");
  });
});

describe("EntitlementError", () => {
  it("has name='EntitlementError' (not plain 'Error')", () => {
    const err = new EntitlementError("subscription required");
    expect(err.name).toBe("EntitlementError");
  });

  it("is instanceof Error", () => {
    const err = new EntitlementError("subscription required");
    expect(err).toBeInstanceOf(Error);
  });

  it("carries the message on the standard Error.message field", () => {
    const err = new EntitlementError("access denied");
    expect(err.message).toBe("access denied");
  });

  it("can be caught in a catch block and identified by name", () => {
    let caught: unknown;
    try {
      throw new EntitlementError("paywall");
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(EntitlementError);
    expect((caught as EntitlementError).name).toBe("EntitlementError");
  });
});
