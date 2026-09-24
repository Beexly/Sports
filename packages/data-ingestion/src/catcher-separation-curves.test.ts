/**
 * Tests for ./catcher-separation-curves (arXiv:1810.12068v2, lane=markets).
 *
 * ACCEPTANCE GATE: ADAPT confirmed if pseudo-regularized early-season NFL ratings beat unregularized on weeks 5-8
 * held-out log-likelihood (any positive margin with p<0.1), OR if quasi-SEs change at least one
 * published pick-confidence tier vs naive SEs; otherwise keep the current early-season rating
 * procedure.
 */

import { describe, expect, it } from "vitest";
import * as mod from "./catcher-separation-curves";

describe("catcher separation curves (arXiv:1804.05329v1)", () => {
  const samples = [
    { tSec: 0, separationYd: 0.5 },
    { tSec: 1, separationYd: 2.0 },
    { tSec: 2, separationYd: 1.5 },
    { tSec: 3, separationYd: 4.0 },
    null,
  ];
  it("envelope is non-decreasing", () => {
    const env = mod.separationEnvelope(samples);
    expect(env).toHaveLength(4);
    for (let i = 1; i < env.length; i++) expect(env[i]!.separationYd).toBeGreaterThanOrEqual(env[i - 1]!.separationYd);
  });
  it("windows interpolate", () => {
    const env = mod.separationEnvelope(samples);
    const w = mod.separationAtWindows(env, [0.5, 1.5, 5]);
    expect(w[0]).toBeCloseTo(1.25, 10);
    expect(w[1]).toBeCloseTo(2.0, 10);
    expect(w[2]).toBeCloseTo(4.0, 10);
  });
  it("EPA lift monotone", () => {
    expect(mod.separationEpaLift(4)!).toBeGreaterThan(mod.separationEpaLift(1)!);
    expect(mod.separationEpaLift(-1)).toBeNull();
  });
  it("aggregates", () => {
    const env = mod.separationEnvelope(samples);
    const agg = mod.separationAggregates(env)!;
    expect(agg.peak).toBe(4);
    expect(agg.timeTo3Yd).toBe(3);
    expect(mod.separationAggregates([])).toBeNull();
  });
});
