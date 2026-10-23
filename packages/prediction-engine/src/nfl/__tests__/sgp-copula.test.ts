import { describe, expect, it } from "vitest";
import {
  OBSERVED_JOINT_AT_HALF,
  THETA_BY_PAIRING,
  independenceErrorPp,
  jointExceedance,
  jointForPairing,
} from "../sgp-copula";

describe("Clayton survival joint", () => {
  it("reduces to independence at theta 0", () => {
    expect(jointExceedance(0.5, 0.5, 0)).toBeCloseTo(0.25, 10);
    expect(jointExceedance(0.3, 0.6, 0)).toBeCloseTo(0.18, 10);
  });

  it("is above independence for a positive theta", () => {
    expect(jointExceedance(0.5, 0.5, 0.788)).toBeGreaterThan(0.25);
  });

  it("never exceeds the Frechet upper bound", () => {
    for (const [a, b] of [
      [0.9, 0.9],
      [0.95, 0.4],
      [0.2, 0.98],
    ] as const) {
      expect(jointExceedance(a, b, 2)).toBeLessThanOrEqual(Math.min(a, b) + 1e-12);
    }
  });

  it("never falls below independence", () => {
    expect(jointExceedance(0.4, 0.7, 0.5)).toBeGreaterThanOrEqual(0.4 * 0.7 - 1e-12);
  });

  it("handles certain legs", () => {
    expect(jointExceedance(1, 0.4, 0.8)).toBeCloseTo(0.4, 10);
  });

  it("clamps probabilities outside [0,1]", () => {
    expect(jointExceedance(-0.2, 1.4, 0.5)).toBeCloseTo(jointExceedance(0, 1, 0.5), 10);
  });
});

describe("pairing table", () => {
  it("pins the fitted theta values", () => {
    expect(THETA_BY_PAIRING["QB-WR"]).toBe(0.788);
    expect(THETA_BY_PAIRING["QB-TE"]).toBe(0.57);
    expect(THETA_BY_PAIRING["QB-RB"]).toBeLessThan(THETA_BY_PAIRING["QB-TE"]);
  });

  it("ranks pairings by dependence at equal marginals", () => {
    const wr = jointForPairing(0.5, 0.5, "QB-WR");
    const te = jointForPairing(0.5, 0.5, "QB-TE");
    const rb = jointForPairing(0.5, 0.5, "QB-RB");
    expect(wr).toBeGreaterThan(te);
    expect(te).toBeGreaterThan(rb);
  });

  it("reproduces the observed joint at half marginals within rounding", () => {
    // Modelling at 0.5/0.5 should land near the measured cells, not near 0.25.
    expect(jointForPairing(0.5, 0.5, "QB-WR")).toBeCloseTo(OBSERVED_JOINT_AT_HALF["QB-WR"], 1);
    expect(jointForPairing(0.5, 0.5, "QB-RB")).toBeCloseTo(OBSERVED_JOINT_AT_HALF["QB-RB"], 1);
  });
});

describe("independence error", () => {
  it("is positive for complementary pairings", () => {
    expect(independenceErrorPp(0.5, 0.5, "QB-WR")).toBeGreaterThan(3);
  });

  it("is near zero for the RB pairing", () => {
    expect(Math.abs(independenceErrorPp(0.5, 0.5, "QB-RB"))).toBeLessThan(1.5);
  });
});
