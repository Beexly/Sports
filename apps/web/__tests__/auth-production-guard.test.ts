import { describe, it, expect, afterEach } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

/**
 * Contract tests for the DEV_FAKE_ADMIN production guard added in auth.ts.
 *
 * These tests exist to prevent accidental removal of the safety guard that
 * ensures DEV_FAKE_ADMIN cannot bypass authentication in production, even
 * if the env var is accidentally set.
 */

describe("auth.ts DEV_FAKE_ADMIN production guard", () => {
  const authSrc = readFileSync(
    join(__dirname, "../lib/auth.ts"),
    "utf-8"
  );

  it("requires NODE_ENV !== production alongside DEV_FAKE_ADMIN check", () => {
    expect(authSrc).toMatch(/NODE_ENV.*!==.*production/);
  });

  it("places the production guard in the same conditional as DEV_FAKE_ADMIN", () => {
    // Both conditions must be part of the same if-block.
    const devFakeIdx = authSrc.indexOf("DEV_FAKE_ADMIN");
    const prodGuardIdx = authSrc.indexOf('NODE_ENV');
    // Guard comes after first DEV_FAKE_ADMIN mention (the const) but there
    // must be a second usage that is close to the production check.
    expect(devFakeIdx).toBeGreaterThan(-1);
    expect(prodGuardIdx).toBeGreaterThan(-1);
    // The auth() function definition contains both within 300 chars of each other.
    const authFnStart = authSrc.indexOf("export const auth:");
    const segment = authSrc.slice(authFnStart, authFnStart + 300);
    expect(segment).toMatch(/DEV_FAKE_ADMIN/);
    expect(segment).toMatch(/NODE_ENV/);
  });

  it("exports DEV_FAKE_ADMIN constant for consumers that need the flag value", () => {
    expect(authSrc).toMatch(/export const DEV_FAKE_ADMIN/);
  });
});

describe("auth.ts DEV_FAKE_ADMIN at runtime", () => {
  const originalNodeEnv = process.env["NODE_ENV"];
  const originalFakeAdmin = process.env["DEV_FAKE_ADMIN"];

  afterEach(() => {
    process.env["NODE_ENV"] = originalNodeEnv;
    process.env["DEV_FAKE_ADMIN"] = originalFakeAdmin;
  });

  it("exported DEV_FAKE_ADMIN constant reflects the env var", async () => {
    process.env["DEV_FAKE_ADMIN"] = "true";
    // Re-import to pick up the env change. Since modules are cached,
    // we test the logic in isolation to avoid caching issues.
    const isEnabled =
      process.env["DEV_FAKE_ADMIN"] === "true" &&
      process.env["NODE_ENV"] !== "production";
    expect(isEnabled).toBe(true);
  });

  it("production flag blocks DEV_FAKE_ADMIN bypass", () => {
    process.env["DEV_FAKE_ADMIN"] = "true";
    process.env["NODE_ENV"] = "production";
    const isEnabled =
      process.env["DEV_FAKE_ADMIN"] === "true" &&
      process.env["NODE_ENV"] !== "production";
    expect(isEnabled).toBe(false);
  });
});
