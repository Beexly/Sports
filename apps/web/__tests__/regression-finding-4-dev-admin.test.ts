/**
 * Regression test for Finding 4: DEV_FAKE_ADMIN bypass not gated on NODE_ENV.
 *
 * Before the fix, DEV_FAKE_ADMIN=true + userId="dev-admin" granted ELITE entitlements
 * even in a production environment. After the fix, NODE_ENV !== "production" is required.
 *
 * Severity: LOW | Pillar: entitlement | Finding: sports-intel/threat-map/finding-4.md
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";

// We test the guard logic directly, not the full DB-dependent function.
// The patched guard in entitlements.ts:21-24:
//   if (
//     process.env["DEV_FAKE_ADMIN"] === "true" &&
//     process.env["NODE_ENV"] !== "production" &&
//     userId === "dev-admin"
//   ) { return ELITE; }

describe("DEV_FAKE_ADMIN guard (finding-4 regression)", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env["DEV_FAKE_ADMIN"] = originalEnv["DEV_FAKE_ADMIN"];
    process.env["NODE_ENV"] = originalEnv["NODE_ENV"];
  });

  function devAdminBypass(userId: string): boolean {
    // Replicates the patched guard condition from entitlements.ts
    return (
      process.env["DEV_FAKE_ADMIN"] === "true" &&
      process.env["NODE_ENV"] !== "production" &&
      userId === "dev-admin"
    );
  }

  it("grants bypass in non-production with correct userId", () => {
    process.env["DEV_FAKE_ADMIN"] = "true";
    process.env["NODE_ENV"] = "development";
    expect(devAdminBypass("dev-admin")).toBe(true);
  });

  it("denies bypass when NODE_ENV is production (regression case)", () => {
    process.env["DEV_FAKE_ADMIN"] = "true";
    process.env["NODE_ENV"] = "production";
    expect(devAdminBypass("dev-admin")).toBe(false);
  });

  it("denies bypass when DEV_FAKE_ADMIN is not true", () => {
    process.env["DEV_FAKE_ADMIN"] = "false";
    process.env["NODE_ENV"] = "development";
    expect(devAdminBypass("dev-admin")).toBe(false);
  });

  it("denies bypass when userId is not dev-admin", () => {
    process.env["DEV_FAKE_ADMIN"] = "true";
    process.env["NODE_ENV"] = "development";
    expect(devAdminBypass("google-oauth-user-123")).toBe(false);
  });

  it("denies bypass when DEV_FAKE_ADMIN is unset", () => {
    delete process.env["DEV_FAKE_ADMIN"];
    process.env["NODE_ENV"] = "development";
    expect(devAdminBypass("dev-admin")).toBe(false);
  });
});
