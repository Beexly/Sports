import { describe, it, expect } from "vitest";
import {
  blrInit,
  blrUpdate,
  blrPredictive,
  blrNLL,
  rbfBasis,
  metaLoss,
  alpacaGate,
} from "./1807-08912v2-alpaca-online-regression.js";

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
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

describe("alpaca online regression", () => {
  it("rbfBasis peaks at the center", () => {
    const b = rbfBasis(0.5, [0, 0.5, 1], 0.2);
    expect(b[1]).toBeGreaterThan(b[0]!);
    expect(b[1]).toBeGreaterThan(b[2]!);
  });
  it("recursive updates match the batch posterior", () => {
    const rand = mulberry32(8);
    const d = 3;
    const noiseVar = 0.25;
    const priorVar = 4;
    const phis: number[][] = [];
    const ys: number[] = [];
    const wTrue = [1.5, -2, 0.5];
    for (let i = 0; i < 40; i++) {
      const phi = [randn(rand), randn(rand), randn(rand)];
      const y = phi[0]! * wTrue[0]! + phi[1]! * wTrue[1]! + phi[2]! * wTrue[2]! + randn(rand) * Math.sqrt(noiseVar);
      phis.push(phi);
      ys.push(y);
    }
    let post = blrInit(d, priorVar);
    for (let i = 0; i < phis.length; i++) post = blrUpdate(post, phis[i]!, ys[i]!, noiseVar);
    // batch posterior: cov = (Phi'Phi/noiseVar + I/priorVar)^{-1}
    const A = [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ];
    const b = [0, 0, 0];
    for (let i = 0; i < phis.length; i++) {
      for (let j = 0; j < d; j++) {
        b[j]! += phis[i]![j]! * ys[i]!;
        for (let k = 0; k < d; k++) A[j]![k]! += phis[i]![j]! * phis[i]![k]!;
      }
    }
    for (let j = 0; j < d; j++) {
      for (let k = 0; k < d; k++) A[j]![k] = A[j]![k]! / noiseVar + (j === k ? 1 / priorVar : 0);
      b[j]! /= noiseVar;
    }
    // invert A (3x3, closed form via adjugate-free Gaussian elimination)
    const det =
      A[0]![0]! * (A[1]![1]! * A[2]![2]! - A[1]![2]! * A[2]![1]!) -
      A[0]![1]! * (A[1]![0]! * A[2]![2]! - A[1]![2]! * A[2]![0]!) +
      A[0]![2]! * (A[1]![0]! * A[2]![1]! - A[1]![1]! * A[2]![0]!);
    const inv = [
      [
        (A[1]![1]! * A[2]![2]! - A[1]![2]! * A[2]![1]!) / det,
        (A[0]![2]! * A[2]![1]! - A[0]![1]! * A[2]![2]!) / det,
        (A[0]![1]! * A[1]![2]! - A[0]![2]! * A[1]![1]!) / det,
      ],
      [
        (A[1]![2]! * A[2]![0]! - A[1]![0]! * A[2]![2]!) / det,
        (A[0]![0]! * A[2]![2]! - A[0]![2]! * A[2]![0]!) / det,
        (A[0]![2]! * A[1]![0]! - A[0]![0]! * A[1]![2]!) / det,
      ],
      [
        (A[1]![0]! * A[2]![1]! - A[1]![1]! * A[2]![0]!) / det,
        (A[0]![1]! * A[2]![0]! - A[0]![0]! * A[2]![1]!) / det,
        (A[0]![0]! * A[1]![1]! - A[0]![1]! * A[1]![0]!) / det,
      ],
    ];
    for (let j = 0; j < d; j++) {
      let m = 0;
      for (let k = 0; k < d; k++) m += inv[j]![k]! * b[k]!;
      expect(post.mean[j]).toBeCloseTo(m, 8);
      for (let k = 0; k < d; k++) expect(post.cov[j]![k]).toBeCloseTo(inv[j]![k]!, 8);
    }
  });
  it("online learning beats the static prior on new data", () => {
    const rand = mulberry32(9);
    const d = 2;
    const noiseVar = 0.25;
    let post = blrInit(d, 4);
    const staticPost = blrInit(d, 4);
    let nllOnline = 0;
    let nllStatic = 0;
    for (let i = 0; i < 30; i++) {
      const phi = [randn(rand), randn(rand)];
      const y = 2 * phi[0]! - phi[1]! + randn(rand) * Math.sqrt(noiseVar);
      if (i >= 15) {
        nllOnline += blrNLL(post, phi, y, noiseVar);
        nllStatic += blrNLL(staticPost, phi, y, noiseVar);
      }
      post = blrUpdate(post, phi, y, noiseVar);
    }
    expect(nllOnline).toBeLessThan(nllStatic);
    // predictive variance shrinks with data
    const v0 = blrPredictive(blrInit(d, 4), [1, 0], noiseVar).variance;
    const v1 = blrPredictive(post, [1, 0], noiseVar).variance;
    expect(v1).toBeLessThan(v0);
  });
  it("metaLoss decreases as the prior variance approaches the task scale", () => {
    const rand = mulberry32(10);
    const tasks = Array.from({ length: 6 }, () => {
      const phis: number[][] = [];
      const ys: number[] = [];
      for (let i = 0; i < 12; i++) {
        const phi = [randn(rand), randn(rand)];
        ys.push(3 * phi[0]! + randn(rand) * 0.5);
        phis.push(phi);
      }
      return { phis, ys };
    });
    const bad = metaLoss(tasks, 2, 1e-6, 0.25); // far too tight prior
    const good = metaLoss(tasks, 2, 25, 0.25); // covers the task scale
    expect(good).toBeLessThan(bad);
  });
  it("gate logic", () => {
    expect(alpacaGate(0.02, 50, true)).toBe("ADAPT");
    expect(alpacaGate(0.02, 50, false)).toBe("REJECT");
    expect(alpacaGate(0.005, 50, true)).toBe("REJECT");
  });
});
