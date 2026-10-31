import { computeWrDepthAfterLeader, WrDepthTargetPlay, WrDepthTeamGamePlay } from "../wr-depth-after-leader.js";

describe("computeWrDepthAfterLeader", () => {
  const baseTargetPlay = (playId: string, gameId: string, week: number, posteam: string, receiverPlayerId: string, receivingYards: number | null): WrDepthTargetPlay => ({
    playId, gameId, week, posteam, receiverPlayerId, receivingYards
  });

  const baseGamePlay = (gameId: string, week: number, posteam: string): WrDepthTeamGamePlay => ({
    gameId, week, posteam
  });

  it("calculates leader identity, yardages, and depths with correctly assigned hand-computed features", () => {
    // Team A: 3 distinct games, WR1: 100 yds (20 tgts), WR2: 60 yds (10 tgts), WR3: 40 yds (5 tgts) -> total 200 yds (35 tgts)
    // Team B: 3 distinct games, WR1: 150 yds (35 tgts), WR2: 50 yds (10 tgts) -> total 200 yds (45 tgts)

    const targetPlays: WrDepthTargetPlay[] = [
      ...Array.from({ length: 20 }, (_, i) => baseTargetPlay(`A1-${i}`, "g1", 1, "TeamA", "WR_A_1", 5)),
      ...Array.from({ length: 10 }, (_, i) => baseTargetPlay(`A2-${i}`, "g1", 1, "TeamA", "WR_A_2", 6)),
      ...Array.from({ length: 5 }, (_, i) => baseTargetPlay(`A3-${i}`, "g1", 1, "TeamA", "WR_A_3", 8)),

      ...Array.from({ length: 35 }, (_, i) => baseTargetPlay(`B1-${i}`, "g1", 1, "TeamB", "WR_B_1", Math.floor(150 / 35))),
    ];
    targetPlays.push(baseTargetPlay("B1-rem", "g1", 1, "TeamB", "WR_B_1", 150 - Math.floor(150/35)*35)); // Ensure exactly 150 yds
    targetPlays.push(...Array.from({ length: 10 }, (_, i) => baseTargetPlay(`B2-${i}`, "g1", 1, "TeamB", "WR_B_2", 5)));

    const teamGamePlays: WrDepthTeamGamePlay[] = [
      baseGamePlay("g1", 1, "TeamA"), baseGamePlay("g2", 2, "TeamA"), baseGamePlay("g3", 3, "TeamA"),
      baseGamePlay("g4", 1, "TeamB"), baseGamePlay("g5", 2, "TeamB"), baseGamePlay("g6", 3, "TeamB"),
    ];

    const positionLookup = new Map<string, string>([
      ["WR_A_1", "WR"], ["WR_A_2", "WR"], ["WR_A_3", "WR"],
      ["WR_B_1", "WR"], ["WR_B_2", "WR"]
    ]);

    const { results, diagnostics } = computeWrDepthAfterLeader(targetPlays, teamGamePlays, positionLookup, 4, "season-to-date");

    expect(results).toHaveLength(2);

    const teamARes = results.find(r => r.posteam === "TeamA")!;
    expect(teamARes.distinctGames).toBe(3);
    expect(teamARes.wrTargets).toBe(35);
    expect(teamARes.wrCount).toBe(3);
    expect(teamARes.leaderPlayerId).toBe("WR_A_1");
    expect(teamARes.leaderReceivingYards).toBe(100);
    expect(teamARes.totalWrReceivingYards).toBe(200);
    expect(teamARes.depthReceivingYards).toBe(100);
    expect(teamARes.depthYardsPerGame).toBeCloseTo(100 / 3, 4);
    expect(teamARes.totalWrYardsPerGame).toBeCloseTo(200 / 3, 4);
    expect(teamARes.leaderShareOfWrYards).toBeCloseTo(100 / 200, 4);
    expect(teamARes.provenance.sampleSize).toBe(35);

    const teamBRes = results.find(r => r.posteam === "TeamB")!;
    expect(teamBRes.leaderPlayerId).toBe("WR_B_1");
    expect(teamBRes.leaderReceivingYards).toBe(150);
    expect(teamBRes.totalWrReceivingYards).toBe(200);
    expect(teamBRes.depthReceivingYards).toBe(50);
    expect(teamBRes.depthYardsPerGame).toBeCloseTo(50 / 3, 4);

    expect(diagnostics.belowFloorTeamAbsences).toBe(0);
  });

  it("handles position discipline correctly (TE, RB excluded from leader/depth, included in diagnostics)", () => {
    const targetPlays: WrDepthTargetPlay[] = [
      ...Array.from({ length: 30 }, (_, i) => baseTargetPlay(`WR-${i}`, "g1", 1, "TeamA", "WR1", 3)), // 90 yds, 30 tgts
      baseTargetPlay("TE-1", "g1", 1, "TeamA", "TE1", 100), // 100 yds TE
      baseTargetPlay("RB-1", "g1", 1, "TeamA", "RB1", 50), // 50 yds RB
      baseTargetPlay("UNK-1", "g1", 1, "TeamA", "UNK1", 25) // 25 yds UNK
    ];

    const teamGamePlays: WrDepthTeamGamePlay[] = [
      baseGamePlay("g1", 1, "TeamA"), baseGamePlay("g2", 2, "TeamA"), baseGamePlay("g3", 3, "TeamA"),
    ];

    const positionLookup = new Map<string, string>([
      ["WR1", "WR"], ["TE1", "TE"], ["RB1", "RB"]
      // UNK1 is intentionally left out
    ]);

    const { results, diagnostics } = computeWrDepthAfterLeader(targetPlays, teamGamePlays, positionLookup, 4, "season-to-date");

    const res = results[0]!;
    expect(res.leaderPlayerId).toBe("WR1");
    expect(res.leaderReceivingYards).toBe(90);
    expect(res.depthReceivingYards).toBe(0); // 90 total - 90 leader = 0

    expect(diagnostics.excludedNonWrYards).toBe(150); // TE (100) + RB (50)
    expect(diagnostics.excludedNonWrTargets).toBe(2);
    expect(diagnostics.excludedUnknownPositionYards).toBe(25);
    expect(diagnostics.excludedUnknownPositionTargets).toBe(1);
  });

  it("guards against future leakage (leader from early window shouldn't be overridden by later weeks)", () => {
    // Window is week < 4.
    // Week 1-3: WR1 100 yds, WR2 50 yds.
    // Week 4-6: WR1 0 yds, WR2 150 yds.
    // For targetWeek 4, WR1 is the leader.

    const targetPlays: WrDepthTargetPlay[] = [
      // Weeks 1-3
      ...Array.from({ length: 20 }, (_, i) => baseTargetPlay(`W1-${i}`, "g1", 1, "TeamA", "WR1", 5)), // 100 yds, 20 tgts
      ...Array.from({ length: 10 }, (_, i) => baseTargetPlay(`W2-${i}`, "g2", 2, "TeamA", "WR2", 5)), // 50 yds, 10 tgts
      // Weeks 4-6
      ...Array.from({ length: 15 }, (_, i) => baseTargetPlay(`W4-${i}`, "g4", 4, "TeamA", "WR2", 10)), // 150 yds
    ];

    const teamGamePlays: WrDepthTeamGamePlay[] = [
      baseGamePlay("g1", 1, "TeamA"), baseGamePlay("g2", 2, "TeamA"), baseGamePlay("g3", 3, "TeamA"),
      baseGamePlay("g4", 4, "TeamA")
    ];

    const positionLookup = new Map<string, string>([["WR1", "WR"], ["WR2", "WR"]]);

    const { results } = computeWrDepthAfterLeader(targetPlays, teamGamePlays, positionLookup, 4, "season-to-date");

    const res = results[0]!;
    expect(res.leaderPlayerId).toBe("WR1");
    expect(res.leaderReceivingYards).toBe(100);
    expect(res.totalWrReceivingYards).toBe(150);
  });

  it("handles tie-break logic deterministically (lexicographically smaller playerId)", () => {
    const targetPlays: WrDepthTargetPlay[] = [
      ...Array.from({ length: 15 }, (_, i) => baseTargetPlay(`WR_Z-${i}`, "g1", 1, "TeamA", "WR_Z", 10)), // 150 yds
      ...Array.from({ length: 15 }, (_, i) => baseTargetPlay(`WR_A-${i}`, "g1", 1, "TeamA", "WR_A", 10)), // 150 yds
    ];

    const teamGamePlays: WrDepthTeamGamePlay[] = [
      baseGamePlay("g1", 1, "TeamA"), baseGamePlay("g2", 2, "TeamA"), baseGamePlay("g3", 3, "TeamA"),
    ];

    const positionLookup = new Map<string, string>([["WR_Z", "WR"], ["WR_A", "WR"]]);

    const { results } = computeWrDepthAfterLeader(targetPlays, teamGamePlays, positionLookup, 4, "season-to-date");
    const res = results[0]!;
    expect(res.leaderPlayerId).toBe("WR_A"); // WR_A < WR_Z
    expect(res.leaderReceivingYards).toBe(150);
    expect(res.depthReceivingYards).toBe(150); // Total (300) - Leader (150) = 150
  });

  it("handles targets with missing/null yards correctly (0 yards but counts for targets/floor/diagnostics)", () => {
    const targetPlays: WrDepthTargetPlay[] = [
      ...Array.from({ length: 29 }, (_, i) => baseTargetPlay(`WR1-${i}`, "g1", 1, "TeamA", "WR1", 10)), // 290 yds, 29 tgts
      baseTargetPlay("WR1-30", "g1", 1, "TeamA", "WR1", null) // Missing yards, 1 tgt
    ];

    const teamGamePlays: WrDepthTeamGamePlay[] = [
      baseGamePlay("g1", 1, "TeamA"), baseGamePlay("g2", 2, "TeamA"), baseGamePlay("g3", 3, "TeamA"),
    ];

    const positionLookup = new Map<string, string>([["WR1", "WR"]]);

    const { results, diagnostics } = computeWrDepthAfterLeader(targetPlays, teamGamePlays, positionLookup, 4, "season-to-date");
    const res = results[0]!;

    expect(res.wrTargets).toBe(30);
    expect(res.totalWrReceivingYards).toBe(290);
    expect(diagnostics.missingYardsTargets).toBe(1);
    expect(diagnostics.belowFloorTeamAbsences).toBe(0); // Clears 30 tgt floor because of the null target
  });

  it("handles floor behaviors accurately (below 3 games or below 30 targets yields absent row)", () => {
    const targetPlays: WrDepthTargetPlay[] = [
      // Team A: 20 tgts (below target floor), 3 distinct games
      ...Array.from({ length: 20 }, (_, i) => baseTargetPlay(`A-${i}`, "g1", 1, "TeamA", "WR_A", 10)),
      // Team B: 40 tgts (clears target floor), 2 distinct games (below game floor)
      ...Array.from({ length: 40 }, (_, i) => baseTargetPlay(`B-${i}`, "g1", 1, "TeamB", "WR_B", 10)),
      // Team C: 40 tgts, 3 games (clears both)
      ...Array.from({ length: 40 }, (_, i) => baseTargetPlay(`C-${i}`, "g1", 1, "TeamC", "WR_C", 10)),
    ];

    const teamGamePlays: WrDepthTeamGamePlay[] = [
      baseGamePlay("g1", 1, "TeamA"), baseGamePlay("g2", 2, "TeamA"), baseGamePlay("g3", 3, "TeamA"),
      baseGamePlay("g1", 1, "TeamB"), baseGamePlay("g2", 2, "TeamB"),
      baseGamePlay("g1", 1, "TeamC"), baseGamePlay("g2", 2, "TeamC"), baseGamePlay("g3", 3, "TeamC"),
    ];

    const positionLookup = new Map<string, string>([["WR_A", "WR"], ["WR_B", "WR"], ["WR_C", "WR"]]);

    const { results, diagnostics } = computeWrDepthAfterLeader(targetPlays, teamGamePlays, positionLookup, 4, "season-to-date");

    expect(results).toHaveLength(1);
    expect(results[0]!.posteam).toBe("TeamC");

    expect(diagnostics.belowFloorTeamAbsences).toBe(2); // TeamA and TeamB
  });

  it("emits depthYardsPerGame of exactly 0 when team's only WR has all the yards", () => {
    const targetPlays: WrDepthTargetPlay[] = [
      ...Array.from({ length: 30 }, (_, i) => baseTargetPlay(`C-${i}`, "g1", 1, "TeamC", "WR_C", 10)),
    ];
    const teamGamePlays: WrDepthTeamGamePlay[] = [
      baseGamePlay("g1", 1, "TeamC"), baseGamePlay("g2", 2, "TeamC"), baseGamePlay("g3", 3, "TeamC"),
    ];
    const positionLookup = new Map<string, string>([["WR_C", "WR"]]);

    const { results } = computeWrDepthAfterLeader(targetPlays, teamGamePlays, positionLookup, 4, "season-to-date");

    expect(results).toHaveLength(1);
    expect(results[0]!.depthYardsPerGame).toBe(0);
    expect(results[0]!.depthReceivingYards).toBe(0);
  });
});
