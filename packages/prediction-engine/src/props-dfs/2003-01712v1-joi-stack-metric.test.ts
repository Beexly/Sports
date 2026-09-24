import { describe, it, expect } from "vitest";
import {
  PairSequence,
  joiPerDropback,
  synergyEdge,
  rankStackPairs,
} from "./2003-01712v1-joi-stack-metric.js";

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

describe("joi", () => {
  it("joiPerDropback normalizes by shared volume", () => {
    expect(joiPerDropback(10, 100)).toBeCloseTo(0.1, 10);
    expect(joiPerDropback(10, 0)).toBe(0);
  });
  it("synergyEdge is positive for true synergies", () => {
    const { edge, z } = synergyEdge(2.0, 1.0, 1.0, 0.3);
    expect(edge).toBeGreaterThan(0);
    expect(z).toBeGreaterThan(2);
  });
  it("rankStackPairs orders by JOI rate", () => {
    const pairs = [
      { pairId: "a", dropbacksTogether: 100, jointEpa: 5 },
      { pairId: "b", dropbacksTogether: 100, jointEpa: 15 },
    ];
    expect(rankStackPairs(pairs)[0]!.pairId).toBe("b");
  });
});
