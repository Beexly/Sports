/**
 * Tests for ./rating-stabilization-curve (arXiv:1501.07179v1, lane=tracking).
 *
 * ACCEPTANCE GATE: ADOPT a finite decay half-life for GSE in-season ratings IF the best finite half-life beats the
 * static BT by >= 0.5% log-loss on the 2015-2024 rolling-origin test AND the stabilization curve
 * identifies a week after which marginal information gain per game drops below 0.2pp accuracy.
 */

import { describe, expect, it } from "vitest";
import * as mod from "./rating-stabilization-curve";

describe("rating stabilization curve (arXiv:1501.07179v1)", () => {
  const points = [
    { week: 5, halfLifeWeeks: 4, logLoss: 0.66 },
    { week: 6, halfLifeWeeks: 4, logLoss: 0.64 },
    { week: 5, halfLifeWeeks: 8, logLoss: 0.67 },
    { week: 6, halfLifeWeeks: 8, logLoss: 0.66 },
    { week: 5, halfLifeWeeks: Infinity, logLoss: 0.69 },
    { week: 6, halfLifeWeeks: Infinity, logLoss: 0.68 },
  ];
  it("sweeps and picks the best finite half-life", () => {
    const sweep = mod.halfLifeSweep(points);
    expect(sweep).toHaveLength(3);
    expect(mod.bestFiniteHalfLife(points)).toBe(4);
  });
  it("finite beats static gate", () => {
    expect(mod.finiteBeatsStatic(points)).toBe(true);
    expect(mod.finiteBeatsStatic(points, 0.5)).toBe(false);
  });
  it("returns null when static wins", () => {
    const pts = points.map((p) => ({ ...p, halfLifeWeeks: Number.isFinite(p.halfLifeWeeks) ? Infinity : p.halfLifeWeeks }));
    expect(mod.bestFiniteHalfLife(pts)).toBeNull();
  });
  it("stabilization week", () => {
    expect(mod.stabilizationWeek([1.2, 0.8, 0.3, 0.1], 0.2)).toBe(4);
    expect(mod.stabilizationWeek([1.2, 0.8], 0.2)).toBeNull();
    expect(mod.stabilizationWeek([], 0.2)).toBeNull();
  });
  it("skips malformed points", () => {
    expect(mod.halfLifeSweep([null, { week: 1 }])).toEqual([]);
  });
});
