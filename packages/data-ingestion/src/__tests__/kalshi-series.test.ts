import { describe, expect, it } from "vitest";
import {
  KALSHI_GAME_SERIES,
  KALSHI_SERIES,
  constructedEventSeriesStem,
  gameSeriesForLeague,
  sportKeyToKalshiLeagueCode,
  toKalshiDateFragment,
  toKalshiTimeFragment,
} from "../kalshi-series.js";
import {
  eventTickerMatchesGame,
  toKalshiEventTicker,
} from "../kalshi-client.js";

describe("KALSHI_SERIES harvest map", () => {
  it("includes game-winner series for majors + college + soccer", () => {
    expect(KALSHI_GAME_SERIES.mlb).toContain("KXMLBGAME");
    expect(KALSHI_GAME_SERIES.nba).toContain("KXNBAGAME");
    expect(KALSHI_GAME_SERIES.cfb).toContain("KXCFBGAME");
    expect(KALSHI_GAME_SERIES.cbb).toContain("KXCBBCGAME");
    expect(KALSHI_GAME_SERIES.epl).toContain("KXEPLGAME");
    expect(KALSHI_GAME_SERIES.wnba).toContain("KXWNBAGAME");
  });

  it("keeps full series lists for discovery (props/futures present)", () => {
    expect(KALSHI_SERIES.nba.length).toBeGreaterThan(KALSHI_GAME_SERIES.nba.length);
    expect(KALSHI_SERIES.epl).toContain("KXEPLTOTAL");
  });
});

describe("sportKeyToKalshiLeagueCode", () => {
  it("maps Odds-API majors", () => {
    expect(sportKeyToKalshiLeagueCode("americanfootball_nfl")).toBe("NFL");
    expect(sportKeyToKalshiLeagueCode("basketball_nba")).toBe("NBA");
    expect(sportKeyToKalshiLeagueCode("baseball_mlb")).toBe("MLB");
    expect(sportKeyToKalshiLeagueCode("icehockey_nhl")).toBe("NHL");
  });

  it("maps college + wnba + soccer", () => {
    expect(sportKeyToKalshiLeagueCode("americanfootball_ncaaf")).toBe("CFB");
    expect(sportKeyToKalshiLeagueCode("basketball_ncaab")).toBe("CBB");
    expect(sportKeyToKalshiLeagueCode("basketball_wnba")).toBe("WNBA");
    expect(sportKeyToKalshiLeagueCode("soccer_epl")).toBe("EPL");
    expect(sportKeyToKalshiLeagueCode("soccer_usa_mls")).toBe("MLS");
    expect(sportKeyToKalshiLeagueCode("soccer_germany_bundesliga")).toBe("BUNDESLIGA");
  });

  it("null on unknown (honest)", () => {
    expect(sportKeyToKalshiLeagueCode("tennis_atp")).toBeNull();
  });
});

describe("date/time fragments + constructed tickers", () => {
  it("builds YYMMMDD date fragment in UTC", () => {
    expect(toKalshiDateFragment("2026-08-12")).toBe("26AUG12");
    expect(toKalshiDateFragment("2026-06-03T20:05:00Z")).toBe("26JUN03");
  });

  it("encodes time fragment only when clock is present", () => {
    expect(toKalshiTimeFragment("2026-08-12")).toBeNull();
    expect(toKalshiTimeFragment("2026-08-12T23:10:00Z")).toBe("2310");
  });

  it("constructs MLB with time when commence has clock", () => {
    expect(
      toKalshiEventTicker({
        league: "MLB",
        dateUtc: "2026-08-12T23:10:00Z",
        awayAbbr: "MIL",
        homeAbbr: "SD",
      }),
    ).toBe("KXMLBGAME-26AUG122310MILSD");
  });

  it("NBA remains date-only constructed grammar", () => {
    expect(
      toKalshiEventTicker({
        league: "NBA",
        dateUtc: "2026-06-03",
        awayAbbr: "NYK",
        homeAbbr: "SAS",
      }),
    ).toBe("KXNBAGAME-26JUN03NYKSAS");
  });

  it("gameSeriesForLeague returns moneyline series", () => {
    expect(gameSeriesForLeague("MLB")).toEqual(["KXMLBGAME"]);
    expect(constructedEventSeriesStem("EPL")).toBe("KXEPLGAME");
  });
});

describe("eventTickerMatchesGame — time-encoded MLB", () => {
  it("matches live MLB time-encoded stem", () => {
    expect(
      eventTickerMatchesGame("KXMLBGAME-26AUG121610MILSD", {
        league: "MLB",
        dateUtc: "2026-08-12T23:10:00Z",
        awayAbbr: "MIL",
        homeAbbr: "SD",
      }),
    ).toBe(true);
  });

  it("rejects wrong teams", () => {
    expect(
      eventTickerMatchesGame("KXMLBGAME-26AUG121610MILSD", {
        league: "MLB",
        dateUtc: "2026-08-12",
        awayAbbr: "NYY",
        homeAbbr: "BOS",
      }),
    ).toBe(false);
  });

  it("matches EPL game stem", () => {
    expect(
      eventTickerMatchesGame("KXEPLGAME-26AUG23NEWLFC", {
        league: "EPL",
        dateUtc: "2026-08-23",
        awayAbbr: "NEW",
        homeAbbr: "LFC",
      }),
    ).toBe(true);
  });
});
