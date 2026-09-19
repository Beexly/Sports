import { describe, expect, it, vi } from "vitest";
import {
  OddsPapiOddsProvider,
  createSecondaryOddsProvider,
  fetchDualProviderOdds,
  isCertifiableOddsProvider,
  type OddsQuoteProvider,
} from "../odds-provider-adapter.js";
import type { OddsPapiClient } from "../oddspapi-client.js";
import type { OddsProviderResult } from "../odds-failover.js";
import type { NormalizedOdds } from "@sports/types";

const FIXTURE = {
  fixtureId: "id1000001761301153",
  participant1Id: "p1",
  participant2Id: "p2",
  sportId: 14,
  tournamentId: 31,
  seasonId: "s1",
  statusId: 0,
  hasOdds: true,
  startTime: "2026-09-20T17:00:00Z",
  trueStartTime: null,
  trueEndTime: null,
  updatedAt: "2026-09-18T00:00:00Z",
  statusName: "Pre-Game",
  participant1Name: "Houston Texans",
  participant2Name: "Cincinnati Bengals",
  participant1ShortName: "Texans",
  participant2ShortName: "Bengals",
  participant1Abbr: "HOU",
  participant2Abbr: "CIN",
  sportName: "American Football",
  tournamentName: "NFL",
  tournamentSlug: "nfl",
  categoryName: "USA",
  categorySlug: "usa",
};

const CATALOG = [
  {
    marketId: "141",
    marketLength: 2,
    marketName: "Regular Time Result",
    playerProp: false,
    sportId: 14,
    handicap: null,
    period: "full",
    marketType: "h2h",
    outcomes: [
      { outcomeId: "o1", outcomeName: "Home" },
      { outcomeId: "o2", outcomeName: "Away" },
    ],
  },
  {
    marketId: "900",
    marketLength: 2,
    marketName: "Over Under Player Receiving Yards",
    playerProp: true,
    sportId: 14,
    handicap: 50.5,
    period: "full",
    marketType: "player_prop",
    outcomes: [
      { outcomeId: "o3", outcomeName: "Over" },
      { outcomeId: "o4", outcomeName: "Under" },
    ],
  },
];

function priceCell(american: string, active = true) {
  return {
    price: 1.9,
    priceAmerican: american,
    priceFractional: "10/11",
    active,
    betslip: "",
    bookmakerOutcomeId: "bo",
    bookmakerChangedAt: null,
    changedAt: "2026-09-18T00:00:00Z",
    limit: 1000,
    playerName: "",
    mainLine: true,
  };
}

const ODDS_RESPONSE = {
  ...FIXTURE,
  bookmakerOdds: {
    pinnacle: {
      bookmakerIsActive: true,
      bookmakerFixtureId: "b1",
      fixturePath: "/x",
      suspended: false,
      markets: {
        "141": {
          bookmakerMarketId: "m1",
          marketActive: true,
          outcomes: {
            o1: { players: { "0": priceCell("-110") } },
            o2: { players: { "0": priceCell("+100") } },
          },
        },
        // Prop market: must be excluded from normalized output.
        "900": {
          bookmakerMarketId: "m9",
          marketActive: true,
          outcomes: {
            o3: { players: { pl7: priceCell("-110") } },
          },
        },
      },
    },
    // Suspended book: skipped.
    softbook: {
      bookmakerIsActive: true,
      bookmakerFixtureId: "b2",
      fixturePath: "/y",
      suspended: true,
      markets: {},
    },
    // Demo feed: skipped.
    demo: {
      bookmakerIsActive: true,
      bookmakerFixtureId: "b3",
      fixturePath: "/z",
      suspended: false,
      markets: {
        "141": {
          bookmakerMarketId: "m1",
          marketActive: true,
          outcomes: { o1: { players: { "0": priceCell("-110") } } },
        },
      },
    },
  },
};

function stubClient() {
  return {
    getMarkets: async () => ({ data: CATALOG, notModified: false }),
    getFixtures: async () => ({ data: [FIXTURE], notModified: false }),
    getOdds: async () => ({ data: ODDS_RESPONSE, notModified: false }),
    getAccount: async () => ({
      data: { request_limit: 250, request_count: 10 },
      notModified: false,
    }),
  } as unknown as OddsPapiClient;
}

describe("OddsPapiOddsProvider", () => {
  it("normalizes the Pinnacle game line, skipping suspended/demo/prop markets", async () => {
    const provider = new OddsPapiOddsProvider("k", { client: stubClient() });
    const result = await provider.fetchNormalized("americanfootball_nfl");
    expect(result.healthy).toBe(true);
    expect(result.odds).toHaveLength(1);
    const row = result.odds[0]!;
    expect(row.bookmaker).toBe("pinnacle");
    expect(row.market).toBe("H2H");
    expect(row.homePrice).toBe(-110);
    expect(row.awayPrice).toBe(100);
    expect(row.gameExternalId).toBe("id1000001761301153");
  });

  it("refuses unsupported sportKeys without inventing rows", async () => {
    const provider = new OddsPapiOddsProvider("k", { client: stubClient() });
    const result = await provider.fetchNormalized("basketball_nba");
    expect(result.healthy).toBe(false);
    expect(result.odds).toHaveLength(0);
    expect(result.error).toMatch(/unsupported sportKey/i);
  });

  it("is not certifiable for the live gate (terms need a legal read)", () => {
    const provider = new OddsPapiOddsProvider("k", { client: stubClient() });
    expect(isCertifiableOddsProvider(provider)).toBe(false);
  });

  it("probes via the unmetered /account endpoint", async () => {
    const provider = new OddsPapiOddsProvider("k", { client: stubClient() });
    const health = await provider.probe();
    expect(health).toEqual({ available: true, remainingCredits: 240 });
  });

  it("caches the market catalog across fetches", async () => {
    const client = stubClient();
    const getMarkets = vi.spyOn(client, "getMarkets");
    const provider = new OddsPapiOddsProvider("k", { client });
    await provider.fetchNormalized("americanfootball_nfl");
    await provider.fetchNormalized("americanfootball_nfl");
    expect(getMarkets).toHaveBeenCalledTimes(1);
  });
});

describe("createSecondaryOddsProvider", () => {
  it("returns null when ODDSPAPI_KEY is absent", () => {
    expect(createSecondaryOddsProvider({ env: {} })).toBeNull();
  });
  it("builds the provider from the canonical env var", () => {
    const p = createSecondaryOddsProvider({ env: { ODDSPAPI_KEY: "k" } });
    expect(p).toBeInstanceOf(OddsPapiOddsProvider);
  });
});

describe("fetchDualProviderOdds", () => {
  function stubProvider(
    name: string,
    odds: NormalizedOdds[],
    healthy = true,
  ): OddsQuoteProvider {
    return {
      id: name as never,
      name,
      capabilities: {
        multiBook: true,
        markets: ["H2H"],
        supportsLiveQuotes: true,
        certifiableForLiveGate: true,
      },
      fetchNormalized: async (): Promise<OddsProviderResult> => ({
        provider: name,
        odds,
        healthy,
        error: healthy ? undefined : `${name} failed`,
      }),
    };
  }

  const base: NormalizedOdds = {
    gameExternalId: "g1",
    bookmaker: "pinnacle",
    market: "H2H",
    homePrice: -110,
    awayPrice: 100,
    fetchedAt: new Date(),
    bookmakerLastUpdate: new Date(),
  };

  it("merges secondary books without overwriting primary prices", async () => {
    const secondaryRow: NormalizedOdds = { ...base, bookmaker: "fanduel" };
    const conflictingRow: NormalizedOdds = {
      ...base,
      homePrice: -150, // secondary disagrees on an already-quoted book+market
    };
    const merged = await fetchDualProviderOdds(
      stubProvider("the-odds-api", [base]),
      stubProvider("oddspapi", [conflictingRow, secondaryRow]),
      "americanfootball_nfl",
    );
    expect(merged.healthy).toBe(true);
    expect(merged.odds).toHaveLength(2);
    const pinnacle = merged.odds.find((o) => o.bookmaker === "pinnacle")!;
    expect(pinnacle.homePrice).toBe(-110); // primary wins
    expect(merged.provider).toBe("the-odds-api+oddspapi");
  });

  it("stays healthy when only the secondary is up", async () => {
    const merged = await fetchDualProviderOdds(
      stubProvider("the-odds-api", [], false),
      stubProvider("oddspapi", [base]),
      "americanfootball_nfl",
    );
    expect(merged.healthy).toBe(true);
    expect(merged.odds).toHaveLength(1);
  });

  it("errors only when both providers failed", async () => {
    const merged = await fetchDualProviderOdds(
      stubProvider("the-odds-api", [], false),
      stubProvider("oddspapi", [], false),
      "americanfootball_nfl",
    );
    expect(merged.healthy).toBe(false);
    expect(merged.error).toMatch(/the-odds-api failed \| oddspapi failed/);
  });
});
