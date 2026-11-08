import { describe, expect, it } from "vitest";
import {
  defensiveFieldZoneSplitAllowed,
  type DefensiveFieldZonePlay,
} from "../defensive-field-zone-split.js";

const DEFAULT_PLAY: DefensiveFieldZonePlay = {
  playId: "default",
  defteam: "SEA",
  week: 1,
  yardline_100: 50,
  down: 1,
  ydstogo: 10,
  yardsGained: 5,
  touchdown: 0,
  turnover: 0,
  epa: 0,
};

function createPlay(overrides: Partial<DefensiveFieldZonePlay>): DefensiveFieldZonePlay {
  return { ...DEFAULT_PLAY, ...overrides };
}

describe("defensiveFieldZoneSplitAllowed", () => {
  it("computes hand-computed fixture accurately", () => {
    // We will generate 30+ plays to pass the floor
    const plays: DefensiveFieldZonePlay[] = [];

    // SEA:
    // Red Zone: 30 plays, 30 epaPlays, epa = 1.0, 15 successes (50%), 6 TDs (20%)
    for (let i = 0; i < 30; i++) {
      plays.push(createPlay({
        playId: `sea-rz-${i}`,
        defteam: "SEA",
        yardline_100: 10,
        down: 1,
        ydstogo: 10,
        yardsGained: i < 15 ? 4 : 3, // >=4 is success on 1st down, <4 is failure
        touchdown: i < 6 ? 1 : 0, // 6 TDs
        epa: 1.0,
      }));
    }

    // Open Field: 100 plays, 100 epaPlays, epa = -0.5, 40 successes (40%)
    for (let i = 0; i < 100; i++) {
      plays.push(createPlay({
        playId: `sea-of-${i}`,
        defteam: "SEA",
        yardline_100: 50,
        down: 1,
        ydstogo: 10,
        yardsGained: i < 40 ? 4 : 3,
        epa: -0.5,
      }));
    }

    // SF:
    // Red Zone: 40 plays, 40 epaPlays, epa = -0.2, 10 successes (25%), 0 TDs
    for (let i = 0; i < 40; i++) {
      plays.push(createPlay({
        playId: `sf-rz-${i}`,
        defteam: "SF",
        yardline_100: 15,
        down: 1,
        ydstogo: 10,
        yardsGained: i < 10 ? 4 : 3,
        touchdown: 0,
        epa: -0.2,
      }));
    }

    // Open Field: 120 plays, 120 epaPlays, epa = 0.3, 60 successes (50%)
    for (let i = 0; i < 120; i++) {
      plays.push(createPlay({
        playId: `sf-of-${i}`,
        defteam: "SF",
        yardline_100: 60,
        down: 1,
        ydstogo: 10,
        yardsGained: i < 60 ? 4 : 3,
        epa: 0.3,
      }));
    }

    const { results } = defensiveFieldZoneSplitAllowed(plays, 18, "season-to-date");
    expect(results).toHaveLength(2);

    const sea = results.find((r) => r.defteam === "SEA")!;
    expect(sea.redZone.plays).toBe(30);
    expect(sea.redZone.epaPlays).toBe(30);
    expect(sea.redZone.meanEpaAllowed).toBe(1.0);
    expect(sea.redZone.successesAllowed).toBe(15);
    expect(sea.redZone.successRateAllowed).toBe(0.5);
    expect(sea.redZone.redZoneTdRateAllowed).toBe(0.2);

    expect(sea.openField.plays).toBe(100);
    expect(sea.openField.epaPlays).toBe(100);
    expect(sea.openField.meanEpaAllowed).toBe(-0.5);
    expect(sea.openField.successesAllowed).toBe(40);
    expect(sea.openField.successRateAllowed).toBe(0.4);

    expect(sea.epaSplit).toBe(1.5); // 1.0 - (-0.5) = 1.5 (Positive, worse in red zone)
    expect(sea.successSplit).toBe(0.1); // 0.5 - 0.4 = 0.1

    const sf = results.find((r) => r.defteam === "SF")!;
    expect(sf.redZone.meanEpaAllowed).toBe(-0.2);
    expect(sf.openField.meanEpaAllowed).toBe(0.3);
    expect(sf.epaSplit).toBe(-0.5); // -0.2 - 0.3 = -0.5
    expect(sf.successSplit).toBe(-0.25); // 0.25 - 0.5 = -0.25
  });

  it("handles zone boundaries and excludes NaN yardlines correctly", () => {
    const plays: DefensiveFieldZonePlay[] = [];

    for (let i = 0; i < 30; i++) {
      plays.push(createPlay({ defteam: "BAL", yardline_100: 20, epa: 0.5 })); // Red zone exact boundary
    }
    for (let i = 0; i < 100; i++) {
      plays.push(createPlay({ defteam: "BAL", yardline_100: 21, epa: 0 })); // Open field exact boundary
    }

    plays.push(createPlay({ defteam: "BAL", yardline_100: NaN, epa: 1.0 }));

    const out = defensiveFieldZoneSplitAllowed(plays, 18, "season-to-date");
    expect(out.diagnostics.unratableYardline).toBe(1);

    const bal = out.results.find((r) => r.defteam === "BAL")!;
    expect(bal.redZone.plays).toBe(30);
    expect(bal.redZone.meanEpaAllowed).toBe(0.5);
    expect(bal.openField.plays).toBe(100);
    expect(bal.openField.meanEpaAllowed).toBe(0);
  });

  it("judges success via isSuccessfulPlay exactly and handles TD logic correctly", () => {
    const plays: DefensiveFieldZonePlay[] = [];

    // We only need one team, but need to pass the floors to inspect outputs
    for (let i = 0; i < 26; i++) {
      plays.push(createPlay({ defteam: "MIA", yardline_100: 10, down: 1, ydstogo: 10, yardsGained: 4, epa: 0 }));
    }

    // Unratable down (0)
    plays.push(createPlay({ defteam: "MIA", yardline_100: 10, down: 0, ydstogo: 10, yardsGained: 10, epa: 0 }));
    // Unratable down (5)
    plays.push(createPlay({ defteam: "MIA", yardline_100: 10, down: 5, ydstogo: 10, yardsGained: 10, epa: 0 }));

    // Turnover dominates TD -> failure (e.g. pick-six). TD should not count as TD allowed (turnover == 1).
    plays.push(createPlay({ defteam: "MIA", yardline_100: 10, down: 1, ydstogo: 10, yardsGained: 10, touchdown: 1, turnover: 1, epa: 0 }));
    // TD forced success (offensive score). Turnover == 0.
    plays.push(createPlay({ defteam: "MIA", yardline_100: 10, down: 3, ydstogo: 10, yardsGained: 2, touchdown: 1, turnover: 0, epa: 0 }));

    for (let i = 0; i < 100; i++) {
      plays.push(createPlay({ defteam: "MIA", yardline_100: 50, down: 1, ydstogo: 10, yardsGained: 4, epa: 0 }));
    }

    const out = defensiveFieldZoneSplitAllowed(plays, 18, "season-to-date");
    expect(out.diagnostics.unratableSuccessExclusions).toBe(2);

    const mia = out.results.find((r) => r.defteam === "MIA")!;
    expect(mia.redZone.plays).toBe(30);
    expect(mia.redZone.successPlays).toBe(28); // 30 - 2 unratable downs

    // 26 normal successes + 1 TD success = 27 successes
    expect(mia.redZone.successesAllowed).toBe(27);

    // Total RZ plays = 30. We had one TD where turnover==0 and one where turnover==1.
    // Red zone TD rate allowed should be 1 / 30.
    expect(mia.redZone.redZoneTdRateAllowed).toBe(0.0333);
  });

  it("handles null EPA by excluding from means but keeping in plays/successes", () => {
    const plays: DefensiveFieldZonePlay[] = [];

    for (let i = 0; i < 30; i++) {
      plays.push(createPlay({ defteam: "NYJ", yardline_100: 10, epa: 0.1, yardsGained: 4 }));
    }

    plays.push(createPlay({ defteam: "NYJ", yardline_100: 10, epa: null, yardsGained: 4 }));
    plays.push(createPlay({ defteam: "NYJ", yardline_100: 10, epa: null, yardsGained: 0 }));

    for (let i = 0; i < 100; i++) {
      plays.push(createPlay({ defteam: "NYJ", yardline_100: 50, epa: 0, yardsGained: 4 }));
    }

    const out = defensiveFieldZoneSplitAllowed(plays, 18, "season-to-date");
    expect(out.diagnostics.nullEpaExclusions).toBe(2);

    const nyj = out.results.find((r) => r.defteam === "NYJ")!;
    expect(nyj.redZone.plays).toBe(32);
    expect(nyj.redZone.epaPlays).toBe(30);
    expect(nyj.redZone.successPlays).toBe(32);
    expect(nyj.redZone.successesAllowed).toBe(31);
    expect(nyj.redZone.meanEpaAllowed).toBe(0.1);
  });

  it("enforces floors and tracks exclusions", () => {
    const plays: DefensiveFieldZonePlay[] = [];

    // Missing red zone plays floor
    for (let i = 0; i < 29; i++) {
      plays.push(createPlay({ defteam: "BUF", yardline_100: 10, epa: 0 }));
    }
    for (let i = 0; i < 100; i++) {
      plays.push(createPlay({ defteam: "BUF", yardline_100: 50, epa: 0 }));
    }

    // Missing red zone epa plays floor
    for (let i = 0; i < 30; i++) {
      plays.push(createPlay({ defteam: "CLE", yardline_100: 10, epa: i === 0 ? null : 0 }));
    }
    for (let i = 0; i < 100; i++) {
      plays.push(createPlay({ defteam: "CLE", yardline_100: 50, epa: 0 }));
    }

    // Missing open field plays floor
    for (let i = 0; i < 30; i++) {
      plays.push(createPlay({ defteam: "CIN", yardline_100: 10, epa: 0 }));
    }
    for (let i = 0; i < 99; i++) {
      plays.push(createPlay({ defteam: "CIN", yardline_100: 50, epa: 0 }));
    }

    const out = defensiveFieldZoneSplitAllowed(plays, 18, "season-to-date");
    expect(out.results.length).toBe(0);
    expect(out.diagnostics.belowFloorDefteams).toBe(3);
  });

  it("respects targetWeek and windows", () => {
    const plays: DefensiveFieldZonePlay[] = [];

    // A single team that meets floors ONLY if weeks are correctly filtered
    // We want last-4 distinct weeks. Let's make the distinct weeks: 1, 2, 3, 4, 5.
    // targetWeek = 6. Last 4 distinct below 6 = 2, 3, 4, 5.
    // We put the floor-breaking plays in week 1. If week 1 is included, they exceed floor.

    for (let i = 0; i < 20; i++) plays.push(createPlay({ defteam: "PIT", yardline_100: 10, week: 1, epa: 0 }));
    for (let i = 0; i < 100; i++) plays.push(createPlay({ defteam: "PIT", yardline_100: 50, week: 1, epa: 0 }));

    // Weeks 2-5: each has 5 rz plays and 25 open field plays
    for (const w of [2, 3, 4, 5]) {
      for (let i = 0; i < 5; i++) plays.push(createPlay({ defteam: "PIT", yardline_100: 10, week: w, epa: 0 }));
      for (let i = 0; i < 25; i++) plays.push(createPlay({ defteam: "PIT", yardline_100: 50, week: w, epa: 0 }));
    }

    // A week >= targetWeek that should always be ignored
    for (let i = 0; i < 30; i++) plays.push(createPlay({ defteam: "PIT", yardline_100: 10, week: 6, epa: 0 }));
    for (let i = 0; i < 100; i++) plays.push(createPlay({ defteam: "PIT", yardline_100: 50, week: 6, epa: 0 }));

    // With targetWeek=6 and last-4, it aggregates weeks 2,3,4,5. Total rz plays = 20 (below floor 30).
    const outLast4 = defensiveFieldZoneSplitAllowed(plays, 6, "last-4");
    expect(outLast4.results.length).toBe(0);
    expect(outLast4.diagnostics.belowFloorDefteams).toBe(1);

    // With targetWeek=6 and last-8, it aggregates weeks 1,2,3,4,5. Total rz plays = 40 (above floor).
    const outLast8 = defensiveFieldZoneSplitAllowed(plays, 6, "last-8");
    expect(outLast8.results.length).toBe(1);
    expect(outLast8.results[0]!.redZone.plays).toBe(40);
    expect(outLast8.results[0]!.openField.plays).toBe(200);

    // With targetWeek=7 and last-4, it aggregates 2,3,4,5,6 (Wait, 6 is present, so distinct below 7: 6,5,4,3)
    // Plays: week 6 has 30 rz. weeks 3,4,5 have 15. Total 45 rz plays.
    const outTarget7 = defensiveFieldZoneSplitAllowed(plays, 7, "last-4");
    expect(outTarget7.results.length).toBe(1);
    expect(outTarget7.results[0]!.redZone.plays).toBe(45);
    expect(outTarget7.results[0]!.openField.plays).toBe(175);
  });
});
