import { describe, it, expect } from "vitest";
import {
  mfSgd,
  mfPredict,
} from "./2302-13386-player2vec-embeddings.js";

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

describe("mfac", () => {
  it("mfSgd reduces training RMSE", () => {
    const rand = mulberry32(451);
    const nU = 20;
    const nI = 15;
    const obs: { u: number; i: number; r: number }[] = [];
    for (let u = 0; u < nU; u++) {
      for (let i = 0; i < nI; i++) {
        if (rand() < 0.6) obs.push({ u, i, r: 20 + 3 * Math.sin(u / 3) * Math.cos(i / 2) + randnMf(rand) });
      }
    }
    const before = Math.sqrt(obs.reduce((s, x) => s + (x.r - 20) ** 2, 0) / obs.length);
    const { P, Q, mu } = mfSgd(obs, nU, nI, 3, 40, 0.02, 0.05, rand);
    const after = Math.sqrt(
      obs.reduce((s, x) => s + (x.r - mfPredict(P, Q, mu, x.u, x.i)) ** 2, 0) / obs.length,
    );
    expect(after).toBeLessThan(before);
  });
});

function randnMf(rand: () => number): number {
  let u = 0;
  while (u === 0) u = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
}
