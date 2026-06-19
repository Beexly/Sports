import { describe, it, expect } from "vitest";
import {
  brierScore,
  calibrationQuality,
  confidenceToProbability,
  rewardForSignalCheck,
} from "../calibration.js";
import { CONVICTION_CONFIDENCE } from "../constants.js";

describe("Calibration Engine (bible §4.1)", () => {
  it("never allows certainty — probability clamps off 0 and 1", () => {
    expect(confidenceToProbability(100)).toBeLessThan(1);
    expect(confidenceToProbability(0)).toBeGreaterThan(0);
    expect(confidenceToProbability(50)).toBeCloseTo(0.5, 5);
  });

  it("Brier: confident + correct is near-zero (best)", () => {
    expect(brierScore(99, 1)).toBeLessThan(0.001);
  });

  it("Brier: confident + WRONG is near-one (worst — overconfidence punished)", () => {
    expect(brierScore(99, 0)).toBeGreaterThan(0.96);
  });

  it("Brier: a 50/50 lean is 0.25 either way", () => {
    expect(brierScore(50, 1)).toBeCloseTo(0.25, 4);
    expect(brierScore(50, 0)).toBeCloseTo(0.25, 4);
  });

  it("calibrationQuality is 1 - Brier", () => {
    expect(calibrationQuality(50, 1)).toBeCloseTo(0.75, 4);
  });

  it("rewards a sharp call (correct + conviction) the most", () => {
    const sharp = rewardForSignalCheck("WIN", 90);
    const timid = rewardForSignalCheck("WIN", 55);
    expect(sharp.sharpCall).toBe(true);
    expect(timid.sharpCall).toBe(false);
    expect(sharp.xp).toBeGreaterThan(timid.xp);
    expect(sharp.calibrationScore!).toBeGreaterThan(timid.calibrationScore!);
  });

  it("punishes overconfident misses more than humble misses", () => {
    const overconfident = rewardForSignalCheck("LOSS", 95);
    const humble = rewardForSignalCheck("LOSS", 52);
    // The humble doubter knew it was a lean — better calibrated → more XP.
    expect(humble.xp).toBeGreaterThan(overconfident.xp);
    expect(humble.calibrationScore!).toBeGreaterThan(overconfident.calibrationScore!);
    expect(overconfident.explanation.toLowerCase()).toContain("overconfidence");
  });

  it("PUSH carries no calibration signal but still pays flat reps", () => {
    const r = rewardForSignalCheck("PUSH", 80);
    expect(r.brier).toBeNull();
    expect(r.calibrationScore).toBeNull();
    expect(r.xp).toBeGreaterThan(0);
  });

  it("surface multiplier scales rewards", () => {
    const full = rewardForSignalCheck("WIN", 80, 1);
    const blacktop = rewardForSignalCheck("WIN", 80, 0.6);
    expect(blacktop.xp).toBeLessThan(full.xp);
  });

  it("conviction threshold gates the sharp-call bonus exactly", () => {
    expect(rewardForSignalCheck("WIN", CONVICTION_CONFIDENCE).sharpCall).toBe(true);
    expect(rewardForSignalCheck("WIN", CONVICTION_CONFIDENCE - 1).sharpCall).toBe(false);
  });
});
