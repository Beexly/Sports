import { describe, expect, it } from "vitest";
import {
  KALSHI_GAME_SERIES,
  KALSHI_SERIES,
  constructedEventSeriesStem,
  gameSeriesForLeague,
  sportKeyToKalshiLeagueCode,
  toKalshiDateFragment,
  toKalshiTimeFragment,
  parseKalshiEventTail,
  MAX_MARKET_START_SKEW_MS,
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
  it("builds YYMMMDD date fragment (date-only calendar; ISO uses ET)", () => {
    expect(toKalshiDateFragment("2026-08-12")).toBe("26AUG12");
    // 20:05Z = 16:05 ET on Jun 3 — same calendar day in summer EDT
    expect(toKalshiDateFragment("2026-06-03T20:05:00Z")).toBe("26JUN03");
    // late UTC evening can still be prior ET calendar day
    expect(toKalshiDateFragment("2026-08-13T02:10:00Z")).toBe("26AUG12");
  });

  it("encodes ET wall-clock time fragment when clock is present", () => {
    expect(toKalshiTimeFragment("2026-08-12")).toBeNull();
    // 23:10Z = 19:10 EDT
    expect(toKalshiTimeFragment("2026-08-12T23:10:00Z")).toBe("1910");
  });

  it("constructs MLB with ET time when commence has clock", () => {
    expect(
      toKalshiEventTicker({
        league: "MLB",
        dateUtc: "2026-08-12T23:10:00Z",
        awayAbbr: "MIL",
        homeAbbr: "SD",
      }),
    ).toBe("KXMLBGAME-26AUG121910MILSD");
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

describe("parseKalshiEventTail — sports-skills grammar", () => {
  it("parses time-encoded MLB tail with ET start", () => {
    const p = parseKalshiEventTail("KXMLBGAME-26AUG121910MILSD");
    expect(p).not.toBeNull();
    expect(p!.dateFrag).toBe("26AUG12");
    expect(p!.timeFrag).toBe("1910");
    expect(p!.teamPair).toBe("MILSD");
    expect(p!.gameNum).toBeNull();
    expect(p!.startUtcMs).not.toBeNull();
    // 19:10 ET Aug 12 2026 = 23:10 UTC (EDT)
    expect(new Date(p!.startUtcMs!).toISOString()).toBe("2026-08-12T23:10:00.000Z");
  });

  it("parses time-less NBA tail (pair only)", () => {
    const p = parseKalshiEventTail("KXNBAGAME-26JUN03NYKSAS");
    expect(p!.timeFrag).toBeNull();
    expect(p!.teamPair).toBe("NYKSAS");
    expect(p!.startUtcMs).toBeNull();
  });

  it("parses doubleheader Gn suffix", () => {
    const p = parseKalshiEventTail("KXMLBGAME-26AUG121610MILSDG1");
    expect(p!.gameNum).toBe(1);
    expect(p!.teamPair).toBe("MILSD");
  });

  it("null on non-game futures stem", () => {
    expect(parseKalshiEventTail("KXMLB-SOMETHING")).toBeNull();
  });

  it("exports 12h skew constant", () => {
    expect(MAX_MARKET_START_SKEW_MS).toBe(12 * 60 * 60 * 1000);
  });
});
