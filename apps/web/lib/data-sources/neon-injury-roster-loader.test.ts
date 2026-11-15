/**
 * Unit tests for the live Neon injury/roster loader (gate T-07).
 *
 * The critical law under test: per-game rates divide by the INDIVIDUAL
 * player's games played (player_gp), NEVER by team games played.
 */
import { describe, it, expect } from "vitest";
import {
  playerGamesPlayed,
  perGameRate,
  verifyActiveRoster,
  type InjuryReportRow,
  type SnapCountRow,
  type PlayerGameStatRow,
  type DepthChartRow,
} from "./neon-injury-roster-loader";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function injury(over: Partial<InjuryReportRow> = {}): InjuryReportRow {
  return {
    playerId: "p1",
    gsisId: "00-0000001",
    playerName: "Test Player",
    season: 2026,
    week: 10,
    team: "DET",
    position: "WR",
    reportStatus: "Questionable",
    practiceStatus: "Limited Participation",
    primaryInjury: "Ankle",
    ...over,
  };
}

function snap(week: number, over: Partial<SnapCountRow> = {}): SnapCountRow {
  return {
    playerId: "p1",
    playerName: "Test Player",
    season: 2026,
    week,
    team: "DET",
    offenseSnaps: 40,
    defenseSnaps: 0,
    stSnaps: 0,
    ...over,
  };
}

function stat(week: number, over: Partial<PlayerGameStatRow> = {}): PlayerGameStatRow {
  return {
    playerId: "p1",
    season: 2026,
    week,
    team: "DET",
    attempts: 0,
    carries: 0,
    receptions: 4,
    targets: 10,
    receivingYards: 60,
    rushingYards: 0,
    ...over,
  };
}

function depth(week: number, rank: number, over: Partial<DepthChartRow> = {}): DepthChartRow {
  return {
    playerId: "p1",
    gsisId: "00-0000001",
    playerName: "Test Player",
    season: 2026,
    week,
    team: "DET",
    position: "WR",
    depthRank: rank,
    ...over,
  };
}

// ---------------------------------------------------------------------------
// Denominator law
// ---------------------------------------------------------------------------

describe("playerGamesPlayed (player_gp)", () => {
  it("counts distinct weeks of the player's own game evidence", () => {
    expect(playerGamesPlayed([1, 2, 3, 4, 5, 6], [])).toBe(6);
  });

  it("deduplicates repeated rows inside one week", () => {
    expect(playerGamesPlayed([3, 3, 3], [3])).toBe(1);
  });

  it("unions snap weeks and box-score weeks", () => {
    expect(playerGamesPlayed([1, 2], [2, 3])).toBe(3);
  });

  it("is zero with no evidence", () => {
    expect(playerGamesPlayed([], [])).toBe(0);
  });
});

describe("perGameRate — PLAYER_gp denominator, never team GP", () => {
  it("divides by the player's games played", () => {
    // 60 targets across the player's OWN 6 games = 10.0 per game.
    expect(perGameRate(60, 6)).toBe(10);
  });

  it("does NOT divide by team games played (6 vs team's 9)", () => {
    const rate = perGameRate(60, 6);
    expect(rate).toBe(10);
    expect(rate).not.toBeCloseTo(60 / 9, 6); // team-GP answer would be 6.667
  });

  it("returns null when the player has zero games — no team-GP fallback", () => {
    expect(perGameRate(60, 0)).toBeNull();
    expect(perGameRate(60, -1)).toBeNull();
    expect(perGameRate(60, NaN)).toBeNull();
  });

  it("returns null for a missing numerator — never fabricates", () => {
    expect(perGameRate(null, 6)).toBeNull();
    expect(perGameRate(undefined, 6)).toBeNull();
  });
});

describe("verifyActiveRoster — end-to-end denominator rule", () => {
  it("targetsPerGame uses player_gp=6 even when the team played 9", () => {
    const rows = verifyActiveRoster({
      injuries: [injury()],
      snaps: [1, 2, 3, 4, 5, 6].map((w) => snap(w)),
      stats: [1, 2, 3, 4, 5, 6].map((w) => stat(w)), // 10 targets each = 60 total
      depth: [depth(9, 1)],
      teamGames: { DET: 9 },
    });
    expect(rows).toHaveLength(1);
    const r = rows[0]!;
    expect(r.playerGamesPlayed).toBe(6);
    expect(r.teamGamesPlayed).toBe(9); // context only
    expect(r.targetsPerGame).toBe(10); // 60 / 6 — NOT 60 / 9
    expect(r.receptionsPerGame).toBe(4); // 24 / 6
    expect(r.receivingYardsPerGame).toBe(60); // 360 / 6
    expect(r.offenseSnapsPerGame).toBe(40); // 240 / 6
    expect(r.rosterStatus).toBe("ACTIVE_VERIFIED");
  });

  it("a player with no game evidence gets null rates, not team-GP rates", () => {
    const rows = verifyActiveRoster({
      injuries: [injury()],
      snaps: [],
      stats: [],
      depth: [],
      teamGames: { DET: 9 },
    });
    const r = rows[0]!;
    expect(r.playerGamesPlayed).toBe(0);
    expect(r.targetsPerGame).toBeNull();
    expect(r.offenseSnapsPerGame).toBeNull();
    expect(r.receivingYardsPerGame).toBeNull();
    expect(r.rosterStatus).toBe("REPORT_ONLY");
  });

  it("zero-snap weeks do not count as game evidence", () => {
    const rows = verifyActiveRoster({
      injuries: [injury()],
      snaps: [snap(1, { offenseSnaps: 0, defenseSnaps: 0, stSnaps: 0 }), snap(2)],
      stats: [],
      depth: [depth(9, 2)],
      teamGames: { DET: 9 },
    });
    const r = rows[0]!;
    expect(r.playerGamesPlayed).toBe(1); // only week 2
    expect(r.offenseSnapsPerGame).toBe(40); // 40 / 1
    expect(r.rosterStatus).toBe("ACTIVE_VERIFIED");
  });

  it("box-score-only weeks still count toward player_gp", () => {
    const rows = verifyActiveRoster({
      injuries: [injury()],
      snaps: [snap(1)],
      stats: [stat(2), stat(3)],
      depth: [],
      teamGames: { DET: 9 },
    });
    const r = rows[0]!;
    expect(r.playerGamesPlayed).toBe(3);
    expect(r.targetsPerGame).toBeCloseTo(20 / 3, 9); // 20 targets / 3 games
  });

  it("depth-only players are DEPTH_ONLY with null rates", () => {
    const rows = verifyActiveRoster({
      injuries: [injury()],
      snaps: [],
      stats: [],
      depth: [depth(9, 1)],
      teamGames: { DET: 9 },
    });
    const r = rows[0]!;
    expect(r.rosterStatus).toBe("DEPTH_ONLY");
    expect(r.depthRank).toBe(1);
    expect(r.targetsPerGame).toBeNull();
  });

  it("picks the latest depth week and best rank", () => {
    const rows = verifyActiveRoster({
      injuries: [injury()],
      snaps: [snap(1)],
      stats: [],
      depth: [depth(7, 3), depth(9, 2), depth(9, 1)],
      teamGames: {},
    });
    const r = rows[0]!;
    expect(r.depthWeek).toBe(9);
    expect(r.depthRank).toBe(1);
  });

  it("flags Out / Injured Reserve as availability concerns", () => {
    const rows = verifyActiveRoster({
      injuries: [
        injury({ playerName: "Out Guy", reportStatus: "Out" }),
        injury({ playerId: "p2", gsisId: "00-0000002", playerName: "IR Guy", reportStatus: "Injured Reserve" }),
        injury({ playerId: "p3", gsisId: "00-0000003", playerName: "Fine Guy", reportStatus: "Full Participation" }),
      ],
      snaps: [],
      stats: [],
      depth: [],
    });
    expect(rows[0]!.availabilityConcern).toBe(true);
    expect(rows[1]!.availabilityConcern).toBe(true);
    expect(rows[2]!.availabilityConcern).toBe(false);
  });

  it("resolves identity via gsisId crosswalk when injuries.playerId is null", () => {
    const rows = verifyActiveRoster({
      injuries: [injury({ playerId: null, gsisId: "00-0000001" })],
      snaps: [snap(1), snap(2)],
      stats: [stat(1), stat(2)],
      depth: [depth(9, 1)],
      players: [{ id: "p1", gsisId: "00-0000001", fullName: "Test Player" }],
      teamGames: { DET: 9 },
    });
    const r = rows[0]!;
    expect(r.playerId).toBe("p1");
    expect(r.playerGamesPlayed).toBe(2);
    expect(r.targetsPerGame).toBe(10); // 20 / 2
    expect(r.rosterStatus).toBe("ACTIVE_VERIFIED");
  });

  it("falls back to (team, name) matching for snaps without a crosswalk hit", () => {
    const rows = verifyActiveRoster({
      injuries: [injury({ playerId: null, gsisId: null })],
      snaps: [snap(1, { playerId: null }), snap(2, { playerId: null })],
      stats: [],
      depth: [],
      teamGames: { DET: 9 },
    });
    const r = rows[0]!;
    expect(r.playerGamesPlayed).toBe(2);
    expect(r.offenseSnapsPerGame).toBe(40); // 80 / 2, not 80 / 9
  });

  it("covers a full 32-team / 800-row report shape", () => {
    const teams = Array.from({ length: 32 }, (_, i) => `T${String(i).padStart(2, "0")}`);
    const injuries: InjuryReportRow[] = [];
    const snaps: SnapCountRow[] = [];
    for (const team of teams) {
      for (let i = 0; i < 25; i++) {
        const pid = `${team}-p${i}`;
        injuries.push(injury({ playerId: pid, gsisId: null, team, playerName: `Player ${pid}` }));
        snaps.push(snap(1, { playerId: pid, team, playerName: `Player ${pid}` }));
      }
    }
    const rows = verifyActiveRoster({ injuries, snaps, stats: [], depth: [] });
    expect(rows).toHaveLength(800);
    expect(new Set(rows.map((r) => r.team)).size).toBe(32);
    // Every rate still divides by the player's own 1 game, never a team count.
    for (const r of rows) {
      expect(r.playerGamesPlayed).toBe(1);
      expect(r.offenseSnapsPerGame).toBe(40);
    }
  });
});