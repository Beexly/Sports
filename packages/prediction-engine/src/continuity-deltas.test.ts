/**
 * Tests for continuity-deltas.ts
 *
 * Verifies:
 * - Correctly computes starter retention across depth chart snapshots
 * - Returns null when insufficient data
 * - Handles team name normalization
 * - Averages home and away team deltas
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@sports/db";
import { computeContinuityDeltas, type ContinuityDeltasInput } from "./continuity-deltas";

describe("continuity-deltas", () => {
  /**
   * Test 1: Returns null for teams with no depth chart data
   */
  it("returns null for teams with no depth chart data", async () => {
    const input: ContinuityDeltasInput = {
      homeTeamName: "NODATA",
      awayTeamName: "NODATA",
      season: 2026,
      week: 1,
    };

    const result = await computeContinuityDeltas(input);
    expect(result.olContinuityDelta).toBeNull();
    expect(result.dlContinuityDelta).toBeNull();
    expect(result.dbContinuityDelta).toBeNull();
  });

  /**
   * Test 2: Computes delta correctly when prior snapshot exists
   * Scenario: 4 starters in week 1, 3 retained in week 2 = delta of -0.25
   */
  it("computes correct delta when prior snapshot exists", async () => {
    // Setup: create depth chart entries for a fake team across 2 weeks
    const season = 2026;
    const team = "TESTOL";

    // Clear any existing test data
    await db.depthChartEntry.deleteMany({
      where: { team, season },
    });

    // Week 1: 4 OL starters
    await db.depthChartEntry.createMany({
      data: [
        {
          playerName: "Player1",
          season,
          week: 1,
          team,
          position: "LT",
          depthRank: 1,
          sourceId: "test",
          rightsSnapshot: { test: true },
          fetchedAt: new Date(),
        },
        {
          playerName: "Player2",
          season,
          week: 1,
          team,
          position: "LG",
          depthRank: 1,
          sourceId: "test",
          rightsSnapshot: { test: true },
          fetchedAt: new Date(),
        },
        {
          playerName: "Player3",
          season,
          week: 1,
          team,
          position: "C",
          depthRank: 1,
          sourceId: "test",
          rightsSnapshot: { test: true },
          fetchedAt: new Date(),
        },
        {
          playerName: "Player4",
          season,
          week: 1,
          team,
          position: "RG",
          depthRank: 1,
          sourceId: "test",
          rightsSnapshot: { test: true },
          fetchedAt: new Date(),
        },
      ],
    });

    // Week 2: 3 of 4 retained (Player1, Player2, Player3), Player5 replaces Player4
    await db.depthChartEntry.createMany({
      data: [
        {
          playerName: "Player1",
          season,
          week: 2,
          team,
          position: "LT",
          depthRank: 1,
          sourceId: "test",
          rightsSnapshot: { test: true },
          fetchedAt: new Date(),
        },
        {
          playerName: "Player2",
          season,
          week: 2,
          team,
          position: "LG",
          depthRank: 1,
          sourceId: "test",
          rightsSnapshot: { test: true },
          fetchedAt: new Date(),
        },
        {
          playerName: "Player3",
          season,
          week: 2,
          team,
          position: "C",
          depthRank: 1,
          sourceId: "test",
          rightsSnapshot: { test: true },
          fetchedAt: new Date(),
        },
        {
          playerName: "Player5",
          season,
          week: 2,
          team,
          position: "RG",
          depthRank: 1,
          sourceId: "test",
          rightsSnapshot: { test: true },
          fetchedAt: new Date(),
        },
      ],
    });

    // Setup a matching team for the away side (with no turnover for simplicity)
    const awayTeam = "TESTAWAY";
    await db.depthChartEntry.deleteMany({
      where: { team: awayTeam, season },
    });
    // Week 1 and Week 2: same players (100% retention)
    const awayPlayers = ["AwayOL1", "AwayOL2", "AwayOL3", "AwayOL4"];
    await db.depthChartEntry.createMany({
      data: awayPlayers.map((p, i) => ({
        playerName: p,
        season,
        week: 1,
        team: awayTeam,
        position: ["LT", "LG", "C", "RG"][i],
        depthRank: 1,
        sourceId: "test",
        rightsSnapshot: { test: true },
        fetchedAt: new Date(),
      })),
    });
    await db.depthChartEntry.createMany({
      data: awayPlayers.map((p, i) => ({
        playerName: p,
        season,
        week: 2,
        team: awayTeam,
        position: ["LT", "LG", "C", "RG"][i],
        depthRank: 1,
        sourceId: "test",
        rightsSnapshot: { test: true },
        fetchedAt: new Date(),
      })),
    });

    // Compute delta for week 2
    const input: ContinuityDeltasInput = {
      homeTeamName: team,
      awayTeamName: awayTeam,
      season,
      week: 2,
    };

    const result = await computeContinuityDeltas(input);

    // Home team: 3/4 = 0.75, delta = 0.75 - 1 = -0.25
    // Away team: 4/4 = 1.0, delta = 1.0 - 1 = 0
    // Average: (-0.25 + 0) / 2 = -0.125
    expect(result.olContinuityDelta).toBeCloseTo(-0.125, 2);
    expect(result.dlContinuityDelta).toBeNull(); // No DL data
    expect(result.dbContinuityDelta).toBeNull(); // No DB data

    // Cleanup
    await db.depthChartEntry.deleteMany({
      where: { team: { in: [team, awayTeam] }, season },
    });
  });

  /**
   * Test 3: Multiple position groups are tracked independently
   */
  it("tracks OL, DL, and DB independently", async () => {
    const season = 2026;
    const team = "TESTMULTI";
    const awayTeam = "TESTAWAY2";

    // Clear
    await db.depthChartEntry.deleteMany({
      where: { team: { in: [team, awayTeam] }, season },
    });

    // Home team: OL (1 starter), DL (2 starters), DB (3 starters) at week 1
    // Week 2: OL (1 retained), DL (1 retained), DB (2 retained)
    await db.depthChartEntry.createMany({
      data: [
        // OL week 1
        {
          playerName: "OLPlayer1",
          season,
          week: 1,
          team,
          position: "LT",
          depthRank: 1,
          sourceId: "test",
          rightsSnapshot: { test: true },
          fetchedAt: new Date(),
        },
        // DL week 1
        {
          playerName: "DLPlayer1",
          season,
          week: 1,
          team,
          position: "DE",
          depthRank: 1,
          sourceId: "test",
          rightsSnapshot: { test: true },
          fetchedAt: new Date(),
        },
        {
          playerName: "DLPlayer2",
          season,
          week: 1,
          team,
          position: "DT",
          depthRank: 1,
          sourceId: "test",
          rightsSnapshot: { test: true },
          fetchedAt: new Date(),
        },
        // DB week 1
        {
          playerName: "DBPlayer1",
          season,
          week: 1,
          team,
          position: "CB",
          depthRank: 1,
          sourceId: "test",
          rightsSnapshot: { test: true },
          fetchedAt: new Date(),
        },
        {
          playerName: "DBPlayer2",
          season,
          week: 1,
          team,
          position: "S",
          depthRank: 1,
          sourceId: "test",
          rightsSnapshot: { test: true },
          fetchedAt: new Date(),
        },
        {
          playerName: "DBPlayer3",
          season,
          week: 1,
          team,
          position: "FS",
          depthRank: 1,
          sourceId: "test",
          rightsSnapshot: { test: true },
          fetchedAt: new Date(),
        },
      ],
    });

    // Week 2: partial retention
    await db.depthChartEntry.createMany({
      data: [
        // OL: 1/1 retained (100%)
        {
          playerName: "OLPlayer1",
          season,
          week: 2,
          team,
          position: "LT",
          depthRank: 1,
          sourceId: "test",
          rightsSnapshot: { test: true },
          fetchedAt: new Date(),
        },
        // DL: 1/2 retained (50%)
        {
          playerName: "DLPlayer1",
          season,
          week: 2,
          team,
          position: "DE",
          depthRank: 1,
          sourceId: "test",
          rightsSnapshot: { test: true },
          fetchedAt: new Date(),
        },
        {
          playerName: "DLPlayerNew",
          season,
          week: 2,
          team,
          position: "DT",
          depthRank: 1,
          sourceId: "test",
          rightsSnapshot: { test: true },
          fetchedAt: new Date(),
        },
        // DB: 2/3 retained (67%)
        {
          playerName: "DBPlayer1",
          season,
          week: 2,
          team,
          position: "CB",
          depthRank: 1,
          sourceId: "test",
          rightsSnapshot: { test: true },
          fetchedAt: new Date(),
        },
        {
          playerName: "DBPlayer2",
          season,
          week: 2,
          team,
          position: "S",
          depthRank: 1,
          sourceId: "test",
          rightsSnapshot: { test: true },
          fetchedAt: new Date(),
        },
        {
          playerName: "DBPlayerNew",
          season,
          week: 2,
          team,
          position: "FS",
          depthRank: 1,
          sourceId: "test",
          rightsSnapshot: { test: true },
          fetchedAt: new Date(),
        },
      ],
    });

    // Away team: no data (so game deltas will be just the home team's)
    const input: ContinuityDeltasInput = {
      homeTeamName: team,
      awayTeamName: awayTeam,
      season,
      week: 2,
    };

    const result = await computeContinuityDeltas(input);

    // Home only:
    // OL: 1/1 = 1, delta = 0
    // DL: 1/2 = 0.5, delta = -0.5
    // DB: 2/3 = 0.667, delta = -0.333
    expect(result.olContinuityDelta).toBeCloseTo(0, 1); // single team, so not averaged
    expect(result.dlContinuityDelta).toBeCloseTo(-0.5, 1);
    expect(result.dbContinuityDelta).toBeCloseTo(-0.333, 2);

    // Cleanup
    await db.depthChartEntry.deleteMany({
      where: { team: { in: [team, awayTeam] }, season },
    });
  });
});
