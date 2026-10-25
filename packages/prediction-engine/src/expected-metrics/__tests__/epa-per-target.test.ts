import { describe, expect, it } from "vitest";
import { computeEpaPerTarget, type TargetPlay } from "../epa-per-target.js";
import { mapNflversePbpToExpectedMetrics } from "../nflverse-pbp-mapper.js";

describe("epa-per-target", () => {
  it("calculates exact arithmetic for raw, positional, and shrunk EPA with 20-target floor", () => {
    // 2 WRs, 1 TE
    // WR1: 25 targets, total EPA 25.0 -> raw = 1.0
    // WR2: 20 targets, total EPA 10.0 -> raw = 0.5
    // WR3 (below floor): 19 targets, total EPA 19.0 -> raw = 1.0 (should not emit, should not contribute to pos mean)
    // TE1: 30 targets, total EPA 15.0 -> raw = 0.5

    const plays: TargetPlay[] = [];
    const pushPlays = (playerId: string, targets: number, epa: number) => {
      for (let i = 0; i < targets; i++) {
        plays.push({
          playId: \`p-\${playerId}-\${i}\`,
          week: 1,
          receiverPlayerId: playerId,
          epa: epa / targets
        });
      }
    };

    pushPlays("WR1", 25, 25.0);
    pushPlays("WR2", 20, 10.0);
    pushPlays("WR3", 19, 19.0);
    pushPlays("TE1", 30, 15.0);

    const positionLookup = new Map([
      ["WR1", "WR"],
      ["WR2", "WR"],
      ["WR3", "WR"],
      ["TE1", "TE"]
    ]);

    const result = computeEpaPerTarget(plays, 2026, 2, "season-to-date", positionLookup);

    // WR Pos mean: only WR1 (25 targets, 25 EPA) and WR2 (20 targets, 10 EPA) contribute.
    // Sum EPA = 35.0, count = 45 -> mean = 35 / 45 = 0.777777...
    const wrPosMean = 35 / 45;

    // WR1 shrunk: 0.77777... + (25 / 45) * (1.0 - 0.77777...)
    // = 0.77777 + 0.55555 * 0.22222 = 0.77777 + 0.12345 = 0.90123...

    expect(result.diagnostics.excludedForFloor).toBe(1); // WR3
    expect(result.metrics.length).toBe(3); // WR1, WR2, TE1

    const wr1 = result.metrics.find(m => m.playerId === "WR1")!;
    expect(wr1.rawEpaPerTarget).toBeCloseTo(1.0, 4);
    expect(wr1.positionalMeanEpaPerTarget).toBeCloseTo(wrPosMean, 4);

    const expectedWr1Shrunk = wrPosMean + (25 / 45) * (1.0 - wrPosMean);
    expect(wr1.shrunkEpaPerTarget).toBeCloseTo(expectedWr1Shrunk, 4);

    const expectedWr2Shrunk = wrPosMean + (20 / 40) * (0.5 - wrPosMean);
    const wr2 = result.metrics.find(m => m.playerId === "WR2")!;
    expect(wr2.shrunkEpaPerTarget).toBeCloseTo(expectedWr2Shrunk, 4);
  });

  it("mapper correctly filters run rows, empty receiver passes, and includes interceptions", () => {
    const mockRows: any[] = [
      { season_type: "REG", season: "2026", game_id: "2026_01_AAA_BBB", play_id: "1", week: "1", play_type: "pass", receiver_player_id: "WR1", interception: "0" },
      { season_type: "REG", season: "2026", game_id: "2026_01_AAA_BBB", play_id: "2", week: "1", play_type: "pass", receiver_player_id: "", interception: "0" },
      { season_type: "REG", season: "2026", game_id: "2026_01_AAA_BBB", play_id: "3", week: "1", play_type: "run", receiver_player_id: "WR1", interception: "0" },
      { season_type: "REG", season: "2026", game_id: "2026_01_AAA_BBB", play_id: "4", week: "1", play_type: "pass", receiver_player_id: "WR1", interception: "1" }
    ];

    const result = mapNflversePbpToExpectedMetrics(mockRows);
    const targets = result.targetPlays;

    expect(targets.length).toBe(2);
    expect(targets[0]!.playId).toBe("2026_01_AAA_BBB-1");
    expect(targets[1]!.playId).toBe("2026_01_AAA_BBB-4");
  });

  it("excludes missing position players, null EPA targets, and tracks in diagnostics", () => {
    const plays: TargetPlay[] = [];
    const pushPlays = (playerId: string, targets: number, epa: number | null) => {
      for (let i = 0; i < targets; i++) {
        plays.push({
          playId: \`p-\${playerId}-\${i}\`,
          week: 1,
          receiverPlayerId: playerId,
          epa: epa === null ? null : (epa / targets)
        });
      }
    };

    // WR1: 21 targets, 1 has null EPA (20 valid)
    for(let i=0; i<20; i++) {
        plays.push({playId: \`p-WR1-\${i}\`, week: 1, receiverPlayerId: "WR1", epa: 1.0}); // sum 20
    }
    plays.push({playId: \`p-WR1-null\`, week: 1, receiverPlayerId: "WR1", epa: null}); // total 21 targets

    // UNK1: 20 targets, missing position
    pushPlays("UNK1", 20, 10.0);

    const positionLookup = new Map([
      ["WR1", "WR"],
    ]);

    const result = computeEpaPerTarget(plays, 2026, 2, "season-to-date", positionLookup);

    expect(result.diagnostics.nullEpaTargetsExcludedFromMean).toBe(1);
    expect(result.diagnostics.unknownPositionTargetsExcluded).toBe(20);

    // WR1 should have raw EPA = 20 / 20 = 1.0
    const wr1 = result.metrics.find(m => m.playerId === "WR1")!;
    expect(wr1.rawEpaPerTarget).toBe(1.0);
    expect(wr1.targets).toBe(21);
  });

  it("enforces strict point-in-time discipline", () => {
    const plays: TargetPlay[] = [];
    for(let i=0; i<20; i++) {
        plays.push({playId: \`p-WR1-w1-\${i}\`, week: 1, receiverPlayerId: "WR1", epa: 1.0}); // Week 1
    }
    for(let i=0; i<10; i++) {
        plays.push({playId: \`p-WR1-w2-\${i}\`, week: 2, receiverPlayerId: "WR1", epa: 2.0}); // Week 2
    }

    const positionLookup = new Map([["WR1", "WR"]]);

    // Query for week 2: should only include week 1 (strict < targetWeek)
    const resWeek2 = computeEpaPerTarget(plays, 2026, 2, "season-to-date", positionLookup);
    expect(resWeek2.metrics[0]!.targets).toBe(20);

    // Query for week 3: should include week 1 and week 2
    const resWeek3 = computeEpaPerTarget(plays, 2026, 3, "season-to-date", positionLookup);
    expect(resWeek3.metrics[0]!.targets).toBe(30);
  });
});
