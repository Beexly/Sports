import { describe, it, expect } from "vitest";
import { compositeScore, type WeightedSignal } from "../composite-score.js";

describe("compositeScore", () => {
  it("is empty for no signals", () => {
    const r = compositeScore([]);
    expect(r.score).toBe(0);
    expect(r.signalsUsed).toBe(0);
    expect(r.contributions).toEqual([]);
  });

  it("is an effective-weighted average of the signal values", () => {
    const r = compositeScore([
      { key: "a", value: 1, weight: 2 },
      { key: "b", value: 0, weight: 1 },
    ]);
    expect(r.score).toBeCloseTo(2 / 3, 4); // (1*2 + 0*1) / 3
    expect(r.totalWeight).toBeCloseTo(3, 4);
    expect(r.signalsUsed).toBe(2);
  });

  it("confidence keeps a rumor from voting like a fact", () => {
    const r = compositeScore([
      { key: "fact", value: 1, weight: 1, confidence: 1 },
      { key: "rumor", value: -1, weight: 1, confidence: 0.1 },
    ]);
    // The low-confidence bad rumor barely dents a strong positive.
    expect(r.score).toBeCloseTo(0.9 / 1.1, 3);
    expect(r.contributions[0]!.key).toBe("fact"); // sorted by |contribution|
    const rumor = r.contributions.find((c) => c.key === "rumor")!;
    expect(Math.abs(rumor.contribution)).toBeLessThan(Math.abs(r.contributions[0]!.contribution));
  });

  it("decays stale signals by the freshness half-life", () => {
    const r = compositeScore(
      [
        { key: "fresh", value: 1, weight: 1, ageDays: 0 },
        { key: "stale", value: 1, weight: 1, ageDays: 14 }, // one half-life old
      ],
      { halfLifeDays: 14 },
    );
    const fresh = r.contributions.find((c) => c.key === "fresh")!;
    const stale = r.contributions.find((c) => c.key === "stale")!;
    expect(fresh.effectiveWeight).toBeCloseTo(2 * stale.effectiveWeight, 4); // stale ~ half weight
  });

  it("drops zero-confidence signals from the blend", () => {
    const r = compositeScore([
      { key: "real", value: 1, weight: 1, confidence: 1 },
      { key: "muted", value: 5, weight: 10, confidence: 0 },
    ]);
    expect(r.signalsUsed).toBe(1);
    expect(r.score).toBe(1); // the muted signal contributes nothing
  });

  it("blends hard + soft signals and attributes the drivers (weight-everything example)", () => {
    const signals: WeightedSignal[] = [
      { key: "opp_adj_off", value: 1.2, weight: 3, confidence: 1 }, // hard metric, strong + reliable
      { key: "concussion_protocol", value: -1.5, weight: 2, confidence: 0.9 }, // designation, fairly reliable
      { key: "rumor_holdout", value: -1, weight: 1, confidence: 0.2, ageDays: 10 }, // soft, low-conf, aging
      { key: "practice_dnp", value: -0.8, weight: 1.5, confidence: 0.8 }, // missed practice
    ];
    const r = compositeScore(signals);
    expect(r.signalsUsed).toBe(4);
    // The top driver should be a high-weight, high-confidence signal, not the rumor.
    expect(r.contributions[0]!.key === "opp_adj_off" || r.contributions[0]!.key === "concussion_protocol").toBe(true);
    const rumor = r.contributions.find((c) => c.key === "rumor_holdout")!;
    expect(rumor.weightShare).toBeLessThan(0.1); // the rumor is a minor, honest contributor
  });
});
