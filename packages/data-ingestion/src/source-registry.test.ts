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

  it("throws on unknown sources so nothing is ingested without a declaration", () => {
    expect(isIngestible("totally-made-up")).toBe(false);
    expect(() => assertIngestible("totally-made-up")).toThrow(/Unknown data source/);
  });

  it("partitions the registry into cleared vs forbidden/paid", () => {
    const cleared = clearedSources().map((s) => s.id);
    const blocked = forbiddenSources().map((s) => s.id);
    expect(cleared).toEqual(expect.arrayContaining(["nflverse", "the-odds-api", "sleeper"]));
    expect(blocked).toEqual(
      expect.arrayContaining(["espn-hidden-api", "pro-football-reference", "nfelo", "open-meteo"]),
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
