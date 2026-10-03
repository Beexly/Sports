import { describe, it, expect } from "vitest";
import {
  lineupJaccard,
  chalkIndex,
  contrarianFilter,
} from "./2009-01206v1-chalk-meter-contrarian.js";

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

describe("chalk", () => {
  it("chalkIndex is higher for concentrated fields", () => {
    const ownership = [0.4, 0.35, 0.3, 0.05, 0.05, 0.05];
    const concentrated = [[0, 1, 2], [0, 1, 2], [0, 1, 3]];
    const diverse = [[0, 3, 4], [1, 4, 5], [2, 3, 5]];
    expect(chalkIndex(ownership, concentrated)).toBeGreaterThan(chalkIndex(ownership, diverse));
  });
  it("contrarianFilter removes template-hugging lineups", () => {
    const lineups = [[0, 1, 2], [3, 4, 5]];
    const kept = contrarianFilter(lineups, [0, 1, 2], 0.5);
    expect(kept).toEqual([1]);
  });
});
