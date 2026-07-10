import { describe, it, expect, beforeEach } from "vitest";
import { getUserEntitlements, assertDevAdminDisabledInProd } from "@/lib/entitlements";

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

describe("assertDevAdminDisabledInProd (boot-time fail-loud guard)", () => {
  it("throws when DEV_FAKE_ADMIN=true in production", () => {
    expect(() =>
      assertDevAdminDisabledInProd({ NODE_ENV: "production", DEV_FAKE_ADMIN: "true" }),
    ).toThrow(/DEV_FAKE_ADMIN must be unset in production/);
  });

  it("does not throw in production when DEV_FAKE_ADMIN is unset", () => {
    expect(() => assertDevAdminDisabledInProd({ NODE_ENV: "production" })).not.toThrow();
  });

  it("does not throw in production when DEV_FAKE_ADMIN is not exactly 'true'", () => {
    expect(() =>
      assertDevAdminDisabledInProd({ NODE_ENV: "production", DEV_FAKE_ADMIN: "1" }),
    ).not.toThrow();
  });

  it("allows DEV_FAKE_ADMIN=true outside production (dev/test/preview)", () => {
    expect(() =>
      assertDevAdminDisabledInProd({ NODE_ENV: "development", DEV_FAKE_ADMIN: "true" }),
    ).not.toThrow();
    expect(() =>
      assertDevAdminDisabledInProd({ NODE_ENV: "test", DEV_FAKE_ADMIN: "true" }),
    ).not.toThrow();
  });
});
