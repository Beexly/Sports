import { describe, it, expect } from "vitest";
import { computeRzCarryShare } from "../red-zone-carry-share.js";
import { type PbpRow } from "../nflverse-pbp-mapper.js";

function makeRow(overrides: Record<string, string>): PbpRow {
  return {
    game_id: "2026_01_AWAY_HOME",
    play_id: "100",
    play_type: "run",
    yardline_100: "10",
    rusher_player_id: "P1",
    posteam: "HOME",
    qb_kneel: "0",
    week: "1",
    ...overrides,
  };
}

describe("Red-Zone Carry Share Module", () => {
  it("computes accurate share math correctly", () => {
    // 10 RZ carries: P1 gets 9, P2 gets 1
    const records = [
      ...Array(9).fill(makeRow({ rusher_player_id: "P1", week: "1" })),
      makeRow({ rusher_player_id: "P2", play_id: "101", week: "1" }),
      // Add extra padding to meet team floor (need >= 20 team)
      ...Array(10).fill(makeRow({ rusher_player_id: "P3", week: "1" }))
    ];

    const result = computeRzCarryShare(records, 2);
    const p1 = result.find(r => r.playerId === "P1");

    expect(p1).toBeDefined();
    // 9 / 20 = 0.45
    expect(p1?.metrics.rzCarryShareSeasonToDate).toBe(0.45);
    expect(p1?.metrics.rzCarryShareLast4Games).toBe(0.45);
    expect(p1?.metrics.rzCarryShareLast8Games).toBe(0.45);
  });

  it("excludes QB kneels", () => {
    const records = [
      ...Array(15).fill(makeRow({ rusher_player_id: "P1", week: "1" })),
      // Not included in num or den
      makeRow({ rusher_player_id: "P1", qb_kneel: "1", week: "1" }),
      makeRow({ rusher_player_id: "P2", qb_kneel: "1", week: "1" }),
      ...Array(5).fill(makeRow({ rusher_player_id: "P2", week: "1" }))
    ];

    const result = computeRzCarryShare(records, 2);
    const p1 = result.find(r => r.playerId === "P1");

    // Team carries: 15 (P1) + 5 (P2) = 20
    // P1 carries: 15
    // 15 / 20 = 0.75
    expect(p1?.metrics.rzCarryShareSeasonToDate).toBe(0.75);
  });

  it("enforces boundary conditions for yardline and play_type", () => {
    const records = [
      ...Array(20).fill(makeRow({ rusher_player_id: "P1", yardline_100: "20", week: "1" })), // exactly on boundary counts
      makeRow({ rusher_player_id: "P1", yardline_100: "21", week: "1" }), // outside boundary
      makeRow({ rusher_player_id: "P1", yardline_100: "10", play_type: "pass", week: "1" }) // pass play inside
    ];

    const result = computeRzCarryShare(records, 2);
    const p1 = result.find(r => r.playerId === "P1");

    // 20 valid carries
    // 20 / 20 = 1.0
    expect(p1?.metrics.rzCarryShareSeasonToDate).toBe(1.0);
  });

  it("applies strict point-in-time discipline", () => {
    const records = [
      ...Array(20).fill(makeRow({ rusher_player_id: "P1", week: "1" })),
      // week 2 plays should be ignored for target week 2
      ...Array(10).fill(makeRow({ rusher_player_id: "P2", week: "2" })),
      // week 3 plays should be ignored for target week 2
      ...Array(10).fill(makeRow({ rusher_player_id: "P2", week: "3" }))
    ];

    const result = computeRzCarryShare(records, 2);
    const p1 = result.find(r => r.playerId === "P1");
    const p2 = result.find(r => r.playerId === "P2");

    // For week 2, only week 1 plays count. Team has 20, P1 has 20.
    expect(p1?.metrics.rzCarryShareSeasonToDate).toBe(1.0);
    expect(p2).toBeUndefined(); // P2 has no valid plays in window and floor
  });

  it("respects volume floors for both player and team", () => {
    // 19 team carries total -> team floor fails
    const records19 = [
      ...Array(15).fill(makeRow({ rusher_player_id: "P1", week: "1" })),
      ...Array(4).fill(makeRow({ rusher_player_id: "P2", week: "1" }))
    ];
    expect(computeRzCarryShare(records19, 2)).toHaveLength(0);

    // 20 team carries, but P1 has 7 -> player floor fails
    const records7 = [
      ...Array(7).fill(makeRow({ rusher_player_id: "P1", week: "1" })),
      ...Array(13).fill(makeRow({ rusher_player_id: "P2", week: "1" }))
    ];
    const result7 = computeRzCarryShare(records7, 2);
    expect(result7).toHaveLength(1); // Only P2 emitted
    expect(result7[0]?.playerId).toBe("P2");
  });

  it("maintains denominator integrity with missing players", () => {
    // 20 carries: P1 gets 10, P2 gets 7, P3 gets 3
    const records = [
      ...Array(10).fill(makeRow({ rusher_player_id: "P1", week: "1" })),
      ...Array(7).fill(makeRow({ rusher_player_id: "P2", week: "1" })),
      ...Array(3).fill(makeRow({ rusher_player_id: "P3", week: "1" }))
    ];

    const result = computeRzCarryShare(records, 2);

    // Only P1 meets floor of 8
    expect(result).toHaveLength(1);

    const p1 = result[0];
    expect(p1?.playerId).toBe("P1");
    // Share is 10/20 = 0.5, ensuring P2 and P3 were part of denominator
    expect(p1?.metrics.rzCarryShareSeasonToDate).toBe(0.5);

    const totalShare = result.reduce((sum, r) => sum + (r.metrics.rzCarryShareSeasonToDate || 0), 0);
    expect(totalShare).toBeLessThanOrEqual(1.0);
  });

  it("rolling windows handle distinct game count correctly", () => {
    const records = [
      // week 1
      ...Array(8).fill(makeRow({ rusher_player_id: "P1", week: "1" })),
      ...Array(12).fill(makeRow({ rusher_player_id: "P2", week: "1" })),
      // week 2
      ...Array(8).fill(makeRow({ rusher_player_id: "P1", week: "2" })),
      ...Array(12).fill(makeRow({ rusher_player_id: "P2", week: "2" })),
      // week 3
      ...Array(8).fill(makeRow({ rusher_player_id: "P1", week: "3" })),
      ...Array(12).fill(makeRow({ rusher_player_id: "P2", week: "3" })),
      // week 4
      ...Array(8).fill(makeRow({ rusher_player_id: "P1", week: "4" })),
      ...Array(12).fill(makeRow({ rusher_player_id: "P2", week: "4" })),
      // week 5
      ...Array(8).fill(makeRow({ rusher_player_id: "P1", week: "5" })),
      ...Array(12).fill(makeRow({ rusher_player_id: "P2", week: "5" })),
      // week 6
      ...Array(8).fill(makeRow({ rusher_player_id: "P1", week: "6" })),
      ...Array(12).fill(makeRow({ rusher_player_id: "P2", week: "6" })),
    ];

    const result = computeRzCarryShare(records, 7); // target week 7
    const p1 = result.find(r => r.playerId === "P1");

    // Season to date: 48 / 120 = 0.4
    expect(p1?.metrics.rzCarryShareSeasonToDate).toBe(0.4);

    // Last 4 games: weeks 3,4,5,6 -> 32 / 80 = 0.4
    expect(p1?.metrics.rzCarryShareLast4Games).toBe(0.4);

    // Last 8 games (all 6 games here): 48 / 120 = 0.4
    expect(p1?.metrics.rzCarryShareLast8Games).toBe(0.4);
  });
});
