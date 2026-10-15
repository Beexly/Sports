import { describe, it, expect } from "vitest";
import {
  mapTargetedPassPlays,
  computeQbConditionedReceiverEfficiency,
  type TargetedPassPlay,
} from "../qb-conditioned-receiver-efficiency.js";
import { type PbpRow } from "../nflverse-pbp-mapper.js";

describe("QB-conditioned receiver efficiency", () => {
  it("computes exact hand-computed arithmetic on a synthetic fixture", () => {
    // Fixture: One receiver (WR1) targeted by two different QBs (QB1 and QB2).
    // QB1: 22 targets, 11 completions, 110 yards. (110 / 22 = 5.0 ypt)
    // QB2: 12 targets, 6 completions, 90 yards. (90 / 12 = 7.5 ypt)
    // Other QBs for QB1 baseline = QB2 (12 targets >= 10 floor, baseline = 7.5 ypt).
    // On/off differential for QB1 = 5.0 - 7.5 = -2.5.

    const plays: TargetedPassPlay[] = [];

    // QB1 targets (22)
    for (let i = 0; i < 22; i++) {
      plays.push({
        gameId: "2025_01_AAA_BBB",
        season: 2025,
        week: 1,
        passerId: "QB1",
        receiverId: "WR1",
        complete: i < 11 ? 1 : 0,
        receivingYards: i < 11 ? 10 : 0, // 11 * 10 = 110 yards
        airYards: 10,
        posteam: "AAA",
        defteam: "BBB",
      });
    }

    // QB2 targets (12)
    for (let i = 0; i < 12; i++) {
      plays.push({
        gameId: "2025_02_AAA_BBB",
        season: 2025,
        week: 2,
        passerId: "QB2",
        receiverId: "WR1",
        complete: i < 6 ? 1 : 0,
        receivingYards: i < 6 ? 15 : 0, // 6 * 15 = 90 yards
        airYards: 10,
        posteam: "AAA",
        defteam: "BBB",
      });
    }

    // Target week = 3, so all plays (week 1, week 2) are counted.
    const output = computeQbConditionedReceiverEfficiency(plays, 2025, 3, "season");

    expect(output.results).toHaveLength(1); // Only QB1 >= 20 targets floor
    const row = output.results[0]!;

    expect(row.receiverId).toBe("WR1");
    expect(row.qbId).toBe("QB1");
    expect(row.targets).toBe(22);
    expect(row.completions).toBe(11);
    expect(row.completionRate).toBe(11 / 22);
    expect(row.receivingYards).toBe(110);
    expect(row.yardsPerTarget).toBe(5.0);
    expect(row.yardsPerCompletion).toBe(10.0);

    expect(row.otherQbTargets).toBe(12);
    expect(row.otherQbYardsPerTarget).toBe(7.5);
    expect(row.onOffDifferential).toBe(-2.5);

    // League mean calculation check
    // Total targets = 34. Total yards = 200. League mean = 200 / 34 = 5.88235...
    const leagueMean = 200 / 34;
    const weight = 22 / (22 + 20);
    const expectedShrunk = (weight * 5.0) + ((1 - weight) * leagueMean);
    expect(row.shrunkYardsPerTarget).toBeCloseTo(expectedShrunk);
  });

  it("handles on/off differential null when baseline is under 10 targets", () => {
    const plays: TargetedPassPlay[] = [];

    // QB1 targets (20)
    for (let i = 0; i < 20; i++) {
      plays.push({
        gameId: "2025_01_AAA_BBB", season: 2025, week: 1, passerId: "QB1", receiverId: "WR1",
        complete: 1, receivingYards: 10, airYards: 10, posteam: "AAA", defteam: "BBB",
      });
    }

    // QB2 targets (9 - under the 10 target floor for baseline)
    for (let i = 0; i < 9; i++) {
      plays.push({
        gameId: "2025_01_AAA_BBB", season: 2025, week: 1, passerId: "QB2", receiverId: "WR1",
        complete: 1, receivingYards: 10, airYards: 10, posteam: "AAA", defteam: "BBB",
      });
    }

    const output = computeQbConditionedReceiverEfficiency(plays, 2025, 3, "season");
    expect(output.results).toHaveLength(1); // QB1 row
    const row = output.results[0]!;
    expect(row.otherQbTargets).toBe(9);
    expect(row.otherQbYardsPerTarget).toBeNull();
    expect(row.onOffDifferential).toBeNull();
  });

  it("produces no row for pairings under the 20-target floor", () => {
    const plays: TargetedPassPlay[] = [];

    for (let i = 0; i < 19; i++) { // 19 targets < 20 floor
      plays.push({
        gameId: "2025_01_AAA_BBB", season: 2025, week: 1, passerId: "QB1", receiverId: "WR1",
        complete: 1, receivingYards: 10, airYards: 10, posteam: "AAA", defteam: "BBB",
      });
    }

    const output = computeQbConditionedReceiverEfficiency(plays, 2025, 3, "season");
    expect(output.results).toHaveLength(0);
    expect(output.diagnostics.droppedDueToTargetFloor).toBe(1);
  });

  it("enforces point-in-time cutoff", () => {
    const plays: TargetedPassPlay[] = [];

    // 20 targets in Week 1
    for (let i = 0; i < 20; i++) {
      plays.push({
        gameId: "2025_01_AAA_BBB", season: 2025, week: 1, passerId: "QB1", receiverId: "WR1",
        complete: 1, receivingYards: 10, airYards: 10, posteam: "AAA", defteam: "BBB",
      });
    }

    // 10 targets in Week 3
    for (let i = 0; i < 10; i++) {
      plays.push({
        gameId: "2025_03_AAA_BBB", season: 2025, week: 3, passerId: "QB1", receiverId: "WR1",
        complete: 1, receivingYards: 20, airYards: 10, posteam: "AAA", defteam: "BBB",
      });
    }

    // Target week 3 means week 3 plays are EXCLUDED. So only the 20 week 1 plays count.
    const output = computeQbConditionedReceiverEfficiency(plays, 2025, 3, "season");
    expect(output.results).toHaveLength(1);
    expect(output.results[0]!.targets).toBe(20);
    expect(output.results[0]!.receivingYards).toBe(200);
  });

  it("shrinks small-sample pairing more than large-sample pairing", () => {
    const plays: TargetedPassPlay[] = [];

    // Receiver 1: Small sample (20 targets)
    for (let i = 0; i < 20; i++) {
      plays.push({
        gameId: "2025_01_AAA_BBB", season: 2025, week: 1, passerId: "QB1", receiverId: "WR1",
        complete: 1, receivingYards: 10, airYards: 10, posteam: "AAA", defteam: "BBB",
      });
    }

    // Receiver 2: Large sample (180 targets)
    for (let i = 0; i < 180; i++) {
      plays.push({
        gameId: "2025_01_AAA_BBB", season: 2025, week: 1, passerId: "QB2", receiverId: "WR2",
        complete: 1, receivingYards: 10, airYards: 10, posteam: "AAA", defteam: "BBB",
      });
    }

    // Include some other receiver with a different yards/target to pull league mean away from 10.
    for (let i = 0; i < 100; i++) {
      plays.push({
        gameId: "2025_01_AAA_BBB", season: 2025, week: 1, passerId: "QB3", receiverId: "WR3",
        complete: 1, receivingYards: 4, airYards: 4, posteam: "AAA", defteam: "BBB",
      });
    }

    const output = computeQbConditionedReceiverEfficiency(plays, 2025, 3, "season");

    const wr1Row = output.results.find(r => r.receiverId === "WR1")!;
    const wr2Row = output.results.find(r => r.receiverId === "WR2")!;
    const wr3Row = output.results.find(r => r.receiverId === "WR3")!;

    // Both WR1 and WR2 have a raw 10.0 yards per target. WR3 has 4.0.
    // The league mean is (200 + 1800 + 400) / 300 = 2400 / 300 = 8.0.
    // So both WR1 and WR2 will be shrunk towards 8.0.
    // WR1 (20 targets) should shrink more (closer to 8.0) than WR2 (180 targets).

    const wr1DistanceToRaw = Math.abs(wr1Row.yardsPerTarget - wr1Row.shrunkYardsPerTarget);
    const wr2DistanceToRaw = Math.abs(wr2Row.yardsPerTarget - wr2Row.shrunkYardsPerTarget);

    expect(wr1DistanceToRaw).toBeGreaterThan(wr2DistanceToRaw);
  });

  it("does not export or claim YPRR", () => {
    // Assert keys directly to guarantee no 'yprr' or 'routes' properties exist
    const plays: TargetedPassPlay[] = [];
    for (let i = 0; i < 20; i++) {
      plays.push({
        gameId: "2025_01_AAA_BBB", season: 2025, week: 1, passerId: "QB1", receiverId: "WR1",
        complete: 1, receivingYards: 10, airYards: 10, posteam: "AAA", defteam: "BBB",
      });
    }
    const output = computeQbConditionedReceiverEfficiency(plays, 2025, 3, "season");
    const keys = Object.keys(output.results[0]!);
    expect(keys).not.toContain("yprr");
    expect(keys).not.toContain("routes");
    expect(keys).not.toContain("yardsPerRouteRun");
  });

  it("maps correctly from nflverse rows and skips plays without receiving_yards or passer_id", () => {
    const rows: PbpRow[] = [
      { play_type: "run", game_id: "2025_01_AAA_BBB" },
      { play_type: "pass", game_id: "2025_01_AAA_BBB", passer_player_id: "QB1" }, // missing receiver
      { play_type: "pass", game_id: "2025_01_AAA_BBB", receiver_player_id: "WR1" }, // missing passer
      {
        play_type: "pass",
        game_id: "2025_01_AAA_BBB",
        passer_player_id: "QB1",
        receiver_player_id: "WR1",
        complete_pass: "1",
        receiving_yards: "15",
        air_yards: "10",
        posteam: "AAA",
        defteam: "BBB"
      },
      {
        play_type: "pass",
        game_id: "2025_01_AAA_BBB",
        passer_player_id: "QB1",
        receiver_player_id: "WR1",
        complete_pass: "0",
        receiving_yards: "NA", // incomplete pass, receiving yards NA
      }
    ];

    const mapped = mapTargetedPassPlays(rows);
    expect(mapped).toHaveLength(2);
    expect(mapped[0]!.receivingYards).toBe(15);
    expect(mapped[0]!.complete).toBe(1);
    expect(mapped[0]!.airYards).toBe(10);
    expect(mapped[1]!.receivingYards).toBe(0);
    expect(mapped[1]!.complete).toBe(0);
  });
});
