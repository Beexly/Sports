import { describe, expect, it } from "vitest";
import {
  runBrierOgdEnsemble,
  equalWeightBlend,
  projectProbabilitySimplex,
} from "../brier-ogd-ensemble.js";

describe("brier OGD ensemble", () => {
  it("projects onto simplex", () => {
    const m = new Map([
      ["a", 0.8],
      ["b", 0.5],
      ["c", -0.1],
    ]);
    const w = projectProbabilitySimplex(m, ["a", "b", "c"]);
    const s = w.a + w.b + w.c;
    expect(s).toBeCloseTo(1, 6);
    expect(w.c).toBeGreaterThanOrEqual(0);
  });

  it("beats equal weight when one member is better", () => {
    // Member good is near-oracle; bad is noise
    const samples = Array.from({ length: 80 }, (_, i) => {
      const y = (i % 2 === 0 ? 1 : 0) as 0 | 1;
      return {
        sampleId: `s${i}`,
        t: i,
        y,
        members: {
          good: y === 1 ? 0.75 : 0.25,
          bad: 0.5 + ((i % 7) - 3) * 0.02,
        },
      };
    });
    const rep = runBrierOgdEnsemble(samples, {
      learningRate: 0.4,
      etaSchedule: "one_over_sqrt_t",
    });
    expect(rep.n).toBe(80);
    expect(rep.finalWeights.good).toBeGreaterThan(rep.finalWeights.bad);
    expect(rep.meanBrierEnsemble).toBeLessThanOrEqual(rep.meanBrierEqual + 0.02);
    expect(rep.status).toBe("shadow");
    expect(rep.priced).toBe(false);
  });

  it("equalWeightBlend clamps", () => {
    expect(equalWeightBlend({ a: 0.4, b: 0.6 })).toBeCloseTo(0.5, 6);
    expect(equalWeightBlend({})).toBeNull();
  });
});
