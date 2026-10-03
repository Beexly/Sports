// Tests for decision/1905-10964v2-dac-abstention-cleaning.ts (vitest).
import { describe, it, expect } from "vitest";
import {
  dacLoss,
  dacAbstain,
  dacCleanDataset,
  brierScore,
  unreliableGameReport,
  dacGatePasses,
} from "./1905-10964v2-dac-abstention-cleaning.js";

describe("dacLoss (1905.10964v2)", () => {
  it("rewards abstention when the true class probability is low", () => {
    // Uncertain sample: p_true = 0.2. Abstaining (pA=0.5) should beat not abstaining.
    const abstain = dacLoss(0.2, 0.5, 0.5);
    const noAbstain = dacLoss(0.2, 0.01, 0.5);
    expect(abstain).toBeLessThan(noAbstain);
  });
  it("penalizes abstention when the model is confident and right", () => {
    const abstain = dacLoss(0.95, 0.5, 1.0);
    const noAbstain = dacLoss(0.95, 0.01, 1.0);
    expect(noAbstain).toBeLessThan(abstain);
  });
});

describe("dacAbstain / dacCleanDataset", () => {
  it("abstains exactly when the abstention head dominates", () => {
    expect(dacAbstain({ classProbs: [0.6, 0.3], pAbstain: 0.1 })).toBe(false);
    expect(dacAbstain({ classProbs: [0.3, 0.3], pAbstain: 0.4 })).toBe(true);
  });
  it("partitions the training set and reports the abstention rate", () => {
    const outputs = [
      { classProbs: [0.8, 0.1], pAbstain: 0.1 },
      { classProbs: [0.3, 0.3], pAbstain: 0.4 },
      { classProbs: [0.2, 0.2], pAbstain: 0.6 },
      { classProbs: [0.9, 0.05], pAbstain: 0.05 },
    ];
    const { cleanIdx, abstainedIdx, abstentionRate } = dacCleanDataset(outputs);
    expect(cleanIdx).toEqual([0, 3]);
    expect(abstainedIdx).toEqual([1, 2]);
    expect(abstentionRate).toBeCloseTo(0.5, 10);
  });
});

describe("brierScore", () => {
  it("is 0 for perfect forecasts", () => {
    expect(brierScore([1, 0, 1], [true, false, true])).toBe(0);
    expect(brierScore([0.5, 0.5], [true, false])).toBeCloseTo(0.25, 10);
  });
});

describe("unreliableGameReport", () => {
  it("annotates abstained games for the write-up pipeline", () => {
    const report = unreliableGameReport(
      ["g1", "g2"],
      [
        { classProbs: [0.8, 0.1], pAbstain: 0.1 },
        { classProbs: [0.3, 0.35], pAbstain: 0.35 },
      ],
      ["home-cover", "away-cover"],
    );
    expect(report).toHaveLength(1);
    expect(report[0]).toMatchObject({ gameId: "g2", topClass: "away-cover" });
    expect(report[0]!.pAbstain).toBeCloseTo(0.35, 10);
  });
});

describe("dacGatePasses", () => {
  it("encodes Brier >=0.003, abstention <=25%, hard reject at >40%", () => {
    expect(dacGatePasses(0.004, 0.2)).toBe(true);
    expect(dacGatePasses(0.002, 0.2)).toBe(false);
    expect(dacGatePasses(0.004, 0.3)).toBe(false);
    expect(dacGatePasses(0.05, 0.45)).toBe(false); // sample destruction
  });
});
