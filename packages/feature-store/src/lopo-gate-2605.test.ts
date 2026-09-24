import { describe, expect, it } from "vitest";
import {
  efficiencyFlags,
  lopoFolds,
  lopoGateAdopt,
  lopoReport,
  scoreFold,
} from "./lopo-gate-2605.js";

describe("lopo gate", () => {
  const data = [
    { playerId: "p1", features: [1], target: 10 },
    { playerId: "p1", features: [2], target: 12 },
    { playerId: "p2", features: [1], target: 5 },
    { playerId: "p2", features: [2], target: 6 },
    { playerId: "p3", features: [1], target: 20 },
  ];

  it("creates one fold per player with disjoint train/test", () => {
    const folds = lopoFolds(data);
    expect(folds.length).toBe(3);
    for (const f of folds) {
      expect(f.test.every((r) => r.playerId === f.heldOutPlayer)).toBe(true);
      expect(f.train.every((r) => r.playerId !== f.heldOutPlayer)).toBe(true);
      expect(f.train.length + f.test.length).toBe(data.length);
    }
  });

  it("scoreFold computes MAE and R2", () => {
    const s = scoreFold("p1", [10, 12], [10, 12]);
    expect(s.mae).toBe(0);
    expect(s.r2).toBe(1);
    const s2 = scoreFold("p1", [10, 12], [11, 11]);
    expect(s2.mae).toBe(1);
  });

  it("gate adopts on >=10% pooled->LOPO degradation", () => {
    const folds = [
      { playerId: "p1", mae: 2.0, r2: 0.5, n: 10 },
      { playerId: "p2", mae: 2.2, r2: 0.4, n: 10 },
    ];
    const rep = lopoReport(folds, 1.5); // (2.1-1.5)/1.5 = 40%
    expect(rep.lopoMae).toBeCloseTo(2.1, 9);
    expect(lopoGateAdopt(rep)).toBe(true);
    const rep2 = lopoReport(folds, 2.05); // ~2.4% degradation
    expect(lopoGateAdopt(rep2)).toBe(false);
  });

  it("efficiency flags systematic outperformers", () => {
    const preds = new Map([
      ["p1", [8, 8]], // actual 10,12 -> +3 mean residual
      ["p2", [5, 6]], // exact
      ["p3", [25]], // actual 20 -> -5
    ]);
    const flags = efficiencyFlags(data, preds, 1);
    expect(flags[0]?.playerId).toBe("p1");
    expect(flags[0]?.efficient).toBe(true);
    expect(flags.find((f) => f.playerId === "p2")?.efficient).toBe(false);
  });

  it("handles empty input", () => {
    expect(lopoFolds([])).toEqual([]);
    const rep = lopoReport([], 1.0);
    expect(Number.isNaN(rep.lopoMae)).toBe(true);
    expect(lopoGateAdopt(rep)).toBe(false);
    expect(efficiencyFlags([], new Map())).toEqual([]);
    const s = scoreFold("x", [], []);
    expect(Number.isNaN(s.mae)).toBe(true);
  });
});
