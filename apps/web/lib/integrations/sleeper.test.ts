import { describe, it, expect } from "vitest";
import {
  SLEEPER_URLS, normalizeUser, normalizeLeague, resolvePlayer, normalizeRoster, rosterForUser,
  buildTrending, loadSleeperTrending,
  type SleeperPlayersMap, type SleeperRoster, type SleeperTrendingRaw,
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

// ─────────────────────────────────────────────────────────────────────────────
// Sleeper TRENDING — league-wide waiver momentum (ownership velocity).
// ─────────────────────────────────────────────────────────────────────────────

const TRENDING_PLAYERS: SleeperPlayersMap = {
  "100": { player_id: "100", full_name: "Silas Hart", position: "QB", team: "phi" },
  "200": { player_id: "200", first_name: "Marcus", last_name: "Vale", position: "rb", team: "ATL" },
  "300": { player_id: "300", full_name: "Julian Roe", position: "WR", team: "MIA" },
  // A non-fantasy position (OL) — must be filtered out.
  "400": { player_id: "400", full_name: "Big Tackle", position: "OL", team: "GB" },
  // A defense/special-teams entry — DEF is kept.
  "DEN": { player_id: "DEN", full_name: "Denver Broncos", position: "DEF", team: "DEN" },
};

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
}

describe("sleeper trending (waiver momentum)", () => {
  it("joins ids to names and preserves source order", () => {
    const adds: SleeperTrendingRaw[] = [
      { player_id: "100", count: 5000 },
      { player_id: "300", count: 3000 },
    ];
    const drops: SleeperTrendingRaw[] = [{ player_id: "200", count: 1200 }];
    const { adds: a, drops: d } = buildTrending(adds, drops, TRENDING_PLAYERS);
    expect(a.map((r) => r.name)).toEqual(["Silas Hart", "Julian Roe"]);
    expect(a[0]).toMatchObject({ playerId: "100", position: "QB", team: "PHI", count: 5000 });
    // first/last name join + team upper-casing
    expect(d[0]).toMatchObject({ name: "Marcus Vale", position: "RB", team: "ATL", count: 1200 });
  });

  it("skips ids missing from the map rather than inventing names", () => {
    const adds: SleeperTrendingRaw[] = [
      { player_id: "100", count: 10 },
      { player_id: "999", count: 9 }, // unknown id → dropped, never fabricated
    ];
    const { adds: a } = buildTrending(adds, [], TRENDING_PLAYERS);
    expect(a).toHaveLength(1);
    expect(a[0]!.playerId).toBe("100");
    // nothing in the output references the unknown id
    expect(a.some((r) => r.playerId === "999")).toBe(false);
  });

  it("filters out non-fantasy positions but keeps DEF", () => {
    const adds: SleeperTrendingRaw[] = [
      { player_id: "400", count: 50 }, // OL — dropped
      { player_id: "DEN", count: 40 }, // DEF — kept
    ];
    const { adds: a } = buildTrending(adds, [], TRENDING_PLAYERS);
    expect(a.map((r) => r.playerId)).toEqual(["DEN"]);
    expect(a[0]!.position).toBe("DEF");
  });

  it("returns an honest source-error when the fetcher throws (no fabricated rows)", async () => {
    const fetcher = async (): Promise<Response> => {
      throw new Error("network down");
    };
    const result = await loadSleeperTrending({ fetcher });
    expect(result.status).toBe("source-error");
    expect(result.adds).toEqual([]);
    expect(result.drops).toEqual([]);
    expect(result.error).toMatch(/network down/);
    // attribution is still carried for the empty state
    expect(result.attribution).toMatch(/sleeper/i);
  });

  it("loads live rows from canned JSON responses", async () => {
    const addUrl = "/trending/add";
    const dropUrl = "/trending/drop";
    const fetcher = async (input: string): Promise<Response> => {
      if (input.includes("/trending/add")) return jsonResponse([{ player_id: "100", count: 8000 }, { player_id: "300", count: 4000 }]);
      if (input.includes("/trending/drop")) return jsonResponse([{ player_id: "200", count: 2500 }]);
      if (input.endsWith("/players/nfl")) return jsonResponse(TRENDING_PLAYERS);
      throw new Error(`unexpected url ${input}`);
    };
    void addUrl;
    void dropUrl;
    const result = await loadSleeperTrending({ fetcher, lookbackHours: 24, limit: 25 });
    expect(result.status).toBe("live");
    expect(result.error).toBeNull();
    expect(result.lookbackHours).toBe(24);
    expect(result.adds.map((r) => r.name)).toEqual(["Silas Hart", "Julian Roe"]);
    expect(result.drops.map((r) => r.name)).toEqual(["Marcus Vale"]);
    expect(result.sourceUrl).toMatch(/trending\/add\?lookback_hours=24&limit=25/);
    expect(result.attribution).toMatch(/sleeper/i);
  });
});
