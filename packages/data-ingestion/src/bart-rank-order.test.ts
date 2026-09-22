/**
 * Tests for ./bart-rank-order (arXiv:2308.10231v5, lane=team_ratings).
 *
 * ACCEPTANCE GATE: ADOPT the BART-dynamic strength model if it beats the linear AR baseline by >=0.003 mean log-
 * loss on weeks 12-18, 2015-2025 pooled, AND wins Kendall tau vs end-of-season SRS in >=6 of 10
 * seasons; ADAPT if it wins on only one metric (keep as an ensemble component); REJECT if it loses
 * on both.
 */

import { describe, expect, it } from "vitest";
import * as mod from "./bart-rank-order";

describe("BART rank-order (arXiv:2308.10231v5)", () => {
  it("Plackett-Luce log-lik", () => {
    const ll = mod.plackettLuceLogLik(["A", "B", "C"], { A: 2, B: 1, C: 0 })!;
    const ll2 = mod.plackettLuceLogLik(["C", "B", "A"], { A: 2, B: 1, C: 0 })!;
    expect(ll).toBeGreaterThan(ll2);
    expect(mod.plackettLuceLogLik([], { A: 1 })).toBeNull();
    expect(mod.plackettLuceLogLik(["A", "Z"], { A: 1 })).toBeNull();
  });
  it("tree-sum predict", () => {
    const stumps = [
      { feature: 0, threshold: 0.5, left: 1, right: 2 },
      { feature: 0, threshold: 0.5, left: 3, right: 4 },
    ];
    expect(mod.treeSumPredict(stumps, [0.3])).toBeCloseTo(4, 10);
    expect(mod.treeSumPredict(stumps, [0.7])).toBeCloseTo(6, 10);
    expect(mod.treeSumPredict([], [0.3])).toBeNull();
    expect(mod.treeSumPredict([{ feature: 0 }], [0.3])).toBeNull();
    expect(mod.isBartNode(stumps[0])).toBe(true);
    expect(mod.isBartNode({ feature: 0 })).toBe(false);
  });
  it("partial dependence", () => {
    const stumps = [{ feature: 0, threshold: 0.5, left: 1, right: 2 }];
    const pd = mod.partialDependence(stumps, [0, 0], 0, [0.3, 0.7])!;
    expect(pd).toEqual([1, 2]);
    expect(mod.partialDependence(stumps, [0, 0], 5, [0.3])).toBeNull();
  });
  it("rank agreement", () => {
    expect(mod.rankAgreement(["A", "B", "C"], { A: 1, B: 2, C: 3 })).toBeCloseTo(1, 10);
    expect(mod.rankAgreement(["C", "B", "A"], { A: 1, B: 2, C: 3 })).toBeCloseTo(-1, 10);
    expect(mod.rankAgreement(["A"], { A: 1 })).toBeNull();
  });
});
