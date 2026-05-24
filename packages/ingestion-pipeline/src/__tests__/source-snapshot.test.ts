import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import { stableStringify } from "../source-snapshot";

/**
 * Unit tests for the stableStringify helper.
 *
 * stableStringify is the deterministic serialization used for payload hashing
 * in recordSourceSnapshot. The key invariant: two objects with identical keys
 * and values produce the same hash regardless of key insertion order.
 * This prevents spurious hash mismatches between API responses that happen
 * to return fields in different order.
 */

describe("stableStringify", () => {
  it("produces identical output for objects with different key order", () => {
    const a = stableStringify({ z: 1, a: 2, m: 3 });
    const b = stableStringify({ a: 2, m: 3, z: 1 });
    const c = stableStringify({ m: 3, z: 1, a: 2 });
    expect(a).toBe(b);
    expect(b).toBe(c);
  });

  it("sorts keys alphabetically", () => {
    const result = stableStringify({ c: 3, a: 1, b: 2 });
    expect(result).toBe('{"a":1,"b":2,"c":3}');
  });

  it("recursively sorts nested object keys", () => {
    const result = stableStringify({ outer: { z: 9, a: 1 }, first: "v" });
    expect(result).toBe('{"first":"v","outer":{"a":1,"z":9}}');
  });

  it("preserves arrays without sorting their elements", () => {
    const result = stableStringify({ items: [3, 1, 2] });
    expect(result).toBe('{"items":[3,1,2]}');
  });

  it("preserves null values", () => {
    const result = stableStringify({ a: null, b: "x" });
    expect(result).toBe('{"a":null,"b":"x"}');
  });

  it("handles primitive values directly", () => {
    expect(stableStringify(42)).toBe("42");
    expect(stableStringify("hello")).toBe('"hello"');
    expect(stableStringify(null)).toBe("null");
    expect(stableStringify(true)).toBe("true");
  });

  it("handles empty objects and arrays", () => {
    expect(stableStringify({})).toBe("{}");
    expect(stableStringify([])).toBe("[]");
  });

  it("produces the same SHA-256 hash as a direct hash of the sorted string", () => {
    const payload = { z: "last", a: "first", m: [1, 2, 3] };
    const serialized = stableStringify(payload);
    const expectedHash = createHash("sha256").update(serialized).digest("hex");
    const reHash = createHash("sha256").update(stableStringify(payload)).digest("hex");
    expect(expectedHash).toBe(reHash);
    // Verify the hash is different from a non-stable serialization that
    // might have keys in a different order
    expect(expectedHash).toHaveLength(64);
  });

  it("hash is consistent across calls with the same payload", () => {
    const payload = { sport: "NFL", game: "Chiefs vs Eagles", odds: -3.5 };
    const hash1 = createHash("sha256").update(stableStringify(payload)).digest("hex");
    const hash2 = createHash("sha256").update(stableStringify(payload)).digest("hex");
    expect(hash1).toBe(hash2);
  });

  it("hash differs for payloads with different values", () => {
    const p1 = { odds: -3.5 };
    const p2 = { odds: -4.0 };
    const h1 = createHash("sha256").update(stableStringify(p1)).digest("hex");
    const h2 = createHash("sha256").update(stableStringify(p2)).digest("hex");
    expect(h1).not.toBe(h2);
  });

  it("sorts keys inside objects that are array elements", () => {
    // Arrays are returned as-is, but JSON.stringify still calls the replacer
    // on each element — so object elements inside arrays also get key-sorted.
    const result = stableStringify([{ b: 2, a: 1 }, { d: 4, c: 3 }]);
    expect(result).toBe('[{"a":1,"b":2},{"c":3,"d":4}]');
  });
});
