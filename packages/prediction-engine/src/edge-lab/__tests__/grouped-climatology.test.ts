import { describe, expect, it } from "vitest";
import {
  brierMean,
  brierSkillScore,
  fitGroupedClimatology,
  predictGrouped,
  scoreAgainstClimatology,
  type ClimTrainRow,
  type ScoredCase,
} from "../grouped-climatology.js";

function many(group: string, parent: string, y: 0 | 1, n: number): ClimTrainRow[] {
  return Array.from({ length: n }, () => ({ group, parent, y }));
}

describe("brierMean / brierSkillScore", () => {
  it("is (p − y)² and BSS is 1 − model/ref", () => {
    expect(brierMean([{ p: 0.2, y: 0 }])).toBeCloseTo(0.04, 12);
    expect(brierMean([{ p: 1, y: 1 }, { p: 0, y: 0 }])).toBe(0);
    expect(brierSkillScore(0.2, 0.25)).toBeCloseTo(0.2, 12);
  });

  it("refuses an empty sample and a zero reference", () => {
    expect(() => brierMean([])).toThrow(RangeError);
    expect(brierSkillScore(0.1, 0)).toBeNull();
    expect(brierSkillScore(0.1, -0.01)).toBeNull();
  });
});

describe("fitGroupedClimatology + predictGrouped backoff", () => {
  it("fits group / parent / pooled rates without leaking a test row", () => {
    const train = fitGroupedClimatology([
      ...many("WR|8", "WR", 1, 30),
      ...many("WR|8", "WR", 0, 10),
      ...many("TE|8", "TE", 1, 5),
      ...many("TE|8", "TE", 0, 25),
    ]);
    expect(train.n).toBe(70);
    expect(train.rates.get("WR|8")?.rate).toBeCloseTo(0.75, 12);
    expect(train.parentRates.get("WR")?.rate).toBeCloseTo(0.75, 12);
    expect(train.pooled.rate).toBeCloseTo(35 / 70, 12);

    const wr8 = predictGrouped("WR|8", "WR", train, 20);
    expect(wr8.source).toBe("group");
    expect(wr8.p).toBeCloseTo(0.75, 12);

    // Unseen week for WR: cell missing → parent (WR has n=40 ≥ 20).
    const wr1 = predictGrouped("WR|1", "WR", train, 20);
    expect(wr1.source).toBe("parent");
    expect(wr1.p).toBeCloseTo(0.75, 12);

    // Thin TE×week cell (n=30 actually; drop min so TE|8 is used). TE parent exists.
    const teThin = predictGrouped("TE|99", "TE", train, 20);
    expect(teThin.source).toBe("parent");
    expect(teThin.p).toBeCloseTo(5 / 30, 12);

    // Unknown parent and group → pooled.
    const unk = predictGrouped("QB|1", "QB", train, 20);
    expect(unk.source).toBe("pooled");
    expect(unk.p).toBeCloseTo(0.5, 12);
  });

  it("backs off a thin cell even when the key exists", () => {
    const train = fitGroupedClimatology([...many("WR|1", "WR", 1, 3), ...many("WR|8", "WR", 0, 40)]);
    const thin = predictGrouped("WR|1", "WR", train, 20);
    expect(thin.source).toBe("parent");
    expect(thin.n).toBe(43);
    expect(thin.p).toBeCloseTo(3 / 43, 12);
  });
});

describe("scoreAgainstClimatology — grouping-loss identity", () => {
  it("flags a model that is just the cell mean: beats pooled, loses to grouped", () => {
    const train = fitGroupedClimatology([
      ...many("WR|8", "WR", 1, 40),
      ...many("TE|8", "TE", 0, 40),
    ]);
    // Train WR|8 rate = 1, TE|8 rate = 0, pooled = 0.5.
    // Test outcomes match the cell means. Model predicts the cell mean.
    const cases: ScoredCase[] = [
      ...Array.from({ length: 40 }, () => ({ pModel: 1, y: 1 as const, group: "WR|8", parent: "WR" })),
      ...Array.from({ length: 40 }, () => ({ pModel: 0, y: 0 as const, group: "TE|8", parent: "TE" })),
    ];
    const card = scoreAgainstClimatology(cases, train, 20);
    expect(card.modelBrier).toBe(0);
    expect(card.groupedClimBrier).toBe(0);
    expect(card.pooledClimBrier).toBeCloseTo(0.25, 12);
    expect(card.bssPooled).toBe(1);
    expect(card.bssGrouped).toBeNull(); // grouped reference Brier is 0
    // groupingLoss requires a usable grouped BSS ≤ 0; perfect grouped
    // reference is refused. Perturb so grouped Brier > 0.
  });

  it("groupingLoss is true when pModel = grouped rate and groups differ", () => {
    const train = fitGroupedClimatology([
      ...many("WR|8", "WR", 1, 30),
      ...many("WR|8", "WR", 0, 10),
      ...many("TE|8", "TE", 1, 10),
      ...many("TE|8", "TE", 0, 30),
    ]);
    const wrRate = 0.75;
    const teRate = 0.25;
    // Test hit rates match train cells (WR 6/8, TE 2/8) so the cell-mean
    // model is calibrated. Pooled 0.5 is the weaker dummy.
    const cases: ScoredCase[] = [
      ...Array.from({ length: 6 }, () => ({ pModel: wrRate, y: 1 as const, group: "WR|8", parent: "WR" })),
      ...Array.from({ length: 2 }, () => ({ pModel: wrRate, y: 0 as const, group: "WR|8", parent: "WR" })),
      ...Array.from({ length: 2 }, () => ({ pModel: teRate, y: 1 as const, group: "TE|8", parent: "TE" })),
      ...Array.from({ length: 6 }, () => ({ pModel: teRate, y: 0 as const, group: "TE|8", parent: "TE" })),
    ];
    const card = scoreAgainstClimatology(cases, train, 20);
    expect(card.bssPooled).not.toBeNull();
    expect(card.bssGrouped).not.toBeNull();
    expect(card.bssPooled! > 0).toBe(true);
    expect(card.bssGrouped!).toBeLessThanOrEqual(1e-12);
    expect(card.groupingLoss).toBe(true);
    expect(card.groupedClimBrier).toBeLessThan(card.pooledClimBrier);
  });

  it("groupingLoss is false when the model beats the cell mean", () => {
    const train = fitGroupedClimatology([
      ...many("WR|8", "WR", 1, 20),
      ...many("WR|8", "WR", 0, 20),
    ]);
    // Grouped rate 0.5. Model is perfect on this tiny test.
    const cases: ScoredCase[] = [
      { pModel: 0.99, y: 1, group: "WR|8", parent: "WR" },
      { pModel: 0.01, y: 0, group: "WR|8", parent: "WR" },
    ];
    const card = scoreAgainstClimatology(cases, train, 20);
    expect(card.bssGrouped).not.toBeNull();
    expect(card.bssGrouped!).toBeGreaterThan(0);
    expect(card.groupingLoss).toBe(false);
  });
});
