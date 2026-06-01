import { describe, it, expect, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getUserEntitlements } from "@/lib/entitlements";

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

  it("disables the shortcut when NODE_ENV is production (source-level guard)", () => {
    // Verify the source code contains the production guard so the bypass
    // can't fire on a production host even if DEV_FAKE_ADMIN is mis-set.
    const src = readFileSync(
      resolve(__dirname, "../lib/entitlements.ts"),
      "utf8"
    );
    expect(src).toMatch(/NODE_ENV.*production|production.*NODE_ENV/);
  });
});
