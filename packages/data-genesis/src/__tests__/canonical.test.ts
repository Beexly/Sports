import { describe, it, expect } from "vitest";
import { canonicalize, canonicalEquals } from "../canonical.js";

describe("canonicalize — stable, deterministic serialization", () => {
  it("sorts object keys so insertion order cannot change the output", () => {
    const a = { b: 1, a: 2, c: 3 };
    const b = { c: 3, a: 2, b: 1 };
    expect(canonicalize(a)).toBe(canonicalize(b));
    expect(canonicalize(a)).toBe('{"a":2,"b":1,"c":3}');
  });

  it("handles primitives, arrays, null and nesting", () => {
    expect(canonicalize(null)).toBe("null");
    expect(canonicalize(42)).toBe("42");
    expect(canonicalize("x")).toBe('"x"');
    expect(canonicalize(true)).toBe("true");
    expect(canonicalize([3, 1, 2])).toBe("[3,1,2]"); // array order is significant, preserved
    expect(canonicalize({ k: [{ z: 1, a: 2 }] })).toBe('{"k":[{"a":2,"z":1}]}');
  });

  it("serializes Date to an ISO string", () => {
    const d = new Date("2026-01-02T03:04:05.000Z");
    expect(canonicalize(d)).toBe('"2026-01-02T03:04:05.000Z"');
  });

  it("omits undefined-valued object properties (like JSON)", () => {
    expect(canonicalize({ a: 1, b: undefined })).toBe('{"a":1}');
  });

  it("rejects values with no stable JSON image", () => {
    expect(() => canonicalize(undefined)).toThrow();
    expect(() => canonicalize(() => 1)).toThrow();
    expect(() => canonicalize(Symbol("s"))).toThrow();
    expect(() => canonicalize(10n)).toThrow();
    expect(() => canonicalize(NaN)).toThrow();
    expect(() => canonicalize(Infinity)).toThrow();
    expect(() => canonicalize([undefined])).toThrow(); // undefined as an array element
  });

  it("refuses non-plain objects (Map/Set/class instances) rather than silently emitting {}", () => {
    expect(() => canonicalize(new Map([["a", 1]]))).toThrow(/non-plain|plain objects/);
    expect(() => canonicalize(new Set([1, 2]))).toThrow(/non-plain|plain objects/);
    class Widget { x = 1; }
    expect(() => canonicalize(new Widget())).toThrow(/non-plain|plain objects/);
    // a null-prototype bag of data is still plain data and is allowed
    const bag = Object.create(null) as Record<string, unknown>;
    bag.a = 1;
    expect(canonicalize(bag)).toBe('{"a":1}');
  });

  it("throws on circular structures", () => {
    const o: Record<string, unknown> = { a: 1 };
    o.self = o;
    expect(() => canonicalize(o)).toThrow(/circular/);
  });

  it("does NOT treat a shared (non-circular) reference as circular", () => {
    const shared = { v: 1 };
    expect(() => canonicalize({ a: shared, b: shared })).not.toThrow();
  });

  it("canonicalEquals compares by canonical form", () => {
    expect(canonicalEquals({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true);
    expect(canonicalEquals({ a: 1 }, { a: 2 })).toBe(false);
  });
});
