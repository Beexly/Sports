import { describe, it, expect } from "vitest";
import {
  tuneExtremizationGamma,
  type GammaTuningEvent,
} from "../edge-lab/features/extremization-tuner.js";

const m = (source: string, prob: number, weight?: number) => ({ source, prob, weight });

describe("tuneExtremizationGamma", () => {
  it("prefers gamma > 1 when members are systematically underconfident", () => {
    // True prob 0.8; members hedge around 0.6-0.7. Extremization should help.
    const mk = (): GammaTuningEvent => ({
      members: [m("a", 0.65), m("b", 0.7), m("c", 0.6)],
      outcome: 1,
    });
    const r = tuneExtremizationGamma([mk(), mk(), mk(), mk()]);
    expect(r.bestGamma).toBeGreaterThan(1);
    expect(r.bestBrier).toBeLessThan(r.baselineBrier);
  });

  it("prefers gamma = 1 (or below) when members are already well-calibrated", () => {
    const events: GammaTuningEvent[] = [
      { members: [m("a", 0.9), m("b", 0.95)], outcome: 1 },
      { members: [m("a", 0.05), m("b", 0.1)], outcome: 0 },
      { members: [m("a", 0.85), m("b", 0.9)], outcome: 1 },
      { members: [m("a", 0.1), m("b", 0.15)], outcome: 0 },
    ];
    const r = tuneExtremizationGamma(events);
    expect(r.bestBrier).toBeLessThanOrEqual(r.baselineBrier + 1e-12);
    // Well-separated confident pools: extremizing beyond 1 cannot beat baseline much.
    expect(r.baselineBrier).toBeLessThan(0.05);
  });

  it("returns the full curve and reports flat optima honestly", () => {
    const ev = (): GammaTuningEvent => ({
      members: [m("a", 0.5), m("b", 0.5)],
      outcome: 1,
    });
    const r = tuneExtremizationGamma([ev(), ev()], { grid: [1, 2, 3] });
    // Pools at exactly 0.5 stay at 0.5 for every gamma → perfectly flat curve.
    expect(r.curve).toHaveLength(3);
    for (const pt of r.curve) {
      expect(pt.brier).toBeCloseTo(0.25, 10);
    }
    expect(r.flatOptimum).toBe(true);
  });

  it("ties resolve to the smallest gamma", () => {
    const ev = (): GammaTuningEvent => ({
      members: [m("a", 0.5), m("b", 0.5)],
      outcome: 1,
    });
    const r = tuneExtremizationGamma([ev(), ev()], { grid: [2, 3, 1] });
    expect(r.bestGamma).toBe(1);
  });

  it("skips unpoolable events with indices reported, never imputes", () => {
    const good: GammaTuningEvent = { members: [m("a", 0.7)], outcome: 1 };
    const badMembers: GammaTuningEvent = { members: [m("x", NaN)], outcome: 0 };
    const badOutcome = { members: [m("a", 0.4)], outcome: 2 as 0 | 1 };
    expect(() =>
      tuneExtremizationGamma([good, badMembers, badOutcome]),
    ).toThrow(/outcome/);

    const r = tuneExtremizationGamma([badMembers, good]);
    expect(r.skippedEventIndices).toEqual([0]);
    expect(r.nScored).toBe(1);
  });

  it("fail-closed on empty events/grid and invalid gammas", () => {
    const ev: GammaTuningEvent = { members: [m("a", 0.6)], outcome: 1 };
    expect(() => tuneExtremizationGamma([], {})).toThrow();
    expect(() => tuneExtremizationGamma([ev], { grid: [] })).toThrow();
    expect(() => tuneExtremizationGamma([ev], { grid: [-1] })).toThrow();
    expect(() => tuneExtremizationGamma([ev], { grid: [NaN] })).toThrow();
  });

  it("throws when every event fails pooling", () => {
    const bad: GammaTuningEvent = { members: [m("x", Infinity)], outcome: 1 };
    expect(() => tuneExtremizationGamma([bad])).toThrow(/no event had a member set/);
  });
});
