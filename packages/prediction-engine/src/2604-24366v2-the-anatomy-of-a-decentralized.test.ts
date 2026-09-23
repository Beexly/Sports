/**
 * Vitest suite for arXiv:2604.24366v2 (The Anatomy of a Decentralized Prediction Market: Microstructure Evidence from the Polymarket Order Book).
 * Gate: Adopt the sports-only replication and the spread-premium signal-weighting if direction-agreement and stylized facts replicate within sampling noise.
 */
import { describe, it, expect } from "vitest";
import { rffMap, drawRffParams, updateMeanEmbedding, mmdWitness } from "./2604-24366v2-the-anatomy-of-a-decentralized";

function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
describe("2604-24366v2 online covariate-shift detection", () => {
  it("detects drift between train and live feature streams", () => {
    const rng = lcg(77);
    const { W, b } = drawRffParams(2, 32, rng);
    let mt = new Array(32).fill(0);
    let nt = 0;
    let ml = new Array(32).fill(0);
    let nl = 0;
    const rng2 = lcg(78);
    for (let i = 0; i < 200; i++) {
      const xt = [rng2(), rng2()]; // train ~ U[0,1]
      const xl = [rng2() + 1.5, rng2()]; // live shifted
      const r1 = updateMeanEmbedding(mt, nt, rffMap(xt, W, b));
      mt = r1.mean; nt = r1.n;
      const r2 = updateMeanEmbedding(ml, nl, rffMap(xl, W, b));
      ml = r2.mean; nl = r2.n;
    }
    const { stat, drift } = mmdWitness(mt, ml, 0.05);
    expect(stat).toBeGreaterThan(0.05);
    expect(drift).toBe(true);
  });
  it("no drift when streams match", () => {
    const m = [0.1, 0.2];
    const { drift } = mmdWitness(m, [...m], 0.05);
    expect(drift).toBe(false);
    expect(() => mmdWitness([1], [1, 2], 0.1)).toThrow();
    expect(() => rffMap([1, 2], [[[1]] as unknown as number[][]][0] as never, [0])).toThrow();
  });
});
