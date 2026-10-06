import { describe, it, expect } from "vitest";
import {
  marginRegime,
  synthesize,
  logScore,
  fitBPS,
  fitOutcomeDependentBPS,
  bpsGate,
} from "./1803-01984-bps-outcome-pools.js";

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

/**
 * Synthetic: 5 outcome bins (margins -20..20). Model A is sharp in blowouts,
 * model B is sharp in close games; each is diffuse in the other's regime.
 */
function sim(n: number, seed: number) {
  const rand = mulberry32(seed);
  const K = 5;
  const dens: number[][][] = [];
  const outcomes: number[] = [];
  const margins: number[] = [];
  const base: number[][] = [];
  for (let i = 0; i < n; i++) {
    const blowout = rand() < 0.5;
    const truth = blowout ? (rand() < 0.5 ? 0 : 4) : 1 + Math.floor(rand() * 3);
    const mk = (sharp: number, flat: number, isBlow: boolean) => {
      const d = new Array<number>(K).fill(0);
      if ((blowout && isBlow) || (!blowout && !isBlow)) {
        d[truth] = sharp;
        const rest = (1 - sharp) / (K - 1);
        for (let k = 0; k < K; k++) if (k !== truth) d[k] = rest;
      } else {
        for (let k = 0; k < K; k++) d[k] = 1 / K;
        d[truth] = flat;
        const rest = (1 - flat) / (K - 1);
        for (let k = 0; k < K; k++) if (k !== truth) d[k] = rest;
      }
      return d;
    };
    dens.push([mk(0.7, 0.3, true), mk(0.7, 0.3, false)]);
    outcomes.push(truth);
    margins.push(blowout ? (truth === 0 ? -18 : 18) : (truth - 2) * 3);
    base.push([0.2, 0.2, 0.2, 0.2, 0.2]);
  }
  return { dens, outcomes, margins, base };
}

describe("bps outcome-dependent pools", () => {
  it("marginRegime splits blowouts from close games", () => {
    expect(marginRegime(14)).toBe("blowout");
    expect(marginRegime(-3)).toBe("close");
  });
  it("synthesize returns a valid density", () => {
    const q = synthesize(
      [
        [0.1, 0.7, 0.2],
        [0.3, 0.3, 0.4],
      ],
      [0.5, 0.5],
      [0, 0],
      [1 / 3, 1 / 3, 1 / 3],
      0.1,
    );
    expect(q.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
    expect(q.every((x) => x > 0)).toBe(true);
  });
  it("outcome-dependent BPS beats the equal-weight pool by >= 0.02 nats", () => {
    const { dens, outcomes, margins, base } = sim(800, 11);
    const od = fitOutcomeDependentBPS(dens, outcomes, margins, base);
    const ew = fitBPS(dens, outcomes, base);
    const scoreOD = { blowout: 0, close: 0 };
    const nOD = { blowout: 0, close: 0 };
    let totEW = 0;
    for (let i = 0; i < outcomes.length; i++) {
      const r = marginRegime(margins[i]!);
      const f = od[r];
      totEW += logScore(synthesize(dens[i]!, ew.weights, ew.biases, base[i]!, 0.05), outcomes[i]!);
      scoreOD[r] += logScore(synthesize(dens[i]!, f.weights, f.biases, base[i]!, 0.05), outcomes[i]!);
      nOD[r]++;
    }
    const meanOD = (scoreOD.blowout + scoreOD.close) / outcomes.length;
    const meanEW = totEW / outcomes.length;
    expect(meanOD - meanEW).toBeGreaterThanOrEqual(0.02);
    // regime weights genuinely differ (no collapse to constant)
    const shift = Math.abs(od.blowout.weights[0]! - od.close.weights[0]!);
    expect(shift).toBeGreaterThan(0.05);
    void nOD;
  });
  it("gate logic", () => {
    const w = {
      blowout: { weights: [0.9, 0.1], biases: [0, 0], meanLogScore: -1 },
      close: { weights: [0.1, 0.9], biases: [0, 0], meanLogScore: -1 },
    };
    expect(bpsGate(-1.0, -1.03, -1.02, 0.8, w)).toBe("ADOPT");
    expect(bpsGate(-1.0, -1.005, -1.02, 0.8, w)).toBe("REJECT");
  });
});
