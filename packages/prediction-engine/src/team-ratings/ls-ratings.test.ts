
import { describe, expect, it } from "vitest";
import { pairedComparisonLS, pairwiseZTest } from "./ls-ratings";

describe("ls-ratings", () => {
  const games = [
    { home: "KC", away: "BUF", homeScore: 30, awayScore: 20 },
    { home: "BUF", away: "KC", homeScore: 24, awayScore: 21 },
    { home: "KC", away: "DEN", homeScore: 28, awayScore: 10 },
    { home: "DEN", away: "BUF", homeScore: 17, awayScore: 24 },
  ];
  it("ranks the stronger team first with sum-zero ratings", () => {
    const r = pairedComparisonLS(games);
    const sum = r.rating.reduce((s, v) => s + v, 0);
    expect(sum).toBeCloseTo(0, 8);
    const kc = r.rating[r.teams.indexOf("KC")] ?? 0;
    const den = r.rating[r.teams.indexOf("DEN")] ?? 0;
    expect(kc).toBeGreaterThan(den);
  });
  it("standard errors are positive and finite", () => {
    const r = pairedComparisonLS(games);
    expect(r.se.every((s) => s > 0 && Number.isFinite(s))).toBe(true);
    expect(r.sigma2hat).toBeGreaterThan(0);
  });
  it("pairwise z-test flags a clear gap", () => {
    const t = pairwiseZTest(5, 0, 1, 1);
    expect(t.z).toBeCloseTo(5 / Math.SQRT2, 8);
    expect(t.significant95).toBe(true);
    const close = pairwiseZTest(0.1, 0, 1, 1);
    expect(close.significant95).toBe(false);
  });
  it("edge cases: <2 teams throws", () => {
    expect(() => pairedComparisonLS([])).toThrow();
    expect(() => pairedComparisonLS([{ home: "KC", away: "KC", homeScore: 1, awayScore: 0 }])).toThrow();
  });
});
