/**
 * Characterization tests — G-22 CSRF Origin Guard (gate-sweep batch 1,
 * 2026-10-15). These pin the module's CURRENT behavior as landed on main;
 * they do not change it. The module shipped with no co-located test file;
 * this file is the first. Shadow registration:
 * intelligence/gate-wiring/shadow-registry.json (weight 0).
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { csrfOriginCheck } from "./csrf-origin-guard";

const ENV_KEY = "NEXT_PUBLIC_APP_URL";
let saved: string | undefined;

beforeEach(() => {
  saved = process.env[ENV_KEY];
});
afterEach(() => {
  if (saved === undefined) delete process.env[ENV_KEY];
  else process.env[ENV_KEY] = saved;
});

describe("csrfOriginCheck — fail-closed contract", () => {
  it("fails closed when NEXT_PUBLIC_APP_URL is not configured, even with a plausible Origin", () => {
    delete process.env[ENV_KEY];
    const r = csrfOriginCheck("https://galaxysportsedge.com", null);
    expect(r.ok).toBe(false);
    expect(r.reason).toContain("not configured");
  });

  it("fails closed when both Origin and Referer are missing", () => {
    process.env[ENV_KEY] = "https://galaxysportsedge.com";
    const r = csrfOriginCheck(null, null);
    expect(r.ok).toBe(false);
    expect(r.reason).toContain("missing or unparseable");
  });

  it("fails closed on an unparseable Origin with no Referer fallback", () => {
    process.env[ENV_KEY] = "https://galaxysportsedge.com";
    const r = csrfOriginCheck("not a url", null);
    expect(r.ok).toBe(false);
    expect(r.reason).toContain("missing or unparseable");
  });
});

describe("csrfOriginCheck — origin matching", () => {
  beforeEach(() => {
    process.env[ENV_KEY] = "https://galaxysportsedge.com";
  });

  it("accepts an exact same-origin Origin header", () => {
    const r = csrfOriginCheck("https://galaxysportsedge.com", null);
    expect(r.ok).toBe(true);
    expect(r.reason).toBe("Origin verified");
  });

  it("falls back to the Referer origin when Origin is absent", () => {
    const r = csrfOriginCheck(null, "https://galaxysportsedge.com/board?x=1");
    expect(r.ok).toBe(true);
  });

  it("rejects a cross-origin Origin and names both origins in the reason", () => {
    const r = csrfOriginCheck("https://evil.example", null);
    expect(r.ok).toBe(false);
    expect(r.reason).toContain("Cross-origin request");
    expect(r.reason).toContain("https://evil.example");
    expect(r.reason).toContain("https://galaxysportsedge.com");
  });

  it("treats a scheme downgrade as cross-origin", () => {
    const r = csrfOriginCheck("http://galaxysportsedge.com", null);
    expect(r.ok).toBe(false);
  });

  it("treats a different port as a different origin", () => {
    process.env[ENV_KEY] = "https://galaxysportsedge.com:8443";
    const r = csrfOriginCheck("https://galaxysportsedge.com", null);
    expect(r.ok).toBe(false);
  });

  it("ignores path/query on the Origin header value", () => {
    const r = csrfOriginCheck("https://galaxysportsedge.com/some/path", null);
    expect(r.ok).toBe(true);
  });
});
