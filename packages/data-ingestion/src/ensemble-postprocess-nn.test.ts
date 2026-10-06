/**
 * Tests for ./ensemble-postprocess-nn (arXiv:2303.17610, lane=weather).
 *
 * ACCEPTANCE GATE: ADOPT if the post-processed model beats EMOS by >=5% CRPS on wind speed AND >=5% on temperature
 * on the 2024 holdout with rank histograms visibly more uniform than raw ensembles; REJECT if CRPS
 * gain <5% on either variable - then GSE stays with off-the-shelf weather APIs.
 */

import { describe, expect, it } from "vitest";
import * as mod from "./ensemble-postprocess-nn";

describe("ensemble post-process NN (arXiv:2303.17610)", () => {
  it("affine params", () => {
    const p = mod.affineDistParams({ mean: 10, spread: 2, nMembers: 10 }, [0, 1, 0], [0, 0, 0])!;
    expect(p.mu).toBeCloseTo(10, 10);
    expect(p.sigma).toBeCloseTo(1, 10);
    expect(mod.affineDistParams({ mean: 10, spread: 2, nMembers: 0 }, [0, 1, 0], [0, 0, 0])).toBeNull();
  });
  it("NLL minimized at truth", () => {
    const a = mod.gaussianNLL(5, 1, 5)!;
    const b = mod.gaussianNLL(7, 1, 5)!;
    expect(a).toBeLessThan(b);
    expect(mod.gaussianNLL(5, 0, 5)).toBeNull();
  });
  it("CRPS", () => {
    expect(mod.crpsGaussian(5, 1, 5)!).toBeGreaterThan(0);
    expect(mod.crpsGaussian(5, 1, 9)!).toBeGreaterThan(mod.crpsGaussian(5, 1, 5)!);
  });
  it("NLL gradient", () => {
    const g = mod.nllGrad(5, 1, 5)!;
    expect(g.dMu).toBeCloseTo(0, 10);
    expect(g.dLogSigma).toBeCloseTo(1, 10);
    expect(mod.nllGrad(5, 0, 5)).toBeNull();
  });
});
