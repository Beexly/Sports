
import { describe, expect, it } from "vitest";
import { expectedFlags, expectedFreeYardage, xFlagsByCrew, xFlagsByTeam } from "./xflag";

describe("xflag", () => {
  it("expected flags sum clamped per-play probabilities", () => {
    expect(expectedFlags([0.1, 0.2, 0.3])).toBeCloseTo(0.6, 10);
    expect(expectedFlags([1.5, -0.2])).toBeCloseTo(1, 10);
  });
  it("aggregates by team and crew", () => {
    const byTeam = xFlagsByTeam([0.1, 0.2, 0.3], ["KC", "KC", "BUF"]);
    expect(byTeam.get("KC")).toBeCloseTo(0.3, 10);
    expect(byTeam.get("BUF")).toBeCloseTo(0.3, 10);
    const byCrew = xFlagsByCrew([0.1, 0.2], ["A", "B"]);
    expect(byCrew.get("A")).toBeCloseTo(0.1, 10);
  });
  it("expected free yardage weights by yards", () => {
    expect(expectedFreeYardage([0.5, 0.5], [10, 5])).toBeCloseTo(7.5, 10);
  });
  it("edge cases: empty -> 0; misaligned throws", () => {
    expect(expectedFlags([])).toBe(0);
    expect(() => xFlagsByTeam([0.1], ["a", "b"])).toThrow();
    expect(() => expectedFreeYardage([0.1], [])).toThrow();
  });
});
