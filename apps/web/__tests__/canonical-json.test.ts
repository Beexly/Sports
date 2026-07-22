import { describe, expect, it } from "vitest";
import {
  CanonicalJsonError,
  canonicalJsonStringify,
  sha256CanonicalJson,
} from "@/lib/billing/canonical-json";

/**
 * Canonical-JSON hash helper (directive 5.5) — the primitive under the
 * checkout request fingerprint. The contract: ONE byte-stable encoding per
 * semantic value, and loud failure for anything that JSON would silently
 * mangle (a silently-dropped field must never fingerprint-collide with an
 * absent one).
 */
describe("canonicalJsonStringify", () => {
  it("sorts object keys at every depth (insertion order never matters)", () => {
    const a = canonicalJsonStringify({ b: 1, a: [2, { d: 3, c: 4 }] });
    const b = canonicalJsonStringify({ a: [2, { c: 4, d: 3 }], b: 1 });
    expect(a).toBe(b);
    expect(a).toBe('{"a":[2,{"c":4,"d":3}],"b":1}');
  });

  it("preserves array order (position is meaning)", () => {
    expect(canonicalJsonStringify([1, 2])).toBe("[1,2]");
    expect(canonicalJsonStringify([1, 2])).not.toBe(canonicalJsonStringify([2, 1]));
  });

  it("encodes primitives exactly like JSON", () => {
    expect(canonicalJsonStringify(null)).toBe("null");
    expect(canonicalJsonStringify(true)).toBe("true");
    expect(canonicalJsonStringify(false)).toBe("false");
    expect(canonicalJsonStringify(1.5)).toBe("1.5");
    expect(canonicalJsonStringify('a"b')).toBe('"a\\"b"');
  });

  it("distinguishes null from absent key", () => {
    expect(canonicalJsonStringify({ a: null })).not.toBe(canonicalJsonStringify({}));
  });

  it("THROWS on undefined values instead of silently dropping them", () => {
    expect(() =>
      canonicalJsonStringify({ a: undefined } as unknown as Record<string, never>),
    ).toThrow(CanonicalJsonError);
  });

  it("THROWS on non-finite numbers instead of encoding null", () => {
    for (const bad of [NaN, Infinity, -Infinity]) {
      expect(() => canonicalJsonStringify({ n: bad })).toThrow(CanonicalJsonError);
    }
  });

  it("THROWS on non-JSON types (bigint, function, symbol)", () => {
    for (const bad of [10n, () => 1, Symbol("x")]) {
      expect(() =>
        canonicalJsonStringify({ v: bad } as unknown as Record<string, never>),
      ).toThrow(CanonicalJsonError);
    }
  });

  it("reports the path of the offending value", () => {
    try {
      canonicalJsonStringify({ outer: [{ inner: undefined }] } as unknown as Record<string, never>);
      expect.unreachable("should have thrown");
    } catch (err) {
      expect((err as Error).message).toContain("$.outer[0].inner");
    }
  });
});

describe("sha256CanonicalJson", () => {
  it("hashes identical semantic values identically regardless of key order", () => {
    expect(sha256CanonicalJson({ x: 1, y: 2 }, "ns")).toBe(
      sha256CanonicalJson({ y: 2, x: 1 }, "ns"),
    );
  });

  it("namespaces the hash (same value, different namespace → different hash)", () => {
    expect(sha256CanonicalJson({ x: 1 }, "ns-a")).not.toBe(sha256CanonicalJson({ x: 1 }, "ns-b"));
  });

  it("produces 64-char lowercase hex", () => {
    expect(sha256CanonicalJson({ x: 1 }, "ns")).toMatch(/^[0-9a-f]{64}$/);
  });
});
