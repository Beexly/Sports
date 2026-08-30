import { describe, it, expect } from "vitest";
import { computeGameContext } from "../game-context.js";
import type { GameContextInput, AtsFormBucket } from "@sports/types";

// ============================================================
// Orchestrator coverage for computeGameContext().
// scoring.test.ts exercises the individual sub-scorers; this file
// pins the orchestrator's routing, side-flip, neutral-default and
// documented output bands so the honest fail-closed behavior holds.
// ============================================================

function bucket(wins: number, losses: number, pushes = 0, sampleSize?: number): AtsFormBucket {
  return { wins, losses, pushes, sampleSize: sampleSize ?? wins + losses + pushes };
}

const EMPTY: GameContextInput = {};

describe("computeGameContext — orchestrator", () => {
  it("is deterministic for identical input", () => {
    const input: GameContextInput = {
      openingSpread: -3,
      currentSpread: -4.5,
      restDaysHome: 7,
      restDaysAway: 3,
      homeAtsForm: bucket(8, 2),
    };
    const a = computeGameContext(input, "SPREAD", "HOME");
    const b = computeGameContext(input, "SPREAD", "HOME");
    expect(a).toEqual(b);
  });

  it("routes a strong home ATS form (8-2, >=65%) to historicalFormScore 10 with a Home ATS Form factor", () => {
    const input: GameContextInput = { homeAtsForm: bucket(8, 2) };
    const scores = computeGameContext(input, "SPREAD", "HOME");
    expect(scores.historicalFormScore).toBe(10);
    expect(scores.factors.some((f) => f.name === "Home ATS Form")).toBe(true);
  });

  it("negates the home rest-advantage score when the picked side flips to AWAY", () => {
    const input: GameContextInput = { restDaysHome: 7, restDaysAway: 3 };
    const home = computeGameContext(input, "SPREAD", "HOME");
    const away = computeGameContext(input, "SPREAD", "AWAY");
    // Same rest differential, opposite perspective → exact sign flip.
    expect(home.restAdvantageScore).not.toBe(0);
    expect(away.restAdvantageScore).toBe(-home.restAdvantageScore);
  });

  it("zeroes rest and venue scores for TOTAL/OVER (side-agnostic market)", () => {
    const input: GameContextInput = {
      restDaysHome: 7,
      restDaysAway: 3,
      homeAtsFormAtHome: bucket(8, 2),
      openingTotal: 44,
      currentTotal: 46,
    };
    const scores = computeGameContext(input, "TOTAL", "OVER");
    expect(scores.restAdvantageScore).toBe(0);
    expect(scores.venueFormScore).toBe(0);
  });

  it("returns all-zero scores and an empty (or data-quality-only) factor list for neutral input", () => {
    const scores = computeGameContext(EMPTY, "SPREAD", "HOME");
    expect(scores.lineMovementScore).toBe(0);
    expect(scores.restAdvantageScore).toBe(0);
    expect(scores.historicalFormScore).toBe(0);
    expect(scores.venueFormScore).toBe(0);
    expect(scores.headToHeadScore).toBe(0);
    expect(scores.crossMarketScore).toBe(0);
    expect(scores.uncertaintyPenalty).toBe(0);
    expect(scores.scheduleStressScore).toBe(0);
    // All directional/form signals are zero; the only non-zero field is the
    // data-quality score, which on empty input reflects default freshness credit
    // (dataFreshnessMinutes defaults to 0 → full 30 freshness pts, no coverage).
    expect(scores.dataQualityScore).toBe(30);
    // The ONLY factor that may appear is the low-data-quality flag (30 < 50).
    expect(scores.factors.every((f) => f.name === "Data Quality")).toBe(true);
  });

  it("fails closed on a mostly-push bucket that clears sampleSize but not decided games", () => {
    // sampleSize 5 (>= MIN_SAMPLE) but only 1 decided game (1-0-4). The old
    // gate checked sampleSize and would emit a full-strength 100%-ATS signal
    // off a single decided game; the corrected gate requires >=5 DECIDED games.
    const pushHeavy = bucket(1, 0, 4); // sampleSize === 5, decided === 1
    const input: GameContextInput = {
      homeAtsForm: pushHeavy,
      homeAtsFormAtHome: pushHeavy,
      headToHeadForm: pushHeavy,
    };
    const scores = computeGameContext(input, "SPREAD", "HOME");
    expect(scores.historicalFormScore).toBe(0);
    expect(scores.venueFormScore).toBe(0);
    expect(scores.headToHeadScore).toBe(0);
    // None of the form scorers should have emitted a factor from this bucket.
    expect(scores.factors.some((f) => f.name === "Home ATS Form")).toBe(false);
    expect(scores.factors.some((f) => f.name === "Home Venue Form")).toBe(false);
    expect(scores.factors.some((f) => f.name === "Head-to-Head Form")).toBe(false);
  });

  it("still emits a signal once decided games reach the minimum, even with pushes present", () => {
    // 5 decided games (3-2) plus pushes → clears the decided-game gate.
    const enough = bucket(5, 0, 3); // decided === 5, 100% ATS
    const scores = computeGameContext({ homeAtsForm: enough }, "SPREAD", "HOME");
    expect(scores.historicalFormScore).toBe(10);
    expect(scores.factors.some((f) => f.name === "Home ATS Form")).toBe(true);
  });

  it("keeps every numeric field within its documented band", () => {
    // A rich input that lights up multiple signals at once.
    const input: GameContextInput = {
      openingSpread: -2,
      currentSpread: -8,
      restDaysHome: 1,
      restDaysAway: 9,
      isBackToBackHome: true,
      homeAtsForm: bucket(9, 1),
      homeAtsFormAtHome: bucket(8, 2),
      headToHeadForm: bucket(7, 1),
      mlFairProbHome: 0.7,
      scheduleDensityHome: 4,
      scheduleDensityAway: 1,
      bookmakerCoverageMax: 1,
      dataFreshnessMinutes: 80,
    };
    const s = computeGameContext(input, "SPREAD", "HOME");
    expect(s.lineMovementScore).toBeGreaterThanOrEqual(-15);
    expect(s.lineMovementScore).toBeLessThanOrEqual(15);
    expect(s.restAdvantageScore).toBeGreaterThanOrEqual(-10);
    expect(s.restAdvantageScore).toBeLessThanOrEqual(10);
    expect(s.historicalFormScore).toBeGreaterThanOrEqual(-10);
    expect(s.historicalFormScore).toBeLessThanOrEqual(10);
    expect(s.headToHeadScore).toBeGreaterThanOrEqual(-5);
    expect(s.headToHeadScore).toBeLessThanOrEqual(5);
    expect(s.venueFormScore).toBeGreaterThanOrEqual(-5);
    expect(s.venueFormScore).toBeLessThanOrEqual(5);
    expect(s.uncertaintyPenalty).toBeGreaterThanOrEqual(-8);
    expect(s.uncertaintyPenalty).toBeLessThanOrEqual(0);
    expect(s.crossMarketScore).toBeGreaterThanOrEqual(-3);
    expect(s.crossMarketScore).toBeLessThanOrEqual(4);
    expect(s.scheduleStressScore).toBeGreaterThanOrEqual(-5);
    expect(s.scheduleStressScore).toBeLessThanOrEqual(5);
    expect(s.dataQualityPenalty).toBeGreaterThanOrEqual(-20);
    expect(s.dataQualityPenalty).toBeLessThanOrEqual(0);
    expect(s.dataQualityScore).toBeGreaterThanOrEqual(0);
    expect(s.dataQualityScore).toBeLessThanOrEqual(100);
  });
});
