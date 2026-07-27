import { describe, it, expect, vi } from "vitest";
import {
  OfflineOddsProvider,
  TheOddsApiOddsProvider,
  createOddsQuoteProvider,
  isCertifiableOddsProvider,
} from "../odds-provider-adapter.js";
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
  it("uses offline when key missing", () => {
    const p = createOddsQuoteProvider({ env: {} });
    expect(p.id).toBe("offline");
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
