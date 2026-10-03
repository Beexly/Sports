import { gzipSync } from "node:zlib";
import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/api-entitlement", () => ({ requirePremiumApiRateLimited: async () => null }));
import { resetNflverseTableCacheForTests } from "@sports/data-ingestion";
import { loadQbAgeRbTrendReport, resetQbAgeRbTrendCacheForTests } from "@/lib/nflverse/qb-age-rb-trend";
import {
  loadBirthdayUsageTrendReport,
  resetBirthdayUsageTrendCacheForTests,
} from "@/lib/nflverse/birthday-usage-trend";
import { loadNflverseUsagePulse, resetNflverseUsagePulseCacheForTests } from "@/lib/nflverse/usage-pulse";

/**
 * OP-002 proof: this is the exact page shape from `apps/web/app/nflverse/page.tsx`
 * — the three loaders called concurrently via `Promise.all`. Before OP-002 this
 * fired THREE independent full-history combined-asset downloads (the confirmed
 * live OOM). After OP-002 the shared `nflverse-cache.ts` single-flight layer
 * bounds the combined asset (and every other shared artifact) to exactly one
 * underlying fetch across all three loaders.
 */

const SEASON = 2025;

const PLAYER_STATS_URL_FRAGMENT = "player_stats.csv.gz";
const PLAYERS_URL_FRAGMENT = "players.csv";
const SCHEDULES_URL_FRAGMENT = "games.csv";
const ROSTER_URL_FRAGMENT = `roster_${SEASON}.csv`;

const PLAYER_STATS_CSV = [
  "player_id,player_name,player_display_name,position,recent_team,opponent_team,season,week,season_type,attempts,carries,targets,receptions,rushing_yards,receiving_yards,receiving_air_yards,target_share,air_yards_share,wopr,fantasy_points_ppr,headshot_url",
  "00-qb1,,Aaron Rodgers,QB,PIT,CIN,2025,18,REG,32,2,0,0,8,0,0,,,0,1.1,",
  "00-rb1,,Jaylen Warren,RB,PIT,CIN,2025,18,REG,0,18,8,6,88,42,15,0.25,0.04,0.21,18.0,",
  "00-wr1,,George Pickens,WR,PIT,CIN,2025,18,REG,0,0,11,7,0,94,110,0.34,0.41,0.72,23.4,",
].join("\n");

const PLAYERS_CSV = [
  "gsis_id,birth_date",
  "00-qb1,1983-12-02",
  "00-rb1,1998-11-01",
  "00-wr1,2001-03-04",
].join("\n");

const SCHEDULES_CSV = [
  "game_type,season,week,gameday,away_team,home_team,away_qb_id,home_qb_id,away_qb_name,home_qb_name",
  "REG,2025,18,2026-01-04,CIN,PIT,00-cinqb,00-qb1,J. Burrow,A. Rodgers",
].join("\n");

const ROSTERS_CSV = [
  "gsis_id,full_name,birth_date,headshot_url",
  "00-qb1,Aaron Rodgers,1983-12-02,",
  "00-rb1,Jaylen Warren,1998-11-01,",
  "00-wr1,George Pickens,2001-03-04,",
].join("\n");

function gzResponse(csv: string): Response {
  const body = gzipSync(Buffer.from(csv));
  return new Response(body, { status: 200, headers: { "content-length": String(body.length) } });
}

function csvResponse(csv: string): Response {
  return new Response(csv, { status: 200, headers: { "content-length": String(Buffer.byteLength(csv)) } });
}

function makeCountingFetcher(): { fetcher: ReturnType<typeof vi.fn>; countsByFragment: () => Record<string, number> } {
  const calls: string[] = [];
  const fetcher = vi.fn(async (input: string | URL | Request) => {
    const url = String(input);
    calls.push(url);
    if (url.includes(PLAYER_STATS_URL_FRAGMENT)) return gzResponse(PLAYER_STATS_CSV);
    if (url.includes(ROSTER_URL_FRAGMENT)) return csvResponse(ROSTERS_CSV);
    if (url.includes(PLAYERS_URL_FRAGMENT)) return csvResponse(PLAYERS_CSV);
    if (url.includes(SCHEDULES_URL_FRAGMENT)) return csvResponse(SCHEDULES_CSV);
    return new Response("missing", { status: 404 });
  });
  const countsByFragment = () => {
    const fragments = [PLAYER_STATS_URL_FRAGMENT, PLAYERS_URL_FRAGMENT, SCHEDULES_URL_FRAGMENT, ROSTER_URL_FRAGMENT];
    const counts: Record<string, number> = {};
    for (const fragment of fragments) counts[fragment] = calls.filter((url) => url.includes(fragment)).length;
    return counts;
  };
  return { fetcher, countsByFragment };
}

async function loadAllThreeLikeThePage(): Promise<
  readonly [
    Awaited<ReturnType<typeof loadNflverseUsagePulse>>,
    Awaited<ReturnType<typeof loadQbAgeRbTrendReport>>,
    Awaited<ReturnType<typeof loadBirthdayUsageTrendReport>>,
  ]
> {
  // Mirrors apps/web/app/nflverse/page.tsx's Promise.all([pulse, qbAgeTrend, birthdayTrend]).
  return Promise.all([
    loadNflverseUsagePulse({ season: SEASON, cacheTtlMs: 0 }),
    loadQbAgeRbTrendReport({ season: SEASON, cacheTtlMs: 0 }),
    loadBirthdayUsageTrendReport({ season: SEASON, cacheTtlMs: 0 }),
  ]);
}

describe("nflverse cold-start coalescing (OP-002 proof)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    resetNflverseTableCacheForTests();
    resetQbAgeRbTrendCacheForTests();
    resetBirthdayUsageTrendCacheForTests();
    resetNflverseUsagePulseCacheForTests();
  });

  it("fetches each shared nflverse artifact exactly once across all three concurrent loaders, all reports live", async () => {
    const { fetcher, countsByFragment } = makeCountingFetcher();
    vi.stubGlobal("fetch", fetcher);

    const [pulse, qbAgeTrend, birthdayTrend] = await loadAllThreeLikeThePage();

    const counts = countsByFragment();
    // Old shape (pre-OP-002): each of the three loaders independently fetched
    // player_stats.csv.gz, players.csv and games.csv -> 3 fetches per shared
    // artifact (9 total across the three combined-asset artifacts alone) plus
    // 2 roster fetches (qb-age/birthday don't use rosters; pulse fetches it
    // once + usage-pulse's own roster call), i.e. old-shape combined-asset
    // fetch count would have been 3. New bounded shape: exactly 1 each.
    expect(counts[PLAYER_STATS_URL_FRAGMENT]).toBe(1);
    expect(counts[PLAYERS_URL_FRAGMENT]).toBe(1);
    expect(counts[SCHEDULES_URL_FRAGMENT]).toBe(1);
    expect(counts[ROSTER_URL_FRAGMENT]).toBe(1);

    expect(pulse.status).toBe("live");
    expect(qbAgeTrend.status).toBe("live");
    expect(birthdayTrend.status).toBe("live");
  });

  it("a single failing artifact is only attempted once total, and every report degrades honestly (no throw)", async () => {
    const calls: string[] = [];
    const fetcher = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      calls.push(url);
      if (url.includes(PLAYER_STATS_URL_FRAGMENT)) return new Response("down", { status: 500 });
      if (url.includes(ROSTER_URL_FRAGMENT)) return csvResponse(ROSTERS_CSV);
      if (url.includes(PLAYERS_URL_FRAGMENT)) return csvResponse(PLAYERS_CSV);
      if (url.includes(SCHEDULES_URL_FRAGMENT)) return csvResponse(SCHEDULES_CSV);
      return new Response("missing", { status: 404 });
    });
    vi.stubGlobal("fetch", fetcher);

    const [pulse, qbAgeTrend, birthdayTrend] = await loadAllThreeLikeThePage();

    // player_stats.csv.gz primary + mirror = 2 raw HTTP attempts, but that is
    // ONE fetchNflverseTableCached flight shared by all three loaders — not
    // three independent flights (which would be 6 attempts).
    const statsAttempts = calls.filter((url) => url.includes(PLAYER_STATS_URL_FRAGMENT)).length;
    expect(statsAttempts).toBe(2);

    expect(pulse.status).toBe("source-error");
    expect(pulse.playerRows).toHaveLength(0);
    expect(qbAgeTrend.status).toBe("source-error");
    expect(qbAgeTrend.trends).toHaveLength(0);
    expect(birthdayTrend.status).toBe("source-error");
    expect(birthdayTrend.result).toBeNull();
  });
});
