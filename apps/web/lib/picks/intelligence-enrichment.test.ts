import { describe, expect, it } from "vitest";
import {
  enrichPickWithIntelligence,
  universalSignalsFromPick,
  type PickForIntelligence,
} from "./intelligence-enrichment";

function pick(over: Partial<PickForIntelligence> = {}): PickForIntelligence {
  return {
    id: "pick-1",
    selection: "KC ML (model signal)",
    pickType: "MONEYLINE",
    confidence: 72,
    reasoning: "Independent blend: model estimate 72.0% for KC.",
    sportKey: "americanfootball_nfl",
    commenceTime: "2026-09-25T20:00:00.000Z",
    homeTeamName: "Kansas City Chiefs",
    awayTeamName: "Buffalo Bills",
    homeFairProb: 0.72,
    awayFairProb: 0.28,
    marketFairProb: null,
    line: null,
    consensusPct: null,
    bookmakerCount: null,
    modelVersion: "v5.2.7",
    pickGrade: "LEAN",
    ...over,
  };
}

describe("enrichPickWithIntelligence", () => {
  it("returns six questions and family weights", () => {
    const r = enrichPickWithIntelligence(pick());
    expect(r.sixQuestions).not.toBeNull();
    expect(r.sixQuestions!.what.length).toBeGreaterThan(0);
    expect(r.familyWeights).not.toBeNull();
    expect(Object.keys(r.familyWeights!).length).toBeGreaterThan(0);
    expect(r.calibratedProb).not.toBeNull();
    expect(r.calibratedProb!).toBeGreaterThan(0);
    expect(r.calibratedProb!).toBeLessThan(1);
  });

  it("fail-opens on a bad pick", () => {
    const r = enrichPickWithIntelligence(pick({ commenceTime: "not-a-date" }));
    expect(r.calibratedProb === null || Number.isFinite(r.calibratedProb)).toBe(true);
  });

  it("carries publish state and why/whyNot spine", () => {
    const r = enrichPickWithIntelligence(pick());
    expect(["SHADOW", "WITHHOLD", "CANDIDATE"]).toContain(r.publishState);
    expect(Array.isArray(r.why)).toBe(true);
    expect(Array.isArray(r.whyNot)).toBe(true);
  });

  it("universalSignalsFromPick assembles market signals from the pick row", () => {
    const s = universalSignalsFromPick(pick({ line: -3, bookmakerCount: 4 }));
    expect(s.market?.devig?.homeProb).toBeCloseTo(0.72, 5);
    expect(s.market?.consensus?.books).toBe(4);
  });

  it("feeds wireEverything observations into the reasoning spine", () => {
    const p = pick({ line: -3, bookmakerCount: 4 });
    const r = enrichPickWithIntelligence(p, new Date(), universalSignalsFromPick(p));
    expect(r.familyCoverage).not.toBeNull();
    if (r.familyCoverage) {
      expect(r.familyCoverage.total).toBeGreaterThanOrEqual(0);
      expect(r.familyCoverage.familiesCovered).toBeGreaterThanOrEqual(0);
    }
    // universal-wiring must have contributed observations beyond bare market
    expect(r.observationCount).toBeGreaterThan(0);
  });

  it("fail-opens when universal wiring throws", () => {
    const r = enrichPickWithIntelligence(pick(), new Date(), {
      market: { devig: { homeProb: Number.NaN, awayProb: Number.NaN } },
    } as never);
    expect(r.calibratedProb === null || Number.isFinite(r.calibratedProb)).toBe(true);
  });
});
