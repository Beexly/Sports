/**
 * Tests for ./blackbox-batch-al (arXiv:2302.08981v2, lane=active_learning).
 *
 * ACCEPTANCE GATE: ADOPT black-box BADGE iff it matches or beats white-box BADGE on 2024 held-out margin RMSE at
 * equal batch size (delta-RMSE <= 0 — no accuracy cost for dropping gradient access) AND runs >=
 * 3x faster per acquisition round, with the win replicated on a second head (totals); REJECT if
 * black-box underperforms white-box by > 0.05 RMSE points (the Fisher-kernel approximation is
 * carrying real signal), or if pool disagreement collapses so black-box ~= uniform (their CatBoost
 * failure mode).
 */

import { describe, expect, it } from "vitest";
import * as mod from "./blackbox-batch-al";

describe("black-box batch AL (arXiv:2302.08981v2)", () => {
  const models = [
    (x: readonly number[]): number | null => (x[0] ?? 0) * 2,
    (x: readonly number[]): number | null => (x[0] ?? 0) * 2 + 1,
    (x: readonly number[]): number | null => (x[0] ?? 0) * 2 - 1,
  ];
  it("disagreement = variance", () => {
    expect(mod.committeeDisagreement(models, [3])).toBeCloseTo(2 / 3, 10);
    expect(mod.committeeDisagreement([models[0]!], [3])).toBeNull();
    expect(mod.committeeDisagreement(models, [])).toBeNull();
  });
  it("diverse batch", () => {
    const cands = [[0], [1], [2], [10]];
    const b = mod.diverseBatch(cands, models, 2)!;
    expect(b).toHaveLength(2);
    expect(new Set(b).size).toBe(2);
    expect(mod.diverseBatch(cands, models, 9)).toBeNull();
  });
  it("expected gain", () => {
    expect(mod.expectedGain(0.5, 2)).toBeCloseTo(1, 10);
    expect(mod.expectedGain(-1, 2)).toBeNull();
  });
});
