import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseEspnScoreboard } from "@/lib/data-sources/free-adapters/espn-scores";
import { parseHenrygdScoreboard } from "@/lib/data-sources/free-adapters/henrygd-ncaa";
import {
  crossCheckNcaaScores,
  resilientNcaaScores,
  toComparableFromEspn,
  toComparableFromHenrygd,
  normAbbr,
  matchupKey,
  type ComparableGame,
} from "@/lib/data-sources/ncaa-consensus";

const FIX = resolve(__dirname, "fixtures");
const read = (f: string) => JSON.parse(readFileSync(resolve(FIX, f), "utf8"));

const espn = parseEspnScoreboard(read("espn-ncaaf-scoreboard.json"), "ncaaf")
  .map(toComparableFromEspn)
  .filter((g): g is ComparableGame => g !== null);
const henry = parseHenrygdScoreboard(read("henrygd-scoreboard.json")).map(toComparableFromHenrygd);

describe("NCAA cross-source consensus", () => {
  it("normalizes abbreviations and builds orientation-independent keys", () => {
    expect(normAbbr("Navy")).toBe("NAVY");
    const g = { source: "x", date: "2025-12-13", completed: true, home: { abbr: "NAVY", name: "Navy", score: 17 }, away: { abbr: "ARMY", name: "Army", score: 16 } };
    const flipped = { ...g, home: g.away, away: g.home };
    expect(matchupKey(g)).toBe(matchupKey(flipped)); // home/away order does not change the key
  });

  it("confirms the Army-Navy final agreed by ESPN and henrygd", () => {
    const report = crossCheckNcaaScores(espn, henry);
    expect(report.summary.confirmed).toBeGreaterThanOrEqual(1);
    expect(report.summary.conflicts).toBe(0);
    const navy = report.agreements.find((a) => a.matchupKey.includes("NAVY"));
    expect(navy).toBeDefined();
    expect(navy!.a.home).toBe(navy!.b.home); // 17 == 17
    expect(navy!.a.away).toBe(navy!.b.away); // 16 == 16
  });

  it("flags a real disagreement instead of trusting either source", () => {
    // Tamper with henrygd's score for the same matchup.
    const tampered = henry.map((g) => ({ ...g, home: { ...g.home, score: 99 } }));
    const report = crossCheckNcaaScores(espn, tampered);
    expect(report.summary.confirmed).toBe(0);
    expect(report.summary.conflicts).toBeGreaterThanOrEqual(1);
  });

  it("reports coverage gaps when a source lacks a game", () => {
    const report = crossCheckNcaaScores(espn, []);
    expect(report.summary.coverageGaps).toBeGreaterThanOrEqual(1);
    expect(report.agreements.length).toBe(0);
  });

  it("treats not-yet-final games as pending, not confirmed", () => {
    const live = espn.map((g) => ({ ...g, completed: false }));
    const report = crossCheckNcaaScores(live, henry);
    expect(report.summary.confirmed).toBe(0);
    expect(report.summary.pending).toBeGreaterThanOrEqual(1);
  });

  it("does NOT confirm the same team pair played on a different date (rematch guard)", () => {
    // Same matchup key, but the secondary's copy is 90 days later — a different game.
    const shifted = henry.map((g) => ({ ...g, date: "2026-03-13" }));
    const report = crossCheckNcaaScores(espn, shifted);
    expect(report.summary.confirmed).toBe(0);
    expect(report.summary.coverageGaps).toBeGreaterThanOrEqual(2); // each side stands alone
  });

  it("tolerates a one-day UTC/local rollover when matching", () => {
    const nextDay = henry.map((g) => ({ ...g, date: "2025-12-14" }));
    const report = crossCheckNcaaScores(espn, nextDay);
    expect(report.summary.confirmed).toBeGreaterThanOrEqual(1);
  });
});

describe("NCAA free-source failover", () => {
  it("serves from the primary when it is healthy", async () => {
    const r = await resilientNcaaScores(async () => espn, async () => henry);
    expect(r.servedBy).toBe("primary");
    expect(r.degraded).toBe(false);
  });

  it("falls back to the secondary when the primary throws", async () => {
    const r = await resilientNcaaScores(async () => { throw new Error("ESPN 503"); }, async () => henry);
    expect(r.servedBy).toBe("secondary");
    expect(r.degraded).toBe(true);
    expect(r.error).toContain("503");
    expect(r.games.length).toBeGreaterThan(0);
  });

  it("falls back when the primary returns empty", async () => {
    const r = await resilientNcaaScores(async () => [], async () => henry);
    expect(r.servedBy).toBe("secondary");
    expect(r.degraded).toBe(true);
  });

  it("reports none when both sources are down", async () => {
    const r = await resilientNcaaScores(async () => { throw new Error("down"); }, async () => { throw new Error("down"); });
    expect(r.servedBy).toBe("none");
    expect(r.games.length).toBe(0);
  });
});
