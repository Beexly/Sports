import { describe, expect, it } from "vitest";
import { computeDefensiveFantasyPointsAllowed } from "../defensive-fantasy-points-allowed.js";
import type { PbpRow } from "../nflverse-pbp-mapper.js";

const FAKE_POSITION_LOOKUP = (gsisId: string) => {
  if (gsisId === "QB1") return "QB";
  if (gsisId === "WR1") return "WR";
  if (gsisId === "RB1") return "RB";
  return undefined; // Unverified
};

function createRow(overrides: Partial<PbpRow>): PbpRow {
  return {
    game_id: "2023_01_AWAY_HOME",
    defteam: "DEF",
    play_type: "pass",
    yards_gained: "0",
    touchdown: "0",
    interception: "0",
    complete_pass: "0",
    passer_player_id: "",
    receiver_player_id: "",
    rusher_player_id: "",
    ...overrides,
  } as PbpRow;
}

describe("Defensive Fantasy Points Allowed", () => {
  it("calculates exact PPR points for passing play and rushing play with point-in-time discipline", () => {
    const rows = [
      // Game 1 (Week 1):
      createRow({
        game_id: "2023_01_AWAY_HOME",
        play_type: "pass",
        complete_pass: "1",
        yards_gained: "100", // QB: 100 * 0.04 = 4. WR: 100 * 0.1 = 10
        touchdown: "1",      // QB: 4. WR: 6.
        interception: "0",
        passer_player_id: "QB1",
        receiver_player_id: "WR1",
      }), // QB gets 8. WR gets 17.
      createRow({
        game_id: "2023_01_AWAY_HOME",
        play_type: "pass",
        complete_pass: "0",
        interception: "1",   // QB: -2
        passer_player_id: "QB1",
      }), // QB gets -2. Total QB = 6.
      createRow({
        game_id: "2023_01_AWAY_HOME",
        play_type: "run",
        yards_gained: "50",  // RB: 5
        touchdown: "0",
        rusher_player_id: "RB1",
      }), // RB gets 5.
      createRow({
        game_id: "2023_01_AWAY_HOME",
        play_type: "run",
        yards_gained: "20",  // UNVERIFIED: 2
        touchdown: "1",      // UNVERIFIED: 6
        rusher_player_id: "UNKNOWN",
      }), // UNVERIFIED gets 8 points across 1 play.

      // Game 2 (Week 2): to let Week 2 observe Week 1
      createRow({
        game_id: "2023_02_AWAY_HOME",
        play_type: "run",
        yards_gained: "0",
        rusher_player_id: "RB1",
      }),

      // Game 3 (Week 3): empty game just to observe Week 2
      createRow({
        game_id: "2023_03_AWAY_HOME",
        play_type: "run",
        yards_gained: "0",
        rusher_player_id: "RB1",
      }),
    ];

    const results = computeDefensiveFantasyPointsAllowed(rows, { positionLookup: FAKE_POSITION_LOOKUP });

    // Results should have records for Week 2 observing Week 1, and Week 3 observing Week 1 & 2.
    // Week 1 should have NO results (no past games).
    expect(results.filter(r => r.week === 1).length).toBe(0);

    const week2QB = results.find(r => r.week === 2 && r.position === "QB");
    expect(week2QB).toBeDefined();
    expect(week2QB!.seasonWindow).toBe(6); // 8 - 2 = 6

    const week2WR = results.find(r => r.week === 2 && r.position === "WR");
    expect(week2WR).toBeDefined();
    expect(week2WR!.seasonWindow).toBe(17); // 10 (yds) + 6 (td) + 1 (ppr)

    const week2RB = results.find(r => r.week === 2 && r.position === "RB");
    expect(week2RB).toBeDefined();
    expect(week2RB!.seasonWindow).toBe(5);

    // Check exclusions on Week 2 record (they share the same game, so exclusions are aggregated across the game)
    expect(week2QB!.excludedPlayerPlays).toBe(1);
    expect(week2QB!.excludedPoints).toBe(8);

    // Week 3 RB observes Week 1 (5 pts) and Week 2 (0 pts) -> seasonWindow = 2.5
    const week3RB = results.find(r => r.week === 3 && r.position === "RB");
    expect(week3RB).toBeDefined();
    expect(week3RB!.seasonWindow).toBe(2.5); // (5 + 0) / 2
  });

  it("calculates rolling windows correctly and uses distinct games for normalization", () => {
    // Generate 10 weeks of 1 point per game for WR.
    const rows = Array.from({ length: 10 }).map((_, i) => createRow({
      game_id: `2023_${String(i + 1).padStart(2, "0")}_AWAY_HOME`,
      play_type: "pass",
      complete_pass: "1",
      yards_gained: "0",
      touchdown: "0",
      receiver_player_id: "WR1", // 1 pt (PPR)
    }));

    const results = computeDefensiveFantasyPointsAllowed(rows, { positionLookup: FAKE_POSITION_LOOKUP });

    // Week 10 observes weeks 1-9 (9 games)
    const week10 = results.find(r => r.week === 10 && r.position === "WR");
    expect(week10).toBeDefined();
    expect(week10!.seasonWindow).toBe(1); // 9 pts / 9 games = 1
    expect(week10!.rolling4Window).toBe(1); // 4 pts / 4 games = 1
    expect(week10!.rolling8Window).toBe(1); // 8 pts / 8 games = 1
  });

  it("only charges the defense on the field", () => {
      const rows = [
        createRow({
          game_id: "2023_01_AWAY_HOME",
          defteam: "DEF_A",
          play_type: "run",
          yards_gained: "100", // 10 pts
          rusher_player_id: "RB1",
        }),
        createRow({
          game_id: "2023_01_AWAY_HOME",
          defteam: "DEF_B",
          play_type: "run",
          yards_gained: "200", // 20 pts
          rusher_player_id: "RB1",
        }),
        // Dummy game 2 to trigger Week 2 observing Game 1
        createRow({
          game_id: "2023_02_AWAY_HOME",
          defteam: "DEF_A", // Need to include to make DEF_A have a week 2
          play_type: "run",
          yards_gained: "0",
          rusher_player_id: "RB1",
        }),
        createRow({
          game_id: "2023_02_AWAY_HOME",
          defteam: "DEF_B", // Need to include to make DEF_B have a week 2
          play_type: "run",
          yards_gained: "0",
          rusher_player_id: "RB1",
        }),
      ];

      const results = computeDefensiveFantasyPointsAllowed(rows, { positionLookup: FAKE_POSITION_LOOKUP });

      const defA = results.find(r => r.week === 2 && r.defteam === "DEF_A" && r.position === "RB");
      expect(defA!.seasonWindow).toBe(10);

      const defB = results.find(r => r.week === 2 && r.defteam === "DEF_B" && r.position === "RB");
      expect(defB!.seasonWindow).toBe(20);
  });

  it("only awards passing points to QBs", () => {
    const rows = [
      createRow({
        game_id: "2023_01_AWAY_HOME",
        defteam: "DEF",
        play_type: "pass",
        complete_pass: "1",
        yards_gained: "100", // Passing points would be 4
        touchdown: "1",      // Passing TD points would be 4
        passer_player_id: "RB1", // non-QB passer
      }),
      createRow({
        game_id: "2023_01_AWAY_HOME", // Ensure position RB is registered for this game with 0 points
        defteam: "DEF",
        play_type: "run",
        yards_gained: "1", // To make sure it adds to the position sum map
        rusher_player_id: "RB1", // RB gets 0.1 points
      }),
      createRow({
        game_id: "2023_02_AWAY_HOME", // Force week 2 to evaluate week 1
        defteam: "DEF",
        play_type: "run",
        yards_gained: "10",
        rusher_player_id: "RB1",
      }),
    ];
    const results = computeDefensiveFantasyPointsAllowed(rows, { positionLookup: FAKE_POSITION_LOOKUP });

    // RB1 should have 0 points for passing in Week 1, and 0.1 for running. Week 2 should only see 0.1
    const week2RB = results.find(r => r.week === 2 && r.position === "RB");
    expect(week2RB).toBeDefined();
    expect(week2RB!.seasonWindow).toBe(0.1);
  });
});
