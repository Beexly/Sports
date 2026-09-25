import { describe, expect, it } from "vitest";
import {
  CONFIDENCE_RECALIBRATION,
  WEIGHT_BY_PICK_TYPE,
  WEIGHT_BY_SPORT,
  WEIGHT_BY_GRADE,
  WEIGHT_BY_MODEL_VERSION,
  PUBLISH_ACTIONS,
  SIGNAL_COVERAGE_LIVE,
  calibratedWinProb,
  combinedSignalWeight,
  shouldSuppress,
} from "./calibration-weights.js";

describe("calibration weights (live Neon picks, 3,263 graded)", () => {
  it("encodes confidence recalibration without inventing certainty", () => {
    for (const row of Object.values(CONFIDENCE_RECALIBRATION)) {
      expect(row.empiricalPWin).toBeGreaterThan(0.3);
      expect(row.empiricalPWin).toBeLessThan(0.85);
      expect(row.n).toBeGreaterThan(10);
    }
    // Mid bins should not blow past each other wildly (anti-calibration is real but bounded).
    const mid = CONFIDENCE_RECALIBRATION["60"];
    const high = CONFIDENCE_RECALIBRATION["90"];
    expect(mid).toBeDefined();
    expect(high).toBeDefined();
    expect(high!.empiricalPWin).toBeLessThan(0.8);
  });

  it("maps stated confidence to empirical P(WIN) with a safe fallback", () => {
    expect(calibratedWinProb(null)).toBe(0.5);
    expect(calibratedWinProb(undefined)).toBe(0.5);
    expect(calibratedWinProb(Number.NaN)).toBe(0.5);
    expect(calibratedWinProb(55)).toBeCloseTo(CONFIDENCE_RECALIBRATION["50"]!.empiricalPWin, 5);
    const fb = calibratedWinProb(45);
    expect(fb).toBeGreaterThan(0.3);
    expect(fb).toBeLessThan(0.7);
  });

  it("weights MONEYLINE and NCAAF above baseline; SPREAD/TOTAL/NFL below", () => {
    expect(WEIGHT_BY_PICK_TYPE.MONEYLINE!.signalWeight).toBeGreaterThan(1.0);
    expect(WEIGHT_BY_PICK_TYPE.SPREAD!.signalWeight).toBeLessThan(1.0);
    expect(WEIGHT_BY_PICK_TYPE.TOTAL!.signalWeight).toBeLessThan(1.0);
    expect(WEIGHT_BY_SPORT.NCAAF!.signalWeight).toBeGreaterThan(1.0);
    expect(WEIGHT_BY_SPORT.MLB!.signalWeight).toBeLessThan(1.05);
    expect(WEIGHT_BY_SPORT.NFL!.signalWeight).toBeLessThan(1.0);
  });

  it("encodes the inverted grade finding: ELITE_PLAY is historically worse than SOLID/STRONG", () => {
    expect(WEIGHT_BY_GRADE.ELITE_PLAY!.winRate).toBeLessThan(WEIGHT_BY_GRADE.SOLID_PLAY!.winRate);
    expect(WEIGHT_BY_GRADE.ELITE_PLAY!.signalWeight).toBeLessThan(1.0);
    expect(WEIGHT_BY_GRADE.STRONG_PLAY!.signalWeight).toBeGreaterThan(1.0);
  });

  it("marks v5.2.7 as a strong head", () => {
    expect(WEIGHT_BY_MODEL_VERSION["v5.2.7"]!.winRate).toBeGreaterThan(0.54);
    expect(WEIGHT_BY_MODEL_VERSION["v5.0.0"]!.winRate).toBeLessThan(WEIGHT_BY_MODEL_VERSION["v5.2.7"]!.winRate);
  });

  it("combinedSignalWeight averages available slices and clamps to [0.4, 1.5]", () => {
    expect(combinedSignalWeight(undefined, undefined)).toBe(1.0);
    const ml = combinedSignalWeight("MLB", "MONEYLINE", "LEAN");
    expect(ml).toBeGreaterThan(0.9);
    expect(ml).toBeLessThan(1.5);
    const bad = combinedSignalWeight("NFL", "SPREAD", "ELITE_PLAY");
    expect(bad).toBeGreaterThanOrEqual(0.4);
    expect(bad).toBeLessThan(1.0);
  });

  it("flags historically losing slices for suppression and strong slices for boost", () => {
    expect(PUBLISH_ACTIONS.length).toBeGreaterThan(0);
    const suppress = PUBLISH_ACTIONS.filter((a) => a.action === "suppress-or-shrink");
    const boost = PUBLISH_ACTIONS.filter((a) => a.action === "boost-shadow-priority");
    expect(suppress.some((a) => a.value === "SPREAD")).toBe(true);
    expect(suppress.some((a) => a.value === "NFL")).toBe(true);
    expect(boost.some((a) => a.value === "MONEYLINE")).toBe(true);
    expect(boost.some((a) => a.value === "NCAAF")).toBe(true);
    expect(shouldSuppress("NFL", "SPREAD", "LEAN")).toBe(true);
    expect(shouldSuppress("NCAAF", "MONEYLINE", "STRONG_PLAY")).toBe(false);
  });

  it("exposes the live signal-coverage gap: injuries/NGS/weather never attach to picks", () => {
    expect(SIGNAL_COVERAGE_LIVE.odds).toBeGreaterThan(3000);
    expect(SIGNAL_COVERAGE_LIVE.injury).toBe(0);
    expect(SIGNAL_COVERAGE_LIVE.ngs).toBe(0);
    expect(SIGNAL_COVERAGE_LIVE.weather).toBe(0);
    expect(SIGNAL_COVERAGE_LIVE.ratings).toBe(0);
  });

  it("keeps every signal weight inside a bounded range so thin slices cannot dominate", () => {
    for (const w of [
      ...Object.values(WEIGHT_BY_PICK_TYPE),
      ...Object.values(WEIGHT_BY_SPORT),
      ...Object.values(WEIGHT_BY_GRADE),
      ...Object.values(WEIGHT_BY_MODEL_VERSION),
    ]) {
      expect(w.signalWeight).toBeGreaterThanOrEqual(0.4);
      expect(w.signalWeight).toBeLessThanOrEqual(1.5);
      expect(w.n).toBeGreaterThan(0);
    }
  });
});
