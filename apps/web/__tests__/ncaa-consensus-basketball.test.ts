import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseEspnScoreboard } from "@/lib/data-sources/free-adapters/espn-scores";
import { parseHenrygdScoreboard } from "@/lib/data-sources/free-adapters/henrygd-ncaa";
import {
  crossCheckNcaaScores,
  toComparableFromEspn,
  toComparableFromHenrygd,
  type ComparableGame,
} from "@/lib/data-sources/ncaa-consensus";

const FIX = resolve(__dirname, "fixtures");
const read = (f: string) => JSON.parse(readFileSync(resolve(FIX, f), "utf8"));

// The same consensus that confirms football also confirms basketball (March Madness),
// because it joins on stable team abbreviations and is sport-agnostic.
const espn = parseEspnScoreboard(read("espn-ncaab-scoreboard.json"), "ncaab")
  .map(toComparableFromEspn)
  .filter((g): g is ComparableGame => g !== null);
const henry = parseHenrygdScoreboard(read("henrygd-basketball-scoreboard.json")).map(toComparableFromHenrygd);

describe("NCAA basketball cross-source consensus", () => {
  it("confirms men's basketball finals agreed by ESPN and henrygd", () => {
    const report = crossCheckNcaaScores(espn, henry);
    expect(report.summary.confirmed).toBeGreaterThanOrEqual(2);
    expect(report.summary.conflicts).toBe(0);
  });

  it("matches the Houston game across both sources with identical scores", () => {
    const report = crossCheckNcaaScores(espn, henry);
    const hou = report.agreements.find((a) => a.matchupKey.includes("HOU"));
    expect(hou).toBeDefined();
    expect(hou!.a.home).toBe(hou!.b.home);
    expect(hou!.a.away).toBe(hou!.b.away);
  });

  it("still flags a tampered basketball score as a conflict", () => {
    const tampered = henry.map((g) => ({ ...g, home: { ...g.home, score: 200 } }));
    const report = crossCheckNcaaScores(espn, tampered);
    expect(report.summary.confirmed).toBe(0);
    expect(report.summary.conflicts).toBeGreaterThanOrEqual(2);
  });
});
