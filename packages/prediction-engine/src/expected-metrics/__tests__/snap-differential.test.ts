import { describe, it, expect } from "vitest";
import { computeSnapDifferential, type ScrimmagePlayRow } from "../snap-differential.js";

describe("computeSnapDifferential", () => {
  it("computes strictly PIT windows and respects 3-game floor", () => {
    // We will simulate 4 games for team A, and check windows at each game.
    // team A plays team B in week 1
    // team A plays team C in week 2
    // team A plays team D in week 3
    // team A plays team E in week 4

    // For simplicity, A has 10 plays per game, opponents have 5, 10, 15, 20
    const buildGame = (gameId: string, season: number, week: number, posteam: string, defteam: string, count: number): ScrimmagePlayRow[] => {
      return Array(count).fill(null).map(() => ({
        gameId, season, week, posteam, defteam, playType: "pass"
      }));
    };

    const plays = [
      ...buildGame("g1", 2026, 1, "A", "B", 10),
      ...buildGame("g1", 2026, 1, "B", "A", 5),

      ...buildGame("g2", 2026, 2, "A", "C", 10),
      ...buildGame("g2", 2026, 2, "C", "A", 10),

      ...buildGame("g3", 2026, 3, "A", "D", 10),
      ...buildGame("g3", 2026, 3, "D", "A", 15),

      ...buildGame("g4", 2026, 4, "A", "E", 10),
      ...buildGame("g4", 2026, 4, "E", "A", 20),
    ];

    const results = computeSnapDifferential(plays);
    const teamA = results.filter(r => r.teamId === "A");
    expect(teamA).toHaveLength(4);

    // Week 1 (no prior games)
    const a1 = teamA.find(r => r.week === 1)!;
    expect(a1.std.games).toBe(0);
    expect(a1.std.scrimmagePlayDifferentialPerGame).toBeNull();

    // Week 2 (1 prior game: g1)
    const a2 = teamA.find(r => r.week === 2)!;
    expect(a2.std.games).toBe(1);
    expect(a2.std.scrimmagePlayDifferentialPerGame).toBeNull(); // < 3 floor

    // Week 3 (2 prior games: g1, g2)
    const a3 = teamA.find(r => r.week === 3)!;
    expect(a3.std.games).toBe(2);
    expect(a3.std.scrimmagePlayDifferentialPerGame).toBeNull(); // < 3 floor

    // Week 4 (3 prior games: g1, g2, g3)
    const a4 = teamA.find(r => r.week === 4)!;
    expect(a4.std.games).toBe(3);
    // offTotal = 10+10+10 = 30
    // defTotal = 5+10+15 = 30
    // diff = 30-30 = 0
    expect(a4.std.scrimmagePlayDifferentialPerGame).toBe(0);
  });

  it("maintains antisymmetry invariant within a game", () => {
    const plays: ScrimmagePlayRow[] = [
      { gameId: "g1", season: 2026, week: 1, posteam: "A", defteam: "B", playType: "run" },
      { gameId: "g1", season: 2026, week: 1, posteam: "A", defteam: "B", playType: "pass" },
      { gameId: "g1", season: 2026, week: 1, posteam: "B", defteam: "A", playType: "pass" },

      // Add more games to reach floor
      { gameId: "g2", season: 2026, week: 2, posteam: "A", defteam: "C", playType: "run" },
      { gameId: "g2", season: 2026, week: 2, posteam: "B", defteam: "C", playType: "pass" },

      { gameId: "g3", season: 2026, week: 3, posteam: "A", defteam: "D", playType: "run" },
      { gameId: "g3", season: 2026, week: 3, posteam: "B", defteam: "D", playType: "pass" },

      { gameId: "g4", season: 2026, week: 4, posteam: "A", defteam: "B", playType: "run" },
    ];

    const results = computeSnapDifferential(plays);

    // Look at target game g4 for teams A and B
    const a4 = results.find(r => r.teamId === "A" && r.gameId === "g4")!;
    const b4 = results.find(r => r.teamId === "B" && r.gameId === "g4")!;

    expect(a4).toBeDefined();
    expect(b4).toBeDefined();

    // In game 1: A off=2 def=1. B off=1 def=2.
    // In game 2: A off=1 def=0. B off=1 def=0.
    // In game 3: A off=1 def=0. B off=1 def=0.
    // A total prior: off = 2+1+1=4, def = 1+0+0=1. Diff = 3. Per game = 3/3 = 1
    // B total prior: off = 1+1+1=3, def = 2+0+0=2. Diff = 1. Per game = 1/3 = 0.3333

    expect(a4.std.scrimmagePlayDifferentialPerGame).toBe(1);
    expect(b4.std.scrimmagePlayDifferentialPerGame).toBeCloseTo(0.3333, 4);

    // Antisymmetry of specific counts for g1 in the aggregate context
    // Actually the antisymmetry constraint means differential(A) over the population of A vs B games == -differential(B) over that same population.
    // Let's create a strictly symmetrical world
    const playsSym: ScrimmagePlayRow[] = [
      { gameId: "g1", season: 2026, week: 1, posteam: "A", defteam: "B", playType: "run" }, // A+1
      { gameId: "g1", season: 2026, week: 1, posteam: "B", defteam: "A", playType: "run" }, // B+1
      { gameId: "g2", season: 2026, week: 2, posteam: "A", defteam: "B", playType: "pass" }, // A+1
      { gameId: "g3", season: 2026, week: 3, posteam: "A", defteam: "B", playType: "run" }, // A+1
      { gameId: "g4", season: 2026, week: 4, posteam: "A", defteam: "B", playType: "run" } // Target
    ];

    const resSym = computeSnapDifferential(playsSym);
    const symA4 = resSym.find(r => r.teamId === "A" && r.gameId === "g4")!;
    const symB4 = resSym.find(r => r.teamId === "B" && r.gameId === "g4")!;

    // A prior: off=3, def=1 -> diff = 2. Per game: 2/3
    // B prior: off=1, def=3 -> diff = -2. Per game: -2/3
    expect(symA4.std.scrimmagePlayDifferentialPerGame).toBeCloseTo(2/3, 4);
    expect(symB4.std.scrimmagePlayDifferentialPerGame).toBeCloseTo(-2/3, 4);
    expect(symA4.std.scrimmagePlayDifferentialPerGame).toBe(-symB4.std.scrimmagePlayDifferentialPerGame!);
    expect(symA4.std.offScrimmagePlays).toBe(symB4.std.defScrimmagePlays);
    expect(symA4.std.defScrimmagePlays).toBe(symB4.std.offScrimmagePlays);
  });

  it("maintains population discipline (pass/run only, excludes punts/fg)", () => {
    const plays: ScrimmagePlayRow[] = [
      { gameId: "g1", season: 2026, week: 1, posteam: "A", defteam: "B", playType: "pass" },
      { gameId: "g1", season: 2026, week: 1, posteam: "A", defteam: "B", playType: "run" },
      { gameId: "g1", season: 2026, week: 1, posteam: "A", defteam: "B", playType: "punt" }, // should be ignored
      { gameId: "g1", season: 2026, week: 1, posteam: "A", defteam: "B", playType: "field_goal" }, // ignored
      { gameId: "g1", season: 2026, week: 1, posteam: "A", defteam: "B", playType: "no_play" }, // ignored
      { gameId: "g1", season: 2026, week: 1, posteam: "B", defteam: "A", playType: "run" }, // B+1

      { gameId: "g2", season: 2026, week: 2, posteam: "A", defteam: "C", playType: "pass" },
      { gameId: "g3", season: 2026, week: 3, posteam: "A", defteam: "D", playType: "pass" },
      { gameId: "g4", season: 2026, week: 4, posteam: "A", defteam: "E", playType: "pass" } // Target
    ];

    const results = computeSnapDifferential(plays);
    const targetA = results.find(r => r.teamId === "A" && r.gameId === "g4")!;

    // A offPlays in g1 should be exactly 2 (pass + run). The others are ignored.
    // g2 has 1, g3 has 1. total offPlays prior = 4.
    expect(targetA.std.offScrimmagePlays).toBe(4);
  });

  it("strictly enforces PIT discipline even if unordered", () => {
    const plays: ScrimmagePlayRow[] = [
      { gameId: "g3", season: 2026, week: 3, posteam: "A", defteam: "C", playType: "pass" }, // later game
      { gameId: "g1", season: 2026, week: 1, posteam: "A", defteam: "B", playType: "run" },
      { gameId: "g9", season: 2026, week: 9, posteam: "A", defteam: "D", playType: "pass" }, // much later game
      { gameId: "g4", season: 2026, week: 4, posteam: "A", defteam: "E", playType: "pass" }, // target game
      { gameId: "g2", season: 2026, week: 2, posteam: "A", defteam: "F", playType: "pass" }
    ];

    const results = computeSnapDifferential(plays);
    const targetA = results.find(r => r.teamId === "A" && r.gameId === "g4")!;

    // For target g4, only g1, g2, g3 are prior. g9 is strictly excluded.
    // games=3, offPlays=3.
    expect(targetA.std.games).toBe(3);
    expect(targetA.std.offScrimmagePlays).toBe(3);
  });

  it("reconciles overall counts", () => {
    // total plays = offPlays + defPlays / 2 across all teams? Yes, for any game:
    // Every play has 1 off, 1 def. So sum of all offPlays = total plays. sum of all defPlays = total plays.
    const plays: ScrimmagePlayRow[] = [
      { gameId: "g1", season: 2026, week: 1, posteam: "A", defteam: "B", playType: "run" },
      { gameId: "g1", season: 2026, week: 1, posteam: "A", defteam: "B", playType: "pass" },
      { gameId: "g2", season: 2026, week: 2, posteam: "A", defteam: "C", playType: "pass" },
      { gameId: "g3", season: 2026, week: 3, posteam: "B", defteam: "C", playType: "run" },
      { gameId: "g4", season: 2026, week: 4, posteam: "A", defteam: "B", playType: "run" } // Target to reach floor
    ];

    const results = computeSnapDifferential(plays);
    const targetA = results.find(r => r.teamId === "A" && r.gameId === "g4")!;

    // A prior: off=3 (g1x2, g2x1), def=0
    expect(targetA.std.offScrimmagePlays).toBe(3);
    expect(targetA.std.defScrimmagePlays).toBe(0);
  });
});
