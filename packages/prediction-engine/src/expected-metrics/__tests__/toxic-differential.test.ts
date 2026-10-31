import { describe, it, expect } from "vitest";
import { computeToxicDifferential, type ToxicPlay } from "../toxic-differential.js";

describe("Toxic Differential", () => {
  it("computes hand-computed fixtures accurately and handles negative differential", () => {
    // Generate plays for Team A to pass the floor (>100 plays, 3 games)
    // Game 1: week 1, 40 plays
    // Game 2: week 2, 40 plays
    // Game 3: week 3, 30 plays
    const plays: ToxicPlay[] = [];

    // 1 explosive play in game 1
    plays.push({ playId: "A-G1-1", gameId: "G1", week: 1, posteam: "TeamA", playType: "pass", yardsGained: 21, interception: 0, fumbleLost: 0, qbKneel: 0, qbSpike: 0 });
    // 2 turnovers in game 2 (one INT, one BOTH)
    plays.push({ playId: "A-G2-1", gameId: "G2", week: 2, posteam: "TeamA", playType: "pass", yardsGained: 0, interception: 1, fumbleLost: 0, qbKneel: 0, qbSpike: 0 });
    plays.push({ playId: "A-G2-2", gameId: "G2", week: 2, posteam: "TeamA", playType: "run", yardsGained: 5, interception: 1, fumbleLost: 1, qbKneel: 0, qbSpike: 0 }); // 1 turnover total

    // Fill the rest to reach 110 plays total
    for (let i = 0; i < 39; i++) plays.push({ playId: `A-G1-F${i}`, gameId: "G1", week: 1, posteam: "TeamA", playType: "run", yardsGained: 5, interception: 0, fumbleLost: 0, qbKneel: 0, qbSpike: 0 });
    for (let i = 0; i < 38; i++) plays.push({ playId: `A-G2-F${i}`, gameId: "G2", week: 2, posteam: "TeamA", playType: "run", yardsGained: 5, interception: 0, fumbleLost: 0, qbKneel: 0, qbSpike: 0 });
    for (let i = 0; i < 30; i++) plays.push({ playId: `A-G3-F${i}`, gameId: "G3", week: 3, posteam: "TeamA", playType: "run", yardsGained: 5, interception: 0, fumbleLost: 0, qbKneel: 0, qbSpike: 0 });

    const result = computeToxicDifferential(plays, 4);

    const teamA_STD = result.teams.find(t => t.teamId === "TeamA" && t.window === "season-to-date");
    expect(teamA_STD).toBeDefined();
    expect(teamA_STD!.offensivePlays).toBe(110);
    expect(teamA_STD!.distinctGames).toBe(3);
    expect(teamA_STD!.explosiveCount).toBe(1);
    expect(teamA_STD!.turnoverCount).toBe(2);
    expect(teamA_STD!.toxicDifferential).toBe(-1); // negative!
    expect(teamA_STD!.toxicRate).toBeCloseTo(-1 / 110, 4);
    expect(teamA_STD!.toxicPerGame).toBeCloseTo(-1 / 3, 4);
    expect(teamA_STD!.explosiveRate).toBeCloseTo(1 / 110, 4);
    expect(teamA_STD!.turnoverRate).toBeCloseTo(2 / 110, 4);
  });

  it("enforces threshold boundaries for explosives and turnovers", () => {
    // Generate exactly enough plays to hit floor
    const plays: ToxicPlay[] = [];
    // Play with exactly 20 yards (NOT explosive)
    plays.push({ playId: "B-1", gameId: "G1", week: 1, posteam: "TeamB", playType: "pass", yardsGained: 20, interception: 0, fumbleLost: 0, qbKneel: 0, qbSpike: 0 });
    // Play with exactly 21 yards (IS explosive)
    plays.push({ playId: "B-2", gameId: "G2", week: 2, posteam: "TeamB", playType: "run", yardsGained: 21, interception: 0, fumbleLost: 0, qbKneel: 0, qbSpike: 0 });
    // Play with BOTH int and fumble (exactly 1 turnover)
    plays.push({ playId: "B-3", gameId: "G3", week: 3, posteam: "TeamB", playType: "pass", yardsGained: 0, interception: 1, fumbleLost: 1, qbKneel: 0, qbSpike: 0 });

    // Fill to 100 plays total
    for (let i = 0; i < 97; i++) {
        plays.push({ playId: `B-F${i}`, gameId: `G${(i%3)+1}`, week: (i%3)+1, posteam: "TeamB", playType: "run", yardsGained: 5, interception: 0, fumbleLost: 0, qbKneel: 0, qbSpike: 0 });
    }

    const result = computeToxicDifferential(plays, 4);
    const teamB_STD = result.teams.find(t => t.teamId === "TeamB" && t.window === "season-to-date");
    expect(teamB_STD).toBeDefined();
    expect(teamB_STD!.explosiveCount).toBe(1);
    expect(teamB_STD!.turnoverCount).toBe(1);
    expect(teamB_STD!.toxicDifferential).toBe(0);
  });

  it("handles exclusions (kneel, spike, non-finite yards) properly", () => {
    const plays: ToxicPlay[] = [
      { playId: "C-1", gameId: "G1", week: 1, posteam: "TeamC", playType: "run", yardsGained: -1, interception: 0, fumbleLost: 0, qbKneel: 1, qbSpike: 0 },
      { playId: "C-2", gameId: "G1", week: 1, posteam: "TeamC", playType: "pass", yardsGained: 0, interception: 0, fumbleLost: 0, qbKneel: 0, qbSpike: 1 },
      { playId: "C-3", gameId: "G1", week: 1, posteam: "TeamC", playType: "pass", yardsGained: NaN, interception: 0, fumbleLost: 0, qbKneel: 0, qbSpike: 0 },
    ];
    // Fill to hit floor
    for (let i = 0; i < 100; i++) {
        plays.push({ playId: `C-F${i}`, gameId: `G${(i%3)+1}`, week: (i%3)+1, posteam: "TeamC", playType: "run", yardsGained: 5, interception: 0, fumbleLost: 0, qbKneel: 0, qbSpike: 0 });
    }

    const result = computeToxicDifferential(plays, 4);
    expect(result.diagnostics.excludedPlays).toBe(3);
    const teamC_STD = result.teams.find(t => t.teamId === "TeamC" && t.window === "season-to-date");
    expect(teamC_STD!.offensivePlays).toBe(100); // the 3 specials are excluded
  });

  it("enforces floor (absent if < 100 plays or < 3 distinct games)", () => {
    const plays: ToxicPlay[] = [];
    // Team D: 150 plays, but only 2 games
    for (let i = 0; i < 150; i++) plays.push({ playId: `D-${i}`, gameId: `G${(i%2)+1}`, week: (i%2)+1, posteam: "TeamD", playType: "run", yardsGained: 5, interception: 0, fumbleLost: 0, qbKneel: 0, qbSpike: 0 });
    // Team E: 99 plays, 3 games
    for (let i = 0; i < 99; i++) plays.push({ playId: `E-${i}`, gameId: `G${(i%3)+1}`, week: (i%3)+1, posteam: "TeamE", playType: "run", yardsGained: 5, interception: 0, fumbleLost: 0, qbKneel: 0, qbSpike: 0 });

    const result = computeToxicDifferential(plays, 4);
    expect(result.teams.find(t => t.teamId === "TeamD")).toBeUndefined();
    expect(result.teams.find(t => t.teamId === "TeamE")).toBeUndefined();
    // 3 windows for D, 3 for E = 6 below floors
    expect(result.diagnostics.belowFloorTeams).toBe(6);
  });

  it("handles point-in-time logic and last-4 windowing", () => {
    const plays: ToxicPlay[] = [];
    // Generate 5 games for Team F, 50 plays each.
    for (let gameIdx = 1; gameIdx <= 5; gameIdx++) {
      for (let i = 0; i < 50; i++) {
        plays.push({ playId: `F-G${gameIdx}-${i}`, gameId: `G${gameIdx}`, week: gameIdx, posteam: "TeamF", playType: "run", yardsGained: gameIdx === 5 ? 25 : 5, interception: 0, fumbleLost: 0, qbKneel: 0, qbSpike: 0 });
      }
    }

    // Target week 5: should only include weeks 1-4.
    const resultW5 = computeToxicDifferential(plays, 5);
    const stdW5 = resultW5.teams.find(t => t.teamId === "TeamF" && t.window === "season-to-date");
    expect(stdW5!.offensivePlays).toBe(200); // 4 games * 50
    expect(stdW5!.distinctGames).toBe(4);
    expect(stdW5!.explosiveCount).toBe(0); // week 5 explosives not included

    // Target week 6: includes weeks 1-5.
    const resultW6 = computeToxicDifferential(plays, 6);
    const stdW6 = resultW6.teams.find(t => t.teamId === "TeamF" && t.window === "season-to-date");
    expect(stdW6!.offensivePlays).toBe(250);
    expect(stdW6!.distinctGames).toBe(5);
    expect(stdW6!.explosiveCount).toBe(50); // week 5 explosives included

    const last4W6 = resultW6.teams.find(t => t.teamId === "TeamF" && t.window === "last-4");
    expect(last4W6!.distinctGames).toBe(4);
    expect(last4W6!.offensivePlays).toBe(200); // games 2, 3, 4, 5
  });

  it("does not output EPA and is unaffected by it", () => {
    // There is no EPA passed in ToxicPlay, so this implicitly proves the no-EPA rule.
    // Ensure the output type doesn't have an epa field magically.
    const plays: ToxicPlay[] = [];
    for (let i = 0; i < 100; i++) plays.push({ playId: `G-${i}`, gameId: `G${(i%3)+1}`, week: (i%3)+1, posteam: "TeamG", playType: "run", yardsGained: 5, interception: 0, fumbleLost: 0, qbKneel: 0, qbSpike: 0 });
    const result = computeToxicDifferential(plays, 4);
    const t = result.teams[0];
    expect((t as any).epa).toBeUndefined();
    expect((t as any).epaPerPlay).toBeUndefined();
  });
});
