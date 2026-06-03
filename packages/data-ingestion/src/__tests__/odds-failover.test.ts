import { describe, it, expect, vi } from "vitest";
import {
  mergeNormalizedOdds,
  bookmakerCoverage,
  gamesBelowThreshold,
  resolveOddsWithFailover,
  type OddsProviderResult,
} from "../odds-failover.js";
import type { NormalizedOdds } from "@sports/types";

const FETCHED = new Date("2026-04-15T17:00:00Z");

function odd(game: string, bookmaker: string, market: NormalizedOdds["market"], homePrice = -110): NormalizedOdds {
  return { gameExternalId: game, bookmaker, market, homePrice, awayPrice: -110, fetchedAt: FETCHED };
}

function result(odds: NormalizedOdds[], healthy = true, error?: string): OddsProviderResult {
  return { provider: "test", odds, healthy, error };
}

describe("mergeNormalizedOdds", () => {
  it("adds only bookmakers the primary lacks; primary wins on conflict", () => {
    const primary = [odd("g1", "fanduel", "H2H", -150)];
    const secondary = [
      odd("g1", "fanduel", "H2H", -200), // conflict — primary kept
      odd("g1", "betmgm", "H2H", -140), // new — added
    ];
    const merged = mergeNormalizedOdds(primary, secondary);
    expect(merged).toHaveLength(2);
    expect(merged.find((o) => o.bookmaker === "fanduel")!.homePrice).toBe(-150);
    expect(merged.some((o) => o.bookmaker === "betmgm")).toBe(true);
  });

  it("treats different markets from the same book as distinct", () => {
    const merged = mergeNormalizedOdds([odd("g1", "fanduel", "H2H")], [odd("g1", "fanduel", "SPREADS")]);
    expect(merged).toHaveLength(2);
  });
});

describe("coverage helpers", () => {
  it("counts distinct bookmakers per game across markets", () => {
    const cov = bookmakerCoverage([
      odd("g1", "fanduel", "H2H"),
      odd("g1", "fanduel", "SPREADS"),
      odd("g1", "betmgm", "H2H"),
      odd("g2", "fanduel", "H2H"),
    ]);
    expect(cov.get("g1")).toBe(2);
    expect(cov.get("g2")).toBe(1);
  });

  it("flags games below the bookmaker threshold", () => {
    const gaps = gamesBelowThreshold(
      [odd("g1", "fanduel", "H2H"), odd("g1", "betmgm", "H2H"), odd("g2", "fanduel", "H2H")],
      2,
    );
    expect(gaps).toEqual(["g2"]);
  });
});

describe("resolveOddsWithFailover", () => {
  it("never calls the secondary when the primary is healthy and fully covered", async () => {
    const fetchSecondary = vi.fn();
    const out = await resolveOddsWithFailover({
      primary: result([odd("g1", "fanduel", "H2H"), odd("g1", "betmgm", "H2H")]),
      minBookmakers: 2,
      fetchSecondary,
    });
    expect(out.usedSecondary).toBe(false);
    expect(out.reason).toBe("primary-sufficient");
    expect(fetchSecondary).not.toHaveBeenCalled();
  });

  it("calls the secondary to fill a coverage gap and closes it", async () => {
    const out = await resolveOddsWithFailover({
      primary: result([odd("g1", "fanduel", "H2H")]), // only 1 book → gap
      minBookmakers: 2,
      fetchSecondary: async () => result([odd("g1", "betmgm", "H2H")]),
    });
    expect(out.usedSecondary).toBe(true);
    expect(out.reason).toBe("coverage-gap");
    expect(out.coverageGapsBefore).toEqual(["g1"]);
    expect(out.coverageGapsAfter).toEqual([]);
  });

  it("falls back to the secondary when the primary is unhealthy", async () => {
    const out = await resolveOddsWithFailover({
      primary: result([], false, "503"),
      minBookmakers: 2,
      fetchSecondary: async () => result([odd("g1", "fanduel", "H2H"), odd("g1", "betmgm", "H2H")]),
    });
    expect(out.usedSecondary).toBe(true);
    expect(out.reason).toBe("primary-unhealthy");
    expect(out.coverageGapsAfter).toEqual([]);
  });

  it("degrades gracefully to the primary when the secondary throws", async () => {
    const out = await resolveOddsWithFailover({
      primary: result([odd("g1", "fanduel", "H2H")]),
      minBookmakers: 2,
      fetchSecondary: async () => {
        throw new Error("secondary down");
      },
    });
    expect(out.usedSecondary).toBe(false);
    expect(out.secondaryError).toBe("secondary down");
    expect(out.coverageGapsAfter).toEqual(["g1"]);
  });

  it("reports no-secondary when a gap exists but no failover is configured", async () => {
    const out = await resolveOddsWithFailover({
      primary: result([odd("g1", "fanduel", "H2H")]),
      minBookmakers: 2,
    });
    expect(out.usedSecondary).toBe(false);
    expect(out.reason).toBe("no-secondary");
  });
});
