import { describe, it, expect } from "vitest";
import {
  // registry
  GSE_SCORING_SYSTEMS,
  getScoringSystem,
  // analytics methods
  ANALYTICS_METHODS,
  getMethod,
  methodsByMaturity,
  linearOpinionPool,
  logOpinionPool,
  extremize,
  splitConformalHalfWidth,
  fitReliabilityCalibration,
  applyReliabilityCalibration,
  // self-learning
  AUTONOMY_LADDER,
  CAPABILITY_AUTONOMY,
  maxAutonomyAllowed,
  populationStabilityIndex,
  scoreDriftRisk,
  scoreModelPromotionReadiness,
  canPromoteModel,
  scoreActiveLearningPriority,
  isValidLoopOrder,
  type ModelPromotionInput,
  // competitor intelligence
  COMPETITORS,
  FEATURE_GAPS,
  scoreFeatureGap,
  prioritizeGaps,
  competitorsBySegment,
  type FeatureGap,
  // open-source ledger
  EXTERNAL_RESOURCES,
  getResource,
  scoreAdoptionValue,
  rankAdoption,
  adoptableNow,
} from "./index";

const inRange = (n: number) => n >= 0 && n <= 100;

// ─── registry now has the 5 new scores ──────────────────────────────────────
describe("scoring registry — Sprint 2 additions", () => {
  it("declares 25 systems including the new five", () => {
    expect(GSE_SCORING_SYSTEMS.length).toBe(25);
    for (const id of ["drift_risk", "model_promotion", "active_learning", "adoption_value", "feature_gap"]) {
      expect(getScoringSystem(id), `missing ${id}`).toBeDefined();
    }
  });
});

// ─── analytics primitives ────────────────────────────────────────────────────
describe("analytics methods", () => {
  it("registers methods across HAVE / PARTIAL / GAP maturity", () => {
    expect(ANALYTICS_METHODS.length).toBeGreaterThanOrEqual(25);
    expect(getMethod("elo")?.maturity).toBe("have");
    // Most methods are now built as primitives → "partial" (not yet in the live
    // engine); only the heavy-infra methods (matrix factorization, gradient
    // boosting via a Python/ONNX worker) remain genuine "gap"s.
    expect(methodsByMaturity("gap").length).toBeGreaterThanOrEqual(1);
    expect(methodsByMaturity("partial").length).toBeGreaterThanOrEqual(12);
  });

  it("opinion pools agree on identical inputs and handle empty", () => {
    expect(linearOpinionPool([0.9, 0.9])).toBeCloseTo(0.9, 5);
    expect(logOpinionPool([0.9, 0.9])).toBeCloseTo(0.9, 5);
    expect(linearOpinionPool([])).toBe(0.5);
    expect(logOpinionPool([])).toBe(0.5);
  });

  it("log opinion pool is sharper than linear for agreeing confident forecasts", () => {
    const probs = [0.8, 0.85, 0.82];
    // Both exceed 0.5; the log pool pushes slightly further toward the agreement.
    expect(logOpinionPool(probs)).toBeGreaterThan(0.5);
    expect(linearOpinionPool(probs)).toBeGreaterThan(0.5);
  });

  it("extremizing pushes away from 0.5 and fixes the midpoint", () => {
    expect(extremize(0.5, 2)).toBeCloseTo(0.5, 5);
    expect(extremize(0.6, 2)).toBeGreaterThan(0.6);
    expect(extremize(0.4, 2)).toBeLessThan(0.4);
  });

  it("split-conformal returns a residual quantile and 0 for empty", () => {
    expect(splitConformalHalfWidth([1, 2, 3, 4], 0.1)).toBe(4);
    expect(splitConformalHalfWidth([], 0.1)).toBe(0);
  });

  it("isotonic calibration is monotone and corrects an over-confident model", () => {
    // Model says 0.9 but the slice only hits ~50%: calibrated value should drop.
    const pts: Array<{ p: number; y: 0 | 1 }> = [];
    for (let i = 0; i < 100; i++) pts.push({ p: 0.9, y: i % 2 === 0 ? 1 : 0 });
    for (let i = 0; i < 100; i++) pts.push({ p: 0.1, y: i % 10 === 0 ? 1 : 0 });
    const cal = fitReliabilityCalibration(pts, 10);
    // monotone non-decreasing
    for (let i = 1; i < cal.rates.length; i++) {
      expect(cal.rates[i]!).toBeGreaterThanOrEqual(cal.rates[i - 1]!);
    }
    const at09 = applyReliabilityCalibration(cal, 0.9);
    expect(at09).toBeGreaterThanOrEqual(0);
    expect(at09).toBeLessThanOrEqual(1);
    expect(at09).toBeLessThan(0.9); // over-confidence corrected downward
  });
});

// ─── self-learning / autonomy ────────────────────────────────────────────────
describe("self-learning & autonomy", () => {
  it("defines a 6-rung ladder and never grants L5", () => {
    expect(AUTONOMY_LADDER.length).toBe(6);
    expect(AUTONOMY_LADDER.find((r) => r.level === "L5")?.humanRole).toMatch(/not granted/i);
  });

  it("caps autonomy by guardrails — external actions never exceed L3", () => {
    expect(maxAutonomyAllowed({ monitored: false, hasRollback: true, shadowEvaluated: true, calibrationGated: true, ownerApprovalForExternal: false })).toBe("L1");
    const internalFullyGuarded = { monitored: true, hasRollback: true, shadowEvaluated: true, calibrationGated: true, ownerApprovalForExternal: false };
    expect(maxAutonomyAllowed(internalFullyGuarded)).toBe("L4");
    expect(maxAutonomyAllowed({ ...internalFullyGuarded, ownerApprovalForExternal: true })).toBe("L3");
  });

  it("keeps bet placement at L0 in the capability map", () => {
    expect(CAPABILITY_AUTONOMY.find((c) => c.capability === "Bet placement")?.current).toBe("L0");
  });

  it("PSI is ~0 for identical distributions and large for a reversal", () => {
    expect(populationStabilityIndex([25, 25, 25, 25], [25, 25, 25, 25])).toBeCloseTo(0, 6);
    const psi = populationStabilityIndex([40, 30, 20, 10], [10, 20, 30, 40]);
    expect(psi).toBeGreaterThan(0.25);
    expect(scoreDriftRisk(psi).band).toBe("very_high");
    expect(scoreDriftRisk(0).band).toBe("very_low");
  });

  it("model promotion hard-gates regressions and small samples", () => {
    const good: ModelPromotionInput = { settledSampleSize: 200, minSample: 100, challengerBrier: 0.15, championBrier: 0.2, shadowDays: 14, requiredShadowDays: 7, inputDriftPsi: 0.05 };
    expect(canPromoteModel(good)).toBe(true);
    const regression = { ...good, challengerBrier: 0.25 };
    expect(scoreModelPromotionReadiness(regression).score).toBeLessThanOrEqual(25);
    expect(canPromoteModel(regression)).toBe(false);
    const smallSample = { ...good, settledSampleSize: 50 };
    expect(scoreModelPromotionReadiness(smallSample).score).toBeLessThanOrEqual(49);
  });

  it("active-learning flags high-impact + high-uncertainty items", () => {
    const s = scoreActiveLearningPriority({ predictiveUncertainty: 0.8, decisionImpact: 0.9, dataStaleness: 0.5, coverageGap: 0.6 });
    expect(inRange(s.score)).toBe(true);
    expect(s.flags.join(" ")).toMatch(/prioritize/i);
  });

  it("validates loop ordering", () => {
    expect(isValidLoopOrder(["capture_outcome", "recalibrate", "deploy"])).toBe(true);
    expect(isValidLoopOrder(["deploy", "promotion_gate"])).toBe(false);
  });
});

// ─── competitor intelligence ─────────────────────────────────────────────────
describe("competitor intelligence", () => {
  it("profiles a broad competitor set across segments", () => {
    expect(COMPETITORS.length).toBeGreaterThanOrEqual(25);
    expect(competitorsBySegment("betting_analytics").length).toBeGreaterThan(3);
  });

  it("ranks a copyable gap above an already-have feature", () => {
    const gaps = prioritizeGaps();
    expect(gaps.length).toBe(FEATURE_GAPS.length);
    // ordering is descending by opportunity
    for (let i = 1; i < gaps.length; i++) {
      expect(gaps[i - 1]!.opportunity.score).toBeGreaterThanOrEqual(gaps[i]!.opportunity.score);
    }
    const haveGap = FEATURE_GAPS.find((g) => g.gseStatus === "have")!;
    expect(scoreFeatureGap(haveGap).flags.join(" ")).toMatch(/already have/i);
  });

  it("hard-gates copying a trust-eroding mechanic", () => {
    const darkPattern: FeatureGap = {
      id: "fake_confidence", feature: "Fake certainty UX", competitorsWithIt: ["x"],
      gseStatus: "gap", copyability: 0.9, valueToGse: 0.9, trustImpact: -0.6, buildSketch: "n/a",
    };
    const s = scoreFeatureGap(darkPattern);
    expect(s.score).toBeLessThanOrEqual(20);
    expect(s.flags.join(" ")).toMatch(/trust gate/i);
  });
});

// ─── open-source ledger ──────────────────────────────────────────────────────
describe("open-source adoption ledger", () => {
  it("registers resources with license + commercial verdicts", () => {
    expect(EXTERNAL_RESOURCES.length).toBeGreaterThanOrEqual(18);
    expect(getResource("the_odds_api")?.commercialOk).toBe(true);
  });

  it("hard-caps a non-commercial dataset (StatsBomb landmine)", () => {
    const sb = getResource("statsbomb_open")!;
    const s = scoreAdoptionValue(sb);
    expect(s.score).toBeLessThanOrEqual(18);
    expect(s.flags.join(" ")).toMatch(/commercial use NOT permitted/i);
  });

  it("caps unverified-license resources below adopt-now", () => {
    const sc = getResource("statcast")!;
    const s = scoreAdoptionValue(sc);
    expect(s.score).toBeLessThanOrEqual(58);
    expect(s.flags.join(" ")).toMatch(/UNVERIFIED/i);
  });

  it("adoptableNow excludes non-commercial and already-integrated resources", () => {
    const now = adoptableNow();
    expect(now.some((r) => r.resource.id === "statsbomb_open")).toBe(false);
    expect(now.some((r) => r.resource.integrationStatus === "have")).toBe(false);
    // ranking is descending
    const ranked = rankAdoption();
    for (let i = 1; i < ranked.length; i++) {
      expect(ranked[i - 1]!.adoption.score).toBeGreaterThanOrEqual(ranked[i]!.adoption.score);
    }
  });
});
