/**
 * Tests for ./2609-15309v1-team-rating (arXiv:2609.15309v1, lane=team_ratings).
 *
 * ACCEPTANCE GATE: ADAPT-accept if the GSE arena yields stable cross-week model rankings (bootstrap 95% CI width < 150 Elo on version gaps) AND the sampling-reference check matches within +-20% on the restart experiment; then adopt the restart-allocation rule into the optimizer. REJECT for GSE use if pairwise model ratings are unstable across weeks (CIs spanning >300 Elo).
 */

import { describe, expect, it } from "vitest";
import * as mod from "./2609-15309v1-team-rating";

describe("2609-15309v1 When Agents Slow Down: Understanding LLM", () => {
  it("elo expected score is 0.5 for equal ratings", () => {
    expect(mod.eloExpectedScore(1500, 1500)).toBeCloseTo(0.5, 10);
    expect(mod.eloExpectedScore(1600, 1500)).toBeGreaterThan(0.5);
    expect(mod.eloExpectedScore(NaN, 1500)).toBeNull();
  });
  it("elo update is zero-sum with k=32", () => {
    const u = mod.eloUpdate(1500, 1500, 1, 32);
    expect(u).not.toBeNull();
    expect(u!.a).toBeCloseTo(1516, 10);
    expect(u!.b).toBeCloseTo(1484, 10);
    expect(mod.eloUpdate(1500, 1500, 1.5, 32)).toBeNull();
  });
  it("margin-adjusted K grows log-wise with blowouts", () => {
    expect(mod.marginAdjustedK(32, 10)).toBeCloseTo(76.73, 1);
    expect(mod.marginAdjustedK(32, 0)).toBeCloseTo(0, 10);
    expect(mod.marginAdjustedK(-1, 10)).toBeNull();
  });
  it("one Bradley-Terry MM iteration on a 2-team matrix", () => {
    const r = mod.bradleyTerryIteration([[0, 3], [1, 0]], [1, 1]);
    expect(r).not.toBeNull();
    expect(r![0]).toBeCloseTo(1.5, 10);
    expect(r![1]).toBeCloseTo(0.5, 10);
  });
  it("ranking order sorts strongest-first", () => {
    expect(mod.rankingOrder([100, 300, 200])).toEqual([1, 2, 0]);
    expect(mod.rankingOrder([])).toBeNull();
  });
});
