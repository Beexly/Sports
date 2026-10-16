import { describe, expect, it } from "vitest";
import {
  computePlayCallerFingerprint,
  type FingerprintPlay,
  type CoachMapping,
} from "../play-caller-fingerprint.js";

function makePlay(partial: Partial<FingerprintPlay>): FingerprintPlay {
  return {
    playId: "default",
    gameId: "G1",
    season: 2026,
    week: 1,
    teamId: "AAA",
    playType: "pass",
    personnelGrouping: "11",
    driveId: 1,
    ...partial,
  };
}

describe("play-caller-fingerprint module", () => {
  it("computes entropy correctly for a hand-computable fixture", () => {
    // We want >200 plays so we don't return null
    // Let's create a target window at week 2
    // Team AAA uses ONLY grouping "11" -> normalized entropy 0, eff grps 1
    // Team BBB uses exactly 50% "11" and 50% "12" -> normalized entropy 1 (K=2), eff grps 2

    const plays: FingerprintPlay[] = [];

    // Target play
    plays.push(makePlay({ week: 2, teamId: "AAA" })); // causes window resolution for week 2

    // Team AAA plays (week 1)
    for (let i = 0; i < 200; i++) {
      plays.push(makePlay({ teamId: "AAA", personnelGrouping: "11" }));
    }

    // Team BBB plays (week 1)
    for (let i = 0; i < 100; i++) {
      plays.push(makePlay({ teamId: "BBB", personnelGrouping: "11" }));
      plays.push(makePlay({ teamId: "BBB", personnelGrouping: "12" }));
    }

    // K = 2 across league (11, 12)

    const coachMap: CoachMapping[] = [];

    const results = computePlayCallerFingerprint(plays, coachMap);

    // We expect both teams to have results. We filter to windowKind = season.
    const aaaSeason = results.find(r => r.teamId === "AAA" && r.windowKind === "season");
    const bbbSeason = results.find(r => r.teamId === "BBB" && r.windowKind === "season");

    expect(aaaSeason).toBeDefined();
    expect(bbbSeason).toBeDefined();

    // Entropy math validation
    expect(aaaSeason!.distinctGroupingsK).toBe(2);
    expect(aaaSeason!.normalizedEntropy).toBe(0);
    expect(aaaSeason!.effectiveGroupings).toBe(1);

    expect(bbbSeason!.distinctGroupingsK).toBe(2);
    // 0.5 * log(0.5) + 0.5 * log(0.5) = log(0.5)
    // H = -log(0.5) = log(2)
    // norm = log(2) / log(2) = 1
    // eff = exp(log(2)) = 2
    expect(bbbSeason!.normalizedEntropy).toBeCloseTo(1, 5);
    expect(bbbSeason!.effectiveGroupings).toBeCloseTo(2, 5);
  });

  it("excludes unparseable/missing personnel plays from denominator", () => {
    const plays: FingerprintPlay[] = [
      makePlay({ week: 2, teamId: "AAA" }) // Target
    ];

    for (let i = 0; i < 200; i++) {
      plays.push(makePlay({ teamId: "AAA", personnelGrouping: "11" }));
    }

    // 50 plays with missing personnel
    for (let i = 0; i < 50; i++) {
      plays.push(makePlay({ teamId: "AAA", personnelGrouping: null }));
    }

    const results = computePlayCallerFingerprint(plays, []);
    const aaaSeason = results.find(r => r.teamId === "AAA" && r.windowKind === "season");

    expect(aaaSeason!.playsCounted).toBe(200);
  });

  it("computes Markov predictability correctly", () => {
    // Predictability = 1 - H(next|current)/H(next)

    const plays: FingerprintPlay[] = [
      makePlay({ week: 2, teamId: "AAA" }), // Target
      makePlay({ week: 2, teamId: "BBB" })
    ];

    // Team AAA: perfectly alternating pass/run
    for (let i = 0; i < 200; i++) {
      plays.push(makePlay({
        teamId: "AAA",
        personnelGrouping: "11",
        playType: i % 2 === 0 ? "pass" : "run",
        driveId: 1
      }));
    }

    // Team BBB: random/independent (all pass or uniformly random but conditionally equal)
    // Let's do purely independent.
    for (let i = 0; i < 200; i++) {
      plays.push(makePlay({
        teamId: "BBB",
        personnelGrouping: "11",
        playType: i < 100 ? "pass" : "run", // H(next) will be 1 but conditionally also 1 roughly (actually it's perfectly predictable within blocks, let's just make it alternating every 2)
        driveId: 2
      }));
    }

    const results = computePlayCallerFingerprint(plays, []);
    const aaaSeason = results.find(r => r.teamId === "AAA" && r.windowKind === "season");

    // perfectly alternating = if current is pass, next is run (prob 1.0) -> conditional entropy 0
    // so H(next|current) = 0 -> predictability = 1.0
    expect(aaaSeason!.predictability).toBeCloseTo(1.0, 3);
  });

  it("Markov ignores transitions across drive boundaries", () => {
    const plays: FingerprintPlay[] = [
      makePlay({ week: 2, teamId: "AAA" })
    ];

    for (let i = 0; i < 200; i++) {
      plays.push(makePlay({
        teamId: "AAA",
        personnelGrouping: "11",
        playType: i % 2 === 0 ? "pass" : "run",
        driveId: i // EVERY PLAY DIFFERENT DRIVE
      }));
    }

    const results = computePlayCallerFingerprint(plays, []);
    const aaaSeason = results.find(r => r.teamId === "AAA" && r.windowKind === "season");

    // Since every play is in a different drive, there are NO transitions.
    // Predictability defaults to 0.
    expect(aaaSeason!.predictability).toBe(0);
  });

  it("Coach mapping applies correctly and handles mid-season splits/nulls", () => {
    const plays: FingerprintPlay[] = [
      makePlay({ week: 3, teamId: "AAA" }), // target week 3
      makePlay({ week: 4, teamId: "AAA" }), // target week 4
    ];

    // week 1, 2
    for (let i = 0; i < 200; i++) {
      plays.push(makePlay({ week: 1, teamId: "AAA" }));
      plays.push(makePlay({ week: 2, teamId: "AAA" }));
    }

    const coachMap: CoachMapping[] = [
      { season: 2026, week: 3, teamId: "AAA", coachName: "Coach A" },
      // week 4 is null/missing
    ];

    const results = computePlayCallerFingerprint(plays, coachMap);

    const w3 = results.find(r => r.targetWeek === 3 && r.windowKind === "season");
    const w4 = results.find(r => r.targetWeek === 4 && r.windowKind === "season");

    expect(w3!.coachName).toBe("Coach A");
    expect(w4!.coachName).toBeNull();
  });

  it("Shrinkage and floors work properly", () => {
    const plays: FingerprintPlay[] = [
      makePlay({ week: 2, teamId: "AAA" }),
      makePlay({ week: 2, teamId: "BBB" })
    ];

    // Team AAA has 200 plays
    for (let i = 0; i < 200; i++) plays.push(makePlay({ teamId: "AAA" }));

    // Team BBB has 199 plays -> under floor!
    for (let i = 0; i < 199; i++) plays.push(makePlay({ teamId: "BBB" }));

    const results = computePlayCallerFingerprint(plays, []);

    const aaaSeason = results.find(r => r.teamId === "AAA" && r.windowKind === "season");
    const bbbSeason = results.find(r => r.teamId === "BBB" && r.windowKind === "season");

    expect(aaaSeason).toBeDefined();
    expect(bbbSeason).toBeUndefined(); // Floor not met, no number invented.

    // Check shrinkage
    // AAA count = 200. weight = 200 / 300 = 0.666
    // Since AAA is the only team above floor, the league mean = AAA's stat
    // shrunk = stat * weight + stat * (1-weight) = stat
    expect(aaaSeason!.shrunkNormalizedEntropy).toBeCloseTo(aaaSeason!.normalizedEntropy, 5);
  });

  it("Ensures STRICTLY point-in-time calculation", () => {
    const plays: FingerprintPlay[] = [
      makePlay({ week: 2, teamId: "AAA" }) // Target
    ];

    // Plays in week 1 (valid)
    for (let i = 0; i < 200; i++) plays.push(makePlay({ week: 1, teamId: "AAA" }));

    // Plays in week 2 (INVALID for week 2 window)
    for (let i = 0; i < 200; i++) plays.push(makePlay({ week: 2, teamId: "AAA", personnelGrouping: "22" }));

    const results = computePlayCallerFingerprint(plays, []);
    const aaaSeason = results.find(r => r.teamId === "AAA" && r.windowKind === "season");

    // Since it only considers week 1, distinct groupings used is just 1 (from default "11")
    // effective groupings = 1
    expect(aaaSeason!.effectiveGroupings).toBe(1);
    expect(aaaSeason!.playsCounted).toBe(200);
  });
});
