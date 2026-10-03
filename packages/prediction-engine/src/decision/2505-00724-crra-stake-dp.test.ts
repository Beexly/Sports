// Tests for decision/2505-00724-crra-stake-dp.ts (vitest).
import { describe, it, expect } from "vitest";
import {
  crraUtility,
  crraInverseUtility,
  solveStakeDP,
  distillLinearRule,
  linearStake,
  kellySlopeReference,
  slopeWithinKelly,
} from "./2505-00724-crra-stake-dp.js";

const WEALTH = [0.5, 1.0, 1.5, 2.0];
const STAKES = [0, 0.05, 0.1, 0.2, 0.3, 0.5];
const EDGES = [-0.05, 0, 0.05, 0.1, 0.2];
const EDGE_PROBS = [0.1, 0.2, 0.3, 0.25, 0.15];

describe("crraUtility", () => {
  it("matches log utility at gamma = 1 and inverts cleanly", () => {
    expect(crraUtility(2, 1)).toBeCloseTo(Math.log(2), 12);
    expect(crraUtility(1, 3)).toBeCloseTo(0, 12);
    for (const g of [0.5, 1, 2, 5]) {
      expect(crraInverseUtility(crraUtility(1.7, g), g)).toBeCloseTo(1.7, 9);
    }
  });
  it("is increasing and concave in wealth", () => {
    const g = 2;
    expect(crraUtility(2, g)).toBeGreaterThan(crraUtility(1, g));
    const mid = (crraUtility(1, g) + crraUtility(3, g)) / 2;
    expect(crraUtility(2, g)).toBeGreaterThan(mid); // concave
  });
});

describe("solveStakeDP", () => {
  it("stakes nothing on negative edge and more on larger edge", () => {
    const policy = solveStakeDP({
      wealthGrid: [1],
      stakeGrid: STAKES,
      gamma: 1,
      edgeSupport: EDGES,
      edgeProbs: EDGE_PROBS,
    });
    // Posterior mean edge = -0.005+0+0.015+0.025+0.03 = 0.065 > 0 -> positive stake
    expect(policy[0]!).toBeGreaterThan(0);
    const negOnly = solveStakeDP({
      wealthGrid: [1],
      stakeGrid: STAKES,
      gamma: 1,
      edgeSupport: [-0.2, -0.1],
      edgeProbs: [0.5, 0.5],
    });
    expect(negOnly[0]).toBe(0);
  });
  it("flattens the policy as risk aversion gamma rises (alpha-dial analog)", () => {
    const at = (gamma: number) =>
      solveStakeDP({ wealthGrid: [1], stakeGrid: STAKES, gamma, edgeSupport: EDGES, edgeProbs: EDGE_PROBS })[0]!;
    expect(at(1)).toBeGreaterThanOrEqual(at(5));
    expect(at(5)).toBeGreaterThanOrEqual(at(20));
  });
});

describe("distillLinearRule", () => {
  it("recovers a positive slope near the Kelly slope on DP stakes", () => {
    const edges = [-0.1, -0.05, 0, 0.05, 0.1, 0.15, 0.2];
    const stakes = edges.map((e) => Math.max(0, e)); // Kelly slope 1 at even money
    const { slope, intercept } = distillLinearRule(edges, stakes);
    expect(slope).toBeGreaterThan(0.5);
    expect(slopeWithinKelly(slope, 1, 0.5)).toBe(true);
    expect(linearStake(slope, intercept, -0.5)).toBe(0); // floored
    expect(linearStake(slope, intercept, 0.1)).toBeGreaterThan(0);
  });
  it("kellySlopeReference is 1/winPayoff", () => {
    expect(kellySlopeReference(1)).toBe(1);
    expect(kellySlopeReference(2)).toBe(0.5);
    expect(slopeWithinKelly(1.1, 1)).toBe(true);
    expect(slopeWithinKelly(2.0, 1)).toBe(false);
  });
});
