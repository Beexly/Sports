import { describe, it, expect } from "vitest";
import {
  LSTMWeights,
  lstmCellForward,
  lstmInitWeights,
  lstmSequence,
  asymmetricMse,
} from "./2206-09654v1-season-total-lstm-ensemble.js";

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

describe("lstm", () => {
  it("lstmSequence produces bounded hidden states of the right dim", () => {
    const rand = mulberry32(321);
    const W = lstmInitWeights(4, 8, rand);
    const X = Array.from({ length: 20 }, () => [rand(), rand(), rand(), rand()]);
    const h = lstmSequence(X, W);
    expect(h.length).toBe(8);
    expect(h.every((v) => Math.abs(v) <= 1 && Number.isFinite(v))).toBe(true);
  });
  it("cell state carries information across steps", () => {
    const rand = mulberry32(322);
    const W = lstmInitWeights(2, 4, rand);
    const h1 = lstmSequence([[1, 1], [1, 1], [1, 1]], W);
    const h2 = lstmSequence([[-1, -1], [-1, -1], [-1, -1]], W);
    const dist = Math.hypot(...h1.map((v, i) => v - h2[i]!));
    expect(dist).toBeGreaterThan(0.01);
  });
  it("asymmetricMse penalizes underestimation more", () => {
    expect(asymmetricMse(10, 8, 3)).toBeGreaterThan(asymmetricMse(10, 12, 3));
  });
});
