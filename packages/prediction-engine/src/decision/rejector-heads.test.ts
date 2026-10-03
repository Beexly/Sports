// Tests for decision/rejector-heads.ts (vitest, globals on).
import { describe, it, expect } from "vitest";
import {
  fitLogistic2D,
  doubleScoreGate,
  calibrateTau,
  abstentionLoss,
  twoStageRejector,
  sharedMultiClassRejector,
  predictorRejectorCascade,
} from "./rejector-heads.js";

describe("fitLogistic2D", () => {
  it("learns positive weights for informative scores", () => {
    // scoreA separates the classes; scoreB is noise.
    const scoreA: number[] = [];
    const scoreB: number[] = [];
    const labels: (0 | 1)[] = [];
    for (let i = 0; i < 50; i++) {
      scoreA.push(i < 25 ? 0.1 : 0.9);
      scoreB.push(0.5);
      labels.push(i < 25 ? 0 : 1);
    }
    const { a, b } = fitLogistic2D(scoreA, scoreB, labels);
    expect(a).toBeGreaterThan(0);
    expect(Math.abs(b)).toBeLessThan(Math.abs(a));
  });
  it("handles empty input without NaN", () => {
    const { a, b, intercept } = fitLogistic2D([], [], []);
    expect(Number.isFinite(a)).toBe(true);
    expect(Number.isFinite(b)).toBe(true);
    expect(Number.isFinite(intercept)).toBe(true);
  });
});

describe("doubleScoreGate (2307.05199v1)", () => {
  it("no-bets above the combined threshold", () => {
    expect(doubleScoreGate(0.8, 0.7, 1, 1, 1.0)).toBe(true);
    expect(doubleScoreGate(0.2, 0.2, 1, 1, 1.0)).toBe(false);
  });
  it("supports the triple-score variant", () => {
    expect(doubleScoreGate(0.2, 0.2, 1, 1, 1.0, 0.9, 2)).toBe(true);
    expect(doubleScoreGate(0.2, 0.2, 1, 1, 1.0, 0.1, 2)).toBe(false);
  });
});

describe("calibrateTau", () => {
  it("hits the target no-bet rate", () => {
    const tau = calibrateTau([0.1, 0.2, 0.3, 0.4, 0.5], 0.4);
    const rejected = [0.1, 0.2, 0.3, 0.4, 0.5].filter((s) => s > tau).length;
    expect(rejected / 5).toBeCloseTo(0.4, 1);
  });
  it("returns Infinity for empty input", () => {
    expect(calibrateTau([], 0.3)).toBe(Infinity);
  });
});

describe("abstentionLoss", () => {
  it("charges 1 for accepted mistakes and c for abstentions", () => {
    // accept wrong, accept right, abstain: (1 + 0 + 0.5)/3
    expect(abstentionLoss([true, true, false], [true, false, false], 0.5)).toBeCloseTo(
      0.5, 10,
    );
  });
  it("is 0 when everything accepted is right", () => {
    expect(abstentionLoss([true, true], [false, false], 0.5)).toBe(0);
  });
  it("handles empty input", () => {
    expect(abstentionLoss([], [], 0.5)).toBe(0);
  });
});

describe("twoStageRejector (2310.14770v2)", () => {
  it("rejects the highest rejector scores at the target rate", () => {
    const { accepted, threshold } = twoStageRejector([0.1, 0.9, 0.2, 0.8, 0.3], 0.4);
    expect(accepted.filter(Boolean).length).toBe(3);
    expect(accepted[1]).toBe(false);
    expect(accepted[3]).toBe(false);
    expect(threshold).toBeGreaterThan(0.3);
  });
});

describe("sharedMultiClassRejector", () => {
  it("applies class-specific thresholds", () => {
    const { accepted, thresholds } = sharedMultiClassRejector(
      [0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
      ["spread", "spread", "total", "total", "moneyline", "moneyline"],
      { spread: 0.5, total: 1, moneyline: 0.2 },
      0.5,
    );
    expect(Object.keys(thresholds).sort()).toEqual(["moneyline", "spread", "total"]);
    expect(accepted.length).toBe(6);
  });
});

describe("predictorRejectorCascade (2310.14772v2)", () => {
  it("routes into three tiers", () => {
    const { tiers, publishCut, reviewCut } = predictorRejectorCascade(
      [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0],
      0.3,
      0.2,
    );
    expect(tiers.filter((t) => t === "hard-no-bet").length).toBe(2);
    expect(tiers.filter((t) => t === "human-review").length).toBe(3);
    expect(tiers.filter((t) => t === "publish").length).toBe(5);
    expect(reviewCut).toBeLessThanOrEqual(publishCut);
  });
  it("handles empty input", () => {
    expect(predictorRejectorCascade([], 0.3, 0.2).tiers).toEqual([]);
  });
});
