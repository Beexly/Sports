/**
 * UNIVERSAL EVENT GENOME + DERIVED STATS — tests.
 *
 * Proves: the three fixtures load across three sports, each adapter has a period schema and renders a
 * score, sport-specific data degrades gracefully, no fixture renders as live; and every derived stat
 * carries a passport (with a weakness, a falsifier, a decision-use), is zero-division safe, and — being
 * fixture-computed — can never claim more than EXPERIMENTAL.
 */

import { describe, it, expect } from "vitest";
import {
  adapterFor,
  isLive,
  statNum,
  SoccerAdapter,
  BaseballAdapter,
  FootballCflAdapter,
  type UniversalEventGenome,
} from "../universal-event-genome.js";
import { ECUADOR_GERMANY, RAYS_ROYALS, ROUGHRIDERS_ARGONAUTS, EVENT_GENOME_FIXTURES } from "../event-genome-fixtures.js";
import { matchDerivedStats } from "../match-derived-stats.js";

describe("Fixtures load across three sports", () => {
  it("soccer fixture: Ecuador 2–1 Germany, ended, halves schema", () => {
    expect(ECUADOR_GERMANY.sport).toBe("soccer");
    expect(ECUADOR_GERMANY.scoreState.home).toBe(2);
    expect(ECUADOR_GERMANY.scoreState.away).toBe(1);
    expect(ECUADOR_GERMANY.status).toBe("ENDED");
    expect(ECUADOR_GERMANY.periodSchema.kind).toBe("CONTINUOUS_HALVES");
    expect(ECUADOR_GERMANY.timeline.filter((e) => e.type === "GOAL")).toHaveLength(3);
  });
  it("baseball fixture: Rays 13–2 Royals, 9-inning schema, probable starters", () => {
    expect(RAYS_ROYALS.sport).toBe("baseball");
    expect(RAYS_ROYALS.scoreState.home).toBe(13);
    expect(RAYS_ROYALS.periodSchema.segments).toHaveLength(9);
    expect(statNum(RAYS_ROYALS, "hitsHome")).toBeGreaterThan(0);
    expect(RAYS_ROYALS.stats.starterHome).toBe("Ian Seymour");
  });
  it("CFL fixture: upcoming, quarters schema, spread/total present", () => {
    expect(ROUGHRIDERS_ARGONAUTS.sport).toBe("football");
    expect(ROUGHRIDERS_ARGONAUTS.status).toBe("UPCOMING");
    expect(ROUGHRIDERS_ARGONAUTS.periodSchema.segments).toEqual(["Q1", "Q2", "Q3", "Q4"]);
    expect(ROUGHRIDERS_ARGONAUTS.odds.some((o) => o.market === "Total points")).toBe(true);
  });
  it("the fixture registry exposes all three", () => {
    expect(Object.keys(EVENT_GENOME_FIXTURES).sort()).toEqual(["baseball", "football", "soccer"]);
  });
});

describe("Adapters — period schema + score rendering + graceful degrade", () => {
  it("each adapter has a period schema and renders a score summary", () => {
    expect(SoccerAdapter.periodSchema.regulationSegments).toBe(2);
    expect(BaseballAdapter.periodSchema.regulationSegments).toBe(9);
    expect(FootballCflAdapter.periodSchema.regulationSegments).toBe(4);
    expect(SoccerAdapter.scoreSummary(ECUADOR_GERMANY)).toContain("Ecuador");
    expect(BaseballAdapter.scoreSummary(RAYS_ROYALS)).toContain("@");
    expect(FootballCflAdapter.scoreSummary(ROUGHRIDERS_ARGONAUTS)).toContain("Saskatchewan");
  });
  it("an unmapped sport degrades to the generic adapter (no throw)", () => {
    const a = adapterFor("tennis");
    expect(a.sport).toBe("generic");
    expect(a.keyStatKeys()).toEqual([]);
  });
  it("missing stat keys read as 0, not NaN (graceful degrade)", () => {
    expect(statNum(ROUGHRIDERS_ARGONAUTS, "xgHome")).toBe(0); // CFL has no xG
  });
});

describe("No fixture renders as live", () => {
  it("isLive() is always false and every fixture is watermarked", () => {
    for (const g of [ECUADOR_GERMANY, RAYS_ROYALS, ROUGHRIDERS_ARGONAUTS] as UniversalEventGenome[]) {
      expect(isLive(g)).toBe(false);
      expect(g.fixtureWatermarked).toBe(true);
    }
  });
});

describe("20 soccer derived stats — every stat has a passport", () => {
  const stats = matchDerivedStats(ECUADOR_GERMANY);

  it("produces 20 stats for soccer; none for non-soccer (graceful)", () => {
    expect(stats).toHaveLength(20);
    expect(matchDerivedStats(RAYS_ROYALS)).toHaveLength(0);
  });

  it("every stat has a passport with a falsifier, a weakness, and a decision-use", () => {
    for (const s of stats) {
      expect(s.passport.falsifier.length).toBeGreaterThan(0);
      expect(s.weakness.length).toBeGreaterThan(0);
      expect(s.decisionUse.length).toBeGreaterThan(0);
      expect(s.fixtureWatermarked).toBe(true);
    }
  });

  it("no derived stat claims more than EXPERIMENTAL on a fixture", () => {
    for (const s of stats) {
      expect(["CANDIDATE", "EXPERIMENTAL"]).toContain(s.passport.status);
    }
  });

  it("no stat divides by zero (values are finite or explicitly null)", () => {
    for (const s of stats) {
      expect(s.value === null || Number.isFinite(s.value)).toBe(true);
    }
  });

  it("headline reads are correct: Possession Mirage is positive (Germany held the ball, not the xG)", () => {
    const mirage = stats.find((s) => s.key === "possession_mirage_index");
    expect(mirage?.value).not.toBeNull();
    expect(mirage!.value!).toBeGreaterThan(0); // possession% >> xG share% for the dominant side
  });

  it("Underdog Deservedness is positive (Ecuador out-created its price)", () => {
    const u = stats.find((s) => s.key === "underdog_deservedness_score");
    expect(u!.value!).toBeGreaterThan(0);
  });

  it("Stat Meaning Confidence stays low on one fixture (the honest meta-stat)", () => {
    const c = stats.find((s) => s.key === "stat_meaning_confidence");
    expect(c!.value!).toBeLessThanOrEqual(0.3);
  });
});
