import { afterEach, describe, expect, it, vi } from "vitest";
import {
  SleeperFeedsClient,
  SleeperError,
  isSleeperFeedsIngestEnabled,
  SLEEPER_BASE,
  SLEEPER_STATE_ATTRIBUTION,
  SLEEPER_PLAYERS_ATTRIBUTION,
  SLEEPER_TRENDING_ATTRIBUTION,
} from "../sleeper-feeds-client.js";
import { assertIngestible, getSource } from "../source-registry.js";

afterEach(() => {
  vi.restoreAllMocks();
});

const fetchJson = (fixture: unknown) =>
  (async (_url: unknown) => new Response(JSON.stringify(fixture), { status: 200 })) as unknown as typeof fetch;

const ENV = { SLEEPER_FEEDS_INGEST: "1" };

/** Real verified fixture shapes (2026-09-18). */
const stateFixture = {
  week: 2,
  season_type: "regular",
  season: "2026",
  leg: 1,
  display_week: 2,
  season_start_date: "2026-09-10",
};

/**
 * Player "6462": the verified part is the cross-platform ID map
 * (espn 3926590 / yahoo 32262 / gsis 00-0035057). Name/team are fixture doubles.
 */
const playersFixture = {
  "6462": {
    player_id: "6462",
    full_name: "Fixture Player",
    position: "RB",
    team: "CHI",
    age: 27,
    injury_status: null,
    injury_body_part: null,
    injury_notes: null,
    depth_chart_order: 1,
    espn_id: 3926590,
    yahoo_id: 32262,
    rotowire_id: null,
    gsis_id: "00-0035057",
    sportradar_id: "abc-123",
    fantasy_data_id: 22222,
    kalshi_id: null,
  },
};

const trendingFixture = [{ player_id: "6130", count: 515538 }];

describe("Sleeper registry linkage", () => {
  it("is use-with-caution and ingestible with the live base", () => {
    expect(getSource("sleeper-state")?.verdict).toBe("use-with-caution");
    expect(getSource("sleeper-players")?.verdict).toBe("use-with-caution");
    expect(getSource("sleeper-trending")?.verdict).toBe("use-with-caution");
    expect(assertIngestible("sleeper-state").baseUrl).toBe(SLEEPER_BASE);
    expect(SLEEPER_STATE_ATTRIBUTION).toBe("NFL state via the Sleeper API.");
    expect(SLEEPER_PLAYERS_ATTRIBUTION).toBe("Player data via the Sleeper API.");
    expect(SLEEPER_TRENDING_ATTRIBUTION).toBe("Waiver sentiment via the Sleeper API.");
  });
});

describe("Sleeper fail-closed", () => {
  it("is off by default and never fetches", async () => {
    expect(isSleeperFeedsIngestEnabled({})).toBe(false);
    const fetchImpl = vi.fn();
    const client = new SleeperFeedsClient({}, fetchImpl as unknown as typeof fetch);
    expect(await client.getState()).toBeNull();
    expect(await client.getPlayers()).toBeNull();
    expect(await client.getTrending("add")).toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe("Sleeper fixtures", () => {
  it("parses NFL state to exact values", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify(stateFixture), { status: 200 }));
    const client = new SleeperFeedsClient(ENV, fetchImpl as unknown as typeof fetch);
    const state = await client.getState();
    expect(state?.season).toBe("2026");
    expect(state?.week).toBe(2);
    expect(state?.seasonType).toBe("regular");
    expect(state?.leg).toBe(1);
    expect(state?.displayWeek).toBe(2);
    expect(state?.seasonStartDate).toBe("2026-09-10");
    const url = String(fetchImpl.mock.calls[0]?.[0]);
    expect(url).toBe(`${SLEEPER_BASE}/v1/state/nfl`);
  });

  it("parses the player master and the 6462 crosswalk ids", async () => {
    const client = new SleeperFeedsClient(ENV, fetchJson(playersFixture));
    const result = await client.getPlayers();
    expect(result?.playerCount).toBe(1);
    const player = result?.players["6462"];
    expect(player?.playerId).toBe("6462");
    expect(player?.position).toBe("RB");
    expect(player?.team).toBe("CHI");
    expect(player?.age).toBe(27);
    expect(player?.depthChartOrder).toBe(1);
    expect(player?.ids.espn).toBe("3926590");
    expect(player?.ids.yahoo).toBe("32262");
    expect(player?.ids.gsis).toBe("00-0035057");
    expect(player?.ids.sportradar).toBe("abc-123");
    expect(player?.ids.fantasyData).toBe("22222");
    expect(player?.ids.rotowire).toBeNull();
    expect(player?.ids.kalshi).toBeNull();
  });

  it("parses trending adds to exact values and builds the query", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify(trendingFixture), { status: 200 }));
    const client = new SleeperFeedsClient(ENV, fetchImpl as unknown as typeof fetch);
    const trending = await client.getTrending("add");
    expect(trending).toHaveLength(1);
    expect(trending?.[0]?.playerId).toBe("6130");
    expect(trending?.[0]?.count).toBe(515538);
    const url = String(fetchImpl.mock.calls[0]?.[0]);
    expect(url).toContain("/v1/players/nfl/trending/add");
    expect(url).toContain("lookback_hours=24");
    expect(url).toContain("limit=25");
  });

  it("honors custom trending args", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }));
    const client = new SleeperFeedsClient(ENV, fetchImpl as unknown as typeof fetch);
    await client.getTrending("drop", 168, 10);
    const url = String(fetchImpl.mock.calls[0]?.[0]);
    expect(url).toContain("/v1/players/nfl/trending/drop");
    expect(url).toContain("lookback_hours=168");
    expect(url).toContain("limit=10");
  });
});

describe("Sleeper malformed payloads", () => {
  it("returns empty results without throwing", async () => {
    const client = new SleeperFeedsClient(ENV, fetchJson({}));
    const state = await client.getState();
    expect(state?.week).toBeNull();
    expect(state?.season).toBeNull();

    const client2 = new SleeperFeedsClient(ENV, fetchJson({ not: "players" }));
    const result = await client2.getPlayers();
    expect(result?.playerCount).toBe(0);
    expect(result?.players).toEqual({});

    const client3 = new SleeperFeedsClient(ENV, fetchJson({ trending: "nope" }));
    expect(await client3.getTrending("add")).toEqual([]);

    const client4 = new SleeperFeedsClient(ENV, fetchJson([{ player_id: null }, { count: "x" }]));
    expect(await client4.getTrending("drop")).toEqual([]);
  });
});

describe("Sleeper HTTP errors", () => {
  it("throws SleeperError carrying the status", async () => {
    const fetchImpl = (async (_url: unknown) =>
      new Response("rate limited", { status: 429 })) as unknown as typeof fetch;
    const client = new SleeperFeedsClient(ENV, fetchImpl);
    const err = await client.getTrending("add").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(SleeperError);
    expect((err as SleeperError).status).toBe(429);
    expect(String((err as Error).message)).toContain("429");
  });
});
