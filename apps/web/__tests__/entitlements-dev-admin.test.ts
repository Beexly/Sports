import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getUserEntitlements } from "@/lib/entitlements";

describe("getUserEntitlements DEV_FAKE_ADMIN shortcut", () => {
  beforeEach(() => {
    process.env["DEV_FAKE_ADMIN"] = "true";
    vi.stubEnv("NODE_ENV", "test");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
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

  it("ignores DEV_FAKE_ADMIN in production even when the flag is accidentally set", async () => {
    process.env["DEV_FAKE_ADMIN"] = "true";
    vi.stubEnv("NODE_ENV", "production");
    const ent = await getUserEntitlements("dev-admin");
    expect(ent.tier).toBe("FREE");
  });
});
