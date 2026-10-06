import { afterEach, describe, expect, it, vi } from "vitest";
import {
  SpreadSpokeClient,
  SpreadSpokeError,
  isSpreadSpokeIngestEnabled,
  SPREADSPOKE_BASE,
  SPREADSPOKE_ATTRIBUTION,
} from "../spreadspoke-client.js";
import { assertIngestible, getSource } from "../source-registry.js";

afterEach(() => {
  vi.restoreAllMocks();
});

const fetchText = (fixture: string) =>
  (async (_url: unknown) => new Response(fixture, { status: 200 })) as unknown as typeof fetch;

const ENV = { SPREADSPOKE_INGEST: "1" };

/**
 * Fixture mirrors the real CSV header order. Row 1 is the verified earliest
 * row (9/2/1966 Dolphins vs Raiders); row 2 exercises quoted fields containing
 * commas and escaped quotes.
 */
const csvFixture = [
  "schedule_date,schedule_season,schedule_week,schedule_playoff,team_home,score_home,score_away,team_away,team_favorite_id,spread_favorite,over_under_line,stadium,stadium_neutral,weather_temperature,weather_wind_mph,weather_humidity,weather_detail",
  "9/2/1966,1966,1,FALSE,Miami Dolphins,14,23,Oakland Raiders,MIA,-3.0,33.0,Orange Bowl,TRUE,81,7,72,Sunny",
  '9/8/2024,2024,1,FALSE,Kansas City Chiefs,27,20,Baltimore Ravens,KC,-3.0,46.5,"GEHA Field at Arrowhead Stadium",FALSE,72,5,64,"Clear, calm"',
  '9/15/2024,2024,2,FALSE,Buffalo Bills,31,10,Miami Dolphins,BUF,-5.5,44.0,"Highmark Stadium ""Home of the Bills""",FALSE,68,8,55,"Partly cloudy, 68 degrees"',
].join("\n");

describe("SpreadSpoke registry linkage", () => {
  it("is use-with-caution and ingestible with the live base", () => {
    expect(getSource("spreadspoke-scores")?.verdict).toBe("use-with-caution");
    expect(assertIngestible("spreadspoke-scores").baseUrl).toBe(SPREADSPOKE_BASE);
    expect(SPREADSPOKE_ATTRIBUTION).toBe("Historical scores and lines via SpreadSpoke.");
  });
});

describe("SpreadSpoke fail-closed", () => {
  it("is off by default and never fetches", async () => {
    expect(isSpreadSpokeIngestEnabled({})).toBe(false);
    const fetchImpl = vi.fn();
    const client = new SpreadSpokeClient({}, fetchImpl as unknown as typeof fetch);
    expect(await client.getScores()).toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe("SpreadSpoke fixtures", () => {
  it("parses the 1966 Dolphins vs Raiders row to exact values", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(csvFixture, { status: 200 }));
    const client = new SpreadSpokeClient(ENV, fetchImpl as unknown as typeof fetch);
    const rows = await client.getScores();
    expect(rows).toHaveLength(3);
    const row = rows?.[0];
    expect(row?.scheduleDate).toBe("9/2/1966");
    expect(row?.season).toBe(1966);
    expect(row?.week).toBe(1);
    expect(row?.playoff).toBe(false);
    expect(row?.teamHome).toBe("Miami Dolphins");
    expect(row?.scoreHome).toBe(14);
    expect(row?.scoreAway).toBe(23);
    expect(row?.teamAway).toBe("Oakland Raiders");
    expect(row?.teamFavoriteId).toBe("MIA");
    expect(row?.spreadFavorite).toBe(-3);
    expect(row?.overUnderLine).toBe(33);
    expect(row?.stadium).toBe("Orange Bowl");
    expect(row?.stadiumNeutral).toBe(true);
    expect(row?.weatherTemperature).toBe(81);
    expect(row?.weatherWindMph).toBe(7);
    expect(row?.weatherHumidity).toBe(72);
    expect(row?.weatherDetail).toBe("Sunny");
    const url = String(fetchImpl.mock.calls[0]?.[0]);
    expect(url).toBe(`${SPREADSPOKE_BASE}/spreadspoke_scores.csv`);
  });

  it("handles quoted fields: embedded commas and escaped quotes", async () => {
    const client = new SpreadSpokeClient(ENV, fetchText(csvFixture));
    const rows = await client.getScores();
    expect(rows?.[1]?.stadium).toBe("GEHA Field at Arrowhead Stadium");
    expect(rows?.[1]?.weatherDetail).toBe("Clear, calm");
    expect(rows?.[2]?.stadium).toBe('Highmark Stadium "Home of the Bills"');
    expect(rows?.[2]?.weatherDetail).toBe("Partly cloudy, 68 degrees");
  });
});

describe("SpreadSpoke malformed payloads", () => {
  it("returns empty arrays without throwing", async () => {
    const client = new SpreadSpokeClient(ENV, fetchText(""));
    expect(await client.getScores()).toEqual([]);

    const client2 = new SpreadSpokeClient(ENV, fetchText("garbage line one\ngarbage line two"));
    expect(await client2.getScores()).toEqual([]);

    const client3 = new SpreadSpokeClient(
      ENV,
      fetchText(
        "schedule_date,team_home,team_away\n" + ",,,,\n" + "9/2/1966,Miami Dolphins,Oakland Raiders",
      ),
    );
    const rows = await client3.getScores();
    // The blank row is skipped; the real row parses with unknown columns nulled.
    expect(rows).toHaveLength(1);
    expect(rows?.[0]?.season).toBeNull();
    expect(rows?.[0]?.teamHome).toBe("Miami Dolphins");
  });
});

describe("SpreadSpoke HTTP errors", () => {
  it("throws SpreadSpokeError carrying the status", async () => {
    const fetchImpl = (async (_url: unknown) =>
      new Response("not found", { status: 404 })) as unknown as typeof fetch;
    const client = new SpreadSpokeClient(ENV, fetchImpl);
    const err = await client.getScores().catch((e: unknown) => e);
    expect(err).toBeInstanceOf(SpreadSpokeError);
    expect((err as SpreadSpokeError).status).toBe(404);
    expect(String((err as Error).message)).toContain("404");
  });
});
