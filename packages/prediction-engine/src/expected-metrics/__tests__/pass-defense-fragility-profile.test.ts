import { describe, expect, it } from "vitest";
import {
  computePassDefenseFragility,
  type FragilityPassPlay
} from "../pass-defense-fragility-profile.js";

function makePlay(overrides: Partial<FragilityPassPlay> = {}): FragilityPassPlay {
  return {
    playId: "p1", gameId: "g1", week: 1, defteam: "DEF",
    epa: 0.1, sack: 0, qbSpike: 0, completePass: 1, passingYards: 10,
    passTouchdown: 0, interception: 0,
    successPlay: {
      playId: "p1", teamId: "OFF", playerId: "QB", down: 1, ydstogo: 10, yardsGained: 10, touchdown: 0, turnover: 0
    },
    ...overrides
  };
}

describe("Pass Defense Fragility Profile", () => {
  it("calculates basic stats correctly and normalizes INT percentiles (invert) for eligible defenses", () => {
    // Generate plays for 2 teams to ensure one gets 0 and one gets 1 percentile
    const t1Plays: FragilityPassPlay[] = [];
    const t2Plays: FragilityPassPlay[] = [];

    // Team 1: 50 dropbacks, 3 games, 30 completions, 300 yards, 2 TD, 0 INT, total EPA = 5.0 (0.1/db), 20 successes (0.4)
    for (let i=0; i<50; i++) {
      const g = i < 20 ? "g1" : i < 40 ? "g2" : "g3";
      t1Plays.push(makePlay({
        playId: `t1-${i}`, gameId: g, defteam: "T1", epa: 0.1, completePass: i < 30 ? 1 : 0,
        passingYards: i < 30 ? 10 : 0, passTouchdown: i < 2 ? 1 : 0, interception: 0,
        successPlay: { playId: `t1-${i}`, teamId: "OFF", playerId: "QB", down: 1, ydstogo: 10, yardsGained: i < 20 ? 10 : 0, touchdown: 0, turnover: 0 }
      }));
    }

    // Team 2: 50 dropbacks, 3 games, 30 completions, 300 yards, 2 TD, 2 INT, total EPA = 5.0, 20 successes
    for (let i=0; i<50; i++) {
      const g = i < 20 ? "g4" : i < 40 ? "g5" : "g6";
      t2Plays.push(makePlay({
        playId: `t2-${i}`, gameId: g, defteam: "T2", epa: 0.1, completePass: i < 30 ? 1 : 0,
        passingYards: i < 30 ? 10 : 0, passTouchdown: i < 2 ? 1 : 0, interception: i >= 48 ? 1 : 0,
        successPlay: { playId: `t2-${i}`, teamId: "OFF", playerId: "QB", down: 1, ydstogo: 10, yardsGained: i < 20 ? 10 : 0, touchdown: 0, turnover: 0 }
      }));
    }

    const profiles = computePassDefenseFragility([...t1Plays, ...t2Plays]);

    // Check specific season-to-date profiles for T1 and T2 at week 1
    const p1 = profiles.find(p => p.defteam === "T1" && p.windowType === "season-to-date" && p.targetGameId === "g3");
    const p2 = profiles.find(p => p.defteam === "T2" && p.windowType === "season-to-date" && p.targetGameId === "g6");

    expect(p1).toBeDefined();
    expect(p2).toBeDefined();

    // Stats
    expect(p1!.dropbacks).toBe(50);
    expect(p1!.attempts).toBe(50);
    expect(p1!.distinctGames).toBe(3);

    // Percentiles (T2 has more INTs, so its INT rate percentile is LOWER)
    // T1: INT rate = 0
    // T2: INT rate = 2/50 = 0.04
    expect(p1!.intRatePercentile).toBe(1); // More fragile (fewer INTs)
    expect(p2!.intRatePercentile).toBe(0); // Less fragile (more INTs)

    // Everything else should be tied at 0.5 except passing
    expect(p1!.epaPerDropbackPercentile).toBe(0.5);
    expect(p2!.epaPerDropbackPercentile).toBe(0.5);
  });

  it("handles sack and spike rows correctly, clamping passer rating", () => {
    // 50 dropbacks: 40 normal (all completions for 10 yards, 10 TDs, 0 INTs), 5 sacks, 5 spikes
    const plays: FragilityPassPlay[] = [];
    for (let i=0; i<50; i++) {
      const g = i < 20 ? "g1" : i < 40 ? "g2" : "g3";
      if (i < 40) {
         // To hit max rating 158.3:
         // - Comp: >= 77.5%
         // - YPA: >= 12.5 (need passingYards: 12.5 per attempt)
         // - TD: >= 11.875% (need at least 5 TDs on 40 attempts)
         // - INT: 0
         plays.push(makePlay({ gameId: g, playId: `p${i}`, completePass: 1, passingYards: 15, passTouchdown: i < 10 ? 1 : 0 }));
      } else if (i < 45) {
         plays.push(makePlay({ gameId: g, playId: `p${i}`, sack: 1, completePass: 0, passingYards: -5, passTouchdown: 0 }));
      } else {
         plays.push(makePlay({ gameId: g, playId: `p${i}`, qbSpike: 1, completePass: 0, passingYards: 0, passTouchdown: 0 }));
      }
    }

    const profiles = computePassDefenseFragility(plays);
    const p = profiles.find(p => p.windowType === "season-to-date" && p.targetGameId === "g3");

    expect(p!.dropbacks).toBe(50);
    expect(p!.attempts).toBe(40); // 50 - 5 sacks - 5 spikes
    expect(p!.completions).toBe(40); // 100% comp
    expect(p!.passerRating).toBe(158.3); // Clamped
  });

  it("returns null percentiles for windows under floors", () => {
    // 2 games, 50 dropbacks
    const plays: FragilityPassPlay[] = [];
    for (let i=0; i<50; i++) {
      plays.push(makePlay({ gameId: i < 25 ? "g1" : "g2" }));
    }

    const profiles = computePassDefenseFragility(plays);
    const p = profiles.find(p => p.windowType === "season-to-date" && p.targetGameId === "g2");

    expect(p!.distinctGames).toBe(2);
    expect(p!.dropbacks).toBe(50);
    expect(p!.epaPerDropback).toBeNull();
    expect(p!.epaPerDropbackPercentile).toBeNull();
  });

  it("calculates moving windows properly and adheres to point-in-time", () => {
    const plays: FragilityPassPlay[] = [];
    for (let g=1; g<=10; g++) {
      for (let i=0; i<10; i++) { // 100 plays total, 10 per game
        plays.push(makePlay({ gameId: `g${g}`, week: g, playId: `p-${g}-${i}` }));
      }
    }

    const profiles = computePassDefenseFragility(plays);

    const last4_g10 = profiles.find(p => p.windowType === "last-4" && p.targetGameId === "g10");
    expect(last4_g10!.distinctGames).toBe(4);
    expect(last4_g10!.dropbacks).toBe(40); // 4 * 10

    const last8_g10 = profiles.find(p => p.windowType === "last-8" && p.targetGameId === "g10");
    expect(last8_g10!.distinctGames).toBe(8);
    expect(last8_g10!.dropbacks).toBe(80);

    const s2d_g10 = profiles.find(p => p.windowType === "season-to-date" && p.targetGameId === "g10");
    expect(s2d_g10!.distinctGames).toBe(10);
    expect(s2d_g10!.dropbacks).toBe(100);
  });
});
