// Tests for decision/2101-12523-sele-loss-gate.ts (vitest).
import { describe, it, expect } from "vitest";
import {
  ridgeFit,
  regGateWeights,
  selePairwiseLoss,
  areaUnderRiskCoverage,
  boundedCoveragePublish,
  maskWinRate,
  seleGatePasses,
} from "./2101-12523-sele-loss-gate.js";

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

describe("ridgeFit (2101.12523 REG)", () => {
  it("recovers linear weights on synthetic data", () => {
    const rand = mulberry32(51);
    const wTrue = [2.0, -1.0, 0.5];
    const X: number[][] = [];
    const y: number[] = [];
    for (let i = 0; i < 200; i++) {
      const x = [rand(), rand(), rand()];
      X.push(x);
      y.push(2 * x[0]! - x[1]! + 0.5 * x[2]! + (rand() - 0.5) * 0.01);
    }
    const w = ridgeFit(X, y, 0.01);
    wTrue.forEach((wt, j) => expect(Math.abs(w[j]! - wt)).toBeLessThan(0.15));
  });
  it("handles empty input", () => {
    expect(ridgeFit([], [], 1)).toEqual([]);
  });
});

describe("areaUnderRiskCoverage", () => {
  it("an informative gate score beats a random one", () => {
    const rand = mulberry32(52);
    const picks = Array.from({ length: 200 }, (_, i) => ({
      loss: i % 2, // alternating loss
      psi: [i % 2 === 0 ? 0.1 : 0.9, rand()], // low score = low loss -> publish first
    }));
    const good = picks.map((p) => p.psi[0]!); // low score = low loss -> publish first
    const random = picks.map(() => rand());
    const aurcGood = areaUnderRiskCoverage(picks, good);
    const aurcRandom = areaUnderRiskCoverage(picks, random);
    expect(aurcGood).toBeLessThan(aurcRandom * 0.9); // >=10% relative improvement
  });
});

describe("regGateWeights + boundedCoveragePublish", () => {
  it("learns a gate that concentrates wins at the operating coverage", () => {
    const rand = mulberry32(53);
    // loss = 1 - edge-ish: first psi feature predicts the loss.
    const picks = Array.from({ length: 300 }, () => {
      const edge = rand();
      return { loss: edge < 0.5 ? 1 : 0, psi: [edge, rand(), rand(), rand(), rand()] };
    });
    const w = regGateWeights(picks, 0.1);
    const scores = picks.map((p) => w.reduce((a, x, j) => a + x * p.psi[j]!, 0));
    const mask = boundedCoveragePublish(scores, 0.3);
    expect(mask.filter(Boolean).length).toBe(90);
    const wr = maskWinRate(mask, picks.map((p) => p.loss));
    expect(wr).toBeGreaterThan(0.5); // gate selects the low-loss region
  });
});

describe("selePairwiseLoss", () => {
  it("is zero for a perfectly rank-consistent gate", () => {
    const picks = [
      { loss: 0, psi: [0.0] },
      { loss: 0, psi: [0.1] },
      { loss: 1, psi: [1.1] },
      { loss: 1, psi: [1.2] },
    ];
    // w = [1]: scores rank losses correctly with margin >= 1.
    expect(selePairwiseLoss(picks, [1], 0)).toBeCloseTo(0, 10);
    // w = [-1]: inverted ranking -> positive loss.
    expect(selePairwiseLoss(picks, [-1], 0)).toBeGreaterThan(0);
  });
});

describe("seleGatePasses", () => {
  it("encodes the AuRC + hard-fail card-size gate", () => {
    expect(seleGatePasses(0.4, 0.5, 0.6, 0.55)).toBe(true);
    expect(seleGatePasses(0.46, 0.5, 0.6, 0.55)).toBe(false); // <10% relative
    expect(seleGatePasses(0.4, 0.5, 0.54, 0.55)).toBe(false); // hard fail at card size
  });
});
