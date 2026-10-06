/**
 * Tests for ./1601-00991v1-signal-discovery-alpha-mining (arXiv:1601.00991v1, lane=signal_discovery_alpha_mining).
 *
 * ACCEPTANCE GATE: ADOPT if: mined factor zoo achieves mean out-of-sample |IC| >= 2x the hand-built baseline IC on the
 * 2023-2025 test block AND mean pairwise |corr| <= 0.25 AND the combined signal improves base-model
 * Brier by >= 0.002 on held-out season with deflated-Sharpe / reality-check multiple-testing gate
 * passed.
 */
import { describe, expect, it } from "vitest";
import * as mod from "./1601-00991v1-signal-discovery-alpha-mining";

describe("alpha mining diagnostics (arXiv:1601.00991v1)", () => {
  it("computes the rank information coefficient", () => {
    expect(mod.informationCoefficient([1, 2, 3, 4], [1, 2, 3, 4])).toBeCloseTo(1, 10);
    expect(mod.informationCoefficient([1, 2, 3, 4], [4, 3, 2, 1])).toBeCloseTo(-1, 10);
    expect(mod.informationCoefficient([1, 1, 1], [1, 2, 3])).toBeNull();
    expect(mod.informationCoefficient([1], [1])).toBeNull();
  });

  it("measures turnover", () => {
    expect(mod.turnoverRate([0.5, 0.5], [1, 0])).toBeCloseTo(0.5, 10);
    expect(mod.turnoverRate([0.5, 0.5], [0.5, 0.5])).toBeCloseTo(0, 10);
    expect(mod.turnoverRate([0.5], [0.5, 0.5])).toBeNull();
  });

  it("fits signal half-life from decay", () => {
    // exact halving each lag -> half-life of 1 period
    expect(mod.halfLifeFromDecay([1, 0.5, 0.25])).toBeCloseTo(1, 8);
    // flat (non-decaying) -> null
    expect(mod.halfLifeFromDecay([0.5, 0.5, 0.5])).toBeNull();
    expect(mod.halfLifeFromDecay([0.5])).toBeNull();
  });
});
