/**
 * Unit tests for the live Neon odds de-vig loader (gate T-08 math contract).
 * Golden values cross-checked against an independent Python Shin solver.
 */
import { describe, it, expect } from "vitest";
import {
  americanToImplied,
  shinDevig,
  shinFromImplied,
  consensusDevig,
  nflWeekWindowUtc,
} from "./neon-odds-devig-loader";

const sum = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0);

describe("americanToImplied", () => {
  it("converts negative American odds", () => {
    expect(americanToImplied(-110)).toBeCloseTo(0.5238095, 6);
    expect(americanToImplied(-150)).toBeCloseTo(0.6, 9);
  });
  it("converts positive American odds", () => {
    expect(americanToImplied(130)).toBeCloseTo(0.4347826, 6);
    expect(americanToImplied(100)).toBeCloseTo(0.5, 9);
  });
  it("treats invalid prices as zero implied", () => {
    expect(americanToImplied(0)).toBe(0);
    expect(americanToImplied(NaN)).toBe(0);
  });
});

describe("shinDevig — known-input golden cases", () => {
  it("[-110,-110] de-vigs to exactly 0.5/0.5 (retired 0.5238 was the RAW implied)", () => {
    const fair = shinDevig([-110, -110]);
    expect(fair[0]).toBeCloseTo(0.5, 9);
    expect(fair[1]).toBeCloseTo(0.5, 9);
    expect(sum(fair)).toBeCloseTo(1, 12);
    // The retired anchor must never survive de-vig on a balanced book.
    expect(Math.abs(fair[0]! - 0.5238)).toBeGreaterThan(0.02);
  });

  it("[-150,130] matches the independent Shin reference", () => {
    const fair = shinDevig([-150, 130]);
    expect(fair[0]).toBeCloseTo(0.582608695652174, 6);
    expect(fair[1]).toBeCloseTo(0.4173913043478261, 6);
    expect(Math.abs(sum(fair) - 1)).toBeLessThan(1e-9);
    expect(fair[0]!).toBeGreaterThan(fair[1]!);
  });

  it("[-200,170] matches the independent Shin reference", () => {
    const fair = shinDevig([-200, 170]);
    expect(fair[0]).toBeCloseTo(0.6481481481481481, 6);
    expect(fair[1]).toBeCloseTo(0.35185185185185197, 6);
    expect(sum(fair)).toBeCloseTo(1, 9);
  });

  it("three-way market [100,200,300] sums to 1 and matches reference", () => {
    const fair = shinDevig([100, 200, 300]);
    expect(fair[0]).toBeCloseTo(0.4694135420493102, 6);
    expect(fair[1]).toBeCloseTo(0.3060690590061109, 6);
    expect(fair[2]).toBeCloseTo(0.22451739894457887, 6);
    expect(Math.abs(sum(fair) - 1)).toBeLessThan(1e-9);
  });

  it("heavy favourite [-400,310] matches reference", () => {
    const fair = shinDevig([-400, 310]);
    expect(fair[0]).toBeCloseTo(0.7780487804878048, 6);
    expect(fair[1]).toBeCloseTo(0.22195121951219507, 6);
  });

  it("margin-free book [100,100] stays 0.5/0.5", () => {
    const fair = shinDevig([100, 100]);
    expect(fair[0]).toBeCloseTo(0.5, 12);
    expect(fair[1]).toBeCloseTo(0.5, 12);
  });

  it("under-round book is proportionally normalized", () => {
    const fair = shinDevig([110, 110]);
    expect(sum(fair)).toBeCloseTo(1, 12);
    expect(fair[0]).toBeCloseTo(0.5, 12);
  });

  it("Shin lifts the favourite above proportional de-vig (favourite–longshot bias)", () => {
    const fair = shinDevig([-150, 130]);
    const proportional = 0.6 / (0.6 + 100 / 230);
    expect(fair[0]!).toBeGreaterThan(proportional);
  });

  it("every fair prob is strictly inside (0,1) and none equals the retired anchor", () => {
    for (const prices of [[-110, -110], [-150, 130], [-200, 170], [100, 200, 300], [-400, 310], [-1000, 650]]) {
      const fair = shinDevig(prices);
      for (const p of fair) {
        expect(p).toBeGreaterThan(0);
        expect(p).toBeLessThan(1);
        expect(Math.abs(p - 0.5238)).toBeGreaterThan(1e-9);
      }
      expect(Math.abs(sum(fair) - 1)).toBeLessThan(1e-9);
    }
  });

  it("empty input returns empty output", () => {
    expect(shinDevig([])).toEqual([]);
    expect(shinFromImplied([])).toEqual([]);
  });
});

describe("consensusDevig", () => {
  const snap = (bookmaker: string, over: number, under: number) => ({
    gameId: "g1",
    market: "TOTALS",
    bookmaker,
    overPrice: over,
    underPrice: under,
    fetchedAt: new Date("2026-11-12T21:00:00Z"),
  });

  it("averages per-bookmaker fair probs and renormalizes to 1", () => {
    const c = consensusDevig([snap("bookA", -110, -110), snap("bookB", -120, 100)]);
    expect(c).not.toBeNull();
    expect(c!.bookmakers).toBe(2);
    expect(Math.abs(sum(c!.fairProbs) - 1)).toBeLessThan(1e-9);
    expect(c!.outcomes).toEqual(["over", "under"]);
    expect(c!.asOf).toBe("2026-11-12T21:00:00.000Z");
  });

  it("skips bookmakers missing a price for the family", () => {
    const broken = { ...snap("bookC", -110, -110), underPrice: null };
    const c = consensusDevig([snap("bookA", -110, -110), broken]);
    expect(c!.bookmakers).toBe(1);
  });

  it("returns null when no bookmaker has usable prices", () => {
    const broken = { ...snap("bookC", -110, -110), overPrice: 0 };
    expect(consensusDevig([broken])).toBeNull();
    expect(consensusDevig([])).toBeNull();
  });

  it("returns null for an unknown market family (no fabricated mapping)", () => {
    expect(consensusDevig([{ ...snap("bookA", -110, -110), market: "UNKNOWN_FAMILY" }])).toBeNull();
  });
});

describe("nflWeekWindowUtc", () => {
  it("Week 10 2026 opens Thu Nov 12 UTC and closes after the MNF UTC spill", () => {
    const { start, end } = nflWeekWindowUtc(2026, 10);
    expect(start.toISOString()).toBe("2026-11-12T00:00:00.000Z");
    expect(end.toISOString()).toBe("2026-11-20T00:00:00.000Z");
    // Stored TNF kickoff (Thu Nov 12 8:15pm ET = Fri Nov 13 01:15 UTC) is inside.
    const tnf = new Date("2026-11-13T01:15:00Z");
    expect(tnf >= start && tnf < end).toBe(true);
    // Next week's TNF (Nov 19 8:15pm ET = Nov 20 01:15 UTC) is outside.
    const nextTnf = new Date("2026-11-20T01:15:00Z");
    expect(nextTnf >= start && nextTnf < end).toBe(false);
  });

  it("Week 1 2026 opens on the first Thursday on/after Sep 8 (Sep 10)", () => {
    const { start } = nflWeekWindowUtc(2026, 1);
    expect(start.toISOString()).toBe("2026-09-10T00:00:00.000Z");
  });
});