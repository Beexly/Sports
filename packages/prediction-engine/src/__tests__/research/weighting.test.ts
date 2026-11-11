import { describe, it, expect } from "vitest";
import { computeWeights, combineParameter, blendTowardEvidence, scoreEvidence, isUsable } from "../../research/weighting.js";
import { MIN_CONFIDENCE, type ResearchEvidence } from "../../research/types.js";

function ev(over: Partial<ResearchEvidence> = {}): ResearchEvidence {
  return {
    arxivId: "2101.00001",
    title: "A Paper",
    lane: "calibration",
    confidence: 0.99,
    enabled: true,
    parameters: [],
    ...over,
  };
}

describe("evidence usability", () => {
  it("rejects disabled papers even at perfect confidence", () => {
    expect(isUsable(ev({ enabled: false }))).toBe(false);
    expect(scoreEvidence(ev({ enabled: false }))).toBe(0);
  });

  it("rejects papers below the confidence floor", () => {
    expect(isUsable(ev({ confidence: MIN_CONFIDENCE - 0.01 }))).toBe(false);
  });

  it("accepts a paper exactly at the floor", () => {
    expect(isUsable(ev({ confidence: MIN_CONFIDENCE }))).toBe(true);
  });

  it("ranks calibration above evaluation at equal confidence", () => {
    const cal = scoreEvidence(ev({ lane: "calibration" }));
    const evaln = scoreEvidence(ev({ lane: "evaluation" }));
    expect(cal).toBeGreaterThan(evaln);
  });
});

describe("computeWeights", () => {
  it("normalizes usable papers to exactly 1", () => {
    const w = computeWeights([ev({ lane: "calibration" }), ev({ lane: "evaluation" })]);
    const total = w.reduce((s, e) => s + e.weight, 0);
    expect(total).toBeCloseTo(1, 10);
  });

  it("gives zero weight to disabled papers and renormalizes the rest", () => {
    const w = computeWeights([
      ev({ lane: "calibration", confidence: 1 }),
      ev({ lane: "evaluation", enabled: false }),
    ]);
    expect(w[0]!.weight).toBeCloseTo(1, 10);
    expect(w[1]!.weight).toBe(0);
  });

  it("returns all zeros when nothing is usable, never a uniform guess", () => {
    const w = computeWeights([ev({ enabled: false }), ev({ confidence: 0.5 })]);
    expect(w.every((e) => e.weight === 0)).toBe(true);
  });

  it("is deterministic for the same input", () => {
    const set = [ev(), ev({ lane: "feature", confidence: 0.95 })];
    expect(computeWeights(set)).toEqual(computeWeights(set));
  });
});

describe("combineParameter", () => {
  it("returns the prior untouched when no paper states the parameter", () => {
    const w = computeWeights([ev()]);
    const r = combineParameter(w, "regression_games", 8);
    expect(r.value).toBe(8);
    expect(r.contributors).toBe(0);
  });

  it("returns a weight-normalized mean of stated values", () => {
    const w = computeWeights([
      ev({ parameters: [{ name: "k", value: 10 }] }),
      ev({ lane: "evaluation", parameters: [{ name: "k", value: 20 }] }),
    ]);
    const r = combineParameter(w, "k", 0);
    expect(r.contributors).toBe(2);
    // calibration lane outranks evaluation, so the mean sits below the midpoint
    expect(r.value).toBeGreaterThan(10);
    expect(r.value).toBeLessThan(15);
  });

  it("ignores non-finite parameter values", () => {
    const w = computeWeights([ev({ parameters: [{ name: "k", value: Number.NaN }] })]);
    const r = combineParameter(w, "k", 7);
    expect(r.value).toBe(7);
    expect(r.contributors).toBe(0);
  });
});

describe("blendTowardEvidence", () => {
  it("returns the prior exactly at strength 0", () => {
    expect(blendTowardEvidence(8, 20, 0)).toBe(8);
  });
  it("adopts the evidence exactly at strength 1", () => {
    expect(blendTowardEvidence(8, 20, 1)).toBe(20);
  });
  it("clamps out-of-range strength rather than extrapolating", () => {
    expect(blendTowardEvidence(8, 20, 5)).toBe(20);
    expect(blendTowardEvidence(8, 20, -3)).toBe(8);
  });
  it("falls back to the prior on non-finite input", () => {
    expect(blendTowardEvidence(8, Number.NaN, 0.5)).toBe(8);
  });
});
