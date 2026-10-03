import { describe, it, expect } from "vitest";
import {
  americanToDecimalOdds,
  fullKellyFraction,
  unitsFromKelly,
  recommendStake,
  KELLY_FRACTION,
  MAX_UNITS_PER_PICK,
  MIN_CONFIDENCE_FOR_STAKE,
  MIN_EDGE_FOR_STAKE,
} from "../kelly.js";
import type { ScoredPick } from "@sports/types";
import { MODEL_VERSION } from "../constants.js";

// Build a minimal ScoredPick for testing
function makePick(overrides: Partial<ScoredPick> = {}): ScoredPick {
  return {
    gameId: "game-test",
    pickType: "MONEYLINE",
    selection: "Test Team ML (-150)",
    line: -150,
    confidence: 80,
    edgeScore: 70,
    consensusPct: 0.7,
    bookmakerCount: 8,
    dataQualityScore: 85,
    tier: "PREMIUM",
    pickGrade: "STRONG_PLAY",
    riskLevel: "LOW_RISK",
    reasoning: "test",
    reasoningShort: "test",
    factorBreakdown: {
      consensusScore: 20,
      marketDepthScore: 15,
      edgeScore: 18,
      lineMovementScore: 5,
      volatilityPenalty: 0,
      dataQualityScore: 85,
      factors: [],
    },
    modelVersion: MODEL_VERSION,
    dataFreshnessAt: new Date(),
    ...overrides,
  };
}

describe("americanToDecimalOdds", () => {
  it("converts +100 → 2.0 (even money)", () => {
    expect(americanToDecimalOdds(100)).toBeCloseTo(2.0);
  });

  it("converts +200 → 3.0", () => {
    expect(americanToDecimalOdds(200)).toBeCloseTo(3.0);
  });

  it("converts -110 → 1.909 (standard vig)", () => {
    expect(americanToDecimalOdds(-110)).toBeCloseTo(1.909, 2);
  });

  it("converts -200 → 1.5", () => {
    expect(americanToDecimalOdds(-200)).toBeCloseTo(1.5);
  });

  it("always returns > 1 for any valid input", () => {
    for (const odds of [-500, -150, -110, +100, +150, +500]) {
      expect(americanToDecimalOdds(odds)).toBeGreaterThan(1);
    }
  });
});

describe("fullKellyFraction", () => {
  it("returns 0 when no edge (probability matches offered)", () => {
    // At -110 odds (52.4% implied), with exact 52.4% win prob → no edge → 0
    const offeredProb = 110 / 210;
    const dec = americanToDecimalOdds(-110);
    expect(fullKellyFraction(offeredProb, dec)).toBeCloseTo(0, 3);
  });

  it("returns 0 (clamped) when edge is negative", () => {
    // 40% win at -110 (52.4% implied) → negative edge → 0
    expect(fullKellyFraction(0.4, americanToDecimalOdds(-110))).toBe(0);
  });

  it("returns positive Kelly fraction when edge exists", () => {
    // 60% win at -110 (52.4% implied) → ~16% Kelly
    const f = fullKellyFraction(0.6, americanToDecimalOdds(-110));
    expect(f).toBeGreaterThan(0.1);
    expect(f).toBeLessThan(0.3);
  });

  it("returns 0 for degenerate inputs", () => {
    expect(fullKellyFraction(0.5, 1.0)).toBe(0);
    expect(fullKellyFraction(0.5, 0.5)).toBe(0);
  });

  it("scales with edge size — bigger edge yields bigger Kelly", () => {
    const small = fullKellyFraction(0.55, americanToDecimalOdds(-110));
    const big = fullKellyFraction(0.7, americanToDecimalOdds(-110));
    expect(big).toBeGreaterThan(small);
  });
});

describe("unitsFromKelly", () => {
  it("scales by fractional Kelly factor", () => {
    // Full Kelly of 0.2 → quarter-Kelly = 0.05 → 5 units, but capped at 3
    expect(unitsFromKelly(0.2)).toBe(MAX_UNITS_PER_PICK);
  });

  it("respects MAX_UNITS_PER_PICK ceiling", () => {
    // Even a massive Kelly value should cap
    expect(unitsFromKelly(0.5)).toBe(MAX_UNITS_PER_PICK);
    expect(unitsFromKelly(1.0)).toBe(MAX_UNITS_PER_PICK);
  });

  it("returns 0 for zero input", () => {
    expect(unitsFromKelly(0)).toBe(0);
  });

  it("respects custom fraction parameter", () => {
    // Half-Kelly should produce a bigger stake than quarter-Kelly
    const quarter = unitsFromKelly(0.1, 0.25);
    const half = unitsFromKelly(0.1, 0.5);
    expect(half).toBeGreaterThan(quarter);
  });

  it("uses default KELLY_FRACTION when not specified", () => {
    const expected = 0.1 * KELLY_FRACTION * 100; // = 2.5
    expect(unitsFromKelly(0.1)).toBeCloseTo(expected, 3);
  });
});

describe("recommendStake", () => {
  it("returns null when confidence below threshold", () => {
    const pick = makePick({ confidence: MIN_CONFIDENCE_FOR_STAKE - 1 });
    expect(recommendStake(pick)).toBeNull();
  });

  it("returns null when edge score below threshold", () => {
    const pick = makePick({ edgeScore: MIN_EDGE_FOR_STAKE - 1 });
    expect(recommendStake(pick)).toBeNull();
  });

  it("returns a stake recommendation for a qualifying pick", () => {
    const pick = makePick({ confidence: 85, edgeScore: 75 });
    const stake = recommendStake(pick);
    expect(stake).not.toBeNull();
    expect(stake!.units).toBeGreaterThan(0);
    expect(stake!.units).toBeLessThanOrEqual(MAX_UNITS_PER_PICK);
  });

  it("rounds units to the nearest 0.25", () => {
    const stake = recommendStake(makePick({ confidence: 80, edgeScore: 70 }));
    expect(stake).not.toBeNull();
    expect(stake!.units * 4).toBeCloseTo(Math.round(stake!.units * 4), 5);
  });

  it("uses quarter-Kelly strategy", () => {
    const stake = recommendStake(makePick({ confidence: 80, edgeScore: 70 }));
    expect(stake).not.toBeNull();
    expect(stake!.strategy).toBe("quarter-kelly");
  });

  it("includes a plain-English rationale", () => {
    const stake = recommendStake(makePick({ confidence: 80, edgeScore: 70 }));
    expect(stake).not.toBeNull();
    expect(stake!.rationale).toMatch(/quarter-kelly/i);
    expect(stake!.rationale).toMatch(/units/i);
    expect(stake!.rationale).toMatch(/bankroll/i);
  });

  it("uses pick.line as American odds for MONEYLINE picks", () => {
    const stakePlus = recommendStake(
      makePick({ pickType: "MONEYLINE", line: 150, confidence: 80, edgeScore: 70 })
    );
    const stakeMinus = recommendStake(
      makePick({ pickType: "MONEYLINE", line: -150, confidence: 80, edgeScore: 70 })
    );
    expect(stakePlus).not.toBeNull();
    expect(stakeMinus).not.toBeNull();
    // +150 → 2.5 decimal, -150 → 1.667 decimal — must differ
    expect(stakePlus!.decimalOdds).not.toBe(stakeMinus!.decimalOdds);
  });

  it("uses standard -110 vig for SPREAD picks", () => {
    const stake = recommendStake(
      makePick({ pickType: "SPREAD", line: -3.5, confidence: 80, edgeScore: 70 })
    );
    expect(stake).not.toBeNull();
    expect(stake!.decimalOdds).toBeCloseTo(1.909, 2);
  });

  it("uses standard -110 vig for TOTAL picks", () => {
    const stake = recommendStake(
      makePick({ pickType: "TOTAL", line: 47.5, confidence: 80, edgeScore: 70 })
    );
    expect(stake).not.toBeNull();
    expect(stake!.decimalOdds).toBeCloseTo(1.909, 2);
  });

  it("never recommends more than MAX_UNITS_PER_PICK", () => {
    // Build a pathologically high-confidence/edge pick
    const stake = recommendStake(makePick({ confidence: 99, edgeScore: 99 }));
    expect(stake).not.toBeNull();
    expect(stake!.units).toBeLessThanOrEqual(MAX_UNITS_PER_PICK);
  });

  it("accepts the narrow StakeInput shape (no full ScoredPick needed)", () => {
    // Verifies the refactor — recommendStake should accept just these 4 fields
    const stake = recommendStake({
      confidence: 80,
      edgeScore: 70,
      pickType: "MONEYLINE",
      line: -150,
    });
    expect(stake).not.toBeNull();
    expect(stake!.strategy).toBe("quarter-kelly");
  });
});
