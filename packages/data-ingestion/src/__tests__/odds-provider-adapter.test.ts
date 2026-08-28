import { describe, it, expect, vi } from "vitest";
import {
  GalaxySportsApiOddsProvider,
  OfflineOddsProvider,
  TheOddsApiOddsProvider,
  createOddsQuoteProvider,
  isCertifiableOddsProvider,
  isCertifiableOddsTag,
  enforceCertifiableLiveGate,
} from "../odds-provider-adapter.js";
import { fetchEspnOddsForSport } from "../espn-odds-client.js";
import type { OddsApiClient } from "../odds-api-client.js";
import { OddsApiError } from "../odds-api-client.js";
import type { NormalizedOdds } from "@sports/types";

const FETCHED = new Date("2026-07-27T18:00:00Z");

describe("OfflineOddsProvider", () => {
  it("returns unhealthy empty odds with explicit reason", async () => {
    const p = new OfflineOddsProvider("payment failed");
    const r = await p.fetchNormalized("baseball_mlb");
    expect(r.healthy).toBe(false);
    expect(r.odds).toEqual([]);
    expect(r.error).toContain("payment failed");
    expect(r.error).toContain("baseball_mlb");
    expect(p.capabilities.certifiableForLiveGate).toBe(false);
    expect(isCertifiableOddsProvider(p)).toBe(false);
  });

  it("probe reports unavailable", async () => {
    const p = new OfflineOddsProvider("no key");
    const h = await p.probe();
    expect(h.available).toBe(false);
    expect(h.reason).toContain("no key");
  });
});

describe("createOddsQuoteProvider", () => {
  it("uses galaxy-sports-api (keyless) when paid Odds API key is missing — never another vendor key", () => {
    const p = createOddsQuoteProvider({ env: {} });
    expect(p.id).toBe("galaxy-sports-api");
    expect(p.capabilities.certifiableForLiveGate).toBe(false);
  });

  it("uses offline when ODDS_PROVIDER=offline even if key set", () => {
    const p = createOddsQuoteProvider({
      env: { THE_ODDS_API_KEY: "secret", ODDS_PROVIDER: "offline" },
    });
    expect(p.id).toBe("offline");
  });

  it("uses the-odds-api when key present", () => {
    const p = createOddsQuoteProvider({
      env: { THE_ODDS_API_KEY: "secret" },
    });
    expect(p.id).toBe("the-odds-api");
    expect(p.capabilities.certifiableForLiveGate).toBe(true);
  });
});

describe("GalaxySportsApiOddsProvider", () => {
  it("fetchNormalized returns real rows end-to-end (inline ESPN → normalizer, spreads survive)", async () => {
    // Real client + real DataNormalizer — this is the seam where the
    // abbreviation-vs-full-name spreads bug lived; a mocked normalizer
    // cannot catch it.
    const commenceSoon = new Date(Date.now() + 6 * 3600 * 1000).toISOString();
    const scoreboard = {
      events: [
        {
          id: "401873298",
          date: commenceSoon,
          competitions: [
            {
              date: commenceSoon,
              status: { type: { state: "pre", completed: false } },
              competitors: [
                {
                  homeAway: "home",
                  team: { displayName: "Buffalo Bills", abbreviation: "BUF" },
                },
                {
                  homeAway: "away",
                  team: { displayName: "Pittsburgh Steelers", abbreviation: "PIT" },
                },
              ],
              odds: [
                {
                  provider: { name: "DraftKings" },
                  spread: -3.0,
                  overUnder: 34.5,
                  moneyline: {
                    home: { close: { odds: "-146" } },
                    away: { close: { odds: "+122" } },
                  },
                },
              ],
            },
          ],
        },
      ],
    };
    const fetchImpl = vi.fn(async (url: string) => {
      if (String(url).includes("scoreboard")) {
        return { ok: true, json: async () => scoreboard } as Response;
      }
      return { ok: false, status: 404 } as Response;
    });

    const p = new GalaxySportsApiOddsProvider((sportKey) =>
      fetchEspnOddsForSport(sportKey, {
        fetchImpl: fetchImpl as unknown as typeof fetch,
        interEventMs: 0,
      }),
    );

    const r = await p.fetchNormalized("americanfootball_nfl");
    expect(r.provider).toBe("galaxy-sports-api");
    expect(r.healthy).toBe(true);
    expect(r.odds.length).toBeGreaterThan(0);

    const h2h = r.odds.find((o) => o.market === "H2H");
    expect(h2h?.homePrice).toBe(-146);
    expect(h2h?.awayPrice).toBe(122);

    // The spread POINT must survive normalization (full-name outcome match).
    const spreads = r.odds.find((o) => o.market === "SPREADS");
    expect(spreads?.spread).toBe(-3);

    const totals = r.odds.find((o) => o.market === "TOTALS");
    expect(totals?.total).toBe(34.5);
  });

  it("fetchNormalized is unhealthy with empty odds when ESPN yields nothing", async () => {
    const p = new GalaxySportsApiOddsProvider(async () => ({
      provider: "espn_public",
      events: [],
      error: "espn odds empty",
    }));
    const r = await p.fetchNormalized("americanfootball_nfl");
    expect(r.healthy).toBe(false);
    expect(r.odds).toEqual([]);
    expect(r.error).toContain("espn odds empty");
  });
});

describe("TheOddsApiOddsProvider", () => {
  it("maps client errors to unhealthy result without throwing", async () => {
    const client = {
      getOdds: vi.fn(async () => {
        throw new OddsApiError("payment required", 402, 0);
      }),
      getSports: vi.fn(),
    } as unknown as OddsApiClient;

    const normalizer = {
      validateFreshness: () => true,
      normalizeOdds: () => [] as NormalizedOdds[],
    };

    const p = new TheOddsApiOddsProvider("key", {
      client,
      normalizer: normalizer as never,
      now: () => FETCHED,
    });

    const r = await p.fetchNormalized("baseball_mlb");
    expect(r.healthy).toBe(false);
    expect(r.odds).toEqual([]);
    expect(r.error).toMatch(/402/);
  });

  it("returns healthy normalized odds on success", async () => {
    const row: NormalizedOdds = {
      gameExternalId: "g1",
      bookmaker: "fanduel",
      market: "SPREADS",
      spread: -1.5,
      homeSpreadPrice: -110,
      awaySpreadPrice: -110,
      fetchedAt: FETCHED,
      bookmakerLastUpdate: FETCHED,
    };
    const client = {
      getOdds: vi.fn(async () => ({
        data: [{ id: "g1", bookmakers: [] }],
        remainingRequests: 100,
        usedRequests: 1,
      })),
      getSports: vi.fn(),
    } as unknown as OddsApiClient;

    const normalizer = {
      validateFreshness: () => true,
      normalizeOdds: () => [row],
    };

    const p = new TheOddsApiOddsProvider("key", {
      client,
      normalizer: normalizer as never,
      now: () => FETCHED,
    });

    const r = await p.fetchNormalized("baseball_mlb");
    expect(r.healthy).toBe(true);
    expect(r.odds).toHaveLength(1);
    expect(r.odds[0]?.bookmaker).toBe("fanduel");
  });
});

describe("certifiableForLiveGate enforcement (addendum 08-28)", () => {
  it("isCertifiableOddsTag: paid the-odds-api (and thin-fill variants) are certifiable", () => {
    expect(isCertifiableOddsTag("the-odds-api")).toBe(true);
    expect(isCertifiableOddsTag("the-odds-api+therundown-thin")).toBe(true);
  });

  it("isCertifiableOddsTag: keyless espn_public / rundown / none are NOT certifiable", () => {
    expect(isCertifiableOddsTag("espn_public")).toBe(false);
    expect(isCertifiableOddsTag("therundown")).toBe(false);
    expect(isCertifiableOddsTag("free-refused-paid")).toBe(false);
    expect(isCertifiableOddsTag(null)).toBe(false);
    expect(isCertifiableOddsTag(undefined)).toBe(false);
  });

  it("enforceCertifiableLiveGate: allows when live promotion not requested", () => {
    const r = enforceCertifiableLiveGate("espn_public", false);
    expect(r.allowed).toBe(true);
  });

  it("enforceCertifiableLiveGate: refuses live promotion for non-certifiable source", () => {
    const r = enforceCertifiableLiveGate("espn_public", true);
    expect(r.allowed).toBe(false);
    expect(r.reason).toMatch(/non-certifiable/i);
  });

  it("enforceCertifiableLiveGate: allows live promotion for certifiable paid source", () => {
    const r = enforceCertifiableLiveGate("the-odds-api", true);
    expect(r.allowed).toBe(true);
  });
});
