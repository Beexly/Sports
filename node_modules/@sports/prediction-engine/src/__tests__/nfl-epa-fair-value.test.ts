import { describe, expect, it } from "vitest";
import {
  nflEpaToWinProbs,
  nflEpaToIndependentFairValue,
} from "../nfl-epa-fair-value.js";

describe("nflEpaToWinProbs", () => {
  it("favors higher overall EPA with HFA for equals", () => {
    const eq = nflEpaToWinProbs({ homeOverall: 0.05, awayOverall: 0.05 });
    expect(eq!.pHome).toBeGreaterThan(0.5);
    const edge = nflEpaToWinProbs({ homeOverall: 0.15, awayOverall: -0.05 });
    expect(edge!.pHome).toBeGreaterThan(eq!.pHome);
  });

  it("soft-fails thin games", () => {
    expect(
      nflEpaToWinProbs({
        homeOverall: 0.1,
        awayOverall: 0,
        homeGames: 2,
        awayGames: 10,
      }),
    ).toBeNull();
  });
});

describe("nflEpaToIndependentFairValue", () => {
  it("source nfl_epa_adj", () => {
    const fv = nflEpaToIndependentFairValue({
      homeOverall: 0.08,
      awayOverall: -0.02,
      homeGames: 8,
      awayGames: 8,
    });
    expect(fv?.source).toBe("nfl_epa_adj");
    expect(fv?.homeFairProb).toBeGreaterThan(0.5);
  });
});
