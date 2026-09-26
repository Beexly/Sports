import { describe, expect, it } from "vitest";
import {
  FIXTURE_SENTINEL_SOURCE_IDS,
  isFixtureSentinelSourceId,
  isLineageClearedForDisplay,
  isSourceClearedForDisplay,
  realSourcesIn,
  unclearedSourcesIn,
} from "../commercial-gate";
import { loadPlayers } from "../product";

describe("commercial-gate", () => {
  describe("isFixtureSentinelSourceId", () => {
    it("recognizes both documented fixture sentinels", () => {
      for (const id of FIXTURE_SENTINEL_SOURCE_IDS) {
        expect(isFixtureSentinelSourceId(id)).toBe(true);
      }
    });

    it("does not treat a real registry id as a sentinel", () => {
      expect(isFixtureSentinelSourceId("nflverse")).toBe(false);
      expect(isFixtureSentinelSourceId("espn-public-api")).toBe(false);
    });
  });

  describe("isSourceClearedForDisplay", () => {
    it("clears a source with commercial_display_allowed=true", () => {
      expect(isSourceClearedForDisplay("nflverse")).toBe(true);
      expect(isSourceClearedForDisplay("open-meteo")).toBe(true);
      expect(isSourceClearedForDisplay("ffc-adp")).toBe(true);
    });

    it("fails closed on a registered source with commercial_display_allowed=false", () => {
      expect(isSourceClearedForDisplay("espn-public-api")).toBe(false);
      expect(isSourceClearedForDisplay("sleeper-api")).toBe(false);
      expect(isSourceClearedForDisplay("ffverse-ffopportunity")).toBe(false);
      expect(isSourceClearedForDisplay("pfr-advstats-via-nflverse")).toBe(false);
      expect(isSourceClearedForDisplay("kalshi")).toBe(false);
    });

    it("fails closed on an unregistered id", () => {
      expect(isSourceClearedForDisplay("not-a-real-source")).toBe(false);
    });

    it("fails closed on a fixture sentinel looked up directly (not a registry entry)", () => {
      expect(isSourceClearedForDisplay("open_snapshot")).toBe(false);
      expect(isSourceClearedForDisplay("fixture_fallback")).toBe(false);
    });
  });

  describe("realSourcesIn", () => {
    it("returns an empty list for undefined or empty lineage", () => {
      expect(realSourcesIn(undefined)).toEqual([]);
      expect(realSourcesIn([])).toEqual([]);
    });

    it("strips fixture sentinels and keeps real source ids", () => {
      expect(realSourcesIn(["open_snapshot", "fixture_fallback"])).toEqual([]);
      expect(realSourcesIn(["open_snapshot", "nflverse"])).toEqual(["nflverse"]);
      expect(realSourcesIn(["nflverse", "espn-public-api"])).toEqual(["nflverse", "espn-public-api"]);
    });
  });

  describe("isLineageClearedForDisplay", () => {
    it("clears an all-sentinel lineage (today's fixture data)", () => {
      expect(isLineageClearedForDisplay(["open_snapshot", "fixture_fallback"])).toBe(true);
    });

    it("clears undefined or empty lineage (nothing external to fail on)", () => {
      expect(isLineageClearedForDisplay(undefined)).toBe(true);
      expect(isLineageClearedForDisplay([])).toBe(true);
    });

    it("clears a lineage of only cleared real sources", () => {
      expect(isLineageClearedForDisplay(["nflverse", "open-meteo"])).toBe(true);
      expect(isLineageClearedForDisplay(["open_snapshot", "nflverse"])).toBe(true);
    });

    it("fails closed the whole record when any real source is uncleared", () => {
      expect(isLineageClearedForDisplay(["nflverse", "espn-public-api"])).toBe(false);
      expect(isLineageClearedForDisplay(["open_snapshot", "sleeper-api"])).toBe(false);
    });

    it("fails closed on an unregistered real source id", () => {
      expect(isLineageClearedForDisplay(["open_snapshot", "some-future-vendor"])).toBe(false);
    });
  });

  describe("unclearedSourcesIn", () => {
    it("is empty for a cleared or all-sentinel lineage", () => {
      expect(unclearedSourcesIn(["open_snapshot", "nflverse"])).toEqual([]);
      expect(unclearedSourcesIn(undefined)).toEqual([]);
    });

    it("lists only the real uncleared sources, excluding sentinels", () => {
      expect(unclearedSourcesIn(["open_snapshot", "espn-public-api", "sleeper-api", "nflverse"])).toEqual([
        "espn-public-api",
        "sleeper-api",
      ]);
    });
  });

  describe("today's real StatKing fixture data", () => {
    it("clears every current player snapshot (all-sentinel lineage, no live ingestion yet)", () => {
      const players = loadPlayers();
      expect(players.length).toBeGreaterThan(0);
      for (const player of players) {
        expect(isLineageClearedForDisplay(player.source_lineage)).toBe(true);
      }
    });
  });
});
