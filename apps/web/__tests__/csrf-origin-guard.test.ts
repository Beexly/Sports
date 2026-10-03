import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { csrfOriginCheck } from "@/lib/auth/csrf-origin-guard";

/**
 * Unit tests for the CSRF/Origin guard.
 *
 * Pins the same-origin enforcement that protects cookie-mutating POST routes:
 *  - same-origin requests pass
 *  - cross-origin requests are rejected
 *  - missing Origin/Referer is rejected (fail-closed)
 *  - unconfigured NEXT_PUBLIC_APP_URL causes rejection (fail-closed)
 */

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://sports.example.com");
});
afterEach(() => {
  vi.unstubAllEnvs();
});

describe("csrfOriginCheck", () => {
  it("accepts a same-origin Origin header", () => {
    const result = csrfOriginCheck(
      "https://sports.example.com",
      null,
    );
    expect(result.ok).toBe(true);
  });

  it("accepts a same-origin Referer when Origin is absent", () => {
    const result = csrfOriginCheck(
      null,
      "https://sports.example.com/dashboard",
    );
    expect(result.ok).toBe(true);
  });

  it("rejects a cross-origin Origin header", () => {
    const result = csrfOriginCheck(
      "https://evil.example.com",
      null,
    );
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/Cross-origin/);
  });

  it("rejects a cross-origin Referer when Origin is absent", () => {
    const result = csrfOriginCheck(
      null,
      "https://evil.example.com/some-path",
    );
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/Cross-origin/);
  });

  it("rejects when both Origin and Referer are missing", () => {
    const result = csrfOriginCheck(null, null);
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/missing or unparseable/);
  });

  it("rejects when Origin is a non-URL string", () => {
    const result = csrfOriginCheck("not-a-url", null);
    expect(result.ok).toBe(false);
  });

  it("rejects when NEXT_PUBLIC_APP_URL is not configured (fail-closed)", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    const result = csrfOriginCheck("https://sports.example.com", null);
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/not configured/);
  });

  it("treats Origin with a different port as cross-origin", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://sports.example.com:3000");
    const result = csrfOriginCheck("https://sports.example.com:4000", null);
    expect(result.ok).toBe(false);
  });

  it("accepts Origin matching a non-default port", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://sports.example.com:3000");
    const result = csrfOriginCheck("https://sports.example.com:3000", null);
    expect(result.ok).toBe(true);
  });
});
