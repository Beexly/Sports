/**
 * C-414 — kickoff-hour weather join: null-safe, T-6h/T-1h window, coverage log.
 * Historical (games.csv) and live (NWS/open-meteo) land on the SAME field
 * so A5 (totals) and A25 (pass props) never fork a fourth weather shape.
 */
import { describe, expect, it } from "vitest";

import {
  LIVE_WEATHER_REFRESH_MS,
  LIVE_WEATHER_WINDOW_START_MS,
  formatWeatherCoverageLog,
  joinLiveWeatherToGames,
  joinWeatherToSlate,
  kickoffWeatherFromGamesCsv,
  liveObservationFromVenueWeather,
  liveWeatherRefreshDue,
  liveWeatherRefreshPhase,
  shouldRefreshLiveWeather,
  weatherFieldMapFromGamesCsv,
  type KickoffWeatherField,
} from "../weather-game-field.js";

const HOUR = 3_600_000;
const T0 = Date.parse("2025-11-16T18:00:00.000Z"); // a Sunday 1pm ET kickoff
const iso = (ms: number) => new Date(ms).toISOString();

describe("T-6h / T-1h refresh window", () => {
  it("window constants are the named ticks", () => {
    expect(LIVE_WEATHER_WINDOW_START_MS).toBe(6 * HOUR);
    expect(LIVE_WEATHER_REFRESH_MS).toBe(1 * HOUR);
  });

  it("shouldRefreshLiveWeather is true only inside (0, T-6h]", () => {
    expect(shouldRefreshLiveWeather(iso(T0), T0 - 6 * HOUR)).toBe(true);
    expect(shouldRefreshLiveWeather(iso(T0), T0 - 1 * HOUR)).toBe(true);
    expect(shouldRefreshLiveWeather(iso(T0), T0 - 30 * 60_000)).toBe(true);
    // Outside: too early, kickoff already past, malformed ISO.
    expect(shouldRefreshLiveWeather(iso(T0), T0 - 6 * HOUR - 1)).toBe(false);
    expect(shouldRefreshLiveWeather(iso(T0), T0 + 1)).toBe(false);
    expect(shouldRefreshLiveWeather("not-a-date", T0)).toBe(false);
  });

  it("phase is t-6h until T-1h, then t-1h", () => {
    expect(liveWeatherRefreshPhase(iso(T0), T0 - 5 * HOUR)).toBe("t-6h");
    expect(liveWeatherRefreshPhase(iso(T0), T0 - 2 * HOUR)).toBe("t-6h");
    expect(liveWeatherRefreshPhase(iso(T0), T0 - 1 * HOUR)).toBe("t-1h");
    expect(liveWeatherRefreshPhase(iso(T0), T0 - 10 * 60_000)).toBe("t-1h");
    expect(liveWeatherRefreshPhase(iso(T0), T0 - 7 * HOUR)).toBeNull();
  });

  it("refresh is due with no stored asOf, or when stored is older than the phase tick", () => {
    const now = T0 - 3 * HOUR; // inside t-6h phase
    const t6Tick = T0 - 6 * HOUR;
    expect(liveWeatherRefreshDue({ kickoffIso: iso(T0), nowMs: now, storedAsOfIso: null })).toBe(true);
    expect(
      liveWeatherRefreshDue({ kickoffIso: iso(T0), nowMs: now, storedAsOfIso: iso(t6Tick + 1) }),
    ).toBe(false);
    expect(
      liveWeatherRefreshDue({ kickoffIso: iso(T0), nowMs: now, storedAsOfIso: iso(t6Tick - 1) }),
    ).toBe(true);

    const late = T0 - 30 * 60_000; // t-1h phase
    const t1Tick = T0 - 1 * HOUR;
    expect(
      liveWeatherRefreshDue({ kickoffIso: iso(T0), nowMs: late, storedAsOfIso: iso(t6Tick + 1) }),
    ).toBe(true);
    expect(
      liveWeatherRefreshDue({ kickoffIso: iso(T0), nowMs: late, storedAsOfIso: iso(t1Tick + 1) }),
    ).toBe(false);
  });
});

describe("historical games.csv → KickoffWeatherField (A5 / A25)", () => {
  it("maps temp/wind/roof; blank columns stay null; precip is null (no csv column)", () => {
    const field = kickoffWeatherFromGamesCsv(
      { game_id: "2024_01_BAL_KC", temp: "72", wind: "8", roof: "open" },
      "2024-09-05T00:00:00.000Z",
    );
    expect(field).not.toBeNull();
    expect(field!.gameId).toBe("2024_01_BAL_KC");
    expect(field!.tempF).toBe(72);
    expect(field!.windMph).toBe(8);
    expect(field!.roof).toBe("open");
    expect(field!.isDome).toBe(false);
    expect(field!.precip).toBeNull();
    expect(field!.precipKind).toBeNull();
    expect(field!.source).toBe("games_csv");
  });

  it("closed/retractable roofs set isDome; missing game_id yields null (never a phantom row)", () => {
    const dome = kickoffWeatherFromGamesCsv(
      { game_id: "dome1", temp: "70", wind: "0", roof: "closed" },
      iso(T0),
    );
    expect(dome!.isDome).toBe(true);
    expect(dome!.roof).toBe("closed");

    const retract = kickoffWeatherFromGamesCsv(
      { game_id: "ret1", roof: "retractable" },
      iso(T0),
    );
    expect(retract!.isDome).toBe(false);
    expect(retract!.roof).toBe("retractable");

    expect(kickoffWeatherFromGamesCsv({ temp: "70" }, iso(T0))).toBeNull();
  });

  it("non-numeric wind stays null (never coerced to 0)", () => {
    const field = kickoffWeatherFromGamesCsv(
      { game_id: "g", temp: "", wind: "calm", roof: "" },
      iso(T0),
    );
    expect(field!.windMph).toBeNull();
    expect(field!.tempF).toBeNull();
    expect(field!.roof).toBeNull();
    expect(field!.isDome).toBe(false);
  });

  it("map builder keeps last row per gameId", () => {
    const map = weatherFieldMapFromGamesCsv(
      [
        { game_id: "g1", wind: "5" },
        { game_id: "g1", wind: "12" },
        { game_id: "g2", wind: "3" },
      ],
      iso(T0),
    );
    expect(map.size).toBe(2);
    expect(map.get("g1")!.windMph).toBe(12);
  });
});

describe("null-safe slate join + coverage log", () => {
  const games = [
    { gameId: "a", startTime: iso(T0) },
    { gameId: "b", startTime: iso(T0 + HOUR) },
    { gameId: "c", startTime: iso(T0 + 2 * HOUR) },
  ];

  it("missing games are counted, never imputed; coverage partitions the slate", () => {
    const fields = new Map<string, KickoffWeatherField>([
      [
        "a",
        {
          gameId: "a",
          windMph: 15,
          tempF: 40,
          precip: 10,
          precipKind: "prob_pct",
          roof: "open",
          isDome: false,
          asOf: iso(T0 - 2 * HOUR),
          source: "nws_live",
        },
      ],
      [
        "b",
        {
          gameId: "b",
          windMph: null,
          tempF: 70,
          precip: null,
          precipKind: null,
          roof: "closed",
          isDome: true,
          asOf: iso(T0 - 2 * HOUR),
          source: "games_csv",
        },
      ],
    ]);
    const { byGameId, coverage } = joinWeatherToSlate({ games, fieldByGameId: fields });
    expect(byGameId.has("a")).toBe(true);
    expect(byGameId.has("c")).toBe(false);
    expect(coverage.totalGames).toBe(3);
    expect(coverage.joined).toBe(2);
    expect(coverage.missing).toBe(1);
    expect(coverage.dome).toBe(1);
    expect(coverage.outdoorComplete).toBe(1);
    expect(coverage.joined + coverage.missing + coverage.outsideWindow).toBe(coverage.totalGames);

    const log = formatWeatherCoverageLog(coverage);
    expect(log).toContain("games=3");
    expect(log).toContain("joined=2");
    expect(log).toContain("missing=1");
    expect(log).toContain("nws_live=1");
    expect(log).toContain("games_csv=1");
  });

  it("live join attaches only inside the window and leaves far kickoffs outsideWindow", () => {
    const now = T0 - 2 * HOUR;
    const far = { gameId: "far", startTime: iso(T0 + 48 * HOUR) };
    const { fields, coverage } = joinLiveWeatherToGames({
      games: [...games, far],
      observationByGameId: new Map([
        [
          "a",
          {
            windMph: 18,
            tempF: 35,
            precip: 20,
            precipKind: "prob_pct" as const,
            asOf: iso(now),
            source: "nws_live" as const,
          },
        ],
      ]),
      nowMs: now,
    });
    expect(fields.has("a")).toBe(true);
    expect(fields.has("far")).toBe(false);
    expect(coverage.outsideWindow).toBe(1);
    expect(coverage.inWindow).toBe(3);
    expect(coverage.missing).toBe(2); // b and c have no observation
  });

  it("venue-keyed observations resolve through venueKeyByGameId", () => {
    const now = T0 - 30 * 60_000;
    const { fields } = joinLiveWeatherToGames({
      games: [{ gameId: "gb-1", startTime: iso(T0) }],
      observationByVenue: new Map([
        [
          "GB",
          {
            windMph: 22,
            tempF: 28,
            precip: 5,
            precipKind: "prob_pct" as const,
            asOf: iso(now),
            source: "nws_live" as const,
            roof: "open",
          },
        ],
      ]),
      venueKeyByGameId: new Map([["gb-1", "GB"]]),
      nowMs: now,
    });
    expect(fields.get("gb-1")?.windMph).toBe(22);
    expect(fields.get("gb-1")?.isDome).toBe(false);
  });

  it("VenueWeather adapter: error venues and bad asOf yield null", () => {
    expect(
      liveObservationFromVenueWeather(
        { windMph: 10, tempF: 50, precipPct: 0, observedFor: iso(T0), status: "error" },
        iso(T0),
      ),
    ).toBeNull();
    expect(
      liveObservationFromVenueWeather(
        { windMph: 10, tempF: 50, precipPct: 0, observedFor: "nope", status: "ok" },
        "also-nope",
      ),
    ).toBeNull();
    const ok = liveObservationFromVenueWeather(
      { windMph: 10, tempF: 50, precipPct: 15, observedFor: iso(T0), status: "ok" },
      iso(T0),
    );
    expect(ok?.precipKind).toBe("prob_pct");
    expect(ok?.source).toBe("nws_live");
  });
});
