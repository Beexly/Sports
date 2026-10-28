import { describe, expect, it } from "vitest";
import {
  buildContextMask,
  maskToArray,
  MASK_WORDS,
  MIN_SAMPLE,
  SIGNAL_FAMILIES,
  toVectorLiteral,
} from "./mcp-cognitive-router.js";

describe("context mask", () => {
  it("sets the bit for a fired family", () => {
    const m = buildContextMask([{ family: 1, displacement: 0.4, n: 100 }]);
    expect(m[0]).toBe(2);
  });

  it("does not set a bit on zero displacement", () => {
    expect(buildContextMask([{ family: 1, displacement: 0, n: 100 }])[0]).toBe(0);
  });

  it("does not set a bit on a thin sample", () => {
    expect(buildContextMask([{ family: 1, displacement: 0.4, n: MIN_SAMPLE - 1 }])[0]).toBe(0);
  });

  it("spans words — family 32 lands in word 1, not word 0", () => {
    const m = buildContextMask([{ family: 32, displacement: 1, n: 50 }]);
    expect(m[0]).toBe(0);
    expect(m[1]).toBe(1);
  });

  it("rejects an out-of-range family", () => {
    expect(() => buildContextMask([{ family: SIGNAL_FAMILIES, displacement: 1, n: 50 }])).toThrow();
    expect(() => buildContextMask([{ family: -1, displacement: 1, n: 50 }])).toThrow();
  });

  it("emits exactly nine words", () => {
    expect(maskToArray(buildContextMask([]))).toHaveLength(MASK_WORDS);
  });

  it("keeps the top bit addressable", () => {
    // family 31 is the top bit of word 0. Postgres int is signed 32-bit, so it stores as
    // -2147483648 — that is the correct two's-complement pattern and bitwise AND still
    // works. What must not happen is the bit vanishing.
    const arr = maskToArray(buildContextMask([{ family: 31, displacement: 1, n: 50 }]));
    expect(arr[0]).toBe(-2147483648);
    expect((arr[0]! & -2147483648) !== 0).toBe(true);
  });
});

describe("vector literal", () => {
  it("formats for pgvector", () => {
    expect(toVectorLiteral([0.1, -0.2])).toBe("[0.1,-0.2]");
  });
});
