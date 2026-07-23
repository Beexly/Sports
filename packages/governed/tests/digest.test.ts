import { describe, expect, it } from "vitest";
import { argsDigest } from "../src/digest";

describe("argsDigest", () => {
  it("is stable across top-level key order", () => {
    expect(argsDigest({ a: 1, b: 2 })).toBe(argsDigest({ b: 2, a: 1 }));
  });

  it("does NOT collide on different nested values under the same top-level key", () => {
    // A naive `JSON.stringify(x, Object.keys(x).sort())` replacer-array
    // whitelists keys at every level, not just the top — so {a:{x:1}} and
    // {a:{y:2}} would both serialize as {"a":{}} and collide. This is the
    // exact case that must NOT collide.
    const d1 = argsDigest({ a: { x: 1 } });
    const d2 = argsDigest({ a: { y: 2 } });
    expect(d1).not.toBe(d2);
  });

  it("is stable across nested key order", () => {
    expect(argsDigest({ a: { x: 1, y: 2 } })).toBe(argsDigest({ a: { y: 2, x: 1 } }));
  });

  it("distinguishes different nested values that a shallow digest would conflate", () => {
    const prompts = [
      argsDigest({ options: { temperature: 0.2 } }),
      argsDigest({ options: { maxTokens: 100 } }),
      argsDigest({ options: { temperature: 0.9 } }),
    ];
    expect(new Set(prompts).size).toBe(3);
  });
});
