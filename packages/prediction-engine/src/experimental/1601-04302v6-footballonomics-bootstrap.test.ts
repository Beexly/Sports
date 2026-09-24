import { describe, it, expect } from "vitest";
import {
  fpmBootstrap,
  quantizedBinCalibration,
  kellyByLowerBound,
} from "./1601-04302v6-footballonomics-bootstrap.js";

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

// logistic win prob on feature-vector difference
const winProb = (a: number[], b: number[]) => {
  const d = a[0]! - b[0]! + 0.5 * (a[1]! - b[1]!);
  return 1 / (1 + Math.exp(-d));
};

describe("fpmBootstrap", () => {
  it("bootstrap mean matches the plug-in estimate and CI is sane", () => {
    const rand = mulberry32(3);
    const teamA = Array.from({ length: 16 }, () => [rand() * 2, rand()]);
    const teamB = Array.from({ length: 16 }, () => [rand() * 2 - 0.8, rand()]);
    const plugIn = winProb(
      teamA.reduce((s, r) => [s[0]! + r[0]! / 16, s[1]! + r[1]! / 16], [0, 0]),
      teamB.reduce((s, r) => [s[0]! + r[0]! / 16, s[1]! + r[1]! / 16], [0, 0]),
    );
    const r = fpmBootstrap(teamA, teamB, winProb, 1000, 11);
    expect(r.mean).toBeCloseTo(plugIn, 1);
    expect(r.ciLow).toBeLessThan(r.mean);
    expect(r.ciHigh).toBeGreaterThan(r.mean);
    expect(r.ciLow).toBeGreaterThanOrEqual(0);
    expect(r.ciHigh).toBeLessThanOrEqual(1);
  });
  it("H0 p-value is small when A clearly dominates", () => {
    const teamA = Array.from({ length: 16 }, () => [5, 5]);
    const teamB = Array.from({ length: 16 }, () => [-5, -5]);
    const r = fpmBootstrap(teamA, teamB, winProb, 500, 13);
    expect(r.h0PValue).toBe(0);
    expect(r.mean).toBeGreaterThan(0.99);
  });
});

describe("quantizedBinCalibration", () => {
  it("passes the y=x check on calibrated predictions", () => {
    const rand = mulberry32(17);
    const preds: number[] = [];
    const outcomes: (0 | 1)[] = [];
    for (let i = 0; i < 4000; i++) {
      const p = 0.1 + 0.8 * rand();
      preds.push(p);
      outcomes.push(rand() < p ? 1 : 0);
    }
    const check = quantizedBinCalibration(preds, outcomes, 10, 0.06);
    expect(check.passes).toBe(true);
    expect(check.maxAbsDev).toBeLessThan(0.06);
  });
  it("fails on badly miscalibrated predictions", () => {
    const preds = new Array<number>(2000).fill(0.9);
    const outcomes = new Array<0 | 1>(2000).fill(0);
    const check = quantizedBinCalibration(preds, outcomes, 10, 0.05);
    expect(check.passes).toBe(false);
  });
});

describe("kellyByLowerBound", () => {
  it("is more conservative than point-estimate Kelly", () => {
    const point = Math.max((0.6 * 2 - 1) / 1, 0);
    expect(kellyByLowerBound(0.55, 2.0)).toBeLessThan(point);
    expect(kellyByLowerBound(0.55, 2.0)).toBeGreaterThan(0);
    expect(kellyByLowerBound(0.4, 2.0)).toBe(0);
  });
});
