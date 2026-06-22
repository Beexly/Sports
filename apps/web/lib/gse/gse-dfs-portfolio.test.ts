import { describe, it, expect } from "vitest";
import {
  buildCorrelationMatrix,
  covarianceFromCorrelation,
  riskParityWeights,
  lineupOverlap,
  portfolioUniqueness,
  exposureCounts,
  withinExposureCaps,
  type PlayerMeta,
} from "./index";

const players: PlayerMeta[] = [
  { id: "qb", team: "A", gameId: "g1" },
  { id: "wr", team: "A", gameId: "g1" },
  { id: "opp", team: "B", gameId: "g1" },
  { id: "other", team: "C", gameId: "g2" },
];

describe("DFS correlation + covariance", () => {
  it("encodes same-team, opponent, and unrelated structure", () => {
    const m = buildCorrelationMatrix(players, { sameTeamRho: 0.6, opponentRho: -0.2 });
    expect(m[0]![0]).toBe(1); // diagonal
    expect(m[0]![1]).toBeCloseTo(0.6, 6); // qb~wr same team
    expect(m[0]![2]).toBeCloseTo(-0.2, 6); // qb~opp same game
    expect(m[0]![3]).toBe(0); // unrelated
  });

  it("scales correlation into covariance by volatility", () => {
    const cov = covarianceFromCorrelation([[1, 0], [0, 1]], [2, 3]);
    expect(cov[0]![0]).toBeCloseTo(4, 6);
    expect(cov[1]![1]).toBeCloseTo(9, 6);
  });
});

describe("risk parity", () => {
  it("reduces to inverse-volatility for a diagonal covariance", () => {
    const w = riskParityWeights([[1, 0], [0, 4]]);
    expect(w[0]! + w[1]!).toBeCloseTo(1, 6);
    expect(w[0]!).toBeCloseTo(0.667, 2);
    expect(w[1]!).toBeCloseTo(0.333, 2);
    // equal risk contribution: w_i^2 * var_i should match
    const rc0 = w[0]! * (1 * w[0]!);
    const rc1 = w[1]! * (4 * w[1]!);
    expect(Math.abs(rc0 - rc1)).toBeLessThan(0.01);
  });

  it("gives equal weights for equal variances and stays valid when correlated", () => {
    const eq = riskParityWeights([[1, 0], [0, 1]]);
    expect(eq[0]!).toBeCloseTo(0.5, 3);
    const corr = riskParityWeights([[1, 0.5, 0.2], [0.5, 1, 0.1], [0.2, 0.1, 1]]);
    expect(corr.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6);
    for (const wi of corr) expect(wi).toBeGreaterThanOrEqual(0);
  });
});

describe("duplication-aware leverage", () => {
  it("computes lineup overlap as Jaccard", () => {
    expect(lineupOverlap(["a", "b", "c"], ["a", "b", "c"])).toBe(1);
    expect(lineupOverlap(["a", "b"], ["c", "d"])).toBe(0);
    expect(lineupOverlap(["a", "b", "c"], ["a", "b", "d"])).toBeCloseTo(2 / 4, 6);
  });

  it("scores identical lineups as zero-unique and disjoint as fully unique", () => {
    expect(portfolioUniqueness([["a", "b"], ["a", "b"]])).toBeCloseTo(0, 6);
    expect(portfolioUniqueness([["a", "b"], ["c", "d"]])).toBeCloseTo(1, 6);
    expect(portfolioUniqueness([["a", "b"]])).toBe(1);
  });
});

describe("exposure caps", () => {
  const lineups = [["a", "b", "c"], ["a", "b", "d"], ["a", "e", "f"]];

  it("computes per-player exposure", () => {
    const exp = exposureCounts(lineups);
    expect(exp.get("a")).toBeCloseTo(1, 6); // in all 3
    expect(exp.get("b")).toBeCloseTo(2 / 3, 6);
  });

  it("flags players over their cap", () => {
    const res = withinExposureCaps(lineups, { a: 0.5 }, 1);
    expect(res.ok).toBe(false);
    expect(res.violations.some((v) => v.player === "a")).toBe(true);
    expect(withinExposureCaps(lineups, {}, 1).ok).toBe(true);
  });
});
