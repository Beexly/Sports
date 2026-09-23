/**
 * Vitest suite for arXiv:2608.19454 (Dummy RAPM: Representing Low-Minute Players in Regularized Adjusted Plus-Minus).
 * Gate: Gate (ADAPT): replicate the paper's pipeline on one NBA season of GSE data with the chronological split; accept if Dummy RAPM RMSE < Filtered RAPM RMSE on the outer test with the improvement direction matching in >= 70% of seasons tested; improvement path = learned per-player replacement-level propensity, success = outer-test RMSE reduction >= 0.06 with the same chronological protocol.
 */
import { describe, it, expect } from "vitest";
import { dummyRapmDesign, fitDummyRapm } from "./2608-19454-dummy-rapm-representing-lowminute-players";

describe("2608-19454 Dummy RAPM", () => {
  it("pools replacement level through dummies instead of dropping players", () => {
    const players = ["a", "b", "c"];
    const stints = [
      { plus: ["a", "b"], minus: ["c"], dummiesPlus: 1, dummiesMinus: 0, margin: 5 },
      { plus: ["a"], minus: ["b", "c"], dummiesPlus: 0, dummiesMinus: 1, margin: -3 },
      { plus: ["b", "c"], minus: ["a"], dummiesPlus: 0, dummiesMinus: 0, margin: 2 },
      { plus: ["a", "c"], minus: ["b"], dummiesPlus: 1, dummiesMinus: 1, margin: 1 },
    ];
    const { X, y } = dummyRapmDesign(stints, players, 2);
    expect(X[0]).toHaveLength(5);
    expect(y).toHaveLength(4);
    const beta = fitDummyRapm(X, y, 0.5, 2.2, players.length);
    expect(beta).toHaveLength(5);
    expect(beta.every(Number.isFinite)).toBe(true);
    // 'a' should rate above 'c' given the stint margins
    expect(beta[0]).toBeGreaterThan(beta[2] ?? 0);
    expect(() => fitDummyRapm([], [], 0.5, 2.2, 3)).toThrow();
  });
});
