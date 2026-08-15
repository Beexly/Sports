import { describe, it, expect } from "vitest";
import { safeCallbackUrl } from "@/lib/auth/callback-url-guard";

/**
 * Unit tests for safeCallbackUrl — pins the open-redirect guard that
 * sanitizes the NextAuth callbackUrl parameter on the sign-in page.
 *
 * Invariants:
 *  - Same-origin relative paths (starting with a single "/") are accepted.
 *  - Absolute URLs, protocol-relative URLs, triple-slash, and backslash
 *    variants are rejected → fall back to DEFAULT_CALLBACK_URL.
 *  - Bare "/" is rejected → falls back to DEFAULT_CALLBACK_URL.
 *  - undefined / empty → DEFAULT_CALLBACK_URL.
 */

describe("safeCallbackUrl", () => {
  it("returns the path for a valid relative URL", () => {
    expect(safeCallbackUrl("/dashboard")).toBe("/dashboard");
    expect(safeCallbackUrl("/dashboard/settings")).toBe("/dashboard/settings");
    expect(safeCallbackUrl("/picks")).toBe("/picks");
  });

  it("returns DEFAULT for undefined / empty", () => {
    expect(safeCallbackUrl(undefined)).toBe("/dashboard");
    expect(safeCallbackUrl("")).toBe("/dashboard");
  });

  it("rejects absolute URLs (open redirect)", () => {
    expect(safeCallbackUrl("https://evil.com")).toBe("/dashboard");
    expect(safeCallbackUrl("https://evil.com/callback")).toBe("/dashboard");
    expect(safeCallbackUrl("http://evil.com")).toBe("/dashboard");
    expect(safeCallbackUrl("evil.com/path")).toBe("/dashboard");
  });

  it("rejects protocol-relative URLs (//evil.com)", () => {
    expect(safeCallbackUrl("//evil.com")).toBe("/dashboard");
    expect(safeCallbackUrl("//evil.com/path")).toBe("/dashboard");
  });

  it("rejects triple-slash (///evil.com normalizes to //evil.com in browsers)", () => {
    expect(safeCallbackUrl("///evil.com")).toBe("/dashboard");
    expect(safeCallbackUrl("///evil.com/path")).toBe("/dashboard");
  });

  it("rejects backslash variants (/\\evil.com)", () => {
    expect(safeCallbackUrl("/\\evil.com")).toBe("/dashboard");
    expect(safeCallbackUrl("/\\evil.com/path")).toBe("/dashboard");
  });

  it("rejects bare /", () => {
    expect(safeCallbackUrl("/")).toBe("/dashboard");
  });

  it("rejects bare /\\", () => {
    expect(safeCallbackUrl("/\\")).toBe("/dashboard");
  });
});
