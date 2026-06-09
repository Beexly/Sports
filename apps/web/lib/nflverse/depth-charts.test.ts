import { describe, expect, it } from "vitest";
import { buildDepthCharts } from "./depth-charts";

type Row = Record<string, string>;

/**
 * buildDepthCharts must read BOTH the legacy (≤2024) and the 2025+ ESPN schema.
 *
 * Legacy carries an explicit `depth_team` order (1 = starter) and a `week`, so we
 * scope to the latest REG week. The 2025+ ESPN schema instead carries `pos_slot`
 * + `pos_rank`, where (per the nflverse `dictionary_depth_charts`) pos_rank is the
 * player's rank WITHIN a pos_slot — so a single position (e.g. guard) that spans
 * two slots (LG, RG) yields TWO players who each carry pos_rank===1. Treating any
 * pos_rank===1 as "the starter" is wrong; only one player per team+position may be
 * the starter (depthOrder 1). The third test locks exactly that.
 */

describe("buildDepthCharts — legacy (≤2024) schema", () => {
  it("uses depth_team as the order and scopes to the latest REG week", () => {
    const records: Row[] = [
      // older week — must be dropped by week-scoping
      { full_name: "Old Starter", club_code: "TMA", position: "QB", depth_team: "1", week: "1", game_type: "REG", gsis_id: "00-OLD" },
      // latest REG week
      { full_name: "QB One", club_code: "TMA", position: "QB", depth_team: "1", week: "5", game_type: "REG", gsis_id: "00-QB1" },
      { full_name: "QB Two", club_code: "TMA", position: "QB", depth_team: "2", week: "5", game_type: "REG", gsis_id: "00-QB2" },
      // postseason row — must be dropped (REG only)
      { full_name: "Playoff Guy", club_code: "TMA", position: "QB", depth_team: "1", week: "20", game_type: "POST", gsis_id: "00-PO" },
    ];

    const { rows, week } = buildDepthCharts(records);

    expect(week).toBe(5);
    expect(rows.map((r) => r.playerName).sort()).toEqual(["QB One", "QB Two"]);
    const starters = rows.filter((r) => r.depthOrder === 1);
    expect(starters).toHaveLength(1);
    expect(starters[0]!.playerName).toBe("QB One");
    expect(starters[0]!.week).toBe(5);
  });
});

describe("buildDepthCharts — 2025+ ESPN schema", () => {
  it("ranks a single-slot position by pos_rank with no week column (snapshot)", () => {
    const records: Row[] = [
      { player_name: "Starter QB", team: "TMA", pos_abb: "QB", pos_slot: "1", pos_rank: "1", espn_id: "E-QB1" },
      { player_name: "Backup QB", team: "TMA", pos_abb: "QB", pos_slot: "1", pos_rank: "2", espn_id: "E-QB2" },
    ];

    const { rows, week } = buildDepthCharts(records);

    // No season/week/game_type column in the ESPN schema → point-in-time snapshot.
    expect(week).toBeNull();
    for (const r of rows) expect(r.week).toBeNull();

    const byName = new Map(rows.map((r) => [r.playerName, r] as const));
    expect(byName.get("Starter QB")!.depthOrder).toBe(1);
    expect(byName.get("Backup QB")!.depthOrder).toBe(2);
    expect(byName.get("Starter QB")!.position).toBe("QB");
    expect(byName.get("Starter QB")!.team).toBe("TMA");
    expect(byName.get("Starter QB")!.playerId).toBe("E-QB1");
  });

  it("derives a single starter when multiple players at one position carry pos_rank===1", () => {
    // Guard spans two slots (LG=slot 1, RG=slot 2). Each slot's top man is
    // pos_rank===1, so the raw data has TWO pos_rank===1 guards. Only the
    // most-prominent (lowest pos_slot) may end up the starter (depthOrder 1).
    const records: Row[] = [
      { player_name: "RG Starter", team: "TMA", pos_abb: "G", pos_slot: "2", pos_rank: "1", espn_id: "E-RG1" },
      { player_name: "RG Backup", team: "TMA", pos_abb: "G", pos_slot: "2", pos_rank: "2", espn_id: "E-RG2" },
      { player_name: "LG Starter", team: "TMA", pos_abb: "G", pos_slot: "1", pos_rank: "1", espn_id: "E-LG1" },
      { player_name: "LG Backup", team: "TMA", pos_abb: "G", pos_slot: "1", pos_rank: "2", espn_id: "E-LG2" },
    ];

    const { rows } = buildDepthCharts(records);

    const guards = rows.filter((r) => r.team === "TMA" && r.position === "G");
    // Exactly one starter despite two raw pos_rank===1 rows — the bug this fixes.
    const starters = guards.filter((r) => r.depthOrder === 1);
    expect(starters).toHaveLength(1);
    expect(starters[0]!.playerName).toBe("LG Starter");

    // Dense 1-based order across the position group, ordered by (pos_slot, pos_rank).
    const order = new Map(guards.map((r) => [r.playerName, r.depthOrder] as const));
    expect(order.get("LG Starter")).toBe(1);
    expect(order.get("LG Backup")).toBe(2);
    expect(order.get("RG Starter")).toBe(3);
    expect(order.get("RG Backup")).toBe(4);
    // No row is invented and none are dropped.
    expect(guards).toHaveLength(4);
  });

  it("keeps team+position groups independent when re-ranking", () => {
    const records: Row[] = [
      { player_name: "TMA G1", team: "TMA", pos_abb: "G", pos_slot: "1", pos_rank: "1", espn_id: "A1" },
      { player_name: "TMB G1", team: "TMB", pos_abb: "G", pos_slot: "1", pos_rank: "1", espn_id: "B1" },
      { player_name: "TMA T1", team: "TMA", pos_abb: "T", pos_slot: "1", pos_rank: "1", espn_id: "A2" },
    ];

    const { rows } = buildDepthCharts(records);

    // Each distinct team+position has its own starter.
    expect(rows.filter((r) => r.depthOrder === 1)).toHaveLength(3);
  });
});

describe("buildDepthCharts — integrity", () => {
  it("drops rows missing a name, team, position, or any order signal (never invents a role)", () => {
    const records: Row[] = [
      { player_name: "", team: "TMA", pos_abb: "QB", pos_slot: "1", pos_rank: "1" }, // no name
      { player_name: "No Team", team: "", pos_abb: "QB", pos_slot: "1", pos_rank: "1" }, // no team
      { player_name: "No Pos", team: "TMA", pos_abb: "", pos_slot: "1", pos_rank: "1" }, // no position
      { player_name: "No Order", team: "TMA", pos_abb: "QB" }, // no depth_team / pos_rank / pos_slot
      { player_name: "Keep Me", team: "TMA", pos_abb: "QB", pos_slot: "1", pos_rank: "1" }, // valid
    ];

    const { rows } = buildDepthCharts(records);

    expect(rows).toHaveLength(1);
    expect(rows[0]!.playerName).toBe("Keep Me");
  });
});
