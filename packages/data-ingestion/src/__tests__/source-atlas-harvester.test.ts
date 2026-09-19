import { describe, it, expect } from "vitest";
import {
  loadSourceAtlas,
  getSourcesByLeague,
  getSourcesByFamily,
  mapSourceToSignalFamily,
  SourceAtlasEntry,
} from "../source-atlas-harvester";

describe("Source Atlas Harvester Suite", () => {
  it("loads the source registry and parses valid entries", () => {
    const atlas = loadSourceAtlas();
    expect(atlas).toBeDefined();
    expect(atlas.source_count).toBeGreaterThan(0);
    expect(atlas.sources.length).toBeGreaterThan(0);
  });

  it("filters sources by NFL league scope", () => {
    const nflSources = getSourcesByLeague("NFL");
    expect(nflSources.length).toBeGreaterThan(0);
    for (const s of nflSources) {
      expect(s.league_scope.map((l) => l.toUpperCase())).toContain("NFL");
    }
  });

  it("correctly maps source categories and content types to Signal Families", () => {
    const sampleEntry: SourceAtlasEntry = {
      source_id: "test_weather",
      canonical_name: "NFL Stadium Weather",
      aliases: ["weather"],
      primary_url: "https://example.com/weather",
      domain: "example.com",
      source_family: "weather",
      source_class: "Stadium Microclimate",
      source_category: "weather_environmental",
      sport_scope: ["football"],
      league_scope: ["NFL"],
      team_scope: [],
      content_types: ["wind", "temperature"],
      access_method: "api",
      legal_gate_status: "lawful_open",
      adapter_status: "active",
      priority_score: 90,
      value_score: 85,
      freshness_score: 95,
    };

    const family = mapSourceToSignalFamily(sampleEntry);
    expect(family).toBe("MICROCLIMATE");
  });

  it("returns sources mapped to EFFICIENCY and MARKET families", () => {
    const efficiencySources = getSourcesByFamily("EFFICIENCY");
    expect(efficiencySources.length).toBeGreaterThan(0);
  });
});
