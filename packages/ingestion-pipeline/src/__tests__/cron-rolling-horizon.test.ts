import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { runWednesdayRollingHorizonSlate, FullSlateMatchupInput } from "../cron-rolling-horizon.js";
import fs from "fs";
import path from "path";

describe("cron-rolling-horizon (Component 8 / Workstream 1)", () => {
  const testArchiveDir = path.resolve(process.cwd(), "tmp/test-cron-archive");

  beforeEach(() => {
    if (fs.existsSync(testArchiveDir)) {
      fs.rmSync(testArchiveDir, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(testArchiveDir)) {
      fs.rmSync(testArchiveDir, { recursive: true, force: true });
    }
  });

  it("evaluates a multi-game Wednesday full-slate and locks prices into archive", async () => {
    const slateMatchups: FullSlateMatchupInput[] = [
      {
        gameId: "GAME-2026-W07-NE-CHI",
        homeTeam: "CHI",
        awayTeam: "NE",
        kickoffUtc: "2026-10-25T17:00:00Z",
        wednesdayOddsAmerican: -145,
        wednesdayVigFreeProb: 0.565,
        conformalLowerBound: 0.595, // strong edge over 0.565
        lineMoveSkillVector: [0.15, 0.20, 0.65], // heavy steam towards home
        scenarios: [
          {
            scenarioId: "S1_HEALTHY_STARTERS",
            stateAssignments: { QB_CHI: "ACTIVE", OL_CHI: "ACTIVE" },
            transitionProbability: 0.70,
            interventionalMean: 0.63,
            scenarioVariance: 0.04,
          },
          {
            scenarioId: "S2_RAIN_STORM",
            stateAssignments: { WEATHER: "RAIN", WIND_MPH: 18 },
            transitionProbability: 0.30,
            interventionalMean: 0.60,
            scenarioVariance: 0.05,
          },
        ],
      },
      {
        gameId: "GAME-2026-W07-BAL-CIN",
        homeTeam: "BAL",
        awayTeam: "CIN",
        kickoffUtc: "2026-10-25T17:00:00Z",
        wednesdayOddsAmerican: -125,
        wednesdayVigFreeProb: 0.535,
        conformalLowerBound: 0.510, // inconclusive lower bound
        lineMoveSkillVector: [0.40, 0.30, 0.30],
        scenarios: [
          {
            scenarioId: "S1_BURROW_HEALTHY",
            stateAssignments: { QB_CIN: "ACTIVE" },
            transitionProbability: 0.50,
            interventionalMean: 0.54,
            scenarioVariance: 0.04,
          },
          {
            scenarioId: "S2_BURROW_INJURED",
            stateAssignments: { QB_CIN: "INACTIVE" },
            transitionProbability: 0.50,
            interventionalMean: 0.68,
            scenarioVariance: 0.05,
          },
        ],
        watchCommitments: [
          {
            rule_id: "CC-2026-07-CIN-BAL-001",
            target_entry_id: "WB-2026-W07-BAL-CIN-ML",
            watched_node: "QB_CIN",
            trigger_condition: "DECLARED_INACTIVE",
            delta_prob: 0.14,
            stake_adjustment: 0.10,
            deadline_utc: "2026-10-25T15:30:00Z",
            status: "PENDING",
          },
        ],
      },
    ];

    const result = await runWednesdayRollingHorizonSlate("NFL-2026-W07-SLATE", 2026, 7, slateMatchups, {
      baseDir: testArchiveDir,
    });

    expect(result.gamesEvaluated).toBe(2);
    expect(result.lockedImmediatelyCount).toBe(1); // NE @ CHI locks
    expect(result.stagedSurveillanceCount).toBe(1); // BAL @ CIN stages watch
    expect(result.entries.length).toBe(2);
    expect(result.archivedCount).toBe(2);

    const chiEntry = result.entries.find((e) => e.game_id === "GAME-2026-W07-NE-CHI")!;
    expect(chiEntry.surveillance_status).toBe("LOCKED_ACTIVE");
    expect(chiEntry.locked_market_odds_american).toBe(-145);

    const balEntry = result.entries.find((e) => e.game_id === "GAME-2026-W07-BAL-CIN")!;
    expect(balEntry.surveillance_status).toBe("SURVEILLANCE_WATCH");
    expect(balEntry.watch_commitments.length).toBe(1);
  });
});
