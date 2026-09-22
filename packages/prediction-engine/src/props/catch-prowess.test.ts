import { describe, expect, it } from "vitest";
import {
  catchProb,
  fitCatchProwess,
  normalCdf,
  spatialBaseline,
  splitHalfCorrelation,
} from "./catch-prowess";
import type { Target } from "./catch-prowess";

let s = 21;
const rng = (): number => {
  s = (1664525 * s + 1013904223) >>> 0;
  return s / 4294967296;
};

// Two receivers: "hands" catches everything, "stone" drops everything, same locations.
const targets: Target[] = [];
for (let i = 0; i < 80; i++) {
  const x = (rng() - 0.5) * 40;
  const depth = rng() * 20;
  targets.push({
    receiverId: "hands",
    x,
    depth,
    airYards: depth,
    separation: 2 + rng() * 2,
    caught: rng() < 0.95 ? 1 : 0,
  });
  targets.push({
    receiverId: "stone",
    x,
    depth,
    airYards: depth,
    separation: 2 + rng() * 2,
    caught: rng() < 0.35 ? 1 : 0,
  });
}

describe("catch-prowess", () => {
  it("spatialBaseline is a valid probability surface", () => {
    const b = spatialBaseline(targets, 0, 10);
    expect(b).toBeGreaterThan(0.3);
    expect(b).toBeLessThan(0.9);
    expect(spatialBaseline([], 0, 0)).toBe(0.6); // no data -> league average-ish
  });

  it("fitCatchProwess separates skill from opportunity", () => {
    const fit = fitCatchProwess(targets);
    expect(fit.hands!.prowess).toBeGreaterThan(fit.stone!.prowess);
    // same locations -> similar positioning sense
    expect(Math.abs(fit.hands!.positioningSense - fit.stone!.positioningSense)).toBeLessThan(0.05);
    expect(fit.hands!.targets).toBe(80);
  });

  it("small samples shrink toward zero prowess", () => {
    const few: Target[] = targets.slice(0, 4).map((t) => ({ ...t, receiverId: "rookie" }));
    const fit = fitCatchProwess(few, 100);
    expect(Math.abs(fit.rookie!.prowess)).toBeLessThan(0.05);
  });

  it("catchProb adds prowess on the probit scale", () => {
    const fit = fitCatchProwess(targets);
    const base = spatialBaseline(targets, 0, 10);
    expect(catchProb(fit, "hands", base)).toBeGreaterThan(catchProb(fit, "stone", base));
    expect(catchProb(fit, "unknown", base)).toBeCloseTo(base, 4); // probit round-trip ±2e-5
    expect(normalCdf(0)).toBeCloseTo(0.5, 6);
  });

  it("splitHalfCorrelation rewards stable signals", () => {
    expect(splitHalfCorrelation({ a: 1, b: 2, c: 3 }, { a: 1, b: 2, c: 3 })).toBeCloseTo(1, 10);
    expect(splitHalfCorrelation({ a: 1 }, { a: 1 })).toBe(0);
  });
});
