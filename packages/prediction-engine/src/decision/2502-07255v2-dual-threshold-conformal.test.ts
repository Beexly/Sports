import { describe, it, expect } from "vitest";
import {
  calibrateConformalThreshold,
  rocTuneAbstentionThreshold,
  fitThresholdsByRegime,
  dualThresholdPublish,
  fixed70Publish,
  evaluatePolicy,
  rocAbstentionGatePasses,
  type ConformalPick,
} from "./2502-07255v2-dual-threshold-conformal.js";

// Deterministic fixture: winners are conforming + unsuspicious; losers are
// non-conforming + suspicious but carry 0.71-0.74 win probs (above the fixed
// 70% cutoff, so the fixed baseline publishes its losers). A third group of
// winners sits at 0.65 prob (below the fixed cutoff) but is conforming and
// unsuspicious, so the ROC policy publishes them — keeping coverage matched.

function mkPick(
  id: string,
  regime: ConformalPick["regime"],
  conformity: number,
  suspicion: number,
  prob: number,
  won: boolean,
): ConformalPick {
  return {
    id,
    regime,
    conformity,
    suspicion,
    predictedWinProb: prob,
    won,
    profit: won ? 0.91 : -1.0,
  };
}

function holdout(): ConformalPick[] {
  const picks: ConformalPick[] = [];
  for (let i = 0; i < 8; i++)
    picks.push(mkPick(`hd${i}`, "divisional", 0.86 + i * 0.01, 0.1 + i * 0.015, 0.8, true));
  for (let i = 0; i < 6; i++)
    picks.push(mkPick(`hn${i}`, "non-divisional", 0.87 + i * 0.01, 0.12 + i * 0.01, 0.81, true));
  for (let i = 0; i < 3; i++)
    picks.push(mkPick(`ld${i}`, "divisional", 0.26 + i * 0.03, 0.7 + i * 0.05, 0.72, false));
  for (let i = 0; i < 3; i++)
    picks.push(mkPick(`ln${i}`, "non-divisional", 0.27 + i * 0.03, 0.85 + i * 0.03, 0.73, false));
  return picks;
}

function testWindow(): ConformalPick[] {
  const picks: ConformalPick[] = [];
  // Group A: 12 winners both policies publish.
  for (let i = 0; i < 12; i++)
    picks.push(mkPick(`a${i}`, i % 2 ? "divisional" : "non-divisional", 0.9, 0.15, 0.8, true));
  // Group B: 8 losers only the fixed-70% baseline publishes (prob 0.72).
  for (let i = 0; i < 8; i++)
    picks.push(mkPick(`b${i}`, i % 2 ? "divisional" : "non-divisional", 0.3, 0.8, 0.72, false));
  // Group C: 8 winners only the ROC policy publishes (prob 0.65).
  for (let i = 0; i < 8; i++)
    picks.push(mkPick(`c${i}`, i % 2 ? "divisional" : "non-divisional", 0.9, 0.15, 0.65, true));
  return picks;
}

describe("2502.07255v2 dual-threshold conformal abstention", () => {
  it("calibrates the conformal threshold as the finite-sample alpha quantile", () => {
    const scores = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0];
    // n=10, alpha=0.2 -> k = ceil(11*0.2) = 3 -> 3rd smallest = 0.3
    expect(calibrateConformalThreshold(scores, 0.2)).toBeCloseTo(0.3, 12);
    expect(calibrateConformalThreshold([], 0.1)).toBe(-Infinity);
  });

  it("ROC-tunes the abstention threshold to separate losers from winners", () => {
    const t = rocTuneAbstentionThreshold(holdout());
    // Winners max suspicion = 0.1 + 7*0.015 = 0.205 (div) / 0.12+5*0.01=0.17;
    // losers min = 0.7. Best Youden J=1 threshold is the largest t < 0.7
    // present in the data, i.e. 0.205.
    expect(t).toBeCloseTo(0.205, 12);
    const tw = testWindow();
    // Group B rejected, groups A and C published under the tuned threshold.
    expect(tw.filter((p) => p.id.startsWith("b")).every((p) => p.suspicion > t)).toBe(true);
    expect(tw.filter((p) => !p.id.startsWith("b")).every((p) => p.suspicion <= t)).toBe(true);
  });

  it("fits separate per-regime threshold pairs (conditional, not marginal)", () => {
    const byRegime = fitThresholdsByRegime(holdout(), 0.29);
    // Divisional losers top out at suspicion 0.8; non-divisional at 0.91,
    // and winner suspicion ranges differ -> tuned abstention differs.
    expect(byRegime["divisional"].qAbs).not.toBeCloseTo(byRegime["non-divisional"].qAbs, 6);
    for (const r of ["divisional", "non-divisional", "weather", "short-week"] as const) {
      expect(byRegime[r].qConf).toBeDefined();
      expect(byRegime[r].qAbs).toBeDefined();
    }
  });

  it("gate passes: ROC policy beats fixed-70% on ROI at matched coverage, coverage on target", () => {
    const alpha = 0.29;
    const byRegime = fitThresholdsByRegime(holdout(), alpha);
    const tw = testWindow();
    const roc = evaluatePolicy(tw, (p) => dualThresholdPublish(p, byRegime[p.regime]));
    const fixed = evaluatePolicy(tw, fixed70Publish);
    // Both publish 20/28 -> comparable coverage.
    expect(roc.coverage).toBeCloseTo(20 / 28, 12);
    expect(fixed.coverage).toBeCloseTo(20 / 28, 12);
    // ROC publishes only winners: ROI 0.91 vs fixed (12W,8L): 0.146.
    expect(roc.roi).toBeCloseTo(0.91, 12);
    expect(fixed.roi).toBeCloseTo((12 * 0.91 - 8) / 20, 12);
    expect(rocAbstentionGatePasses(roc, fixed, alpha)).toBe(true);
  });

  it("gate fails when empirical coverage drifts off the 1-alpha target", () => {
    const alpha = 0.05; // target 0.95, actual ~0.714 -> drift > 3pp
    const byRegime = fitThresholdsByRegime(holdout(), alpha);
    const tw = testWindow();
    const roc = evaluatePolicy(tw, (p) => dualThresholdPublish(p, byRegime[p.regime]));
    const fixed = evaluatePolicy(tw, fixed70Publish);
    expect(rocAbstentionGatePasses(roc, fixed, alpha)).toBe(false);
  });

  it("gate fails when the ROC policy adds no ROI over the fixed cutoff", () => {
    const tw = testWindow();
    const fixed = evaluatePolicy(tw, fixed70Publish);
    // Identical policy -> zero ROI delta -> gate must fail.
    expect(rocAbstentionGatePasses(fixed, fixed, 0.29)).toBe(false);
  });
});
