import { gzipSync } from "node:zlib";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchNflverseTableCached,
  nflverseTableCacheStats,
  resetNflverseTableCacheForTests,
  NflverseArtifactTooLargeError,
  NFLVERSE_MAX_RAW_BYTES,
} from "./nflverse-cache.js";
import { NFLVERSE_BASE } from "./nflverse-source.js";

const PLAYERS_URL = `${NFLVERSE_BASE}/players/players.csv`;
const PLAYER_STATS_URL = `${NFLVERSE_BASE}/player_stats/player_stats.csv.gz`;
const PER_SEASON_URL = (season: number) => `${NFLVERSE_BASE}/stats_player/stats_player_week_${season}.csv`;

const PLAYERS_CSV = [
  "gsis_id,full_name,birth_date,unrelated_column",
  "00-A,Aaron Rodgers,1983-12-02,DROP-ME",
  "00-B,Jaylen Warren,1998-11-01,DROP-ME",
].join("\n");

const COMBINED_PLAYER_STATS_CSV = [
  "player_id,player_name,player_display_name,position,recent_team,opponent_team,season,week,season_type,attempts,carries,targets,receptions,rushing_yards,receiving_yards,receiving_air_yards,target_share,air_yards_share,wopr,fantasy_points_ppr,headshot_url",
  "00-A,,Aaron Rodgers,QB,PIT,CIN,2023,1,REG,30,0,0,0,0,0,0,,,0,20.0,",
].join("\n");

const PER_SEASON_2025_CSV = [
  "player_id,player_name,player_display_name,position,recent_team,opponent_team,season,week,season_type,attempts,carries,targets,receptions,rushing_yards,receiving_yards,receiving_air_yards,target_share,air_yards_share,wopr,fantasy_points_ppr,headshot_url",
  "00-B,,Jaylen Warren,RB,PIT,CIN,2025,18,REG,0,18,8,6,88,42,15,0.25,0.04,0.21,18.0,",
].join("\n");

function csvResponse(csv: string, status = 200): Response {
  return new Response(csv, { status, headers: { "content-length": String(Buffer.byteLength(csv)) } });
}

function gzResponse(csv: string): Response {
  const body = gzipSync(Buffer.from(csv));
  return new Response(body, { status: 200, headers: { "content-length": String(body.length) } });
}

describe("nflverseTableCache", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    resetNflverseTableCacheForTests();
  });

  it("(a) single-flight: two concurrent requests for the same asset join one underlying fetch", async () => {
    const fetcher = vi.fn(async (url: string) => {
      if (url === PLAYERS_URL) return csvResponse(PLAYERS_CSV);
      return new Response("missing", { status: 404 });
    });
    vi.stubGlobal("fetch", fetcher);

    const [a, b] = await Promise.all([
      fetchNflverseTableCached({ key: "players", season: 0 }),
      fetchNflverseTableCached({ key: "players", season: 0 }),
    ]);

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(a.table.records).toEqual(b.table.records);
    const stats = nflverseTableCacheStats();
    expect(stats.misses).toBe(1);
    expect(stats.coalesced).toBe(1);
  });

  it("(b) TTL: serves from cache within TTL, refetches after expiry", async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn(async (url: string) => {
      if (url === PLAYERS_URL) return csvResponse(PLAYERS_CSV);
      return new Response("missing", { status: 404 });
    });
    vi.stubGlobal("fetch", fetcher);

    const first = await fetchNflverseTableCached({ key: "players", season: 0 });
    expect(first.fromCache).toBe(false);
    expect(fetcher).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(5 * 60_000); // within the 6h `players` TTL
    const second = await fetchNflverseTableCached({ key: "players", season: 0 });
    expect(second.fromCache).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(nflverseTableCacheStats().hits).toBe(1);

    vi.advanceTimersByTime(7 * 3_600_000); // past the 6h TTL
    const third = await fetchNflverseTableCached({ key: "players", season: 0 });
    expect(third.fromCache).toBe(false);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("(c) a failure is never cached: coalesced waiters reject, next call refetches, success after that is cached", async () => {
    let call = 0;
    const fetcher = vi.fn(async () => {
      call += 1;
      if (call <= 2) return new Response("down", { status: 500 }); // primary + mirror both fail
      return csvResponse(PLAYERS_CSV);
    });
    vi.stubGlobal("fetch", fetcher);

    await expect(
      Promise.all([
        fetchNflverseTableCached({ key: "players", season: 0 }),
        fetchNflverseTableCached({ key: "players", season: 0 }),
      ]),
    ).rejects.toThrow();
    expect(nflverseTableCacheStats().entries).toBe(0);
    expect(nflverseTableCacheStats().failures).toBe(1);

    const recovered = await fetchNflverseTableCached({ key: "players", season: 0 });
    expect(recovered.table.records).toHaveLength(2);
    expect(nflverseTableCacheStats().entries).toBe(1);
  });

  it("(d) projection: a registered key drops unregistered columns; an unregistered key keeps full records", async () => {
    const fetcher = vi.fn(async (url: string) => {
      if (url === PLAYERS_URL) return csvResponse(PLAYERS_CSV);
      if (url === `${NFLVERSE_BASE}/officials/officials.csv`) {
        return csvResponse("game_id,referee,extra\n2024_01_KC_BAL,J. Smith,keep-me");
      }
      return new Response("missing", { status: 404 });
    });
    vi.stubGlobal("fetch", fetcher);

    const projected = await fetchNflverseTableCached({ key: "players", season: 0 });
    expect(projected.table.records).toHaveLength(2);
    expect(Object.keys(projected.table.records[0]!).sort()).toEqual(["birth_date", "gsis_id"]);
    expect("unrelated_column" in projected.table.records[0]!).toBe(false);

    const unregistered = await fetchNflverseTableCached({ key: "officials", season: 0 });
    expect(unregistered.table.records).toHaveLength(1);
    expect(unregistered.table.records[0]).toEqual({
      game_id: "2024_01_KC_BAL",
      referee: "J. Smith",
      extra: "keep-me",
    });
  });

  it("(e) size caps: an oversized declared body throws NflverseArtifactTooLargeError and caches nothing", async () => {
    const fetcher = vi.fn(async (url: string) => {
      if (url === PLAYERS_URL) {
        return new Response(PLAYERS_CSV, {
          status: 200,
          headers: { "content-length": String(NFLVERSE_MAX_RAW_BYTES + 1) },
        });
      }
      return new Response("missing", { status: 404 });
    });
    vi.stubGlobal("fetch", fetcher);

    await expect(fetchNflverseTableCached({ key: "players", season: 0 })).rejects.toThrow(
      NflverseArtifactTooLargeError,
    );
    expect(nflverseTableCacheStats().entries).toBe(0);
  });

  it("(f) failover: primary 500s, mirror serves; servedFrom reflects the mirror, url stays primary, every request is no-store", async () => {
    const receivedInits: RequestInit[] = [];
    const fetcher = vi.fn(async (url: string, init?: RequestInit) => {
      if (init) receivedInits.push(init);
      if (url === PLAYERS_URL) return new Response("down", { status: 500 });
      if (url.includes("ghproxy.net")) return csvResponse(PLAYERS_CSV);
      return new Response("missing", { status: 404 });
    });
    vi.stubGlobal("fetch", fetcher);

    const result = await fetchNflverseTableCached({ key: "players", season: 0 });
    expect(result.url).toBe(PLAYERS_URL);
    expect(result.servedFrom).toContain("ghproxy.net");
    expect(receivedInits.length).toBeGreaterThan(0);
    for (const init of receivedInits) expect(init.cache).toBe("no-store");
  });

  it("(g) merge-through-cache: a lagging combined asset merges the per-season file, all inside one flight", async () => {
    const fetcher = vi.fn(async (url: string) => {
      if (url === PLAYER_STATS_URL) return gzResponse(COMBINED_PLAYER_STATS_CSV);
      if (url === PER_SEASON_URL(2025)) return csvResponse(PER_SEASON_2025_CSV);
      return new Response("missing", { status: 404 });
    });
    vi.stubGlobal("fetch", fetcher);

    const [a, b, c] = await Promise.all([
      fetchNflverseTableCached({ key: "player_stats_week", season: 2025 }),
      fetchNflverseTableCached({ key: "player_stats_week", season: 2025 }),
      fetchNflverseTableCached({ key: "player_stats_week", season: 2025 }),
    ]);

    const combinedCalls = fetcher.mock.calls.filter(([url]) => url === PLAYER_STATS_URL).length;
    const perSeasonCalls = fetcher.mock.calls.filter(([url]) => url === PER_SEASON_URL(2025)).length;
    expect(combinedCalls).toBe(1);
    expect(perSeasonCalls).toBe(1);
    expect(a.table.records.some((r) => r["season"] === "2025")).toBe(true);
    expect(a.table.records).toEqual(b.table.records);
    expect(b.table.records).toEqual(c.table.records);

    resetNflverseTableCacheForTests();
    const missingPerSeason = vi.fn(async (url: string) => {
      if (url === PLAYER_STATS_URL) return gzResponse(COMBINED_PLAYER_STATS_CSV);
      return new Response("missing", { status: 404 });
    });
    vi.stubGlobal("fetch", missingPerSeason);
    const result = await fetchNflverseTableCached({ key: "player_stats_week", season: 2025 });
    expect(result.table.records).toHaveLength(1); // combined asset rows preserved, no throw
    expect(result.table.records.some((r) => r["season"] === "2025")).toBe(false);
  });

  it("(h) bypass: an explicitly injected non-global fetcher never touches the module cache", async () => {
    const fetcher = vi.fn(async (url: string) => {
      if (url === PLAYERS_URL) return csvResponse(PLAYERS_CSV);
      return new Response("missing", { status: 404 });
    });

    await fetchNflverseTableCached({ key: "players", season: 0, fetcher });
    await fetchNflverseTableCached({ key: "players", season: 0, fetcher });

    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(nflverseTableCacheStats().entries).toBe(0);
    expect(nflverseTableCacheStats().misses).toBe(0);
  });
});
