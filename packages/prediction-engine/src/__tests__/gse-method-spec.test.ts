import { describe, expect, it } from "vitest";
import {
  WEIGHTS,
  GRADE_THRESHOLDS,
  MIN_PUBLISH_CONFIDENCE,
  PREMIUM_CONFIDENCE_THRESHOLD,
} from "../constants.js";
import {
  SCORE_COMPONENTS,
  GRADE_LADDER,
  GSE_SCORE_FORMULA,
  GSE_BASELINE,
  PRICE_PILLARS,
  LIVE_VS_ROADMAP,
  GSE_METHOD,
} from "../gse-method-spec.js";

/**
 * Drift guard. The methodology paper and the public /methodology page are generated
 * from gse-method-spec.ts. This test asserts every documented number equals the REAL
 * constant in the engine, so a weight change that isn't reflected in the spec (and
 * therefore the doc) fails CI. The paper cannot silently go stale.
 */

describe("GSE method spec — drift guard against constants.ts", () => {
  it("every score component's constant-pinned bound equals the real WEIGHTS value", () => {
    for (const c of SCORE_COMPONENTS) {
      if (c.maxConst) {
        expect(WEIGHTS[c.maxConst], `${c.key}.max → WEIGHTS.${String(c.maxConst)}`).toBe(c.max);
      }
      if (c.minConst) {
        expect(WEIGHTS[c.minConst], `${c.key}.min → WEIGHTS.${String(c.minConst)}`).toBe(c.min);
      }
      if (c.symmetric) {
        expect(c.min, `${c.key} symmetric: min === -max`).toBe(-c.max);
      }
      // A bound is never the wrong way round.
      expect(c.min).toBeLessThanOrEqual(c.max);
    }
  });

  it("documents exactly the thirteen live confidence components", () => {
    expect(SCORE_COMPONENTS).toHaveLength(13);
    const keys = SCORE_COMPONENTS.map((c) => c.key);
    expect(new Set(keys).size).toBe(13); // no duplicates
    // The four additive penalties cap at 0 (they only subtract).
    for (const key of ["volatilityPenalty", "dataQualityPenalty", "uncertaintyPenalty"]) {
      expect(SCORE_COMPONENTS.find((c) => c.key === key)!.max).toBe(0);
    }
  });

  it("the grade ladder mirrors GRADE_THRESHOLDS", () => {
    const byGrade = Object.fromEntries(GRADE_LADDER.map((g) => [g.grade, g]));
    expect(byGrade.ELITE_PLAY).toMatchObject(GRADE_THRESHOLDS.ELITE_PLAY);
    expect(byGrade.STRONG_PLAY).toMatchObject(GRADE_THRESHOLDS.STRONG_PLAY);
    expect(byGrade.SOLID_PLAY).toMatchObject(GRADE_THRESHOLDS.SOLID_PLAY);
  });

  it("the publish / premium floors mirror constants.ts", () => {
    expect(GSE_SCORE_FORMULA.publishFloor).toBe(MIN_PUBLISH_CONFIDENCE);
    expect(GSE_SCORE_FORMULA.premiumFloor).toBe(PREMIUM_CONFIDENCE_THRESHOLD);
    expect(GSE_BASELINE).toBe(10);
  });

  it("the GSE Score formula is internally consistent", () => {
    const w = GSE_SCORE_FORMULA.provenanceWeights;
    const sum = w.proofReceipt + w.slateCommitment + w.canonicalAndFresh;
    expect(sum).toBeCloseTo(1, 6); // P maxes out at 1.0
    // M ∈ [floor, floor+range] = [0.80, 1.00]
    expect(GSE_SCORE_FORMULA.multiplierFloor + GSE_SCORE_FORMULA.multiplierRange).toBeCloseTo(1, 6);
    expect(GSE_SCORE_FORMULA.multiplierFloor).toBeGreaterThan(0);
    expect(GSE_SCORE_FORMULA.multiplierFloor).toBeLessThan(1);
  });

  it("the method bundles the five PRICE pillars in order", () => {
    expect(PRICE_PILLARS.map((p) => p.letter).join("")).toBe("PRICE");
    expect(GSE_METHOD.method).toMatch(/PRICE Method/);
    expect(GSE_METHOD.pipeline).toEqual(["Read the board", "Score the math", "Gate the slate"]);
    expect(GSE_METHOD.components).toBe(SCORE_COMPONENTS);
  });

  it("the roadmap ledger only uses known capability statuses", () => {
    const allowed = new Set([
      "PRICED",
      "SURFACED_UNPRICED",
      "RND_BLOCKED",
      "BUILT_NOT_WIRED",
      "PLANNED",
    ]);
    expect(LIVE_VS_ROADMAP.length).toBeGreaterThan(0);
    for (const row of LIVE_VS_ROADMAP) {
      expect(allowed.has(row.status), `unknown status ${row.status}`).toBe(true);
      expect(row.detail.length).toBeGreaterThan(0);
    }
  });
});
