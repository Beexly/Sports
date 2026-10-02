import { describe, expect, it } from "vitest";
import {
  extractTeamFilmFeatures,
  passLeanBySituation,
} from "./team-film-features.js";
import { makeCorpus, makePlay } from "./film-fixtures.js";

describe("extractTeamFilmFeatures", () => {
  it("builds the down×distance matrix and formation frequencies", () => {
    const plays = makeCorpus();
    const tf = extractTeamFilmFeatures(plays, "KC", 2);
    expect(tf).not.toBeNull();
    expect(tf!.team).toBe("KC");
    expect(tf!.nPlays).toBe(12);
    // formation keys are "personnel|distribution"
    expect(tf!.formationFreq["11|trips-right"]).toBeCloseTo(0.5, 3);
    expect(tf!.formationFreq["11|2x2"]).toBeCloseTo(0.5, 3);
    // down×distance rows exist (minN=2)
    expect(tf!.downDistance.length).toBeGreaterThan(0);
    for (const row of tf!.downDistance) {
      expect(row.runRate + row.passRate).toBeCloseTo(1, 3);
    }
  });

  it("computes play-action/screen/hurry-up rates", () => {
    const plays = [
      ...Array.from({ length: 6 }, () =>
        makePlay({ possession: "KC", playType: "play-action" as const }),
      ),
      ...Array.from({ length: 2 }, () =>
        makePlay({ possession: "KC", playType: "screen" as const }),
      ),
      ...Array.from({ length: 4 }, () =>
        makePlay({ possession: "KC", playType: "run" as const }),
      ),
    ];
    const tf = extractTeamFilmFeatures(plays, "KC", 1);
    expect(tf!.playActionRate).toBeCloseTo(0.5, 3);
    expect(tf!.screenRate).toBeCloseTo(2 / 12, 3);
    // all snapKind "set" → hurryUpRate 0
    expect(tf!.hurryUpRate).toBe(0);
  });

  it("computes hurry-up rate from snap kinds", () => {
    const plays = [
      makePlay({ possession: "KC", snapKind: "hurry-up" }),
      makePlay({ possession: "KC", snapKind: "set" }),
      makePlay({ possession: "KC", snapKind: "set" }),
      makePlay({ possession: "KC", snapKind: "set" }),
    ];
    const tf = extractTeamFilmFeatures(plays, "KC", 1);
    expect(tf!.hurryUpRate).toBeCloseTo(0.25, 3);
  });

  it("returns null for a team with no plays", () => {
    expect(extractTeamFilmFeatures(makeCorpus(), "NE", 1)).toBeNull();
  });

  it("yards-per-play is null when results unobserved", () => {
    const plays = [
      makePlay({ possession: "KC", resultYards: null }),
      makePlay({ possession: "KC", resultYards: null }),
    ];
    const tf = extractTeamFilmFeatures(plays, "KC", 1);
    expect(tf!.yardsPerPlayByFormation["11|trips-right"]).toBeNull();
  });

  it("passLeanBySituation keys situations and omits sparse cells", () => {
    const plays = makeCorpus();
    const tf = extractTeamFilmFeatures(plays, "KC", 2);
    const lean = passLeanBySituation(tf!);
    // corpus: downs 1,2,3 with distance buckets medium/long
    expect(lean["1st-medium"]).toBeDefined();
    expect(lean["3rd-long"]).toBeDefined();
    // sparse 4th-down cells omitted
    expect(lean["4th-short"] ?? null).toBeNull();
  });
});
