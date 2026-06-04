import { describe, it, expect } from "vitest";
import {
  SLEEPER_URLS, normalizeUser, normalizeLeague, resolvePlayer, normalizeRoster, rosterForUser,
  type SleeperPlayersMap, type SleeperRoster,
} from "./sleeper";

const PLAYERS: SleeperPlayersMap = {
  "100": { player_id: "100", full_name: "Silas Hart", position: "QB", team: "PHI", injury_status: null },
  "200": { player_id: "200", first_name: "Marcus", last_name: "Vale", position: "RB", team: "ATL", injury_status: "Questionable" },
  "300": { player_id: "300", full_name: "Julian Roe", position: "WR", team: "MIA" },
};

describe("sleeper connector (read-only)", () => {
  it("builds read-only GET endpoints", () => {
    expect(SLEEPER_URLS.user("nova")).toContain("/user/nova");
    expect(SLEEPER_URLS.leagues("u1", "2025")).toContain("/user/u1/leagues/nfl/2025");
    expect(SLEEPER_URLS.rosters("L1")).toContain("/league/L1/rosters");
    expect(SLEEPER_URLS.players()).toMatch(/\/players\/nfl$/);
  });

  it("normalizes a user and a league (dropping bench slots)", () => {
    expect(normalizeUser({ user_id: "u1", display_name: "Nova" })).toEqual({ id: "u1", username: "Nova" });
    const l = normalizeLeague({ league_id: "L1", name: "Dynasty", season: "2025", total_rosters: 12, roster_positions: ["QB", "RB", "BN", "BN"], status: "in_season" });
    expect(l.size).toBe(12);
    expect(l.rosterPositions).toEqual(["QB", "RB"]); // BN filtered out
  });

  it("resolves player ids, including a full_name vs first/last and an injury tag", () => {
    expect(resolvePlayer("100", PLAYERS, true).name).toBe("Silas Hart");
    const vale = resolvePlayer("200", PLAYERS, false);
    expect(vale.name).toBe("Marcus Vale");
    expect(vale.injury).toBe("Questionable");
  });

  it("treats a team-code id as a DST", () => {
    const dst = resolvePlayer("DEN", PLAYERS, true);
    expect(dst.pos).toBe("DEF");
    expect(dst.name).toBe("DEN DST");
  });

  it("normalizes a roster into starters/bench with a record and points", () => {
    const raw: SleeperRoster = {
      roster_id: 3, owner_id: "u1",
      players: ["100", "200", "300", "DEN"],
      starters: ["100", "300", "DEN"],
      settings: { wins: 7, losses: 2, ties: 1, fpts: 1234, fpts_decimal: 56 },
    };
    const t = normalizeRoster(raw, PLAYERS);
    expect(t.record).toBe("7-2-1");
    expect(t.points).toBeCloseTo(1234.56, 1);
    expect(t.starters.map((p) => p.id)).toEqual(["100", "300", "DEN"]);
    expect(t.bench.map((p) => p.id)).toEqual(["200"]);
    expect(t.all).toHaveLength(4);
  });

  it("ignores empty starter slots ('0')", () => {
    const t = normalizeRoster({ roster_id: 1, owner_id: "u1", players: ["100"], starters: ["100", "0", "0"], settings: { wins: 0, losses: 0 } }, PLAYERS);
    expect(t.starters).toHaveLength(1);
    expect(t.record).toBe("0-0");
  });

  it("finds the roster owned by a user", () => {
    const rosters: SleeperRoster[] = [
      { roster_id: 1, owner_id: "other", players: [], starters: [] },
      { roster_id: 2, owner_id: "u1", players: ["100"], starters: ["100"] },
    ];
    expect(rosterForUser(rosters, "u1")?.roster_id).toBe(2);
    expect(rosterForUser(rosters, "nope")).toBeNull();
  });
});
