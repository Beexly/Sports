import { describe, expect, it } from "vitest";
import {
  buildHMatrix, cappedMargin, kendallsTau, spectralRankAlgorithm1, spectralRankAlgorithm2,
  GSE_SPECTRAL_RANKER_ENABLED,
} from "./spectral-ranker-2309.js";

const games = [
  { teamA: "A", teamB: "B", margin: 10 },
  { teamA: "B", teamB: "C", margin: 7 },
  { teamA: "A", teamB: "C", margin: 21 },
  { teamA: "C", teamB: "A", margin: 3 }, // rematch, C wins by 3
];

describe("spectral ranker", () => {
  it("caps MOV at 28", () => {
    expect(cappedMargin(100)).toBe(28);
    expect(cappedMargin(-100)).toBe(-28);
    expect(cappedMargin(10)).toBe(10);
  });
  it("builds a skew-symmetric H", () => {
    const { teams, H } = buildHMatrix(games);
    expect(teams).toEqual(["A", "B", "C"]);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) expect(H[i]?.[j] ?? Number.NaN).toBeCloseTo(-(H[j]?.[i] ?? Number.NaN), 10);
  });
  it("ranks A above B above C on both algorithms", () => {
    expect(spectralRankAlgorithm1(games).map((r) => r.team)[0]).toBe("A");
    expect(spectralRankAlgorithm2(games).map((r) => r.team)[0]).toBe("A");
    expect(spectralRankAlgorithm2(games).map((r) => r.team)[2]).toBe("C");
  });
  it("kendalls tau: identical orderings = 1, reversed = -1, empty = 1", () => {
    expect(kendallsTau(["A", "B"], ["A", "B"])).toBe(1);
    expect(kendallsTau(["A", "B"], ["B", "A"])).toBe(-1);
    expect(kendallsTau([], [])).toBe(1);
  });
  it("stays off until the >=6/10 season gate clears", () => {
    expect(GSE_SPECTRAL_RANKER_ENABLED).toBe(false);
  });
});

