import { describe, expect, it } from "vitest";

import {
  ENABLED,
  distortedCopy,
  edgeStatistic,
  edgeTest,
  weeklyQCRun,
} from "@/lib/calibration/2608-20511-edge-directed-calibration-test";

function mulberry(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("EDGE directed calibration test", () => {
  it("is disabled by default", () => {
    expect(ENABLED).toBe(false);
  });

  it("statistic is ~0 for calibrated forecasts", () => {
    const rand = mulberry(101);
    const n = 800;
    const probs = Array.from({ length: n }, () => 0.1 + 0.8 * rand());
    const ys = probs.map((p) => (rand() < p ? 1 : 0));
    expect(edgeStatistic(probs, ys)).toBeLessThan(0.5);
  });

  it("rejects the distorted copy at p<0.05 on >=500 games", () => {
    const rand = mulberry(102);
    const n = 600;
    // True outcomes follow p^2 (systematic monotone distortion), engine reports p.
    const probs = Array.from({ length: n }, () => 0.05 + 0.9 * rand());
    const ys = probs.map((p) => (rand() < p * p ? 1 : 0));
    const res = edgeTest(probs, ys, 300, 7);
    expect(res.pValue).toBeLessThan(0.05);
    expect(res.fires).toBe(true);
    // Sanity: the distorted copy differs from the original.
    const d = distortedCopy([0.5, 0.8]);
    expect(d[0]).toBeCloseTo(0.25, 10);
  });

  it("does not fire on calibrated data", () => {
    const rand = mulberry(103);
    const n = 600;
    const probs = Array.from({ length: n }, () => 0.1 + 0.8 * rand());
    const ys = probs.map((p) => (rand() < p ? 1 : 0));
    const res = edgeTest(probs, ys, 300, 8);
    expect(res.fires).toBe(false);
  });

  it("weekly QC triages smooth miscalibration to a recalibration map", () => {
    const rand = mulberry(104);
    const n = 600;
    const probs = Array.from({ length: n }, () => 0.05 + 0.9 * rand());
    const ys = probs.map((p) => (rand() < p * p ? 1 : 0));
    const run = weeklyQCRun(probs, ys);
    expect(run.fires).toBe(true);
    expect(["recalibrate-map", "feature-revisit"]).toContain(run.triage);
  });
});
