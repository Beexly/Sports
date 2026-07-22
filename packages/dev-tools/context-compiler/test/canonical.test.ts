import { describe, expect, it } from "vitest";
import { canonicalStringify, sha256Hex } from "../src/canonical.js";

describe("canonicalStringify", () => {
  it("sorts object keys deeply, independent of insertion order", () => {
    const a = canonicalStringify({ b: 1, a: { d: 2, c: 3 } });
    const b = canonicalStringify({ a: { c: 3, d: 2 }, b: 1 });
    expect(a).toBe(b);
  });

  it("preserves array order (arrays are not sorted)", () => {
    const out = canonicalStringify({ list: [3, 1, 2] });
    expect(out).toContain("[\n    3,\n    1,\n    2\n  ]");
  });

  it("ends with a trailing newline", () => {
    expect(canonicalStringify({ a: 1 }).endsWith("\n")).toBe(true);
  });
});

describe("sha256Hex", () => {
  it("is deterministic for identical input", () => {
    expect(sha256Hex("hello")).toBe(sha256Hex("hello"));
  });

  it("matches the known sha256 of an empty string", () => {
    expect(sha256Hex("")).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  });

  it("differs for different input", () => {
    expect(sha256Hex("a")).not.toBe(sha256Hex("b"));
  });
});
