import { describe, expect, it } from "vitest";
import {
  assertIngestible,
  attributionFor,
  clearedSources,
  forbiddenSources,
  getSource,
  isIngestible,
  SOURCE_REGISTRY,
} from "./source-registry.js";

describe("legal source registry", () => {
  it("clears nflverse for commercial ingestion with attribution", () => {
    expect(isIngestible("nflverse")).toBe(true);
    const source = assertIngestible("nflverse");
    expect(source.license.spdx).toBe("CC-BY-4.0");
    expect(source.commercialUse).toBe(true);
    expect(attributionFor("nflverse")).toMatch(/nflverse/i);
  });

  it("clears the licensed Odds API and the public Sleeper API", () => {
    expect(isIngestible("the-odds-api")).toBe(true);
    expect(isIngestible("sleeper")).toBe(true);
    // Sleeper requires attribution on trending data.
    expect(attributionFor("sleeper")).toMatch(/sleeper/i);
    // The Odds API does not require attribution.
    expect(attributionFor("the-odds-api")).toBeNull();
  });

  it("refuses to ingest forbidden sources (ESPN hidden API, PFR scraping, unlicensed nfelo)", () => {
    for (const id of ["espn-hidden-api", "pro-football-reference", "nfelo"]) {
      expect(isIngestible(id)).toBe(false);
      expect(() => assertIngestible(id)).toThrow(/Refusing to ingest/);
    }
  });

  it("blocks paid-required sources until a plan is held (open-meteo)", () => {
    expect(isIngestible("open-meteo")).toBe(false);
    expect(() => assertIngestible("open-meteo")).toThrow(/paid-required/);
  });

  it("refuses the DraftKings hidden API and routes DK salaries through licensed feeds", () => {
    // The unofficial DK scrape is hard-blocked in code.
    expect(isIngestible("draftkings-unofficial")).toBe(false);
    expect(() => assertIngestible("draftkings-unofficial")).toThrow(/Refusing to ingest/);
    expect(getSource("draftkings-unofficial")?.verdict).toBe("forbidden");
    // Licensed DFS feeds are the legal route — declared, but gated on a paid plan/key.
    expect(getSource("sportsdataio")?.verdict).toBe("paid-required");
    expect(getSource("sportsdataio")?.commercialUse).toBe(true);
    expect(isIngestible("sportsdataio")).toBe(false); // not auto-ingestible until a key/plan is held
  });

  it("throws on unknown sources so nothing is ingested without a declaration", () => {
    expect(isIngestible("totally-made-up")).toBe(false);
    expect(() => assertIngestible("totally-made-up")).toThrow(/Unknown data source/);
  });

  it("clears the new open/public-domain sources", () => {
    for (const id of ["nws-weather", "retrosheet", "lahman-db", "openfootball", "cricsheet"]) {
      expect(isIngestible(id)).toBe(true);
    }
    expect(isIngestible("moneypuck")).toBe(false);
    expect(getSource("moneypuck")?.commercialUse).toBe(false);
    expect(isIngestible("kalshi")).toBe(false);
    expect(getSource("kalshi")?.commercialUse).toBe(false);
    expect(getSource("kalshi")?.verdict).toBe("paid-required");
    expect(getSource("kalshi")?.license.url).toBe(
      "https://assets.kalshi.com/Kalshi-Developer-Agreement.pdf",
    );
    expect(() => assertIngestible("kalshi")).toThrow(/paid-required/);
    expect(isIngestible("clubelo")).toBe(true);
    expect(getSource("clubelo")?.verdict).toBe("use-with-caution");
    expect(getSource("clubelo")?.commercialUse).toBe(false);
    expect(getSource("clubelo")?.attributionRequired).toBe(true);
    expect(attributionFor("clubelo")).toMatch(/ClubElo/i);
    expect(getSource("nws-weather")?.commercialUse).toBe(true);
    expect(getSource("openfootball")?.license.spdx).toBe("CC0-1.0");
    expect(attributionFor("retrosheet")).toMatch(/Retrosheet/);
  });

  it("refuses scrape-/non-commercial sources from the source dumps", () => {
    for (const id of ["sports-reference", "fangraphs", "pff", "statsbomb-free", "ergast", "understat"]) {
      expect(isIngestible(id)).toBe(false);
      expect(() => assertIngestible(id)).toThrow();
    }
    // The famous "free" traps are correctly non-commercial / forbidden.
    expect(getSource("statsbomb-free")?.commercialUse).toBe(false);
    expect(getSource("ergast")?.license.spdx).toBe("CC-BY-NC-4.0");
  });

  it("partitions the registry into cleared vs forbidden/paid", () => {
    const cleared = clearedSources().map((s) => s.id);
    const blocked = forbiddenSources().map((s) => s.id);
    expect(cleared).toEqual(expect.arrayContaining(["nflverse", "the-odds-api", "sleeper"]));
    expect(blocked).toEqual(
      expect.arrayContaining([
        "espn-hidden-api",
        "pro-football-reference",
        "nfelo",
        "open-meteo",
        "sportsbookish",
        "smartstake-mlb-props",
        "sportsbook-software-json-api",
        "huggingface-kalshi-api-dump",
        "convokit-sportsbook-reddit",
        "sharp-api",
        "prophetx",
        "novig",
        "pinnacle-unofficial",
      ]),
    );
    expect(cleared).toEqual(
      expect.arrayContaining(["therundown", "predexon", "novig-public-csv"]),
    );
    // No source can be both.
    expect(cleared.some((id) => blocked.includes(id))).toBe(false);
  });

  it("every declared source carries a license URL and a legal reason", () => {
    for (const source of Object.values(SOURCE_REGISTRY)) {
      expect(source.license.url).toMatch(/^https?:\/\//);
      expect(source.reason.length).toBeGreaterThan(10);
      expect(getSource(source.id)).toBe(source);
    }
  });
});
