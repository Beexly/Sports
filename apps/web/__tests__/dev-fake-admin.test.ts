import { describe, it, expect, afterEach, vi } from "vitest";
import { isDevFakeAdminActive } from "@/lib/auth/dev-fake-admin";

/**
 * The dev-only fake-admin escape hatch must be HARD-GATED to non-production.
 * This predicate is the single source of truth shared by auth(), the
 * route-protection middleware, and getUserEntitlements — a regression here is a
 * production privilege-escalation / paywall-bypass. The key case is the last
 * one: flag on, NODE_ENV=production -> MUST stay false.
 */
describe("isDevFakeAdminActive", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is active outside production when the flag is 'true'", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("DEV_FAKE_ADMIN", "true");
    expect(isDevFakeAdminActive()).toBe(true);
  });

  it("is inactive when the flag is unset or not exactly 'true'", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("DEV_FAKE_ADMIN", "");
    expect(isDevFakeAdminActive()).toBe(false);
    vi.stubEnv("DEV_FAKE_ADMIN", "1");
    expect(isDevFakeAdminActive()).toBe(false);
    vi.stubEnv("DEV_FAKE_ADMIN", "TRUE");
    expect(isDevFakeAdminActive()).toBe(false);
  });

  it("is NEVER active in production, even with the flag on", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DEV_FAKE_ADMIN", "true");
    expect(isDevFakeAdminActive()).toBe(false);
  });

  it("is active in the test runtime when the flag is on (NODE_ENV=test)", () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("DEV_FAKE_ADMIN", "true");
    expect(isDevFakeAdminActive()).toBe(true);
  });
});
