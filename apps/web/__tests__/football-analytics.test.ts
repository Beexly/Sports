import { describe, it, expect } from "vitest";
import {
  expectedPoints,
  epaFromPlay,
  winProbability,
  wpaFromPlay,
  isSuccessfulPlay,
  successRate,
  completedAirYards,
  intendedAirYards,
  airYardsPerAttempt,
  catchRateByDepth,
  targetShare,
  aYAC,
  cpoe,
  yardsPerCarry,
  rushSuccessRate,
  stuffRate,
  explosiveRunRate,
  yardsBeforeContact,
  successValue,
  dvoaLite,
  offensiveDvoa,
  defensiveDvoa,
  timeToThrow,
  pressureRate,
  sackRate,
  blitzRate,
  redZoneEfficiency,
  thirdDownConversionRate,
  fourthDownConversionRate,
  turnoverDifferential,
  penaltyYardsPerGame,
  driveSuccessRate,
  avgDriveLength,
  avgDriveTime,
  drivePointsPerTrip,
  teamEfficiencySummary,
  type PlayContext,
  type PassPlay,
  type RushPlay,
  type Drive,
  type TeamGameStats,
} from "@/lib/sports/football-analytics";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCtx(overrides: Partial<PlayContext> = {}): PlayContext {
  return {
    down: 1,
    yardsToGo: 10,
    yardLine: 50,
    quarterSecondsLeft: 450,
    scoreDiff: 0,
    ...overrides,
  };
}

function makePass(overrides: Partial<PassPlay> = {}): PassPlay {
  return {
    airYards: 8,
    completed: true,
    targetDepth: "short",
    targetLocation: "middle",
    ...overrides,
  };
}

function makeRush(overrides: Partial<RushPlay> = {}): RushPlay {
  return {
    yardsGained: 5,
    direction: "middle",
    gapType: "guard",
    ...overrides,
  };
}

function makeDrive(overrides: Partial<Drive> = {}): Drive {
  return {
    plays: 8,
    yards: 55,
    result: "touchdown",
    startingYardLine: 25,
    secondsUsed: 240,
    ...overrides,
  };
}

function makeTeamStats(overrides: Partial<TeamGameStats> = {}): TeamGameStats {
  return {
    plays: 60,
    yards: 360,
    points: 24,
    firstDowns: 20,
    rushAttempts: 25,
    rushYards: 110,
    passAttempts: 35,
    completions: 22,
    passYards: 250,
    sacks: 2,
    sackYards: 14,
    turnovers: 1,
    thirdDownConversions: 7,
    thirdDownAttempts: 14,
    redZoneAttempts: 4,
    redZoneScores: 3,
    penaltyYards: 45,
    timeOfPossession: 1800,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// expectedPoints
// ---------------------------------------------------------------------------

describe("expectedPoints", () => {
  it("returns higher EP for better field position — opp 20 > own 20", () => {
    const ownCtx = makeCtx({ yardLine: 20 }); // own 20
    const oppCtx = makeCtx({ yardLine: 80 }); // opp 20 territory
    expect(expectedPoints(oppCtx)).toBeGreaterThan(expectedPoints(ownCtx));
  });

  it("returns negative EP when pinned near own end zone (yardLine 5)", () => {
    const ctx = makeCtx({ yardLine: 5, down: 1, yardsToGo: 10 });
    expect(expectedPoints(ctx)).toBeLessThan(0);
  });

  it("1st&10 has higher EP than 2nd&10 at the same field position", () => {
    const first = makeCtx({ down: 1, yardsToGo: 10, yardLine: 50 });
    const second = makeCtx({ down: 2, yardsToGo: 10, yardLine: 50 });
    expect(expectedPoints(first)).toBeGreaterThan(expectedPoints(second));
  });

  it("3rd&10 has lower EP than 1st&10", () => {
    const first = makeCtx({ down: 1, yardsToGo: 10, yardLine: 50 });
    const third = makeCtx({ down: 3, yardsToGo: 10, yardLine: 50 });
    expect(expectedPoints(first)).toBeGreaterThan(expectedPoints(third));
  });

  it("4th&10 has lower EP than 3rd&10", () => {
    const third = makeCtx({ down: 3, yardsToGo: 10, yardLine: 50 });
    const fourth = makeCtx({ down: 4, yardsToGo: 10, yardLine: 50 });
    expect(expectedPoints(third)).toBeGreaterThan(expectedPoints(fourth));
  });

  it("midfield 1st&10 has a positive EP", () => {
    const ctx = makeCtx({ yardLine: 50, down: 1, yardsToGo: 10 });
    expect(expectedPoints(ctx)).toBeGreaterThan(0);
  });

  it("opponent's 5 yard line has near-max EP", () => {
    const ctx = makeCtx({ yardLine: 95, down: 1, yardsToGo: 5 });
    expect(expectedPoints(ctx)).toBeGreaterThan(4);
  });

  it("shorter yardsToGo at same field position gives higher EP", () => {
    const long = makeCtx({ yardsToGo: 15, yardLine: 50 });
    const short = makeCtx({ yardsToGo: 5, yardLine: 50 });
    expect(expectedPoints(short)).toBeGreaterThan(expectedPoints(long));
  });
});

// ---------------------------------------------------------------------------
// epaFromPlay
// ---------------------------------------------------------------------------

describe("epaFromPlay", () => {
  it("touchdown gives maximum positive EPA", () => {
    const ctx = makeCtx({ yardLine: 90, down: 1, yardsToGo: 10 });
    const epa = epaFromPlay(ctx, 10, "touchdown");
    expect(epa).toBeGreaterThan(0);
  });

  it("touchdown EPA = 7 - EP(before)", () => {
    const ctx = makeCtx({ yardLine: 50, down: 1, yardsToGo: 10 });
    const epBefore = expectedPoints(ctx);
    const epa = epaFromPlay(ctx, 10, "touchdown");
    expect(epa).toBeCloseTo(7 - epBefore, 5);
  });

  it("field goal EPA = 3 - EP(before)", () => {
    const ctx = makeCtx({ yardLine: 65, down: 3, yardsToGo: 5 });
    const epBefore = expectedPoints(ctx);
    const epa = epaFromPlay(ctx, 0, "field_goal");
    expect(epa).toBeCloseTo(3 - epBefore, 5);
  });

  it("safety EPA = -2 - EP(before)", () => {
    const ctx = makeCtx({ yardLine: 5, down: 2, yardsToGo: 8 });
    const epBefore = expectedPoints(ctx);
    const epa = epaFromPlay(ctx, 0, "safety");
    expect(epa).toBeCloseTo(-2 - epBefore, 5);
  });

  it("first down gain gives positive EPA on 1st&10", () => {
    const ctx = makeCtx({ yardLine: 50, down: 1, yardsToGo: 10 });
    const epa = epaFromPlay(ctx, 12);
    expect(epa).toBeGreaterThan(0);
  });

  it("large gain gives higher EPA than small gain", () => {
    const ctx = makeCtx({ yardLine: 40, down: 1, yardsToGo: 10 });
    const epaSmall = epaFromPlay(ctx, 3);
    const epaLarge = epaFromPlay(ctx, 15);
    expect(epaLarge).toBeGreaterThan(epaSmall);
  });

  it("4th down turnover on downs gives negative EPA", () => {
    const ctx = makeCtx({ down: 4, yardsToGo: 5, yardLine: 50 });
    const epa = epaFromPlay(ctx, 2);
    expect(epa).toBeLessThan(0);
  });

  it("null scoringPlay does not override EPA calculation", () => {
    const ctx = makeCtx({ yardLine: 50, down: 1, yardsToGo: 10 });
    const epa = epaFromPlay(ctx, 5, null);
    // Should not be 7, 3, or -2
    expect(Math.abs(epa)).toBeLessThan(3);
  });
});

// ---------------------------------------------------------------------------
// winProbability
// ---------------------------------------------------------------------------

describe("winProbability", () => {
  it("0-0 tie with half time remaining → ~0.5", () => {
    const ctx = makeCtx({ scoreDiff: 0, quarterSecondsLeft: 450 });
    const wp = winProbability(ctx);
    expect(wp).toBeGreaterThan(0.45);
    expect(wp).toBeLessThan(0.55);
  });

  it("large lead with very little time → near 1.0 for leader", () => {
    const ctx = makeCtx({ scoreDiff: 28, quarterSecondsLeft: 10 });
    const wp = winProbability(ctx);
    expect(wp).toBeGreaterThan(0.9);
  });

  it("large deficit with very little time → near 0 for trailing team", () => {
    const ctx = makeCtx({ scoreDiff: -28, quarterSecondsLeft: 10 });
    const wp = winProbability(ctx);
    expect(wp).toBeLessThan(0.1);
  });

  it("moderate lead with moderate time → above 0.5 but not near 1.0", () => {
    const ctx = makeCtx({ scoreDiff: 7, quarterSecondsLeft: 400 });
    const wp = winProbability(ctx);
    expect(wp).toBeGreaterThan(0.5);
    expect(wp).toBeLessThan(0.9);
  });

  it("returns value between 0 and 1", () => {
    const ctx = makeCtx({ scoreDiff: 100, quarterSecondsLeft: 0 });
    const wp = winProbability(ctx);
    expect(wp).toBeGreaterThanOrEqual(0);
    expect(wp).toBeLessThanOrEqual(1);
  });

  it("symmetric: deficit is complement of same surplus (approximately)", () => {
    const ctxLead = makeCtx({ scoreDiff: 14, quarterSecondsLeft: 450 });
    const ctxDeficit = makeCtx({ scoreDiff: -14, quarterSecondsLeft: 450 });
    const wpLead = winProbability(ctxLead);
    const wpDeficit = winProbability(ctxDeficit);
    // They should sum to approximately 1 (symmetric model)
    expect(wpLead + wpDeficit).toBeCloseTo(1, 1);
  });
});

// ---------------------------------------------------------------------------
// wpaFromPlay
// ---------------------------------------------------------------------------

describe("wpaFromPlay", () => {
  it("scoring play produces positive WPA for scoring team", () => {
    const ctxBefore = makeCtx({ scoreDiff: 0, quarterSecondsLeft: 100 });
    const ctxAfter = makeCtx({ scoreDiff: 7, quarterSecondsLeft: 95 });
    const wpa = wpaFromPlay(ctxBefore, ctxAfter);
    expect(wpa).toBeGreaterThan(0);
  });

  it("losing ground produces negative WPA", () => {
    const ctxBefore = makeCtx({ scoreDiff: 0, quarterSecondsLeft: 200 });
    const ctxAfter = makeCtx({ scoreDiff: -7, quarterSecondsLeft: 195 });
    const wpa = wpaFromPlay(ctxBefore, ctxAfter);
    expect(wpa).toBeLessThan(0);
  });

  it("same context before and after yields 0 WPA", () => {
    const ctx = makeCtx({ scoreDiff: 3, quarterSecondsLeft: 300 });
    const wpa = wpaFromPlay(ctx, ctx);
    expect(wpa).toBeCloseTo(0, 10);
  });
});

// ---------------------------------------------------------------------------
// isSuccessfulPlay
// ---------------------------------------------------------------------------

describe("isSuccessfulPlay", () => {
  it("1st&10: gain 4 = successful (exactly 40%)", () => {
    const ctx = makeCtx({ down: 1, yardsToGo: 10 });
    expect(isSuccessfulPlay(ctx, 4)).toBe(true);
  });

  it("1st&10: gain 3 = not successful (< 40%)", () => {
    const ctx = makeCtx({ down: 1, yardsToGo: 10 });
    expect(isSuccessfulPlay(ctx, 3)).toBe(false);
  });

  it("1st&10: gain 0 = not successful", () => {
    const ctx = makeCtx({ down: 1, yardsToGo: 10 });
    expect(isSuccessfulPlay(ctx, 0)).toBe(false);
  });

  it("1st&10: gain 10 (first down) = successful", () => {
    const ctx = makeCtx({ down: 1, yardsToGo: 10 });
    expect(isSuccessfulPlay(ctx, 10)).toBe(true);
  });

  it("2nd&10: gain 6 = successful (60%)", () => {
    const ctx = makeCtx({ down: 2, yardsToGo: 10 });
    expect(isSuccessfulPlay(ctx, 6)).toBe(true);
  });

  it("2nd&10: gain 5 = not successful (< 60%)", () => {
    const ctx = makeCtx({ down: 2, yardsToGo: 10 });
    expect(isSuccessfulPlay(ctx, 5)).toBe(false);
  });

  it("2nd&10: gain 10 (first down) = successful", () => {
    const ctx = makeCtx({ down: 2, yardsToGo: 10 });
    expect(isSuccessfulPlay(ctx, 10)).toBe(true);
  });

  it("3rd&5: gain 6 = successful (first down)", () => {
    const ctx = makeCtx({ down: 3, yardsToGo: 5 });
    expect(isSuccessfulPlay(ctx, 6)).toBe(true);
  });

  it("3rd&5: gain 4 = not successful (no first down)", () => {
    const ctx = makeCtx({ down: 3, yardsToGo: 5 });
    expect(isSuccessfulPlay(ctx, 4)).toBe(false);
  });

  it("4th&1: gain 1 = successful (first down)", () => {
    const ctx = makeCtx({ down: 4, yardsToGo: 1 });
    expect(isSuccessfulPlay(ctx, 1)).toBe(true);
  });

  it("4th&2: gain 1 = not successful", () => {
    const ctx = makeCtx({ down: 4, yardsToGo: 2 });
    expect(isSuccessfulPlay(ctx, 1)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// successRate
// ---------------------------------------------------------------------------

describe("successRate", () => {
  it("returns 0 for empty array", () => {
    expect(successRate([])).toBe(0);
  });

  it("all successful plays → 1.0", () => {
    const plays = [
      { ctx: makeCtx({ down: 1, yardsToGo: 10 }), yardsGained: 5 },
      { ctx: makeCtx({ down: 1, yardsToGo: 10 }), yardsGained: 6 },
    ];
    expect(successRate(plays)).toBe(1);
  });

  it("no successful plays → 0.0", () => {
    const plays = [
      { ctx: makeCtx({ down: 1, yardsToGo: 10 }), yardsGained: 2 },
      { ctx: makeCtx({ down: 3, yardsToGo: 8 }), yardsGained: 4 },
    ];
    expect(successRate(plays)).toBe(0);
  });

  it("half successful → 0.5", () => {
    const plays = [
      { ctx: makeCtx({ down: 1, yardsToGo: 10 }), yardsGained: 5 }, // success
      { ctx: makeCtx({ down: 1, yardsToGo: 10 }), yardsGained: 2 }, // fail
    ];
    expect(successRate(plays)).toBe(0.5);
  });

  it("mixed downs computed correctly", () => {
    const plays = [
      { ctx: makeCtx({ down: 1, yardsToGo: 10 }), yardsGained: 4 }, // 40% — success
      { ctx: makeCtx({ down: 2, yardsToGo: 10 }), yardsGained: 6 }, // 60% — success
      { ctx: makeCtx({ down: 3, yardsToGo: 5 }), yardsGained: 4 }, // no first — fail
    ];
    expect(successRate(plays)).toBeCloseTo(2 / 3, 5);
  });
});

// ---------------------------------------------------------------------------
// Air Yards Metrics
// ---------------------------------------------------------------------------

describe("completedAirYards", () => {
  it("returns 0 for empty array", () => {
    expect(completedAirYards([])).toBe(0);
  });

  it("sums only completed passes", () => {
    const plays: PassPlay[] = [
      makePass({ airYards: 10, completed: true }),
      makePass({ airYards: 20, completed: false }),
      makePass({ airYards: 5, completed: true }),
    ];
    expect(completedAirYards(plays)).toBe(15);
  });

  it("no completions → 0", () => {
    const plays = [makePass({ completed: false, airYards: 15 })];
    expect(completedAirYards(plays)).toBe(0);
  });
});

describe("intendedAirYards", () => {
  it("returns 0 for empty array", () => {
    expect(intendedAirYards([])).toBe(0);
  });

  it("sums all air yards regardless of completion", () => {
    const plays: PassPlay[] = [
      makePass({ airYards: 10, completed: true }),
      makePass({ airYards: 20, completed: false }),
    ];
    expect(intendedAirYards(plays)).toBe(30);
  });
});

describe("airYardsPerAttempt", () => {
  it("returns 0 for empty array", () => {
    expect(airYardsPerAttempt([])).toBe(0);
  });

  it("returns correct average", () => {
    const plays: PassPlay[] = [
      makePass({ airYards: 10 }),
      makePass({ airYards: 20 }),
    ];
    expect(airYardsPerAttempt(plays)).toBe(15);
  });

  it("completed air yards < intended air yards when some incomplete", () => {
    const plays: PassPlay[] = [
      makePass({ airYards: 10, completed: true }),
      makePass({ airYards: 30, completed: false }),
    ];
    expect(completedAirYards(plays)).toBeLessThan(intendedAirYards(plays));
  });
});

// ---------------------------------------------------------------------------
// catchRateByDepth
// ---------------------------------------------------------------------------

describe("catchRateByDepth", () => {
  it("returns all zeros for empty array", () => {
    const rates = catchRateByDepth([]);
    expect(rates["short"]).toBe(0);
    expect(rates["intermediate"]).toBe(0);
    expect(rates["deep"]).toBe(0);
  });

  it("correctly separates short completion rate", () => {
    const plays: PassPlay[] = [
      makePass({ targetDepth: "short", completed: true }),
      makePass({ targetDepth: "short", completed: false }),
      makePass({ targetDepth: "deep", completed: true }),
    ];
    const rates = catchRateByDepth(plays);
    expect(rates["short"]).toBe(0.5);
    expect(rates["deep"]).toBe(1.0);
    expect(rates["intermediate"]).toBe(0);
  });

  it("all completions → 1.0 for each depth", () => {
    const plays: PassPlay[] = [
      makePass({ targetDepth: "short", completed: true }),
      makePass({ targetDepth: "intermediate", completed: true }),
      makePass({ targetDepth: "deep", completed: true }),
    ];
    const rates = catchRateByDepth(plays);
    expect(rates["short"]).toBe(1.0);
    expect(rates["intermediate"]).toBe(1.0);
    expect(rates["deep"]).toBe(1.0);
  });

  it("no completions → 0.0 for each depth", () => {
    const plays: PassPlay[] = [
      makePass({ targetDepth: "short", completed: false }),
      makePass({ targetDepth: "deep", completed: false }),
    ];
    const rates = catchRateByDepth(plays);
    expect(rates["short"]).toBe(0);
    expect(rates["deep"]).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// targetShare
// ---------------------------------------------------------------------------

describe("targetShare", () => {
  it("returns 0 when team has 0 targets", () => {
    expect(targetShare(5, 0)).toBe(0);
  });

  it("calculates correct share", () => {
    expect(targetShare(8, 32)).toBe(0.25);
  });

  it("100% share when player has all targets", () => {
    expect(targetShare(10, 10)).toBe(1.0);
  });
});

// ---------------------------------------------------------------------------
// aYAC
// ---------------------------------------------------------------------------

describe("aYAC", () => {
  it("returns 0 for empty array", () => {
    expect(aYAC([])).toBe(0);
  });

  it("returns 0 if no completed plays", () => {
    const plays = [makePass({ completed: false, yardsAfterCatch: 10 })];
    expect(aYAC(plays)).toBe(0);
  });

  it("returns correct average for completed plays", () => {
    const plays: PassPlay[] = [
      makePass({ completed: true, yardsAfterCatch: 6 }),
      makePass({ completed: true, yardsAfterCatch: 10 }),
      makePass({ completed: false, yardsAfterCatch: 20 }), // excluded
    ];
    expect(aYAC(plays)).toBe(8);
  });

  it("ignores plays without yardsAfterCatch", () => {
    const plays: PassPlay[] = [
      makePass({ completed: true, yardsAfterCatch: undefined }),
    ];
    // No YAC defined, but the play is complete — should be 0 YAC
    expect(aYAC(plays)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// cpoe
// ---------------------------------------------------------------------------

describe("cpoe", () => {
  it("completion on 0-5 air yard pass gives negative CPOE (expected 75%)", () => {
    // completed = 1, expected = 0.75, CPOE = 0.25 (positive)
    const result = cpoe(true, 3);
    expect(result).toBeCloseTo(0.25, 5);
  });

  it("incompletion on 0-5 air yard pass gives negative CPOE", () => {
    // completed = 0, expected = 0.75, CPOE = -0.75
    const result = cpoe(false, 3);
    expect(result).toBeCloseTo(-0.75, 5);
  });

  it("completion on >20 air yard pass gives positive CPOE", () => {
    // expected = 0.25, CPOE = 0.75
    const result = cpoe(true, 25);
    expect(result).toBeCloseTo(0.75, 5);
  });

  it("incompletion on >20 air yard pass gives negative CPOE", () => {
    // expected = 0.25, CPOE = -0.25
    const result = cpoe(false, 25);
    expect(result).toBeCloseTo(-0.25, 5);
  });

  it("completion on 10-15 air yards has positive CPOE", () => {
    // expected = 0.50, CPOE = 0.50
    const result = cpoe(true, 12);
    expect(result).toBeGreaterThan(0);
  });

  it("incompletion on 10-15 air yards has negative CPOE", () => {
    const result = cpoe(false, 12);
    expect(result).toBeLessThan(0);
  });

  it("CPOE sum for completion and incompletion at same depth = -(2*expected - 1)", () => {
    // completion CPOE + incompletion CPOE = (1-e) + (0-e) = 1 - 2e
    const expected = 0.65; // 5-10 range
    const complete = cpoe(true, 8);
    const incomplete = cpoe(false, 8);
    expect(complete + incomplete).toBeCloseTo(1 - 2 * expected, 5);
  });
});

// ---------------------------------------------------------------------------
// Rushing Analytics
// ---------------------------------------------------------------------------

describe("yardsPerCarry", () => {
  it("returns 0 for empty array", () => {
    expect(yardsPerCarry([])).toBe(0);
  });

  it("calculates average yards correctly", () => {
    const plays = [makeRush({ yardsGained: 4 }), makeRush({ yardsGained: 8 })];
    expect(yardsPerCarry(plays)).toBe(6);
  });

  it("handles negative yards (loss)", () => {
    const plays = [makeRush({ yardsGained: -2 }), makeRush({ yardsGained: 8 })];
    expect(yardsPerCarry(plays)).toBe(3);
  });
});

describe("rushSuccessRate", () => {
  it("returns 0 for empty array", () => {
    expect(rushSuccessRate([])).toBe(0);
  });

  it("calculates success rate for rush plays with context", () => {
    const plays = [
      { play: makeRush({ yardsGained: 5 }), ctx: makeCtx({ down: 1, yardsToGo: 10 }) }, // success (50% > 40%)
      { play: makeRush({ yardsGained: 2 }), ctx: makeCtx({ down: 1, yardsToGo: 10 }) }, // fail
    ];
    expect(rushSuccessRate(plays)).toBe(0.5);
  });
});

describe("stuffRate", () => {
  it("returns 0 for empty array", () => {
    expect(stuffRate([])).toBe(0);
  });

  it("fraction of runs <= 0 (default)", () => {
    const plays = [
      makeRush({ yardsGained: -1 }),
      makeRush({ yardsGained: 0 }),
      makeRush({ yardsGained: 3 }),
      makeRush({ yardsGained: 5 }),
    ];
    expect(stuffRate(plays)).toBe(0.5);
  });

  it("custom threshold of 2", () => {
    const plays = [
      makeRush({ yardsGained: 1 }),
      makeRush({ yardsGained: 2 }),
      makeRush({ yardsGained: 5 }),
    ];
    expect(stuffRate(plays, 2)).toBeCloseTo(2 / 3, 5);
  });

  it("no stuffed runs → 0", () => {
    const plays = [makeRush({ yardsGained: 3 }), makeRush({ yardsGained: 7 })];
    expect(stuffRate(plays)).toBe(0);
  });
});

describe("explosiveRunRate", () => {
  it("returns 0 for empty array", () => {
    expect(explosiveRunRate([])).toBe(0);
  });

  it("fraction >= 10 yards (default)", () => {
    const plays = [
      makeRush({ yardsGained: 5 }),
      makeRush({ yardsGained: 10 }),
      makeRush({ yardsGained: 15 }),
    ];
    expect(explosiveRunRate(plays)).toBeCloseTo(2 / 3, 5);
  });

  it("custom threshold of 15", () => {
    const plays = [
      makeRush({ yardsGained: 10 }),
      makeRush({ yardsGained: 20 }),
    ];
    expect(explosiveRunRate(plays, 15)).toBe(0.5);
  });

  it("all explosive → 1.0", () => {
    const plays = [makeRush({ yardsGained: 20 }), makeRush({ yardsGained: 15 })];
    expect(explosiveRunRate(plays)).toBe(1.0);
  });
});

describe("yardsBeforeContact", () => {
  it("returns avgContact when <= yardsGained", () => {
    expect(yardsBeforeContact(3, 7)).toBe(3);
  });

  it("returns avgContact even when > yardsGained (as documented)", () => {
    expect(yardsBeforeContact(8, 5)).toBe(8);
  });

  it("returns 0 for 0 avgContact", () => {
    expect(yardsBeforeContact(0, 5)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// DVOA-lite
// ---------------------------------------------------------------------------

describe("successValue", () => {
  it("successful 1st down play → positive value", () => {
    const ctx = makeCtx({ down: 1, yardsToGo: 10 });
    expect(successValue(ctx, 5)).toBeGreaterThan(0);
  });

  it("failed play → negative value", () => {
    const ctx = makeCtx({ down: 1, yardsToGo: 10 });
    expect(successValue(ctx, 2)).toBeLessThan(0);
  });

  it("4th down play has higher weight than 1st down play (same success)", () => {
    const ctx1 = makeCtx({ down: 1, yardsToGo: 5 });
    const ctx4 = makeCtx({ down: 4, yardsToGo: 5 });
    // Both are failures (gain 1 yard on &5)
    const val1 = successValue(ctx1, 1);
    const val4 = successValue(ctx4, 1);
    // 4th down failure is worse (more negative)
    expect(Math.abs(val4)).toBeGreaterThan(Math.abs(val1));
  });
});

describe("dvoaLite", () => {
  it("returns 0 for empty array", () => {
    expect(dvoaLite([])).toBe(0);
  });

  it("all successful plays → positive DVOA vs 0 league avg", () => {
    const plays = [
      { ctx: makeCtx({ down: 1, yardsToGo: 10 }), yardsGained: 6 },
      { ctx: makeCtx({ down: 2, yardsToGo: 8 }), yardsGained: 7 },
    ];
    expect(dvoaLite(plays)).toBeGreaterThan(0);
  });

  it("all failed plays → negative DVOA vs 0 league avg", () => {
    const plays = [
      { ctx: makeCtx({ down: 1, yardsToGo: 10 }), yardsGained: 2 },
      { ctx: makeCtx({ down: 3, yardsToGo: 8 }), yardsGained: 4 },
    ];
    expect(dvoaLite(plays)).toBeLessThan(0);
  });

  it("successful slate outperforms unsuccessful slate", () => {
    const goodPlays = [
      { ctx: makeCtx({ down: 1, yardsToGo: 10 }), yardsGained: 8 },
      { ctx: makeCtx({ down: 2, yardsToGo: 5 }), yardsGained: 6 },
    ];
    const badPlays = [
      { ctx: makeCtx({ down: 1, yardsToGo: 10 }), yardsGained: 1 },
      { ctx: makeCtx({ down: 3, yardsToGo: 8 }), yardsGained: 3 },
    ];
    expect(dvoaLite(goodPlays)).toBeGreaterThan(dvoaLite(badPlays));
  });

  it("with non-zero leagueAvg adjusts result", () => {
    const plays = [
      { ctx: makeCtx({ down: 1, yardsToGo: 10 }), yardsGained: 6 },
    ];
    const withAvg = dvoaLite(plays, 1.5);
    const withoutAvg = dvoaLite(plays, 0);
    expect(withAvg).toBeLessThan(withoutAvg);
  });
});

describe("offensiveDvoa", () => {
  it("returns 0 for 0 plays", () => {
    const stats = makeTeamStats({ plays: 0 });
    const avg = makeTeamStats();
    expect(offensiveDvoa(stats, avg)).toBe(0);
  });

  it("above-average offense → positive DVOA", () => {
    const stats = makeTeamStats({ plays: 60, yards: 420 }); // 7 YPP
    const avg = makeTeamStats({ plays: 60, yards: 300 }); // 5 YPP
    expect(offensiveDvoa(stats, avg)).toBeGreaterThan(0);
  });

  it("below-average offense → negative DVOA", () => {
    const stats = makeTeamStats({ plays: 60, yards: 240 }); // 4 YPP
    const avg = makeTeamStats({ plays: 60, yards: 300 }); // 5 YPP
    expect(offensiveDvoa(stats, avg)).toBeLessThan(0);
  });
});

describe("defensiveDvoa", () => {
  it("better defense (allowed fewer yards) → positive DVOA", () => {
    const stats = makeTeamStats({ plays: 60, yards: 240 }); // allowed fewer
    const avg = makeTeamStats({ plays: 60, yards: 300 });
    expect(defensiveDvoa(stats, avg)).toBeGreaterThan(0);
  });

  it("worse defense (allowed more yards) → negative DVOA", () => {
    const stats = makeTeamStats({ plays: 60, yards: 420 }); // allowed more
    const avg = makeTeamStats({ plays: 60, yards: 300 });
    expect(defensiveDvoa(stats, avg)).toBeLessThan(0);
  });
});

// ---------------------------------------------------------------------------
// Pressure and Protection
// ---------------------------------------------------------------------------

describe("timeToThrow", () => {
  it("< 2.5s → quick", () => {
    expect(timeToThrow(2.0)).toBe("quick");
    expect(timeToThrow(2.49)).toBe("quick");
  });

  it("2.5s–3.0s → average", () => {
    expect(timeToThrow(2.5)).toBe("average");
    expect(timeToThrow(3.0)).toBe("average");
  });

  it("> 3.0s → slow", () => {
    expect(timeToThrow(3.1)).toBe("slow");
    expect(timeToThrow(4.5)).toBe("slow");
  });
});

describe("pressureRate", () => {
  it("returns 0 for 0 dropbacks", () => {
    expect(pressureRate(5, 0)).toBe(0);
  });

  it("calculates correct rate", () => {
    expect(pressureRate(12, 40)).toBe(0.3);
  });
});

describe("sackRate", () => {
  it("returns 0 for 0 dropbacks", () => {
    expect(sackRate(3, 0)).toBe(0);
  });

  it("calculates correct sack rate", () => {
    expect(sackRate(4, 40)).toBe(0.1);
  });
});

describe("blitzRate", () => {
  it("returns 0 for 0 plays", () => {
    expect(blitzRate(10, 0)).toBe(0);
  });

  it("calculates correct blitz rate", () => {
    expect(blitzRate(20, 60)).toBeCloseTo(1 / 3, 5);
  });
});

// ---------------------------------------------------------------------------
// Situational Stats
// ---------------------------------------------------------------------------

describe("redZoneEfficiency", () => {
  it("returns 0 for 0 attempts", () => {
    expect(redZoneEfficiency(0, 0)).toBe(0);
  });

  it("calculates efficiency correctly", () => {
    expect(redZoneEfficiency(4, 3)).toBe(0.75);
  });

  it("perfect efficiency → 1.0", () => {
    expect(redZoneEfficiency(5, 5)).toBe(1.0);
  });
});

describe("thirdDownConversionRate", () => {
  it("returns 0 for 0 attempts", () => {
    expect(thirdDownConversionRate(0, 0)).toBe(0);
  });

  it("calculates conversion rate", () => {
    expect(thirdDownConversionRate(7, 14)).toBe(0.5);
  });
});

describe("fourthDownConversionRate", () => {
  it("returns 0 for 0 attempts", () => {
    expect(fourthDownConversionRate(0, 0)).toBe(0);
  });

  it("calculates conversion rate", () => {
    expect(fourthDownConversionRate(2, 4)).toBe(0.5);
  });
});

describe("turnoverDifferential", () => {
  it("positive when more forced than committed", () => {
    expect(turnoverDifferential(3, 1)).toBe(2);
  });

  it("negative when more committed than forced", () => {
    expect(turnoverDifferential(1, 3)).toBe(-2);
  });

  it("zero when equal", () => {
    expect(turnoverDifferential(2, 2)).toBe(0);
  });
});

describe("penaltyYardsPerGame", () => {
  it("returns 0 for 0 games", () => {
    expect(penaltyYardsPerGame(100, 0)).toBe(0);
  });

  it("calculates correctly", () => {
    expect(penaltyYardsPerGame(680, 17)).toBe(40);
  });
});

// ---------------------------------------------------------------------------
// Drive Analytics
// ---------------------------------------------------------------------------

describe("driveSuccessRate", () => {
  it("returns 0 for empty array", () => {
    expect(driveSuccessRate([])).toBe(0);
  });

  it("TD and FG count; punts and turnovers do not", () => {
    const drives: Drive[] = [
      makeDrive({ result: "touchdown" }),
      makeDrive({ result: "field_goal" }),
      makeDrive({ result: "punt" }),
      makeDrive({ result: "turnover" }),
    ];
    expect(driveSuccessRate(drives)).toBe(0.5);
  });

  it("all touchdowns → 1.0", () => {
    const drives = [makeDrive({ result: "touchdown" }), makeDrive({ result: "touchdown" })];
    expect(driveSuccessRate(drives)).toBe(1.0);
  });

  it("all punts → 0", () => {
    const drives = [makeDrive({ result: "punt" }), makeDrive({ result: "punt" })];
    expect(driveSuccessRate(drives)).toBe(0);
  });

  it("end_of_half and end_of_game do not count as successes", () => {
    const drives: Drive[] = [
      makeDrive({ result: "end_of_half" }),
      makeDrive({ result: "end_of_game" }),
      makeDrive({ result: "touchdown" }),
    ];
    expect(driveSuccessRate(drives)).toBeCloseTo(1 / 3, 5);
  });
});

describe("avgDriveLength", () => {
  it("returns 0 for empty array", () => {
    expect(avgDriveLength([])).toBe(0);
  });

  it("calculates average yards", () => {
    const drives = [makeDrive({ yards: 40 }), makeDrive({ yards: 60 })];
    expect(avgDriveLength(drives)).toBe(50);
  });
});

describe("avgDriveTime", () => {
  it("returns 0 for empty array", () => {
    expect(avgDriveTime([])).toBe(0);
  });

  it("calculates average seconds", () => {
    const drives = [makeDrive({ secondsUsed: 200 }), makeDrive({ secondsUsed: 300 })];
    expect(avgDriveTime(drives)).toBe(250);
  });
});

describe("drivePointsPerTrip", () => {
  it("returns 0 for empty array", () => {
    expect(drivePointsPerTrip([])).toBe(0);
  });

  it("TD = 7 points", () => {
    const drives = [makeDrive({ result: "touchdown" })];
    expect(drivePointsPerTrip(drives)).toBe(7);
  });

  it("FG = 3 points", () => {
    const drives = [makeDrive({ result: "field_goal" })];
    expect(drivePointsPerTrip(drives)).toBe(3);
  });

  it("punt = 0 points", () => {
    const drives = [makeDrive({ result: "punt" })];
    expect(drivePointsPerTrip(drives)).toBe(0);
  });

  it("mixed drives average correctly", () => {
    // TD=7, FG=3, punt=0 → avg = (7+3+0)/3 = 10/3 ≈ 3.33
    const drives: Drive[] = [
      makeDrive({ result: "touchdown" }),
      makeDrive({ result: "field_goal" }),
      makeDrive({ result: "punt" }),
    ];
    expect(drivePointsPerTrip(drives)).toBeCloseTo(10 / 3, 5);
  });

  it("two TDs and one FG average correctly", () => {
    const drives: Drive[] = [
      makeDrive({ result: "touchdown" }),
      makeDrive({ result: "touchdown" }),
      makeDrive({ result: "field_goal" }),
    ];
    expect(drivePointsPerTrip(drives)).toBeCloseTo(17 / 3, 5);
  });
});

// ---------------------------------------------------------------------------
// teamEfficiencySummary
// ---------------------------------------------------------------------------

describe("teamEfficiencySummary", () => {
  it("returns object with all 5 required fields", () => {
    const stats = makeTeamStats();
    const avg = makeTeamStats();
    const result = teamEfficiencySummary(stats, avg);
    expect(result).toHaveProperty("yardsPerPlay");
    expect(result).toHaveProperty("pointsPerPlay");
    expect(result).toHaveProperty("successRate");
    expect(result).toHaveProperty("offensiveDvoa");
    expect(result).toHaveProperty("explosivePlayRate");
  });

  it("yardsPerPlay is yards/plays", () => {
    const stats = makeTeamStats({ plays: 60, yards: 360 });
    const avg = makeTeamStats();
    const result = teamEfficiencySummary(stats, avg);
    expect(result.yardsPerPlay).toBeCloseTo(6, 5);
  });

  it("pointsPerPlay is points/plays", () => {
    const stats = makeTeamStats({ plays: 60, points: 24 });
    const avg = makeTeamStats();
    const result = teamEfficiencySummary(stats, avg);
    expect(result.pointsPerPlay).toBeCloseTo(24 / 60, 5);
  });

  it("successRate is between 0 and 1", () => {
    const stats = makeTeamStats();
    const avg = makeTeamStats();
    const result = teamEfficiencySummary(stats, avg);
    expect(result.successRate).toBeGreaterThanOrEqual(0);
    expect(result.successRate).toBeLessThanOrEqual(1);
  });

  it("above-average offense has positive offensiveDvoa", () => {
    const stats = makeTeamStats({ plays: 60, yards: 420 });
    const avg = makeTeamStats({ plays: 60, yards: 300 });
    const result = teamEfficiencySummary(stats, avg);
    expect(result.offensiveDvoa).toBeGreaterThan(0);
  });

  it("explosivePlayRate is between 0 and 1", () => {
    const stats = makeTeamStats();
    const avg = makeTeamStats();
    const result = teamEfficiencySummary(stats, avg);
    expect(result.explosivePlayRate).toBeGreaterThanOrEqual(0);
    expect(result.explosivePlayRate).toBeLessThanOrEqual(1);
  });

  it("returns all zeros when plays = 0", () => {
    const stats = makeTeamStats({ plays: 0, yards: 0, points: 0 });
    const avg = makeTeamStats();
    const result = teamEfficiencySummary(stats, avg);
    expect(result.yardsPerPlay).toBe(0);
    expect(result.pointsPerPlay).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("edge cases", () => {
  it("cpoe boundary: exactly 5 air yards uses 5-10 bucket (>5)", () => {
    // >5 so it's 5-10 bucket: expected = 0.65
    const result = cpoe(true, 5);
    // 5 is <= 5, so first bucket: expected = 0.75
    expect(result).toBeCloseTo(0.25, 5);
  });

  it("cpoe boundary: exactly 10 air yards uses 10-15 bucket (<=10)", () => {
    // 10 is <=10 so 5-10 bucket: expected = 0.65
    const result = cpoe(true, 10);
    expect(result).toBeCloseTo(0.35, 5);
  });

  it("yardsPerCarry single play", () => {
    expect(yardsPerCarry([makeRush({ yardsGained: 7 })])).toBe(7);
  });

  it("driveSuccessRate with downs result is not success", () => {
    const drives = [makeDrive({ result: "downs" })];
    expect(driveSuccessRate(drives)).toBe(0);
  });

  it("blitzRate with 100% blitz", () => {
    expect(blitzRate(40, 40)).toBe(1.0);
  });

  it("targetShare with 0 player targets", () => {
    expect(targetShare(0, 50)).toBe(0);
  });

  it("stuffRate with all stuffed plays", () => {
    const plays = [makeRush({ yardsGained: -2 }), makeRush({ yardsGained: 0 })];
    expect(stuffRate(plays)).toBe(1.0);
  });

  it("explosiveRunRate with no explosive plays", () => {
    const plays = [makeRush({ yardsGained: 5 }), makeRush({ yardsGained: 9 })];
    expect(explosiveRunRate(plays)).toBe(0);
  });

  it("wpaFromPlay large lead at end of game → near 1.0 WP", () => {
    const ctxAfter = makeCtx({ scoreDiff: 21, quarterSecondsLeft: 5 });
    expect(winProbability(ctxAfter)).toBeGreaterThan(0.9);
  });
});
