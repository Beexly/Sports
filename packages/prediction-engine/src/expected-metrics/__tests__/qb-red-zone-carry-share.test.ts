import { describe, it, expect } from "vitest";
import { computeQbRedZoneCarryShare } from "../qb-red-zone-carry-share.js";
import type { PbpRow } from "../nflverse-pbp-mapper.js";

describe("computeQbRedZoneCarryShare", () => {
  it("calculates shares exactly, respects point-in-time, and applies 8/20 floors", () => {
    const rows: PbpRow[] = [
      // Week 1: QB1 passes, becoming a recognized QB for TEAM1
      { week: "1", play_type: "pass", posteam: "TEAM1", passer_player_id: "QB1" },
      // Week 1: TEAM1 RZ carries (3 total, 1 by QB1)
      { week: "1", play_type: "run", posteam: "TEAM1", rusher_player_id: "QB1", yardline_100: "20" },
      { week: "1", play_type: "run", posteam: "TEAM1", rusher_player_id: "RB1", yardline_100: "15" },
      { week: "1", play_type: "run", posteam: "TEAM1", rusher_player_id: "RB2", yardline_100: "2" },

      // Week 2: TEAM1 RZ carries (7 total, 3 by QB1)
      { week: "2", play_type: "run", posteam: "TEAM1", rusher_player_id: "QB1", yardline_100: "1" },
      { week: "2", play_type: "run", posteam: "TEAM1", rusher_player_id: "QB1", yardline_100: "5" },
      { week: "2", play_type: "run", posteam: "TEAM1", rusher_player_id: "QB1", yardline_100: "10" },
      { week: "2", play_type: "run", posteam: "TEAM1", rusher_player_id: "RB1", yardline_100: "10" },
      { week: "2", play_type: "run", posteam: "TEAM1", rusher_player_id: "RB1", yardline_100: "10" },
      { week: "2", play_type: "run", posteam: "TEAM1", rusher_player_id: "RB2", yardline_100: "10" },
      { week: "2", play_type: "run", posteam: "TEAM1", rusher_player_id: "RB2", yardline_100: "10" },

      // Week 3: TEAM1 RZ carries (10 total, 5 by QB1) - team reaches 20 total, QB reaches 9 total
      { week: "3", play_type: "run", posteam: "TEAM1", rusher_player_id: "QB1", yardline_100: "19" },
      { week: "3", play_type: "run", posteam: "TEAM1", rusher_player_id: "QB1", yardline_100: "19" },
      { week: "3", play_type: "run", posteam: "TEAM1", rusher_player_id: "QB1", yardline_100: "19" },
      { week: "3", play_type: "run", posteam: "TEAM1", rusher_player_id: "QB1", yardline_100: "19" },
      { week: "3", play_type: "run", posteam: "TEAM1", rusher_player_id: "QB1", yardline_100: "19" },
      { week: "3", play_type: "run", posteam: "TEAM1", rusher_player_id: "RB1", yardline_100: "19" },
      { week: "3", play_type: "run", posteam: "TEAM1", rusher_player_id: "RB1", yardline_100: "19" },
      { week: "3", play_type: "run", posteam: "TEAM1", rusher_player_id: "RB1", yardline_100: "19" },
      { week: "3", play_type: "run", posteam: "TEAM1", rusher_player_id: "RB1", yardline_100: "19" },
      { week: "3", play_type: "run", posteam: "TEAM1", rusher_player_id: "RB1", yardline_100: "19" },

      // Week 4 (Target week): this should be excluded
      { week: "4", play_type: "run", posteam: "TEAM1", rusher_player_id: "QB1", yardline_100: "1" }
    ];

    // Evaluate at targetWeek = 4 (includes weeks 1, 2, 3)
    const result = computeQbRedZoneCarryShare(rows, 4);

    expect(result.shares.length).toBeGreaterThan(0);
    const qb1S2D = result.shares.find(s => s.playerId === "QB1" && s.window === "season-to-date");
    expect(qb1S2D).toBeDefined();

    // Team total RZ carries: 3 (W1) + 7 (W2) + 10 (W3) = 20
    // QB1 total RZ carries: 1 (W1) + 3 (W2) + 5 (W3) = 9
    // Since 9 >= 8 and 20 >= 20, share is not null
    expect(qb1S2D!.qbCarries).toBe(9);
    expect(qb1S2D!.teamCarries).toBe(20);
    expect(qb1S2D!.share).toBe(0.4500); // 9 / 20 = 0.45

    // Evaluate at targetWeek = 3 (includes weeks 1, 2)
    const resultW3 = computeQbRedZoneCarryShare(rows, 3);
    const qb1W3 = resultW3.shares.find(s => s.playerId === "QB1" && s.window === "season-to-date");
    // Team total RZ carries: 3 (W1) + 7 (W2) = 10 (< 20 floor)
    // QB1 total RZ carries: 1 (W1) + 3 (W2) = 4 (< 8 floor)
    expect(qb1W3!.qbCarries).toBe(4);
    expect(qb1W3!.teamCarries).toBe(10);
    expect(qb1W3!.share).toBeNull();
  });

  it("excludes non-QBs and identifies QBs correctly", () => {
    const rows: PbpRow[] = [
      // QB1 passes for TEAM1 -> QB1 is QB for TEAM1
      { week: "1", play_type: "pass", posteam: "TEAM1", passer_player_id: "QB1" },
      // RB1 passes for TEAM2 -> RB1 is QB for TEAM2, but NOT for TEAM1
      { week: "1", play_type: "pass", posteam: "TEAM2", passer_player_id: "RB1" },

      // TEAM1 carries
      { week: "1", play_type: "run", posteam: "TEAM1", rusher_player_id: "QB1", yardline_100: "10" },
      { week: "1", play_type: "run", posteam: "TEAM1", rusher_player_id: "RB1", yardline_100: "10" }, // NOT a QB for TEAM1
      { week: "1", play_type: "run", posteam: "TEAM1", rusher_player_id: "RB2", yardline_100: "10" }, // Never passed
    ];

    const result = computeQbRedZoneCarryShare(rows, 2);

    // Only QB1 should be in the output for TEAM1
    const playerIds = result.shares.map(s => s.playerId);
    expect(playerIds).toContain("QB1");
    expect(playerIds).not.toContain("RB1");
    expect(playerIds).not.toContain("RB2");
  });

  it("excludes play types based on definition pins", () => {
    const rows: PbpRow[] = [
      { week: "1", play_type: "pass", posteam: "TEAM1", passer_player_id: "QB1" },

      // Valid RZ carry
      { week: "1", play_type: "run", posteam: "TEAM1", rusher_player_id: "QB1", yardline_100: "20" },

      // Excluded: outside red zone
      { week: "1", play_type: "run", posteam: "TEAM1", rusher_player_id: "QB1", yardline_100: "21" },

      // Excluded: qb kneel
      { week: "1", play_type: "run", posteam: "TEAM1", rusher_player_id: "QB1", yardline_100: "10", qb_kneel: "1" },

      // Excluded: pass play inside 20
      { week: "1", play_type: "pass", posteam: "TEAM1", rusher_player_id: "QB1", yardline_100: "10" },
    ];

    const result = computeQbRedZoneCarryShare(rows, 2);
    const qb1 = result.shares.find(s => s.playerId === "QB1" && s.window === "season-to-date");

    // Only the single valid carry counts
    expect(qb1!.qbCarries).toBe(1);
    expect(qb1!.teamCarries).toBe(1);
    expect(result.provenance.sampleSize).toBe(1);
  });

  it("distinct week windowing works at bye weeks", () => {
    const rows: PbpRow[] = [
      { week: "1", play_type: "pass", posteam: "TEAM1", passer_player_id: "QB1" },
      // Distinct weeks where team has RZ carries: 1, 2, 4, 6 (bye weeks 3, 5, or no RZ carries)
      { week: "1", play_type: "run", posteam: "TEAM1", rusher_player_id: "QB1", yardline_100: "10" },
      { week: "2", play_type: "run", posteam: "TEAM1", rusher_player_id: "QB1", yardline_100: "10" },
      { week: "4", play_type: "run", posteam: "TEAM1", rusher_player_id: "QB1", yardline_100: "10" },
      { week: "6", play_type: "run", posteam: "TEAM1", rusher_player_id: "QB1", yardline_100: "10" },
      { week: "7", play_type: "run", posteam: "TEAM1", rusher_player_id: "QB1", yardline_100: "10" }, // 5th distinct week
    ];

    const result = computeQbRedZoneCarryShare(rows, 8);
    const qb1Last4 = result.shares.find(s => s.playerId === "QB1" && s.window === "last-4");

    // Total RZ weeks: 1, 2, 4, 6, 7. Last 4 are 7, 6, 4, 2.
    // That means week 1 is excluded from last-4.
    // QB1 carries in last 4 RZ weeks: 4
    expect(qb1Last4!.qbCarries).toBe(4);

    const qb1Last8 = result.shares.find(s => s.playerId === "QB1" && s.window === "last-8");
    // All 5 weeks included
    expect(qb1Last8!.qbCarries).toBe(5);
  });

  it("future pass attempt does not retroactively qualify a rusher as QB", () => {
    const rows: PbpRow[] = [
      // Wildcat player runs in week 1
      { week: "1", play_type: "run", posteam: "TEAM1", rusher_player_id: "WC1", yardline_100: "10" },
      // Target week is 2. WC1 has no pass attempts before week 2.
      // Week 2: WC1 throws a pass (after target week)
      { week: "2", play_type: "pass", posteam: "TEAM1", passer_player_id: "WC1" },
    ];

    const result = computeQbRedZoneCarryShare(rows, 2);
    const playerIds = result.shares.map(s => s.playerId);

    // WC1 should not be considered a QB for targetWeek 2
    expect(playerIds).not.toContain("WC1");
  });
});
