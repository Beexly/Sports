import { describe, it, expect } from "vitest";
import {
  betaUpdate,
  betaMean,
  betaVar,
  wpBlendCell,
  wpBlendLogistic,
  gammaPosteriorShrink,
} from "./2207-05114-wp-blender-beta-prior.js";

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

describe("betabinom", () => {
  it("posterior concentrates on the true rate with data", () => {
    let post = { a: 2, b: 2 };
    const rand = mulberry32(61);
    for (let i = 0; i < 500; i++) {
      const y = rand() < 0.7 ? 1 : 0;
      post = betaUpdate(post.a, post.b, y, 1 - y);
    }
    expect(Math.abs(betaMean(post.a, post.b) - 0.7)).toBeLessThan(0.05);
    expect(betaVar(post.a, post.b)).toBeLessThan(betaVar(2, 2));
  });
  it("wpBlendCell shrinks thin cells toward the prior", () => {
    expect(wpBlendCell(0, 0, 50, 50)).toBeCloseTo(0.5, 10);
    expect(wpBlendCell(9, 10, 50, 50)).toBeLessThan(0.9);
    expect(wpBlendCell(900, 1000, 50, 50)).toBeGreaterThan(0.85);
  });
  it("gamma shrinkage pulls low-sample players to the global mean", () => {
    const shrunk = gammaPosteriorShrink(30, 10, 1.0, 0.5);
    const raw = 30 / 10;
    expect(Math.abs(shrunk - 1.0)).toBeLessThan(Math.abs(raw - 1.0));
  });
});
