import { describe, it, expect } from "vitest";
import {
  conformalQuantile,
  conformalInterval,
  normalizedInterval,
  rollingCoverage,
  icmMartingaleValue,
  icmAlarm,
} from "./1905-07886-conformal-ncp-intervals.js";

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

describe("conformal", () => {
  it("normalized intervals adapt width to heteroscedastic noise", () => {
    const rand = mulberry32(21);
    const resid: number[] = [];
    for (let i = 0; i < 1000; i++) {
      const sigma = 0.5 + rand();
      resid.push(Math.abs(randn(rand)) * 1); // |resid|/sigma scores
    }
    const q = conformalQuantile(resid, 0.1);
    const w1 = normalizedInterval(0, 0.5, q);
    const w2 = normalizedInterval(0, 2.0, q);
    expect(w2[1]! - w2[0]!).toBeGreaterThan(w1[1]! - w1[0]!);
  });
  it("rolling coverage hits nominal level on calibrated residuals", () => {
    const rand = mulberry32(22);
    const n = 2000;
    const ys: number[] = [];
    const los: number[] = [];
    const his: number[] = [];
    const q = 1.6448536269514729; // 90% two-sided normal quantile
    for (let i = 0; i < n; i++) {
      const y = randn(rand);
      ys.push(y);
      los.push(-q);
      his.push(q);
    }
    const cov = rollingCoverage(ys, los, his);
    expect(Math.abs(cov - 0.9)).toBeLessThan(0.03);
  });
  it("ICM martingale stays flat under uniform p-values, spikes under drift", () => {
    const rand = mulberry32(23);
    const nullP = Array.from({ length: 300 }, () => rand());
    const { alarmAt: a0 } = icmAlarm(nullP, 100);
    expect(a0).toBe(-1);
    const driftP = [...Array.from({ length: 100 }, () => rand()), ...Array.from({ length: 60 }, () => rand() * 0.05)];
    const { alarmAt: a1 } = icmAlarm(driftP, 20);
    expect(a1).toBeGreaterThanOrEqual(0);
  });
});
