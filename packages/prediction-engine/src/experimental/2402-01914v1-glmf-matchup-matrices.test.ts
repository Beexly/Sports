import { describe, it, expect } from "vitest";
import {
  alsFactorize,
  glmfPredict,
  glmfRmse,
} from "./2402-01914v1-glmf-matchup-matrices.js";

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

describe("glmf", () => {
  it("ALS recovers a planted low-rank matrix", () => {
    const rand = mulberry32(421);
    const nU = 30;
    const nI = 25;
    const ratings: { u: number; i: number; r: number }[] = [];
    for (let u = 0; u < nU; u++) {
      for (let i = 0; i < nI; i++) {
        if (rand() < 0.5) {
          ratings.push({ u, i, r: 3 + 0.5 * Math.sin(u) * Math.cos(i) + randnGl(rand) * 0.2 });
        }
      }
    }
    const { P, Q, bu, bi, mu } = alsFactorize(ratings, nU, nI, 2, 25, 0.1, rand);
    const held = ratings.filter((_, i) => i % 5 === 0);
    const rmse = glmfRmse(held, P, Q, bu, bi, mu);
    expect(rmse).toBeLessThan(0.6);
  });
});

function randnGl(rand: () => number): number {
  let u = 0;
  while (u === 0) u = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
}
