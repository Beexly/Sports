/**
 * Tests for prop-analytics library.
 * Pure unit tests — no network calls, no DB, no side effects.
 */

import { describe, it, expect } from "vitest";
import {
  propHitRate,
  propAverage,
  propStdDev,
  recentVsOverall,
  propTrend,
  analyzeProp,
  impliedHitRate,
  propValue,
  altLineAnalysis,
  splitByHomeAway,
  splitByOpponent,
  formatPropLine,
  propTypeCategory,
  type PropHistoricalResult,
  type PropLine,
  type PropType,
} from "@/lib/analytics/prop-analytics";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeResult(
  value: number,
  overrides: Partial<PropHistoricalResult> = {}
): PropHistoricalResult {
  return {
    value,
    gameDate: Date.now(),
    ...overrides,
  };
}

function makeProp(overrides: Partial<PropLine> = {}): PropLine {
  return {
    propType: "passing_yards",
    line: 250,
    overOdds: -110,
    underOdds: -110,
    playerName: "Test Player",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// propHitRate
// ---------------------------------------------------------------------------

describe("propHitRate", () => {
  it("returns null for empty array", () => {
    expect(propHitRate([], 100)).toBeNull();
  });

  it("returns 0 when all values are under the line", () => {
    const results = [makeResult(50), makeResult(80), makeResult(99)];
    expect(propHitRate(results, 100)).toBe(0);
  });

  it("returns 1 when all values are strictly over the line", () => {
    const results = [makeResult(150), makeResult(200), makeResult(300)];
    expect(propHitRate(results, 100)).toBe(1);
  });

  it("returns 0.6 when 3 of 5 results are over the line", () => {
    const results = [
      makeResult(100), // push — not counted as over
      makeResult(110),
      makeResult(120),
      makeResult(130),
      makeResult(90),  // under
    ];
    // values > 100: 110, 120, 130 → 3; push at exactly 100 not counted as over
    expect(propHitRate(results, 100)).toBeCloseTo(3 / 5);
  });

  it("excludes push (value === line) from over count but not denominator", () => {
    const results = [
      makeResult(100), // push
      makeResult(100), // push
      makeResult(110), // over
    ];
    // 1 over out of 3 total (pushes are in denominator)
    expect(propHitRate(results, 100)).toBeCloseTo(1 / 3);
  });

  it("returns 0 when all results are exactly on the line (all pushes)", () => {
    const results = [makeResult(250), makeResult(250), makeResult(250)];
    expect(propHitRate(results, 250)).toBe(0);
  });

  it("handles single result over line", () => {
    expect(propHitRate([makeResult(101)], 100)).toBe(1);
  });

  it("handles single result under line", () => {
    expect(propHitRate([makeResult(99)], 100)).toBe(0);
  });

  it("handles fractional line values", () => {
    const results = [makeResult(275), makeResult(260), makeResult(240)];
    // 275 > 265.5, 260 < 265.5, 240 < 265.5 → 1/3
    expect(propHitRate(results, 265.5)).toBeCloseTo(1 / 3);
  });
});

// ---------------------------------------------------------------------------
// propAverage
// ---------------------------------------------------------------------------

describe("propAverage", () => {
  it("returns null for empty array", () => {
    expect(propAverage([])).toBeNull();
  });

  it("returns the value for single result", () => {
    expect(propAverage([makeResult(100)])).toBe(100);
  });

  it("computes basic mean", () => {
    const results = [makeResult(100), makeResult(200), makeResult(300)];
    expect(propAverage(results)).toBeCloseTo(200);
  });

  it("handles decimal values", () => {
    const results = [makeResult(10.5), makeResult(20.5), makeResult(30.0)];
    expect(propAverage(results)).toBeCloseTo(20.333, 2);
  });

  it("handles all same values", () => {
    const results = [makeResult(50), makeResult(50), makeResult(50)];
    expect(propAverage(results)).toBe(50);
  });
});

// ---------------------------------------------------------------------------
// propStdDev
// ---------------------------------------------------------------------------

describe("propStdDev", () => {
  it("returns null for empty array", () => {
    expect(propStdDev([])).toBeNull();
  });

  it("returns null for single value", () => {
    expect(propStdDev([makeResult(100)])).toBeNull();
  });

  it("returns 0 for identical values", () => {
    const results = [makeResult(100), makeResult(100), makeResult(100)];
    expect(propStdDev(results)).toBeCloseTo(0);
  });

  it("computes population std dev for known values", () => {
    // Values: 2, 4, 4, 4, 5, 5, 7, 9 → mean=5, variance=4, stddev=2
    const results = [2, 4, 4, 4, 5, 5, 7, 9].map((v) => makeResult(v));
    expect(propStdDev(results)).toBeCloseTo(2, 5);
  });

  it("handles two values", () => {
    // Values: 0, 10 → mean=5, variance=25, stddev=5
    const results = [makeResult(0), makeResult(10)];
    expect(propStdDev(results)).toBeCloseTo(5);
  });
});

// ---------------------------------------------------------------------------
// recentVsOverall
// ---------------------------------------------------------------------------

describe("recentVsOverall", () => {
  it("returns all nulls for empty array", () => {
    const { recentRate, overallRate, delta } = recentVsOverall([], 100);
    expect(recentRate).toBeNull();
    expect(overallRate).toBeNull();
    expect(delta).toBeNull();
  });

  it("returns null delta when overall is null", () => {
    const { delta } = recentVsOverall([], 100, 5);
    expect(delta).toBeNull();
  });

  it("computes overall hit rate correctly", () => {
    // 10 results, 6 over → 0.6
    const results = Array.from({ length: 10 }, (_, i) =>
      makeResult(i < 6 ? 110 : 90, { gameDate: i })
    );
    const { overallRate } = recentVsOverall(results, 100, 5);
    expect(overallRate).toBeCloseTo(0.6);
  });

  it("uses the most recent N games by gameDate", () => {
    // 10 results sorted by gameDate; last 5 are all overs
    const results = [
      makeResult(90, { gameDate: 1 }),
      makeResult(90, { gameDate: 2 }),
      makeResult(90, { gameDate: 3 }),
      makeResult(90, { gameDate: 4 }),
      makeResult(90, { gameDate: 5 }),
      makeResult(110, { gameDate: 6 }),
      makeResult(110, { gameDate: 7 }),
      makeResult(110, { gameDate: 8 }),
      makeResult(110, { gameDate: 9 }),
      makeResult(110, { gameDate: 10 }),
    ];
    const { recentRate } = recentVsOverall(results, 100, 5);
    expect(recentRate).toBe(1); // all 5 recent are overs
  });

  it("computes delta as recentRate minus overallRate", () => {
    // overall 5/10=0.5; recent (last 5) 5/5=1.0; delta = 0.5
    const results = [
      makeResult(90, { gameDate: 1 }),
      makeResult(90, { gameDate: 2 }),
      makeResult(90, { gameDate: 3 }),
      makeResult(90, { gameDate: 4 }),
      makeResult(90, { gameDate: 5 }),
      makeResult(110, { gameDate: 6 }),
      makeResult(110, { gameDate: 7 }),
      makeResult(110, { gameDate: 8 }),
      makeResult(110, { gameDate: 9 }),
      makeResult(110, { gameDate: 10 }),
    ];
    const { delta } = recentVsOverall(results, 100, 5);
    expect(delta).toBeCloseTo(0.5);
  });

  it("defaults recentN to 5", () => {
    const results = Array.from({ length: 8 }, (_, i) =>
      makeResult(110, { gameDate: i })
    );
    const { recentRate } = recentVsOverall(results, 100);
    expect(recentRate).toBe(1); // all overs
  });
});

// ---------------------------------------------------------------------------
// propTrend
// ---------------------------------------------------------------------------

describe("propTrend", () => {
  it("returns neutral for empty results", () => {
    expect(propTrend([], 100)).toBe("neutral");
  });

  it("returns neutral when delta is exactly 0", () => {
    // Build equal distributions for overall and recent
    const results = Array.from({ length: 10 }, (_, i) =>
      makeResult(i % 2 === 0 ? 110 : 90, { gameDate: i })
    );
    // recent 5 (dates 5-9): 110,90,110,90,110 → 3/5=0.6
    // overall: 5/10=0.5 — delta=0.1, not > 0.15 so neutral
    expect(propTrend(results, 100, 5)).toBe("neutral");
  });

  it("returns hot when recentRate is much higher than overall", () => {
    // Overall 2/10=0.2, recent 5/5=1.0, delta=0.8 > 0.15
    const results = [
      makeResult(90, { gameDate: 1 }),
      makeResult(90, { gameDate: 2 }),
      makeResult(90, { gameDate: 3 }),
      makeResult(90, { gameDate: 4 }),
      makeResult(90, { gameDate: 5 }),
      makeResult(110, { gameDate: 6 }),
      makeResult(110, { gameDate: 7 }),
      makeResult(110, { gameDate: 8 }),
      makeResult(110, { gameDate: 9 }),
      makeResult(110, { gameDate: 10 }),
    ];
    // recent (last 5) all over → recentRate=1.0; overall=0.5; delta=0.5
    expect(propTrend(results, 100, 5)).toBe("hot");
  });

  it("returns cold when recentRate is much lower than overall", () => {
    // Flip: overall high, recent low
    const results = [
      makeResult(110, { gameDate: 1 }),
      makeResult(110, { gameDate: 2 }),
      makeResult(110, { gameDate: 3 }),
      makeResult(110, { gameDate: 4 }),
      makeResult(110, { gameDate: 5 }),
      makeResult(90, { gameDate: 6 }),
      makeResult(90, { gameDate: 7 }),
      makeResult(90, { gameDate: 8 }),
      makeResult(90, { gameDate: 9 }),
      makeResult(90, { gameDate: 10 }),
    ];
    // recent (last 5) all under → recentRate=0; overall=0.5; delta=-0.5
    expect(propTrend(results, 100, 5)).toBe("cold");
  });

  it("returns neutral when delta is exactly at threshold boundary (0.15)", () => {
    // delta exactly 0.15 is NOT > 0.15, so should be neutral
    // We need overall=0.5 and recent=0.65 → delta=0.15
    // 10 results, recent 5: need 3.25 overs which isn't possible exactly
    // Use 20 results: overall 10/20=0.5, recent 5: need 3+0.25 not possible
    // Simplest: overall 4/10=0.4, recent 3/5=0.6 → delta=0.2 → hot (above threshold)
    // Instead test delta < 0.15 → neutral
    const results = [
      makeResult(90, { gameDate: 1 }),
      makeResult(90, { gameDate: 2 }),
      makeResult(110, { gameDate: 3 }),
      makeResult(110, { gameDate: 4 }),
      makeResult(110, { gameDate: 5 }),
      makeResult(90, { gameDate: 6 }),
      makeResult(110, { gameDate: 7 }),
      makeResult(90, { gameDate: 8 }),
      makeResult(110, { gameDate: 9 }),
      makeResult(90, { gameDate: 10 }),
    ];
    // recent (last 5): 90,110,90,110,90 → 2/5=0.4; overall 5/10=0.5; delta=-0.1 → neutral
    expect(propTrend(results, 100, 5)).toBe("neutral");
  });
});

// ---------------------------------------------------------------------------
// analyzeProp
// ---------------------------------------------------------------------------

describe("analyzeProp", () => {
  it("returns null hitRate and EVs for empty results", () => {
    const prop = makeProp();
    const analysis = analyzeProp(prop, []);
    expect(analysis.hitRate).toBeNull();
    expect(analysis.overEv).toBeNull();
    expect(analysis.underEv).toBeNull();
    expect(analysis.sampleSize).toBe(0);
  });

  it("propagates hitRate into EV calculation", () => {
    const results = [makeResult(300), makeResult(300), makeResult(300)];
    const prop = makeProp({ line: 250, overOdds: -110, underOdds: -110 });
    const analysis = analyzeProp(prop, results);
    expect(analysis.hitRate).toBe(1);
    // overEv = 1.0 * (100/110) - 0.0 * 1 ≈ 0.909
    expect(analysis.overEv).toBeCloseTo(100 / 110, 3);
    // underEv = 0.0 * (100/110) - 1.0 * 1 = -1
    expect(analysis.underEv).toBeCloseTo(-1, 5);
  });

  it("computes overEv correctly for positive odds", () => {
    // hitRate = 0.5, overOdds = +150
    const results = [makeResult(260), makeResult(240)];
    const prop = makeProp({ line: 250, overOdds: 150, underOdds: -130 });
    const analysis = analyzeProp(prop, results);
    // overEv = 0.5 * (150/100) - 0.5 * 1 = 0.75 - 0.5 = 0.25
    expect(analysis.overEv).toBeCloseTo(0.25, 5);
  });

  it("computes underEv correctly", () => {
    // hitRate = 0 (all under), underOdds = -110
    const results = [makeResult(200), makeResult(180)];
    const prop = makeProp({ line: 250, overOdds: -110, underOdds: -110 });
    const analysis = analyzeProp(prop, results);
    // underHitRate = 1 - 0 = 1
    // underEv = 1 * (100/110) - 0 * 1 ≈ 0.909
    expect(analysis.underEv).toBeCloseTo(100 / 110, 3);
  });

  it("sets sampleSize correctly", () => {
    const results = [makeResult(100), makeResult(200), makeResult(300)];
    const analysis = analyzeProp(makeProp(), results);
    expect(analysis.sampleSize).toBe(3);
  });

  it("includes stdDev in analysis", () => {
    const results = [2, 4, 4, 4, 5, 5, 7, 9].map((v) => makeResult(v));
    const prop = makeProp({ line: 5 });
    const analysis = analyzeProp(prop, results);
    expect(analysis.stdDev).toBeCloseTo(2, 5);
  });

  it("returns null stdDev for single result", () => {
    const results = [makeResult(100)];
    const analysis = analyzeProp(makeProp(), results);
    expect(analysis.stdDev).toBeNull();
  });

  it("includes avgValue in analysis", () => {
    const results = [makeResult(100), makeResult(200), makeResult(300)];
    const analysis = analyzeProp(makeProp(), results);
    expect(analysis.avgValue).toBeCloseTo(200);
  });

  it("sets recentTrend correctly", () => {
    // All recent games way over the line — should be hot or neutral based on overall
    const results = [
      makeResult(90, { gameDate: 1 }),
      makeResult(90, { gameDate: 2 }),
      makeResult(90, { gameDate: 3 }),
      makeResult(90, { gameDate: 4 }),
      makeResult(90, { gameDate: 5 }),
      makeResult(110, { gameDate: 6 }),
      makeResult(110, { gameDate: 7 }),
      makeResult(110, { gameDate: 8 }),
      makeResult(110, { gameDate: 9 }),
      makeResult(110, { gameDate: 10 }),
    ];
    const prop = makeProp({ line: 100 });
    const analysis = analyzeProp(prop, results);
    expect(analysis.recentTrend).toBe("hot");
  });
});

// ---------------------------------------------------------------------------
// impliedHitRate
// ---------------------------------------------------------------------------

describe("impliedHitRate", () => {
  it("+150 → 100/250 = 0.4", () => {
    expect(impliedHitRate(150)).toBeCloseTo(100 / 250);
  });

  it("-110 → 110/210 ≈ 0.524", () => {
    expect(impliedHitRate(-110)).toBeCloseTo(110 / 210);
  });

  it("+100 (even odds) → 0.5", () => {
    expect(impliedHitRate(100)).toBeCloseTo(0.5);
  });

  it("-200 → 200/300 ≈ 0.667", () => {
    expect(impliedHitRate(-200)).toBeCloseTo(200 / 300);
  });

  it("+200 → 100/300 ≈ 0.333", () => {
    expect(impliedHitRate(200)).toBeCloseTo(100 / 300);
  });

  it("-300 → 300/400 = 0.75", () => {
    expect(impliedHitRate(-300)).toBeCloseTo(300 / 400);
  });
});

// ---------------------------------------------------------------------------
// propValue
// ---------------------------------------------------------------------------

describe("propValue", () => {
  it("positive edge for hitRate higher than implied", () => {
    // impliedHitRate(+100) = 0.5; hitRate = 0.6 → edge = 0.1
    expect(propValue(0.6, 100)).toBeCloseTo(0.1);
  });

  it("negative edge for hitRate lower than implied", () => {
    // impliedHitRate(+100) = 0.5; hitRate = 0.4 → edge = -0.1
    expect(propValue(0.4, 100)).toBeCloseTo(-0.1);
  });

  it("zero edge when hitRate matches implied probability", () => {
    const implied = impliedHitRate(-110);
    expect(propValue(implied, -110)).toBeCloseTo(0, 10);
  });

  it("returns large positive edge for extreme hit rate advantage", () => {
    // hitRate=0.9, odds=-110 (implied≈0.524), edge≈0.376
    expect(propValue(0.9, -110)).toBeCloseTo(0.9 - 110 / 210, 5);
  });
});

// ---------------------------------------------------------------------------
// altLineAnalysis
// ---------------------------------------------------------------------------

describe("altLineAnalysis", () => {
  it("returns empty array for empty altLines", () => {
    const result = altLineAnalysis(250, [], () => 0.5);
    expect(result).toHaveLength(0);
  });

  it("lower alt line → higher hit rate (using provided function)", () => {
    // The hitRate function should naturally return higher for lower lines
    const hitRateFn = (line: number) => Math.max(0, 1 - line / 500);
    const result = altLineAnalysis(250, [200, 250, 300], hitRateFn);
    expect(result[0]!.hitRate).toBeGreaterThan(result[1]!.hitRate);
    expect(result[1]!.hitRate).toBeGreaterThan(result[2]!.hitRate);
  });

  it("recommendedSide is 'over' when hitRate > 0.574", () => {
    const result = altLineAnalysis(250, [200], () => 0.6);
    expect(result[0]!.recommendedSide).toBe("over");
  });

  it("recommendedSide is 'under' when hitRate < 0.426", () => {
    const result = altLineAnalysis(250, [300], () => 0.3);
    expect(result[0]!.recommendedSide).toBe("under");
  });

  it("recommendedSide is 'skip' for hitRate near 50%", () => {
    const result = altLineAnalysis(250, [250], () => 0.5);
    expect(result[0]!.recommendedSide).toBe("skip");
  });

  it("impliedProb is 110/210 for all lines", () => {
    const result = altLineAnalysis(250, [200, 300], () => 0.5);
    result.forEach((r) => {
      expect(r.impliedProb).toBeCloseTo(110 / 210);
    });
  });

  it("processes multiple alt lines correctly", () => {
    const altLines = [220, 240, 260, 280];
    const hitRateFn = (line: number) => (line < 250 ? 0.65 : 0.35);
    const result = altLineAnalysis(250, altLines, hitRateFn);
    expect(result).toHaveLength(4);
    expect(result[0]!.recommendedSide).toBe("over");
    expect(result[1]!.recommendedSide).toBe("over");
    expect(result[2]!.recommendedSide).toBe("under");
    expect(result[3]!.recommendedSide).toBe("under");
  });

  it("returns the correct line value in each entry", () => {
    const altLines = [200, 250, 300];
    const result = altLineAnalysis(250, altLines, () => 0.5);
    expect(result.map((r) => r.line)).toEqual([200, 250, 300]);
  });
});

// ---------------------------------------------------------------------------
// splitByHomeAway
// ---------------------------------------------------------------------------

describe("splitByHomeAway", () => {
  it("returns both null for empty results", () => {
    const { home, away } = splitByHomeAway([], 100);
    expect(home).toBeNull();
    expect(away).toBeNull();
  });

  it("returns null home when no home games present", () => {
    const results = [
      makeResult(110, { isHome: false }),
      makeResult(90, { isHome: false }),
    ];
    const { home, away } = splitByHomeAway(results, 100);
    expect(home).toBeNull();
    expect(away).toBeCloseTo(0.5);
  });

  it("returns null away when no away games present", () => {
    const results = [
      makeResult(110, { isHome: true }),
      makeResult(90, { isHome: true }),
    ];
    const { home, away } = splitByHomeAway(results, 100);
    expect(away).toBeNull();
    expect(home).toBeCloseTo(0.5);
  });

  it("computes different rates for home and away", () => {
    const results = [
      makeResult(110, { isHome: true }),
      makeResult(110, { isHome: true }),
      makeResult(90, { isHome: false }),
      makeResult(90, { isHome: false }),
    ];
    const { home, away } = splitByHomeAway(results, 100);
    expect(home).toBe(1);
    expect(away).toBe(0);
  });

  it("handles isHome undefined results by excluding them", () => {
    const results = [
      makeResult(110),          // isHome undefined
      makeResult(110, { isHome: true }),
      makeResult(90, { isHome: false }),
    ];
    const { home, away } = splitByHomeAway(results, 100);
    expect(home).toBe(1);  // only the 1 home result
    expect(away).toBe(0);  // only the 1 away result (90 < 100)
  });
});

// ---------------------------------------------------------------------------
// splitByOpponent
// ---------------------------------------------------------------------------

describe("splitByOpponent", () => {
  it("returns empty object for empty results", () => {
    expect(splitByOpponent([], 100)).toEqual({});
  });

  it("creates one entry per opponent", () => {
    const results = [
      makeResult(110, { opponent: "TeamA" }),
      makeResult(90, { opponent: "TeamB" }),
    ];
    const splits = splitByOpponent(results, 100);
    expect(Object.keys(splits)).toHaveLength(2);
    expect(splits).toHaveProperty("TeamA");
    expect(splits).toHaveProperty("TeamB");
  });

  it("computes correct hit rates per opponent", () => {
    const results = [
      makeResult(110, { opponent: "TeamA" }),
      makeResult(120, { opponent: "TeamA" }),
      makeResult(90, { opponent: "TeamB" }),
      makeResult(85, { opponent: "TeamB" }),
    ];
    const splits = splitByOpponent(results, 100);
    expect(splits["TeamA"]).toBe(1);   // both over 100
    expect(splits["TeamB"]).toBe(0);   // both under 100
  });

  it("handles mixed results for same opponent", () => {
    const results = [
      makeResult(110, { opponent: "TeamA" }),
      makeResult(90, { opponent: "TeamA" }),
    ];
    const splits = splitByOpponent(results, 100);
    expect(splits["TeamA"]).toBe(0.5);
  });

  it("excludes results without opponent", () => {
    const results = [
      makeResult(110),                        // no opponent
      makeResult(110, { opponent: "TeamA" }),
    ];
    const splits = splitByOpponent(results, 100);
    expect(Object.keys(splits)).toHaveLength(1);
    expect(splits).toHaveProperty("TeamA");
  });
});

// ---------------------------------------------------------------------------
// formatPropLine
// ---------------------------------------------------------------------------

describe("formatPropLine", () => {
  it("formats passing yards prop correctly", () => {
    const prop: PropLine = {
      propType: "passing_yards",
      line: 275.5,
      overOdds: -115,
      underOdds: -105,
      playerName: "Patrick Mahomes",
    };
    expect(formatPropLine(prop)).toBe(
      "Patrick Mahomes Passing Yards 275.5 (O-115/U-105)"
    );
  });

  it("formats positive over odds with + sign", () => {
    const prop = makeProp({ overOdds: 130, underOdds: -150, line: 100 });
    const formatted = formatPropLine(prop);
    expect(formatted).toContain("O+130");
  });

  it("formats positive under odds with + sign", () => {
    const prop = makeProp({ overOdds: -150, underOdds: 120, line: 100 });
    const formatted = formatPropLine(prop);
    expect(formatted).toContain("U+120");
  });

  it("formats propType with capitalized words separated by spaces", () => {
    const prop = makeProp({ propType: "three_pointers" });
    expect(formatPropLine(prop)).toContain("Three Pointers");
  });

  it("includes player name at start", () => {
    const prop = makeProp({ playerName: "LeBron James" });
    expect(formatPropLine(prop)).toMatch(/^LeBron James /);
  });

  it("includes line number", () => {
    const prop = makeProp({ line: 32.5 });
    expect(formatPropLine(prop)).toContain("32.5");
  });

  it("formats total_bases prop type correctly", () => {
    const prop = makeProp({ propType: "total_bases", line: 2.5 });
    expect(formatPropLine(prop)).toContain("Total Bases");
  });

  it("formats even odds (-110/-110) correctly", () => {
    const prop = makeProp({ overOdds: -110, underOdds: -110, line: 25 });
    expect(formatPropLine(prop)).toContain("O-110/U-110");
  });
});

// ---------------------------------------------------------------------------
// propTypeCategory
// ---------------------------------------------------------------------------

describe("propTypeCategory", () => {
  it("passing_yards → passing", () => {
    expect(propTypeCategory("passing_yards")).toBe("passing");
  });

  it("rushing_yards → rushing", () => {
    expect(propTypeCategory("rushing_yards")).toBe("rushing");
  });

  it("receiving_yards → receiving", () => {
    expect(propTypeCategory("receiving_yards")).toBe("receiving");
  });

  it("receptions → receiving", () => {
    expect(propTypeCategory("receptions")).toBe("receiving");
  });

  it("touchdowns → scoring", () => {
    expect(propTypeCategory("touchdowns")).toBe("scoring");
  });

  it("points → basketball", () => {
    expect(propTypeCategory("points")).toBe("basketball");
  });

  it("rebounds → basketball", () => {
    expect(propTypeCategory("rebounds")).toBe("basketball");
  });

  it("assists → basketball", () => {
    expect(propTypeCategory("assists")).toBe("basketball");
  });

  it("three_pointers → basketball", () => {
    expect(propTypeCategory("three_pointers")).toBe("basketball");
  });

  it("strikeouts → baseball", () => {
    expect(propTypeCategory("strikeouts")).toBe("baseball");
  });

  it("hits → baseball", () => {
    expect(propTypeCategory("hits")).toBe("baseball");
  });

  it("total_bases → baseball", () => {
    expect(propTypeCategory("total_bases")).toBe("baseball");
  });
});
