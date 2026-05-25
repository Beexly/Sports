import { describe, it, expect } from "vitest";
import { computeGameContext } from "../game-context.js";
import type { GameContextInput } from "@sports/types";

// Minimal valid input — all optional fields absent.
const MINIMAL: GameContextInput = {};

// Well-populated spread context for HOME pick.
const SPREAD_HOME: GameContextInput = {
  openingSpread: -3.5,
  currentSpread: -5.5,
  restDaysHome: 4,
  restDaysAway: 1,
  isBackToBackHome: false,
  isBackToBackAway: true,
  homeAtsForm: { wins: 8, losses: 3, pushes: 1, sampleSize: 12 },
  awayAtsForm: { wins: 4, losses: 7, pushes: 1, sampleSize: 12 },
  homeAtsFormAtHome: { wins: 5, losses: 2, pushes: 0, sampleSize: 7 },
  headToHeadForm: { wins: 3, losses: 1, pushes: 0, sampleSize: 4 },
  mlFairProbHome: 0.62,
  scheduleDensityHome: 2,
  scheduleDensityAway: 4,
  bookmakerCoverageMax: 12,
  dataFreshnessMinutes: 8,
  hasSpreadMarket: true,
  hasTotalMarket: true,
  hasH2HMarket: true,
};

// Total market context — relevant scores differ from spread.
const TOTAL_OVER: GameContextInput = {
  openingTotal: 47.5,
  currentTotal: 49.5,
  bookmakerCoverageMax: 8,
  dataFreshnessMinutes: 30,
  hasSpreadMarket: true,
  hasTotalMarket: true,
  hasH2HMarket: false,
};

describe("computeGameContext — integration", () => {
  it("returns all expected fields with minimal input", () => {
    const result = computeGameContext(MINIMAL, "SPREAD", "HOME");
    // Every numeric score field must be present and finite.
    expect(typeof result.lineMovementScore).toBe("number");
    expect(typeof result.restAdvantageScore).toBe("number");
    expect(typeof result.historicalFormScore).toBe("number");
    expect(typeof result.dataQualityPenalty).toBe("number");
    expect(typeof result.dataQualityScore).toBe("number");
    expect(typeof result.headToHeadScore).toBe("number");
    expect(typeof result.venueFormScore).toBe("number");
    expect(typeof result.uncertaintyPenalty).toBe("number");
    expect(typeof result.crossMarketScore).toBe("number");
    expect(typeof result.scheduleStressScore).toBe("number");
    expect(Array.isArray(result.factors)).toBe(true);

    expect(isFinite(result.lineMovementScore)).toBe(true);
    expect(isFinite(result.dataQualityScore)).toBe(true);
  });

  it("returns neutral (0) scores when no context signals are available", () => {
    const result = computeGameContext(MINIMAL, "SPREAD", "HOME");
    // With empty input, no directional signal should fire.
    expect(result.lineMovementScore).toBe(0);
    expect(result.restAdvantageScore).toBe(0);
    expect(result.historicalFormScore).toBe(0);
    expect(result.headToHeadScore).toBe(0);
    expect(result.venueFormScore).toBe(0);
    expect(result.scheduleStressScore).toBe(0);
    // Data Quality factor fires even with minimal input (zero coverage → penalty).
    // Verify no spurious directional signals appear.
    const directionalFactors = result.factors.filter(
      (f) => f.name !== "Data Quality"
    );
    expect(directionalFactors).toHaveLength(0);
  });

  it("dataQualityScore is within the documented 0–100 range", () => {
    for (const [ctx, market, side] of [
      [MINIMAL, "SPREAD", "HOME"],
      [SPREAD_HOME, "SPREAD", "HOME"],
      [TOTAL_OVER, "TOTAL", "OVER"],
    ] as const) {
      const r = computeGameContext(ctx as GameContextInput, market, side);
      expect(r.dataQualityScore).toBeGreaterThanOrEqual(0);
      expect(r.dataQualityScore).toBeLessThanOrEqual(100);
    }
  });

  it("dataQualityPenalty is non-positive", () => {
    for (const [ctx, market, side] of [
      [MINIMAL, "SPREAD", "HOME"],
      [SPREAD_HOME, "SPREAD", "HOME"],
    ] as const) {
      const r = computeGameContext(ctx as GameContextInput, market, side);
      expect(r.dataQualityPenalty).toBeLessThanOrEqual(0);
    }
  });

  it("uncertaintyPenalty is non-positive", () => {
    const r = computeGameContext(SPREAD_HOME, "SPREAD", "HOME");
    expect(r.uncertaintyPenalty).toBeLessThanOrEqual(0);
  });

  it("populates factors when spread line movement signal fires", () => {
    const result = computeGameContext(SPREAD_HOME, "SPREAD", "HOME");
    // Spread moved from -3.5 to -5.5 — a 2-point move should register.
    const lmFactor = result.factors.find((f) => f.name === "Line Movement");
    expect(lmFactor).toBeDefined();
    expect(typeof lmFactor?.weight).toBe("number");
    expect(lmFactor?.impact).toMatch(/positive|negative|neutral/);
  });

  it("populates factors when TOTAL line movement fires", () => {
    const result = computeGameContext(TOTAL_OVER, "TOTAL", "OVER");
    // Total moved from 47.5 to 49.5 — 2-point upward move for OVER pick.
    const lmFactor = result.factors.find((f) => f.name === "Line Movement");
    expect(lmFactor).toBeDefined();
  });

  it("rest-advantage and historical-form factors absent for TOTAL picks", () => {
    // Rest advantage only fires for SPREAD/ML picks, not TOTAL.
    const result = computeGameContext(TOTAL_OVER, "TOTAL", "OVER");
    expect(result.restAdvantageScore).toBe(0);
  });

  it("home AWAY pick returns away-side ATS form score", () => {
    const ctxAway: GameContextInput = {
      ...SPREAD_HOME,
      awayAtsForm: { wins: 8, losses: 2, pushes: 0, sampleSize: 10 },
      homeAtsForm: { wins: 2, losses: 8, pushes: 0, sampleSize: 10 },
    };
    const awayResult = computeGameContext(ctxAway, "SPREAD", "AWAY");
    const homeResult = computeGameContext(ctxAway, "SPREAD", "HOME");
    // Away team has better ATS — away pick should score higher on historicalForm.
    expect(awayResult.historicalFormScore).toBeGreaterThan(homeResult.historicalFormScore);
  });

  it("schedule stress score is positive when away team is more fatigued", () => {
    const fatigued: GameContextInput = {
      scheduleDensityHome: 1,
      scheduleDensityAway: 5,
    };
    const r = computeGameContext(fatigued, "SPREAD", "HOME");
    // Home team is fresher — picking HOME against fatigued AWAY should yield positive stress score.
    expect(r.scheduleStressScore).toBeGreaterThan(0);
  });

  it("identical context for MONEYLINE produces same scores as SPREAD (directional signals)", () => {
    const r1 = computeGameContext(SPREAD_HOME, "MONEYLINE", "HOME");
    const r2 = computeGameContext(SPREAD_HOME, "SPREAD", "HOME");
    // Rest and historical form signals are position-identical for ML vs SPREAD.
    expect(r1.restAdvantageScore).toBe(r2.restAdvantageScore);
    expect(r1.historicalFormScore).toBe(r2.historicalFormScore);
    expect(r1.scheduleStressScore).toBe(r2.scheduleStressScore);
  });
});
