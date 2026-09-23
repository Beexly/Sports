/**
 * Tests for ./2002-08245v2-signal-discovery-alpha-mining (arXiv:2002.08245v2, lane=signal_discovery_alpha_mining).
 *
 * ACCEPTANCE GATE: ADAPT->build if AutoAlpha-style miner yields >= 3x the # of diverse test-surviving signals vs.
 * vanilla GP at equal compute AND the ensemble ranker beats the best single signal by >= 0.002 Brier
 * on 2022-2025 with White's-reality-check p<0.05.
 */
import { describe, expect, it } from "vitest";
import * as mod from "./2002-08245v2-signal-discovery-alpha-mining";

describe("alpha mining diagnostics (arXiv:2002.08245v2)", () => {
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
