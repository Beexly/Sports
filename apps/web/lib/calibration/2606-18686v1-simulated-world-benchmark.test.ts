import { describe, expect, it } from "vitest";

import {
  calibrationSlope,
  mutateDriveDist,
  rolloutGame,
  simBrier,
  simCRPS,
  simResolvedDistribution,
  slopeGateOk,
  mulberry32Local,
} from "@/lib/calibration/2606-18686v1-simulated-world-benchmark";

describe("simulated-world calibration benchmark", () => {
  const dist = [0, 0, 0, 3, 3, 7, 7, 3]; // per-drive points
  const state = {
    homeScore: 14,
    awayScore: 10,
    drivesRemaining: 6,
    homeDriveDist: dist,
    awayDriveDist: dist,
  };

  it("rollouts are deterministic under seed and resolve sensibly", () => {
    const r1 = simResolvedDistribution(state, 100, 5);
    const r2 = simResolvedDistribution(state, 100, 5);
    expect(r1.margins).toEqual(r2.margins);
    expect(r1.margins.length).toBe(100);
    const meanMargin = r1.margins.reduce((a, b) => a + b, 0) / 100;
    expect(meanMargin).toBeGreaterThan(0); // home leads at half
  });

  it("simBrier is ~0 for the sim-implied probability", () => {
    const { margins } = simResolvedDistribution(state, 2000, 6);
    const pSim = margins.filter((m) => m > 0).length / margins.length;
    expect(simBrier(pSim, margins)).toBeLessThan(0.001);
    expect(simBrier(1 - pSim, margins)).toBeGreaterThan(0.1);
  });

  it("simCRPS is ~0 for a degenerate perfect forecast and grows with bias", () => {
    // Degenerate forecast pinned at the sim-resolved outcome: CRPS = 0.
    const y = 24.5;
    expect(simCRPS([y, y, y], [y, y, y])).toBeCloseTo(0, 10);
    // A biased forecast scores worse than the sim-resolved distribution itself.
    const { totals } = simResolvedDistribution(state, 500, 7);
    const biased = totals.map((t) => t + 10);
    const selfScore = simCRPS(totals.slice(0, 250), totals.slice(250));
    expect(simCRPS(biased, totals)).toBeGreaterThan(selfScore);
  });

  it("interventional mutation shifts the resolved distribution", () => {
    const injured = { ...state, homeDriveDist: mutateDriveDist(dist, 0.5) };
    const base = simResolvedDistribution(state, 1500, 8);
    const mut = simResolvedDistribution(injured, 1500, 8);
    const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
    expect(mean(mut.margins)).toBeLessThan(mean(base.margins));
  });

  it("calibration slope ~1 for a well-calibrated engine", () => {
    const probs: number[] = [];
    const outcomes: number[] = [];
    const rand = mulberry32Local(9);
    for (let i = 0; i < 2000; i++) {
      const p = 0.1 + 0.8 * rand();
      probs.push(p);
      outcomes.push(rand() < p ? 1 : 0);
    }
    const slope = calibrationSlope(probs, outcomes);
    expect(slopeGateOk(slope)).toBe(true);
    expect(rolloutGame(state, rand).homeFinal).toBeGreaterThanOrEqual(14);
  });
});
