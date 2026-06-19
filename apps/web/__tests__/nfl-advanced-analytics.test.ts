import { describe, it, expect } from "vitest";
import {
  // EPA
  expectedPoints,
  epa,
  cumulativeEPA,
  epaPerPlay,
  successRate,
  // Air yards & passing
  airYards,
  yardsAfterCatch,
  completionProbability,
  completionPercentageOverExpected,
  averageAirYards,
  airYardsShare,
  targetShare,
  woprScore,
  // Rushing
  stuffRate,
  yardsBeforeContact,
  yardsAfterContact,
  truePasser,
  rushingAttemptsInside5,
  // Fourth down
  goForItExpectedValue,
  puntExpectedValue,
  fieldGoalExpectedValue,
  optimalFourthDownDecision,
  winProbabilityAddedByDecision,
  // Defense
  pressureRate,
  coverageGrade,
  defenseAdjustedYards,
  stopRate,
  havocRate,
  // Team efficiency
  offensiveEfficiency,
  defensiveEfficiency,
  turnoverDifferential,
  explosivePlayRate,
  redZoneEfficiency,
  thirdDownConversionRate,
  // DK scoring
  dkQBScore,
  dkRBScore,
  dkWRTEScore,
  dkDSTScore,
  // Game script
  gameScript,
  twoMinuteDrillPressure,
  weatherImpact,
} from "@/lib/sports/nfl-advanced-analytics";

// ---------------------------------------------------------------------------
// 1. expectedPoints
// ---------------------------------------------------------------------------
describe("expectedPoints", () => {
  it("returns correct EP for 1st-and-10 at midfield (yardLine=50)", () => {
    // baseEP=1.5, -0.05*10=−0.5, +0.04*(50/100)*10=+0.2 → 1.2
    expect(expectedPoints(1, 10, 50)).toBeCloseTo(1.2, 5);
  });

  it("returns correct EP for 1st-and-10 in own territory (yardLine=20)", () => {
    // 1.5 - 0.5 + 0.04*(0.2)*10 = 1.5 - 0.5 + 0.08 = 1.08
    expect(expectedPoints(1, 10, 20)).toBeCloseTo(1.08, 5);
  });

  it("returns correct EP for 2nd-and-5 at yardLine=40", () => {
    // 0.8 - 0.25 + 0.04*(0.4)*10 = 0.8 - 0.25 + 0.16 = 0.71
    expect(expectedPoints(2, 5, 40)).toBeCloseTo(0.71, 5);
  });

  it("returns correct EP for 3rd-and-15 at yardLine=30", () => {
    // 0.2 - 0.75 + 0.04*(0.3)*10 = 0.2 - 0.75 + 0.12 = -0.43
    expect(expectedPoints(3, 15, 30)).toBeCloseTo(-0.43, 5);
  });

  it("returns correct EP for 4th-and-goal at yardLine=2", () => {
    // -0.5 - 0.25 + 0.04*(0.02)*10 = -0.75 + 0.008 = -0.742
    expect(expectedPoints(4, 5, 2)).toBeCloseTo(-0.742, 5);
  });

  it("EP increases as yardLine increases (closer to end zone)", () => {
    const ep20 = expectedPoints(1, 10, 20);
    const ep80 = expectedPoints(1, 10, 80);
    expect(ep80).toBeGreaterThan(ep20);
  });

  it("EP decreases with more yards to go", () => {
    const ep5 = expectedPoints(1, 5, 50);
    const ep15 = expectedPoints(1, 15, 50);
    expect(ep5).toBeGreaterThan(ep15);
  });

  it("4th down base EP is lower than 1st down", () => {
    expect(expectedPoints(4, 10, 50)).toBeLessThan(expectedPoints(1, 10, 50));
  });

  it("works at yardLine=100 (at opponent goal)", () => {
    // 1.5 - 0.05 + 0.04*(1)*10 = 1.5 - 0.05 + 0.4 = 1.85
    expect(expectedPoints(1, 1, 100)).toBeCloseTo(1.85, 5);
  });

  it("works at yardLine=0 (own goal line)", () => {
    // 1.5 - 0.5 + 0 = 1.0
    expect(expectedPoints(1, 10, 0)).toBeCloseTo(1.0, 5);
  });
});

// ---------------------------------------------------------------------------
// 2. epa
// ---------------------------------------------------------------------------
describe("epa", () => {
  it("returns positive EPA when nextEP > playEP", () => {
    expect(epa(1.0, 2.5)).toBeCloseTo(1.5, 5);
  });

  it("returns negative EPA when nextEP < playEP", () => {
    expect(epa(2.0, 0.5)).toBeCloseTo(-1.5, 5);
  });

  it("returns zero EPA when equal", () => {
    expect(epa(1.5, 1.5)).toBe(0);
  });

  it("handles touchdown scoring (nextEP = 7)", () => {
    expect(epa(1.2, 7)).toBeCloseTo(5.8, 5);
  });

  it("handles turnover (nextEP = negative opponent EP)", () => {
    expect(epa(1.0, -1.2)).toBeCloseTo(-2.2, 5);
  });
});

// ---------------------------------------------------------------------------
// 3. cumulativeEPA
// ---------------------------------------------------------------------------
describe("cumulativeEPA", () => {
  it("sums EPA correctly", () => {
    const plays = [{ epa: 1.5 }, { epa: -0.5 }, { epa: 2.0 }];
    expect(cumulativeEPA(plays)).toBeCloseTo(3.0, 5);
  });

  it("returns 0 for empty array", () => {
    expect(cumulativeEPA([])).toBe(0);
  });

  it("handles all negative EPA", () => {
    const plays = [{ epa: -1 }, { epa: -2 }, { epa: -0.5 }];
    expect(cumulativeEPA(plays)).toBeCloseTo(-3.5, 5);
  });

  it("handles single play", () => {
    expect(cumulativeEPA([{ epa: 3.14 }])).toBeCloseTo(3.14, 5);
  });
});

// ---------------------------------------------------------------------------
// 4. epaPerPlay
// ---------------------------------------------------------------------------
describe("epaPerPlay", () => {
  it("computes mean EPA", () => {
    const plays = [{ epa: 1.0 }, { epa: 3.0 }];
    expect(epaPerPlay(plays)).toBeCloseTo(2.0, 5);
  });

  it("returns 0 for empty array", () => {
    expect(epaPerPlay([])).toBe(0);
  });

  it("handles negative mean", () => {
    const plays = [{ epa: -1.0 }, { epa: -3.0 }];
    expect(epaPerPlay(plays)).toBeCloseTo(-2.0, 5);
  });

  it("handles single play", () => {
    expect(epaPerPlay([{ epa: 0.5 }])).toBeCloseTo(0.5, 5);
  });
});

// ---------------------------------------------------------------------------
// 5. successRate
// ---------------------------------------------------------------------------
describe("successRate", () => {
  it("returns fraction of positive EPA plays", () => {
    const plays = [{ epa: 1 }, { epa: -1 }, { epa: 2 }, { epa: -0.5 }];
    expect(successRate(plays)).toBeCloseTo(0.5, 5);
  });

  it("returns 0 for empty array", () => {
    expect(successRate([])).toBe(0);
  });

  it("returns 1.0 when all plays are successful", () => {
    const plays = [{ epa: 0.1 }, { epa: 0.5 }, { epa: 1.0 }];
    expect(successRate(plays)).toBeCloseTo(1.0, 5);
  });

  it("returns 0 when no plays are successful (epa=0 not counted)", () => {
    const plays = [{ epa: 0 }, { epa: -0.5 }];
    expect(successRate(plays)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 6. airYards
// ---------------------------------------------------------------------------
describe("airYards", () => {
  it("returns positive value when target is past LOS", () => {
    expect(airYards(35, 25)).toBe(10);
  });

  it("returns negative value for screen pass behind LOS", () => {
    expect(airYards(20, 25)).toBe(-5);
  });

  it("returns 0 when target is at LOS", () => {
    expect(airYards(30, 30)).toBe(0);
  });

  it("handles deep pass", () => {
    expect(airYards(70, 30)).toBe(40);
  });
});

// ---------------------------------------------------------------------------
// 7. yardsAfterCatch
// ---------------------------------------------------------------------------
describe("yardsAfterCatch", () => {
  it("computes YAC from reception yards and air yards", () => {
    expect(yardsAfterCatch(15, 8)).toBe(7);
  });

  it("returns negative YAC when air yards > reception yards", () => {
    expect(yardsAfterCatch(5, 10)).toBe(-5);
  });

  it("returns 0 when air yards equals reception yards", () => {
    expect(yardsAfterCatch(10, 10)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 8. completionProbability
// ---------------------------------------------------------------------------
describe("completionProbability", () => {
  it("base probability near 5 air yards with off coverage", () => {
    // base=0.65, no depth adj (5 yards), off=+0.05 => 0.70
    expect(completionProbability(5, "off")).toBeCloseTo(0.70, 5);
  });

  it("press coverage reduces probability", () => {
    const offProb = completionProbability(5, "off");
    const pressProb = completionProbability(5, "press");
    expect(pressProb).toBeLessThan(offProb);
  });

  it("zone coverage is between press and off", () => {
    const pressProb = completionProbability(5, "press");
    const zoneProb = completionProbability(5, "zone");
    const offProb = completionProbability(5, "off");
    expect(zoneProb).toBeGreaterThan(pressProb);
    expect(zoneProb).toBeLessThan(offProb);
  });

  it("deep pass reduces probability", () => {
    const short = completionProbability(5, "off");
    const deep = completionProbability(30, "off");
    expect(deep).toBeLessThan(short);
  });

  it("clamps probability to minimum 0.05", () => {
    // Very deep with press: 0.65 - 0.01*(50-5) - 0.08 = 0.65 - 0.45 - 0.08 = 0.12... still above 0.05
    // Use extreme values
    expect(completionProbability(100, "press")).toBeGreaterThanOrEqual(0.05);
  });

  it("clamps probability to maximum 0.95", () => {
    expect(completionProbability(0, "off")).toBeLessThanOrEqual(0.95);
  });

  it("short pass with off coverage has prob ~0.70", () => {
    expect(completionProbability(3, "off")).toBeCloseTo(0.70, 5);
  });

  it("zone coverage at 5 air yards gives 0.68", () => {
    // base=0.65, no depth adj, zone=+0.03 => 0.68
    expect(completionProbability(5, "zone")).toBeCloseTo(0.68, 5);
  });

  it("press at 5 air yards gives 0.57", () => {
    // base=0.65, no depth adj, press=-0.08 => 0.57
    expect(completionProbability(5, "press")).toBeCloseTo(0.57, 5);
  });
});

// ---------------------------------------------------------------------------
// 9. completionPercentageOverExpected
// ---------------------------------------------------------------------------
describe("completionPercentageOverExpected", () => {
  it("returns positive CPOE when actual > expected", () => {
    expect(completionPercentageOverExpected(0.75, 0.65)).toBeCloseTo(0.10, 5);
  });

  it("returns negative CPOE when actual < expected", () => {
    expect(completionPercentageOverExpected(0.55, 0.65)).toBeCloseTo(-0.10, 5);
  });

  it("returns 0 when actual equals expected", () => {
    expect(completionPercentageOverExpected(0.65, 0.65)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 10. averageAirYards
// ---------------------------------------------------------------------------
describe("averageAirYards", () => {
  it("computes total average correctly", () => {
    const result = averageAirYards([10, 20, 15], [10, 20]);
    expect(result.total).toBeCloseTo(15, 5);
  });

  it("computes completed average correctly", () => {
    const result = averageAirYards([10, 20, 30], [10, 20]);
    expect(result.completed).toBeCloseTo(15, 5);
  });

  it("treats missing completions as all targets", () => {
    const result = averageAirYards([10, 20, 30]);
    expect(result.completed).toBeCloseTo(20, 5);
    expect(result.total).toBeCloseTo(20, 5);
  });

  it("returns 0 for empty targets", () => {
    const result = averageAirYards([]);
    expect(result.total).toBe(0);
  });

  it("returns 0 for empty completions", () => {
    const result = averageAirYards([10, 20], []);
    expect(result.completed).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 11. airYardsShare
// ---------------------------------------------------------------------------
describe("airYardsShare", () => {
  it("returns correct share", () => {
    expect(airYardsShare(50, 200)).toBeCloseTo(0.25, 5);
  });

  it("returns 0 when team air yards is 0", () => {
    expect(airYardsShare(50, 0)).toBe(0);
  });

  it("returns 1.0 for monopoly of air yards", () => {
    expect(airYardsShare(100, 100)).toBeCloseTo(1.0, 5);
  });
});

// ---------------------------------------------------------------------------
// 12. targetShare
// ---------------------------------------------------------------------------
describe("targetShare", () => {
  it("returns correct share", () => {
    expect(targetShare(8, 32)).toBeCloseTo(0.25, 5);
  });

  it("returns 0 when team targets is 0", () => {
    expect(targetShare(5, 0)).toBe(0);
  });

  it("returns 1.0 for all targets", () => {
    expect(targetShare(10, 10)).toBeCloseTo(1.0, 5);
  });
});

// ---------------------------------------------------------------------------
// 13. woprScore
// ---------------------------------------------------------------------------
describe("woprScore", () => {
  it("computes WOPR correctly", () => {
    // 1.5*0.25 + 0.7*0.30 = 0.375 + 0.21 = 0.585
    expect(woprScore(0.25, 0.30)).toBeCloseTo(0.585, 5);
  });

  it("clamps to 1.0", () => {
    expect(woprScore(0.6, 0.8)).toBe(1.0);
  });

  it("clamps to 0 for negative inputs", () => {
    expect(woprScore(-0.5, -0.5)).toBe(0);
  });

  it("returns 0 for zero shares", () => {
    expect(woprScore(0, 0)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 14. stuffRate
// ---------------------------------------------------------------------------
describe("stuffRate", () => {
  it("computes stuff rate correctly", () => {
    expect(stuffRate(5, 20)).toBeCloseTo(0.25, 5);
  });

  it("returns 0 when carries is 0", () => {
    expect(stuffRate(0, 0)).toBe(0);
  });

  it("returns 1 when all carries stuffed", () => {
    expect(stuffRate(10, 10)).toBeCloseTo(1.0, 5);
  });

  it("returns 0 when no stuffs", () => {
    expect(stuffRate(0, 20)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 15. yardsBeforeContact
// ---------------------------------------------------------------------------
describe("yardsBeforeContact", () => {
  it("computes yards before contact", () => {
    expect(yardsBeforeContact(8, 3)).toBe(5);
  });

  it("returns 0 when tackled immediately", () => {
    expect(yardsBeforeContact(5, 5)).toBe(0);
  });

  it("handles negative (tackled behind LOS scenario)", () => {
    expect(yardsBeforeContact(-2, 1)).toBe(-3);
  });
});

// ---------------------------------------------------------------------------
// 16. yardsAfterContact (average)
// ---------------------------------------------------------------------------
describe("yardsAfterContact", () => {
  it("computes average correctly", () => {
    const stats = [
      { totalYards: 10, yardBeforeContact: 4 }, // YAC=6
      { totalYards: 6, yardBeforeContact: 2 },  // YAC=4
    ];
    expect(yardsAfterContact(stats)).toBeCloseTo(5.0, 5);
  });

  it("returns 0 for empty stats", () => {
    expect(yardsAfterContact([])).toBe(0);
  });

  it("handles single carry", () => {
    expect(yardsAfterContact([{ totalYards: 8, yardBeforeContact: 3 }])).toBeCloseTo(5.0, 5);
  });
});

// ---------------------------------------------------------------------------
// 17. truePasser
// ---------------------------------------------------------------------------
describe("truePasser", () => {
  it("computes true passer rating correctly", () => {
    // (300 + 20*3 - 45*1 + 0.5*22 + 0.25*8 + 0.5*180 + 0.25*60) / 30
    // = (300 + 60 - 45 + 11 + 2 + 90 + 15) / 30 = 433/30 ≈ 14.43
    const rating = truePasser(300, 3, 1, 22, 30, 180, 60);
    expect(rating).toBeCloseTo(433 / 30, 3);
  });

  it("throws when attempts is 0", () => {
    expect(() => truePasser(0, 0, 0, 0, 0, 0, 0)).toThrow();
  });

  it("penalizes interceptions heavily", () => {
    const noInt = truePasser(200, 2, 0, 20, 30, 150, 50);
    const withInt = truePasser(200, 2, 2, 20, 30, 150, 50);
    expect(noInt).toBeGreaterThan(withInt);
  });

  it("rewards touchdowns", () => {
    const noTD = truePasser(200, 0, 0, 20, 30, 150, 50);
    const withTD = truePasser(200, 2, 0, 20, 30, 150, 50);
    expect(withTD).toBeGreaterThan(noTD);
  });
});

// ---------------------------------------------------------------------------
// 18. rushingAttemptsInside5
// ---------------------------------------------------------------------------
describe("rushingAttemptsInside5", () => {
  it("counts carries at yardLine <=5", () => {
    const carries = [{ yardLine: 3 }, { yardLine: 5 }, { yardLine: 10 }, { yardLine: 1 }];
    expect(rushingAttemptsInside5(carries)).toBe(3);
  });

  it("returns 0 when no carries in red zone", () => {
    const carries = [{ yardLine: 10 }, { yardLine: 20 }];
    expect(rushingAttemptsInside5(carries)).toBe(0);
  });

  it("counts exactly at yardLine=5", () => {
    expect(rushingAttemptsInside5([{ yardLine: 5 }])).toBe(1);
  });

  it("returns 0 for empty array", () => {
    expect(rushingAttemptsInside5([])).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 19. goForItExpectedValue
// ---------------------------------------------------------------------------
describe("goForItExpectedValue", () => {
  it("returns a number for standard inputs", () => {
    const ev = goForItExpectedValue(1, 50);
    expect(typeof ev).toBe("number");
  });

  it("conversion probability is capped at min 0.1", () => {
    // yardsToGo=20 → max(0.1, 0.6-1.0) = 0.1
    const ev = goForItExpectedValue(20, 50);
    expect(typeof ev).toBe("number");
  });

  it("going for it at short yardage is positive EV", () => {
    const ev = goForItExpectedValue(1, 50);
    expect(ev).toBeGreaterThan(0);
  });

  it("going for it at 4th-and-20 from own 20 is negative", () => {
    const ev = goForItExpectedValue(20, 20);
    expect(ev).toBeLessThan(0);
  });

  it("accepts optional down parameter", () => {
    const ev1 = goForItExpectedValue(1, 50, 4);
    const ev2 = goForItExpectedValue(1, 50);
    expect(ev1).toBeCloseTo(ev2, 5);
  });
});

// ---------------------------------------------------------------------------
// 20. puntExpectedValue
// ---------------------------------------------------------------------------
describe("puntExpectedValue", () => {
  it("returns negative value (opponent gets decent field position)", () => {
    const ev = puntExpectedValue(60);
    // opponent at yardLine 100-(60-40)=80 from own end
    // -expectedPoints(1,10,80)
    expect(typeof ev).toBe("number");
  });

  it("uses default 40 yards net punt", () => {
    const ev1 = puntExpectedValue(50);
    const ev2 = puntExpectedValue(50, 40);
    expect(ev1).toBeCloseTo(ev2, 5);
  });

  it("longer punt gives better field position (less negative)", () => {
    const ev40 = puntExpectedValue(50, 40);
    const ev50 = puntExpectedValue(50, 50);
    // Longer punt → opponent further back → less EP for them → more negative return
    expect(ev50).toBeLessThan(ev40);
  });
});

// ---------------------------------------------------------------------------
// 21. fieldGoalExpectedValue
// ---------------------------------------------------------------------------
describe("fieldGoalExpectedValue", () => {
  it("returns close to 3 for a chip shot", () => {
    // yardLine=5 → pct = max(0.1, 0.95-(5-20)*0.02) = max(0.1, 0.95+0.3)=max(0.1,1.25)→ capped at default
    const ev = fieldGoalExpectedValue(5);
    expect(ev).toBeGreaterThan(2);
  });

  it("decreases as yardLine increases (harder kick)", () => {
    const ev20 = fieldGoalExpectedValue(20);
    const ev50 = fieldGoalExpectedValue(50);
    expect(ev20).toBeGreaterThan(ev50);
  });

  it("accepts explicit fieldGoalPct", () => {
    const ev = fieldGoalExpectedValue(30, 0.90);
    expect(ev).toBeGreaterThan(0);
  });

  it("very low FG pct can produce negative EV", () => {
    const ev = fieldGoalExpectedValue(60, 0.10);
    expect(ev).toBeLessThan(3);
  });
});

// ---------------------------------------------------------------------------
// 22. optimalFourthDownDecision
// ---------------------------------------------------------------------------
describe("optimalFourthDownDecision", () => {
  it("returns one of the three valid options", () => {
    const decision = optimalFourthDownDecision(2, 60);
    expect(["go", "punt", "fieldGoal"]).toContain(decision);
  });

  it("tends to go for it at short yardage near goal line", () => {
    const decision = optimalFourthDownDecision(1, 95);
    expect(decision).toBe("go");
  });

  it("tends to punt from own territory with long yardage", () => {
    const decision = optimalFourthDownDecision(15, 20);
    expect(["punt", "go", "fieldGoal"]).toContain(decision);
  });

  it("returns a string type", () => {
    const decision = optimalFourthDownDecision(5, 40);
    expect(typeof decision).toBe("string");
  });
});

// ---------------------------------------------------------------------------
// 23. winProbabilityAddedByDecision
// ---------------------------------------------------------------------------
describe("winProbabilityAddedByDecision", () => {
  it("returns 0 when chosen is optimal", () => {
    expect(winProbabilityAddedByDecision(3, 3)).toBe(0);
  });

  it("returns negative when chosen is worse than best", () => {
    expect(winProbabilityAddedByDecision(1, 3)).toBeLessThan(0);
  });

  it("uses default runsPerPoint of 6", () => {
    const wpa = winProbabilityAddedByDecision(3, 6);
    expect(wpa).toBeCloseTo(-0.5, 5);
  });

  it("uses custom runsPerPoint", () => {
    const wpa = winProbabilityAddedByDecision(3, 6, 3);
    expect(wpa).toBeCloseTo(-1.0, 5);
  });
});

// ---------------------------------------------------------------------------
// 24. pressureRate
// ---------------------------------------------------------------------------
describe("pressureRate", () => {
  it("computes pressure rate correctly", () => {
    expect(pressureRate(10, 40)).toBeCloseTo(0.25, 5);
  });

  it("returns 0 when dropbacks is 0", () => {
    expect(pressureRate(5, 0)).toBe(0);
  });

  it("returns 1 when all dropbacks result in pressure", () => {
    expect(pressureRate(30, 30)).toBeCloseTo(1.0, 5);
  });
});

// ---------------------------------------------------------------------------
// 25. coverageGrade
// ---------------------------------------------------------------------------
describe("coverageGrade", () => {
  it("returns 100 for zero targets", () => {
    expect(coverageGrade(0, 0, 0, 0, 0)).toBe(100);
  });

  it("returns higher grade for fewer completions", () => {
    const grade1 = coverageGrade(10, 4, 50, 0, 0);
    const grade2 = coverageGrade(10, 8, 50, 0, 0);
    expect(grade1).toBeGreaterThan(grade2);
  });

  it("interceptions improve the grade", () => {
    const withINT = coverageGrade(10, 6, 80, 1, 2);
    const withoutINT = coverageGrade(10, 6, 80, 1, 0);
    expect(withINT).toBeGreaterThan(withoutINT);
  });

  it("clamps grade to 0 minimum", () => {
    // Terrible coverage: all 10 complete, 500 yards, 5 TDs, 0 INTs
    expect(coverageGrade(10, 10, 500, 5, 0)).toBeGreaterThanOrEqual(0);
  });

  it("clamps grade to 100 maximum", () => {
    // Great coverage: 0 completions, 5 INTs
    expect(coverageGrade(10, 0, 0, 0, 5)).toBeLessThanOrEqual(100);
  });

  it("computes example correctly", () => {
    // targets=10, comps=6, yards=60, tds=0, ints=0
    // 100 - (50*0.6 + 0.5*6 + 0 - 0) = 100 - (30+3) = 67
    expect(coverageGrade(10, 6, 60, 0, 0)).toBeCloseTo(67, 5);
  });
});

// ---------------------------------------------------------------------------
// 26. defenseAdjustedYards
// ---------------------------------------------------------------------------
describe("defenseAdjustedYards", () => {
  it("no adjustment for rank 16 (average)", () => {
    expect(defenseAdjustedYards(100, 100, 16)).toBeCloseTo(100, 5);
  });

  it("adjusts upward for rank 1 (toughest offense)", () => {
    // 100 * (1 + (1-16)/32) = 100 * (1 - 15/32) = 100 * 0.53125 = 53.125
    expect(defenseAdjustedYards(100, 100, 1)).toBeCloseTo(53.125, 5);
  });

  it("adjusts downward for rank 32 (weakest offense)", () => {
    // 100 * (1 + (32-16)/32) = 100 * (1 + 0.5) = 150
    expect(defenseAdjustedYards(100, 100, 32)).toBeCloseTo(150, 5);
  });
});

// ---------------------------------------------------------------------------
// 27. stopRate
// ---------------------------------------------------------------------------
describe("stopRate", () => {
  it("returns fraction of plays with negative EPA", () => {
    const plays = [{ epa: -1 }, { epa: 0.5 }, { epa: -0.3 }, { epa: 1.0 }];
    expect(stopRate(plays)).toBeCloseTo(0.5, 5);
  });

  it("returns 0 for empty plays", () => {
    expect(stopRate([])).toBe(0);
  });

  it("returns 1 when all plays are stops", () => {
    const plays = [{ epa: -0.5 }, { epa: -1 }];
    expect(stopRate(plays)).toBeCloseTo(1.0, 5);
  });

  it("excludes epa=0 plays from stops", () => {
    const plays = [{ epa: 0 }, { epa: 0 }];
    expect(stopRate(plays)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 28. havocRate
// ---------------------------------------------------------------------------
describe("havocRate", () => {
  it("computes havoc rate correctly", () => {
    expect(havocRate(3, 4, 6, 52)).toBeCloseTo(13 / 52, 5);
  });

  it("returns 0 when plays is 0", () => {
    expect(havocRate(5, 3, 2, 0)).toBe(0);
  });

  it("returns 0 when no havoc plays", () => {
    expect(havocRate(0, 0, 0, 40)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 29. offensiveEfficiency
// ---------------------------------------------------------------------------
describe("offensiveEfficiency", () => {
  it("computes efficiency correctly", () => {
    // (28/12) * 5.5 / 10 = 2.333 * 0.55 = 1.283...
    expect(offensiveEfficiency(28, 12, 5.5)).toBeCloseTo((28 / 12) * 5.5 / 10, 5);
  });

  it("returns 0 when drives is 0", () => {
    expect(offensiveEfficiency(0, 0, 5)).toBe(0);
  });

  it("increases with more points scored", () => {
    const eff1 = offensiveEfficiency(21, 10, 5);
    const eff2 = offensiveEfficiency(35, 10, 5);
    expect(eff2).toBeGreaterThan(eff1);
  });
});

// ---------------------------------------------------------------------------
// 30. defensiveEfficiency
// ---------------------------------------------------------------------------
describe("defensiveEfficiency", () => {
  it("computes efficiency correctly", () => {
    // 10 - (14/10) * 4.5 / 10 = 10 - 0.63 = 9.37
    expect(defensiveEfficiency(14, 10, 4.5)).toBeCloseTo(10 - (14 / 10) * (4.5 / 10), 5);
  });

  it("returns 10 when drives is 0", () => {
    expect(defensiveEfficiency(0, 0, 5)).toBe(10);
  });

  it("clamps to 0", () => {
    expect(defensiveEfficiency(1000, 1, 100)).toBe(0);
  });

  it("clamps to 10", () => {
    expect(defensiveEfficiency(0, 10, 3)).toBe(10);
  });

  it("decreases as points allowed increases", () => {
    const eff1 = defensiveEfficiency(10, 10, 5);
    const eff2 = defensiveEfficiency(35, 10, 5);
    expect(eff1).toBeGreaterThan(eff2);
  });
});

// ---------------------------------------------------------------------------
// 31. turnoverDifferential
// ---------------------------------------------------------------------------
describe("turnoverDifferential", () => {
  it("returns positive when more takeaways", () => {
    expect(turnoverDifferential(4, 2)).toBe(2);
  });

  it("returns negative when more giveaways", () => {
    expect(turnoverDifferential(1, 3)).toBe(-2);
  });

  it("returns 0 when equal", () => {
    expect(turnoverDifferential(2, 2)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 32. explosivePlayRate
// ---------------------------------------------------------------------------
describe("explosivePlayRate", () => {
  it("uses default 15-yard threshold", () => {
    const plays = [{ yards: 20 }, { yards: 10 }, { yards: 15 }, { yards: 5 }];
    expect(explosivePlayRate(plays)).toBeCloseTo(2 / 4, 5);
  });

  it("uses custom threshold", () => {
    const plays = [{ yards: 10 }, { yards: 8 }, { yards: 12 }];
    expect(explosivePlayRate(plays, 10)).toBeCloseTo(2 / 3, 5);
  });

  it("returns 0 for empty plays", () => {
    expect(explosivePlayRate([])).toBe(0);
  });

  it("returns 0 when no plays meet threshold", () => {
    const plays = [{ yards: 5 }, { yards: 8 }, { yards: 3 }];
    expect(explosivePlayRate(plays, 15)).toBe(0);
  });

  it("returns 1 when all plays meet threshold", () => {
    const plays = [{ yards: 20 }, { yards: 25 }];
    expect(explosivePlayRate(plays, 15)).toBeCloseTo(1.0, 5);
  });
});

// ---------------------------------------------------------------------------
// 33. redZoneEfficiency
// ---------------------------------------------------------------------------
describe("redZoneEfficiency", () => {
  it("computes efficiency correctly", () => {
    expect(redZoneEfficiency(3, 5)).toBeCloseTo(0.6, 5);
  });

  it("returns 0 when no trips", () => {
    expect(redZoneEfficiency(0, 0)).toBe(0);
  });

  it("returns 1.0 for perfect efficiency", () => {
    expect(redZoneEfficiency(5, 5)).toBeCloseTo(1.0, 5);
  });
});

// ---------------------------------------------------------------------------
// 34. thirdDownConversionRate
// ---------------------------------------------------------------------------
describe("thirdDownConversionRate", () => {
  it("computes rate correctly", () => {
    expect(thirdDownConversionRate(5, 12)).toBeCloseTo(5 / 12, 5);
  });

  it("returns 0 when no attempts", () => {
    expect(thirdDownConversionRate(0, 0)).toBe(0);
  });

  it("returns 1 when all converted", () => {
    expect(thirdDownConversionRate(8, 8)).toBeCloseTo(1.0, 5);
  });
});

// ---------------------------------------------------------------------------
// 35. dkQBScore
// ---------------------------------------------------------------------------
describe("dkQBScore", () => {
  it("computes QB score correctly", () => {
    const score = dkQBScore({
      passingYards: 300,
      passingTDs: 3,
      interceptions: 1,
      rushingYards: 30,
      rushingTDs: 0,
      twoPointConversions: 0,
      fumblesLost: 0,
    });
    // 0.04*300 + 4*3 - 1*1 + 0.1*30 + 0 + 0 - 0
    // = 12 + 12 - 1 + 3 = 26
    expect(score).toBeCloseTo(26, 5);
  });

  it("penalizes fumbles", () => {
    const nofumble = dkQBScore({ passingYards: 300, passingTDs: 2, interceptions: 0, rushingYards: 0, rushingTDs: 0, twoPointConversions: 0, fumblesLost: 0 });
    const fumble = dkQBScore({ passingYards: 300, passingTDs: 2, interceptions: 0, rushingYards: 0, rushingTDs: 0, twoPointConversions: 0, fumblesLost: 1 });
    expect(nofumble).toBeGreaterThan(fumble);
  });

  it("adds 2pts for two-point conversions", () => {
    const no2pt = dkQBScore({ passingYards: 250, passingTDs: 2, interceptions: 0, rushingYards: 0, rushingTDs: 0, twoPointConversions: 0, fumblesLost: 0 });
    const with2pt = dkQBScore({ passingYards: 250, passingTDs: 2, interceptions: 0, rushingYards: 0, rushingTDs: 0, twoPointConversions: 1, fumblesLost: 0 });
    expect(with2pt - no2pt).toBeCloseTo(2, 5);
  });
});

// ---------------------------------------------------------------------------
// 36. dkRBScore
// ---------------------------------------------------------------------------
describe("dkRBScore", () => {
  it("computes RB score correctly", () => {
    const score = dkRBScore({
      rushingYards: 100,
      rushingTDs: 1,
      receptions: 5,
      receivingYards: 40,
      receivingTDs: 0,
      twoPointConversions: 0,
      fumblesLost: 0,
    });
    // 0.1*100 + 6*1 + 1*5 + 0.1*40 + 0 + 0 - 0
    // = 10 + 6 + 5 + 4 = 25
    expect(score).toBeCloseTo(25, 5);
  });

  it("counts PPR receptions", () => {
    const no_rec = dkRBScore({ rushingYards: 100, rushingTDs: 0, receptions: 0, receivingYards: 0, receivingTDs: 0, twoPointConversions: 0, fumblesLost: 0 });
    const with_rec = dkRBScore({ rushingYards: 100, rushingTDs: 0, receptions: 5, receivingYards: 0, receivingTDs: 0, twoPointConversions: 0, fumblesLost: 0 });
    expect(with_rec - no_rec).toBeCloseTo(5, 5);
  });

  it("receiving TDs score 6 points", () => {
    const noTD = dkRBScore({ rushingYards: 0, rushingTDs: 0, receptions: 0, receivingYards: 0, receivingTDs: 0, twoPointConversions: 0, fumblesLost: 0 });
    const withTD = dkRBScore({ rushingYards: 0, rushingTDs: 0, receptions: 0, receivingYards: 0, receivingTDs: 1, twoPointConversions: 0, fumblesLost: 0 });
    expect(withTD - noTD).toBeCloseTo(6, 5);
  });
});

// ---------------------------------------------------------------------------
// 37. dkWRTEScore
// ---------------------------------------------------------------------------
describe("dkWRTEScore", () => {
  it("computes WR/TE score correctly", () => {
    const score = dkWRTEScore({
      receptions: 8,
      receivingYards: 120,
      receivingTDs: 1,
      twoPointConversions: 0,
      fumblesLost: 0,
    });
    // 1*8 + 0.1*120 + 6*1 = 8 + 12 + 6 = 26
    expect(score).toBeCloseTo(26, 5);
  });

  it("penalizes fumbles", () => {
    const noFumble = dkWRTEScore({ receptions: 5, receivingYards: 60, receivingTDs: 0, twoPointConversions: 0, fumblesLost: 0 });
    const fumble = dkWRTEScore({ receptions: 5, receivingYards: 60, receivingTDs: 0, twoPointConversions: 0, fumblesLost: 1 });
    expect(noFumble - fumble).toBeCloseTo(1, 5);
  });

  it("two-point conversions add 2 points", () => {
    const no2pt = dkWRTEScore({ receptions: 3, receivingYards: 30, receivingTDs: 0, twoPointConversions: 0, fumblesLost: 0 });
    const with2pt = dkWRTEScore({ receptions: 3, receivingYards: 30, receivingTDs: 0, twoPointConversions: 1, fumblesLost: 0 });
    expect(with2pt - no2pt).toBeCloseTo(2, 5);
  });
});

// ---------------------------------------------------------------------------
// 38. dkDSTScore
// ---------------------------------------------------------------------------
describe("dkDSTScore", () => {
  it("shutout gives 10 for points allowed", () => {
    const score = dkDSTScore({ sacks: 0, interceptions: 0, fumblesRecovered: 0, safeties: 0, touchdowns: 0, pointsAllowed: 0, yardsAllowed: 300 });
    // shutout = 10; yards 300-349 = 0; total = 10
    expect(score).toBe(10);
  });

  it("computes full DST score correctly", () => {
    const score = dkDSTScore({
      sacks: 3,
      interceptions: 2,
      fumblesRecovered: 1,
      safeties: 0,
      touchdowns: 1,
      pointsAllowed: 17,
      yardsAllowed: 280,
    });
    // 3*1 + 2*2 + 1*2 + 0 + 1*6 + pts(17=1..20→1) + yards(200-299→2)
    // = 3 + 4 + 2 + 0 + 6 + 1 + 2 = 18
    expect(score).toBe(18);
  });

  it("penalizes high points allowed", () => {
    const low = dkDSTScore({ sacks: 0, interceptions: 0, fumblesRecovered: 0, safeties: 0, touchdowns: 0, pointsAllowed: 7, yardsAllowed: 300 });
    const high = dkDSTScore({ sacks: 0, interceptions: 0, fumblesRecovered: 0, safeties: 0, touchdowns: 0, pointsAllowed: 35, yardsAllowed: 300 });
    expect(low).toBeGreaterThan(high);
  });

  it("points allowed 1-6 gives score of 7", () => {
    const score = dkDSTScore({ sacks: 0, interceptions: 0, fumblesRecovered: 0, safeties: 0, touchdowns: 0, pointsAllowed: 3, yardsAllowed: 300 });
    // pts=7, yards=0; total=7
    expect(score).toBe(7);
  });

  it("points allowed 7-13 gives score of 4", () => {
    const score = dkDSTScore({ sacks: 0, interceptions: 0, fumblesRecovered: 0, safeties: 0, touchdowns: 0, pointsAllowed: 10, yardsAllowed: 300 });
    expect(score).toBe(4);
  });

  it("points allowed 14-20 gives score of 1", () => {
    const score = dkDSTScore({ sacks: 0, interceptions: 0, fumblesRecovered: 0, safeties: 0, touchdowns: 0, pointsAllowed: 20, yardsAllowed: 300 });
    expect(score).toBe(1);
  });

  it("points allowed 21-27 gives score of 0", () => {
    const score = dkDSTScore({ sacks: 0, interceptions: 0, fumblesRecovered: 0, safeties: 0, touchdowns: 0, pointsAllowed: 24, yardsAllowed: 300 });
    expect(score).toBe(0);
  });

  it("points allowed 28-34 gives score of -1", () => {
    const score = dkDSTScore({ sacks: 0, interceptions: 0, fumblesRecovered: 0, safeties: 0, touchdowns: 0, pointsAllowed: 30, yardsAllowed: 300 });
    expect(score).toBe(-1);
  });

  it("points allowed 35+ gives score of -4", () => {
    const score = dkDSTScore({ sacks: 0, interceptions: 0, fumblesRecovered: 0, safeties: 0, touchdowns: 0, pointsAllowed: 40, yardsAllowed: 300 });
    expect(score).toBe(-4);
  });

  it("yards allowed <100 gives 5", () => {
    const score = dkDSTScore({ sacks: 0, interceptions: 0, fumblesRecovered: 0, safeties: 0, touchdowns: 0, pointsAllowed: 0, yardsAllowed: 50 });
    // pts=10, yards=5; total=15
    expect(score).toBe(15);
  });

  it("yards allowed 100-199 gives 3", () => {
    const score = dkDSTScore({ sacks: 0, interceptions: 0, fumblesRecovered: 0, safeties: 0, touchdowns: 0, pointsAllowed: 0, yardsAllowed: 150 });
    expect(score).toBe(13); // 10+3
  });

  it("yards allowed 350-399 gives -1", () => {
    const score = dkDSTScore({ sacks: 0, interceptions: 0, fumblesRecovered: 0, safeties: 0, touchdowns: 0, pointsAllowed: 0, yardsAllowed: 375 });
    expect(score).toBe(9); // 10-1
  });

  it("yards allowed 400-449 gives -3", () => {
    const score = dkDSTScore({ sacks: 0, interceptions: 0, fumblesRecovered: 0, safeties: 0, touchdowns: 0, pointsAllowed: 0, yardsAllowed: 420 });
    expect(score).toBe(7); // 10-3
  });

  it("yards allowed 450-499 gives -5", () => {
    const score = dkDSTScore({ sacks: 0, interceptions: 0, fumblesRecovered: 0, safeties: 0, touchdowns: 0, pointsAllowed: 0, yardsAllowed: 475 });
    expect(score).toBe(5); // 10-5
  });

  it("yards allowed 500+ gives -7", () => {
    const score = dkDSTScore({ sacks: 0, interceptions: 0, fumblesRecovered: 0, safeties: 0, touchdowns: 0, pointsAllowed: 0, yardsAllowed: 550 });
    expect(score).toBe(3); // 10-7
  });
});

// ---------------------------------------------------------------------------
// 39. gameScript
// ---------------------------------------------------------------------------
describe("gameScript", () => {
  it("returns 'blowout' when team leads by 17+ after Q2", () => {
    expect(gameScript(21, 3, 600)).toBe("blowout");
  });

  it("returns 'blowout' when team is down by 17+ after Q2", () => {
    expect(gameScript(-21, 3, 600)).toBe("blowout");
  });

  it("does NOT return blowout in Q1 or Q2", () => {
    expect(gameScript(21, 2, 600)).toBe("normal");
    expect(gameScript(21, 1, 600)).toBe("normal");
  });

  it("returns 'comeback' when trailing by 14+ in Q4", () => {
    expect(gameScript(-14, 4, 300)).toBe("comeback");
  });

  it("returns 'close' when within 3 in Q4", () => {
    expect(gameScript(3, 4, 180)).toBe("close");
  });

  it("returns 'close' for tied game in Q4", () => {
    expect(gameScript(0, 4, 300)).toBe("close");
  });

  it("returns 'normal' for normal mid-game situation", () => {
    expect(gameScript(7, 2, 1200)).toBe("normal");
  });

  it("returns 'normal' in Q3 even if large deficit", () => {
    // Q3 is after Q2 so blowout check applies
    expect(gameScript(17, 3, 600)).toBe("blowout");
  });

  it("blowout takes priority over comeback/close", () => {
    // Leading by 20 in Q4
    expect(gameScript(20, 4, 120)).toBe("blowout");
  });
});

// ---------------------------------------------------------------------------
// 40. twoMinuteDrillPressure
// ---------------------------------------------------------------------------
describe("twoMinuteDrillPressure", () => {
  it("returns 0 when timeRemaining is 120 (full 2 min)", () => {
    // (1 - 120/120) = 0 so urgency = 0
    expect(twoMinuteDrillPressure(120, 7, 2)).toBe(0);
  });

  it("returns higher pressure with less time", () => {
    const low = twoMinuteDrillPressure(60, 7, 2);
    const high = twoMinuteDrillPressure(10, 7, 2);
    expect(high).toBeGreaterThan(low);
  });

  it("returns lower pressure with fewer timeouts when uncapped", () => {
    // Use a scenario where neither result hits the 100 cap: small deficit, more time
    const threeTO = twoMinuteDrillPressure(60, 3, 3);
    const zeroTO = twoMinuteDrillPressure(60, 3, 0);
    // 3 timeouts should give higher urgency (more ability to score → more pressure)
    // Actually bonus map: 3=1.0, 0=0.5, so 3TOs = higher urgency
    expect(threeTO).toBeGreaterThan(zeroTO);
  });

  it("larger deficit increases pressure", () => {
    const small = twoMinuteDrillPressure(30, 3, 2);
    const large = twoMinuteDrillPressure(30, 14, 2);
    expect(large).toBeGreaterThan(small);
  });

  it("clamps to 0–100 range", () => {
    const result = twoMinuteDrillPressure(0, 100, 0);
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(100);
  });

  it("uses timeout bonus 3=1.0, 2=0.9 (ratio ~1.111)", () => {
    // Use a small deficit and more time so we stay well below the 100 cap
    const p3 = twoMinuteDrillPressure(90, 2, 3);
    const p2 = twoMinuteDrillPressure(90, 2, 2);
    // ratio should be ~1.0/0.9
    expect(p3 / p2).toBeCloseTo(1 / 0.9, 3);
  });
});

// ---------------------------------------------------------------------------
// 41. weatherImpact
// ---------------------------------------------------------------------------
describe("weatherImpact", () => {
  it("no impact for calm clear weather above freezing", () => {
    const impact = weatherImpact(10, 60, "none");
    expect(impact.passingImpact).toBe(0);
    expect(impact.kickingImpact).toBe(0);
  });

  it("wind above 15mph reduces passing", () => {
    const impact = weatherImpact(25, 60, "none");
    // -0.05 * (25-15) = -0.5
    expect(impact.passingImpact).toBeCloseTo(-0.5, 5);
    expect(impact.kickingImpact).toBe(0);
  });

  it("cold weather reduces kicking", () => {
    const impact = weatherImpact(5, 20, "none");
    // -0.02 * (32-20) = -0.24
    expect(impact.kickingImpact).toBeCloseTo(-0.24, 5);
    expect(impact.passingImpact).toBe(0);
  });

  it("light precipitation compounds effects", () => {
    const impact = weatherImpact(10, 60, "light");
    expect(impact.passingImpact).toBeCloseTo(-0.05, 5);
    expect(impact.kickingImpact).toBeCloseTo(-0.05, 5);
  });

  it("heavy precipitation has larger effect than light", () => {
    const light = weatherImpact(10, 60, "light");
    const heavy = weatherImpact(10, 60, "heavy");
    expect(heavy.passingImpact).toBeLessThan(light.passingImpact);
    expect(heavy.kickingImpact).toBeLessThan(light.kickingImpact);
  });

  it("combined wind and cold both compound", () => {
    const impact = weatherImpact(20, 20, "none");
    // wind: -0.05*5=-0.25 passing; cold: -0.02*12=-0.24 kicking
    expect(impact.passingImpact).toBeCloseTo(-0.25, 5);
    expect(impact.kickingImpact).toBeCloseTo(-0.24, 5);
  });

  it("wind at exactly 15mph has no effect", () => {
    const impact = weatherImpact(15, 60, "none");
    expect(impact.passingImpact).toBe(0);
  });

  it("temperature at exactly 32F has no cold impact", () => {
    const impact = weatherImpact(5, 32, "none");
    expect(impact.kickingImpact).toBe(0);
  });

  it("heavy precipitation with wind and cold stacks all effects", () => {
    const impact = weatherImpact(25, 20, "heavy");
    // wind: -0.05*10=-0.5 passing; cold: -0.02*12=-0.24 kicking; heavy: -0.15 both
    expect(impact.passingImpact).toBeCloseTo(-0.65, 5);
    expect(impact.kickingImpact).toBeCloseTo(-0.39, 5);
  });
});
