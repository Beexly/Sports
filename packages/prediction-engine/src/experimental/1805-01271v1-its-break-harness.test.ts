import { it, expect } from "vitest";
import {
  normalCdf,
  fitITSPoisson,
  scanBreaks,
  itsGate,
} from "./1805-01271v1-its-break-harness.js";

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

function simCounts(n: number, breakAt: number | null, seed: number): number[] {
  const rand = mulberry32(seed);
  const out: number[] = [];
  for (let t = 0; t < n; t++) {
    let logMu = 2.2 + 0.004 * t;
    if (breakAt !== null && t >= breakAt) logMu += -0.012 * (t - breakAt);
    const mu = Math.exp(logMu);
    // Poisson draw via Knuth
    let k = 0;
    let p = Math.exp(-mu);
    let s = p;
    const u = rand();
    while (s < u) {
      k++;
      p *= mu / k;
      s += p;
    }
    out.push(k);
  }
  return out;
}

/** Noisier low-count DGP for the gate scan (realistic injury-count scale). */
function simNoisyBreak(n: number, breakAt: number, seed: number): number[] {
  const rand = mulberry32(seed);
  const out: number[] = [];
  for (let t = 0; t < n; t++) {
    let logMu = 1.2 + 0.004 * t;
    if (t >= breakAt) logMu += -0.015 * (t - breakAt);
    const mu = Math.exp(logMu);
    let k = 0;
    let p = Math.exp(-mu);
    let s = p;
    const u = rand();
    while (s < u) {
      k++;
      p *= mu / k;
      s += p;
    }
    out.push(k);
  }
  return out;
}
  it("normalCdf sanity", () => {
    expect(normalCdf(0)).toBeCloseTo(0.5, 6);
    expect(normalCdf(1.96)).toBeCloseTo(0.975, 3);
  });
  it("detects a planted trend break at the true point", () => {
    const counts = simCounts(120, 60, 21);
    const f = fitITSPoisson(counts, 60);
    expect(f.pTrend).toBeLessThan(0.05);
    expect(f.beta[3]!).toBeLessThan(0); // trend turns negative
  });
  it("placebo scan: stable series raises no flags", () => {
    const counts = simCounts(120, null, 22);
    const scans = scanBreaks(counts, [40, 60, 80]);
    for (const s of scans) {
      expect(s.pTrend).toBeGreaterThan(0.05);
      expect(s.pLevel).toBeGreaterThan(0.05);
    }
  });
  it("gate: true break stands out in the placebo scan; rule logic is exact", () => {
    // exact rule logic on controlled p-values
    expect(itsGate(0.01, [0.2, 0.5])).toBe("ADOPT");
    expect(itsGate(0.01, [0.02, 0.5])).toBe("REJECT"); // a placebo rejects -> not robust
    expect(itsGate(0.2, [0.5, 0.6])).toBe("REJECT"); // true break not significant
    expect(itsGate(0.04, [0.05, 0.9])).toBe("ADOPT"); // boundary: placebo at 0.05 fails to reject

    // end-to-end: planted trend break -> the true point carries the strongest signal
    const counts = simNoisyBreak(140, 70, 7);
    const scans = scanBreaks(counts, [70, 30, 110]);
    const trueP = scans.find((s) => s.point === 70)!.pTrend;
    expect(trueP).toBeLessThan(0.05);
    for (const s of scans) {
      if (s.point !== 70) expect(trueP).toBeLessThan(s.pTrend);
    }

    // stable series: the gate rejects (no break to adopt)
    const stable = simCounts(120, null, 24);
    const s2 = scanBreaks(stable, [60, 35, 85]);
    expect(
      itsGate(
        s2.find((s) => s.point === 60)!.pTrend,
        s2.filter((s) => s.point !== 60).map((s) => s.pTrend),
      ),
    ).toBe("REJECT");
  });
