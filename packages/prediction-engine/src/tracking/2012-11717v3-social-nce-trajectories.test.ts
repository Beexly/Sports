import { describe, it, expect } from "vitest";
import {
  cosineSim,
  infoNCELoss,
  angularNegatives,
  socialNCELoss,
} from "./2012-11717v3-social-nce-trajectories.js";

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

describe("infonce", () => {
  it("infoNCE is lower when the positive aligns with the anchor", () => {
    const anchor = [1, 0];
    const pos = [0.9, 0.1];
    const negs = [[-1, 0], [0, 1], [0, -1]];
    const lGood = infoNCELoss(anchor, pos, negs, 0.1);
    const lBad = infoNCELoss(anchor, [-1, 0], negs, 0.1);
    expect(lGood).toBeLessThan(lBad);
  });
  it("angularNegatives ring the center at radius rho", () => {
    const rand = mulberry32(311);
    const negs = angularNegatives([0, 0], 1.0, 8, rand);
    expect(negs.length).toBe(8);
    for (const [x, y] of negs) {
      expect(Math.hypot(x, y)).toBeCloseTo(1.0, 1);
    }
  });
  it("socialNCELoss decreases as the anchor nears the true future", () => {
    const rand = mulberry32(312);
    const df: [number, number][] = [[5, 5]];
    const lNear = socialNCELoss([0.5, 0.5], [5, 5.1], df, 1, 0.1, rand);
    const lFar = socialNCELoss([-0.5, -0.5], [5, 5.1], df, 1, 0.1, rand);
    expect(lNear).toBeLessThan(lFar);
  });
});
