import { describe, it, expect } from "vitest";
import { playerKernel, gpPredict } from "./1609-01176v1-player-kernel-gp.js";

const SIGMA2 = 4;
const TAU = 100;

describe("playerKernel", () => {
  it("is maximized by identical personnel and decays with time", () => {
    const g = { z: [0.8, 0.2, 0.5], daysAgo: 10 };
    const same = { z: [0.8, 0.2, 0.5], daysAgo: 10 };
    const old = { z: [0.8, 0.2, 0.5], daysAgo: 400 };
    const diff = { z: [0.1, 0.9, 0.0], daysAgo: 10 };
    expect(playerKernel(g, same, SIGMA2, TAU)).toBeGreaterThan(playerKernel(g, old, SIGMA2, TAU));
    expect(playerKernel(g, same, SIGMA2, TAU)).toBeGreaterThan(playerKernel(g, diff, SIGMA2, TAU));
    expect(playerKernel(g, old, SIGMA2, TAU)).toBeCloseTo(
      playerKernel(g, same, SIGMA2, TAU) * Math.exp(-390 / TAU),
      8,
    );
  });
});

describe("gpPredict", () => {
  const train = [
    { z: [1, 0, 0], daysAgo: 7, margin: 10 },
    { z: [0, 1, 0], daysAgo: 7, margin: -7 },
    { z: [0, 0, 1], daysAgo: 300, margin: 3 },
  ];
  it("interpolates near-duplicate personnel to the observed margin", () => {
    const p = gpPredict(train, [0.98, 0.01, 0.01], 7, SIGMA2, TAU, 0.5);
    expect(p.mean).toBeGreaterThan(5);
    expect(p.variance).toBeGreaterThan(0);
  });
  it("time decay makes recent personnel dominate stale personnel", () => {
    // same z as the stale game but played yesterday: prediction moves toward recent games
    const stale = gpPredict(train, [0, 0, 1], 300, SIGMA2, TAU, 0.5);
    const fresh = gpPredict(train, [0, 0, 1], 7, SIGMA2, TAU, 0.5);
    expect(Math.abs(fresh.mean - 3)).toBeGreaterThan(Math.abs(stale.mean - 3) - 1e-9);
    expect(stale.mean).toBeCloseTo(3, 0);
  });
  it("novel personnel yields higher predictive variance", () => {
    const known = gpPredict(train, [1, 0, 0], 7, SIGMA2, TAU, 0.5);
    const novel = gpPredict(train, [1, 1, 1], 200, SIGMA2, TAU, 0.5);
    expect(novel.variance).toBeGreaterThan(known.variance);
  });
});
