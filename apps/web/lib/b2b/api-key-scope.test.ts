import { describe, expect, it } from "vitest";
import { authorizeB2bApiKey, resolveB2bKeyScope } from "./api-key-auth";

/**
 * B2B key tier scoping.
 *
 * The v1 routes previously filtered only on isPublished/isBootstrap/modelVersion
 * and emitted `confidence` + `factorBreakdown` unconditionally, so ANY holder of a
 * key in GSE_B2B_API_KEYS received Pro-gated confidence for PREMIUM picks.
 * `Pick.tier` already existed (`@default(FREE)`); the query just never used it.
 *
 * These tests pin the fail-closed contract: a bare key is FREE-only, and premium
 * access must be granted explicitly with a `:premium` suffix.
 */

const req = (key?: string): Request =>
  new Request("https://example.test/api/v1/signals", {
    headers: key ? { "x-api-key": key } : {},
  });

describe("resolveB2bKeyScope", () => {
  it("returns null when no key is presented", () => {
    expect(resolveB2bKeyScope(req(), { GSE_B2B_API_KEYS: "abc" })).toBeNull();
  });

  it("returns null when no keys are configured (fails closed)", () => {
    expect(resolveB2bKeyScope(req("abc"), {})).toBeNull();
    expect(resolveB2bKeyScope(req("abc"), { GSE_B2B_API_KEYS: "" })).toBeNull();
    expect(resolveB2bKeyScope(req("abc"), { GSE_B2B_API_KEYS: "   " })).toBeNull();
  });

  it("returns null for a key that is not in the list", () => {
    expect(resolveB2bKeyScope(req("nope"), { GSE_B2B_API_KEYS: "abc,def" })).toBeNull();
  });

  it("DEFAULTS a bare key to free — this is the leak fix", () => {
    expect(resolveB2bKeyScope(req("abc"), { GSE_B2B_API_KEYS: "abc" })).toBe("free");
    expect(resolveB2bKeyScope(req("def"), { GSE_B2B_API_KEYS: "abc,def" })).toBe("free");
  });

  it("grants premium ONLY with an explicit :premium suffix", () => {
    expect(
      resolveB2bKeyScope(req("partner"), { GSE_B2B_API_KEYS: "partner:premium" }),
    ).toBe("premium");
  });

  it("scopes each key independently in a mixed list", () => {
    const env = { GSE_B2B_API_KEYS: "partner:premium,readonly" };
    expect(resolveB2bKeyScope(req("partner"), env)).toBe("premium");
    expect(resolveB2bKeyScope(req("readonly"), env)).toBe("free");
  });

  it("does not let the suffix itself be used as a key", () => {
    const env = { GSE_B2B_API_KEYS: "partner:premium" };
    // Presenting the full entry (with suffix) must NOT authenticate — the key is
    // the part before the suffix.
    expect(resolveB2bKeyScope(req("partner:premium"), env)).toBeNull();
    expect(resolveB2bKeyScope(req(":premium"), env)).toBeNull();
  });

  it("tolerates whitespace and is case-insensitive on the suffix only", () => {
    expect(
      resolveB2bKeyScope(req("partner"), { GSE_B2B_API_KEYS: " partner:PREMIUM " }),
    ).toBe("premium");
    // The KEY itself stays case-sensitive.
    expect(
      resolveB2bKeyScope(req("PARTNER"), { GSE_B2B_API_KEYS: "partner:premium" }),
    ).toBeNull();
  });

  it("ignores empty entries rather than authorizing them", () => {
    expect(resolveB2bKeyScope(req(""), { GSE_B2B_API_KEYS: "abc,,def" })).toBeNull();
    expect(resolveB2bKeyScope(req("abc"), { GSE_B2B_API_KEYS: "abc,,def" })).toBe("free");
  });
});

describe("authorizeB2bApiKey (back-compat wrapper)", () => {
  it("stays true for any recognized key, whatever its scope", () => {
    const env = { GSE_B2B_API_KEYS: "partner:premium,readonly" };
    expect(authorizeB2bApiKey(req("partner"), env)).toBe(true);
    expect(authorizeB2bApiKey(req("readonly"), env)).toBe(true);
  });

  it("stays false for unknown or absent keys", () => {
    const env = { GSE_B2B_API_KEYS: "abc" };
    expect(authorizeB2bApiKey(req("nope"), env)).toBe(false);
    expect(authorizeB2bApiKey(req(), env)).toBe(false);
  });
});
