import { describe, it, expect } from "vitest";
import {
  orderStatFeatures,
  unanimityShortlist,
  agreementThreshold,
  shortlistPrecision,
} from "./2303-04963v1-elite-lineup-order-stats.js";

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function randn(rand: () => number): number {
  let u = 0;
  while (u === 0) u = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
}

describe("orderstats", () => {
  it("orderStatFeatures sorts descending", () => {
    expect(orderStatFeatures([3, 1, 2])).toEqual([3, 2, 1]);
  });
  it("unanimity is stricter than k-of-M", () => {
    const votes = [[true, true, true], [true, true, false], [false, false, false]];
    expect(unanimityShortlist(votes)).toEqual([0]);
    expect(agreementThreshold(votes, 2)).toEqual([0, 1]);
  });
  it("shortlistPrecision measures hit rate", () => {
    expect(shortlistPrecision([0, 1, 2], new Set([0, 2]))).toBeCloseTo(2 / 3, 10);
  });
});
