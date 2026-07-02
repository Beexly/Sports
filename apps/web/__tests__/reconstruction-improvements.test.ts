import { describe, it, expect } from "vitest";
import {
  recencyWeightedObservation,
  fitStratifiedShrinkage,
  fitShrinkage,
  type GroupObservation,
} from "@/lib/reconstruction/empirical-bayes";
import {
  standardizedErrorRms,
  skillScore,
  type TruthPair,
} from "@/lib/reconstruction/calibration-eval";
import { reconstructed, makeProvenance } from "@/lib/reconstruction/provenance";

/**
 * The "improve not remove" extractions: each so-called ornamental construct
 * has a real, testable kernel. These pin the honest behavior.
 */

describe("recencyWeightedObservation (Barbour-OU kernel: mean-reverting drift)", () => {
  it("weights recent weeks more than old ones", () => {
    // Same targets each week; recent value 4.0, old value 2.0. With decay the
    // blended mean must sit ABOVE the simple average (3.0), pulled toward recent.
    const obs = recencyWeightedObservation(
      "wr1",
      [
        { value: 4.0, count: 10, ageWeeks: 0 },
        { value: 2.0, count: 10, ageWeeks: 8 },
      ],
      4, // 4-week half-life
    );
    expect(obs.mean).toBeGreaterThan(3.0);
    expect(obs.mean).toBeLessThan(4.0);
    // Effective count is discounted below the raw 20 by the decay on old weeks.
    expect(obs.count).toBeLessThan(20);
    expect(obs.count).toBeGreaterThan(10);
  });

  it("with decay disabled, reduces to the plain count-weighted mean", () => {
    const obs = recencyWeightedObservation(
      "wr1",
      [
        { value: 4.0, count: 10, ageWeeks: 0 },
        { value: 2.0, count: 10, ageWeeks: 8 },
      ],
      0,
    );
    expect(obs.mean).toBeCloseTo(3.0, 6);
    expect(obs.count).toBe(20);
  });

  it("is empty-safe", () => {
    expect(recencyWeightedObservation("x", [], 4)).toEqual({ key: "x", mean: 0, count: 0 });
  });
});

describe("fitStratifiedShrinkage (exchangeability kernel: borrow from peers)", () => {
  it("shrinks toward the ROLE mean, not the league mean, for populated strata", () => {
    // Slot receivers cluster ~3.0; boundary receivers cluster ~1.5. A thin-
    // sample slot player should be pulled toward 3.0, not the ~2.25 league mean.
    const obs: GroupObservation[] = [];
    for (let i = 0; i < 10; i++) obs.push({ key: `slot${i}`, mean: 3.0 + (i % 2 ? 0.1 : -0.1), count: 40 });
    for (let i = 0; i < 10; i++) obs.push({ key: `bound${i}`, mean: 1.5 + (i % 2 ? 0.1 : -0.1), count: 40 });
    obs.push({ key: "slotThin", mean: 5.0, count: 2 }); // noisy slot outlier

    const stratumOf = (o: GroupObservation) => (o.key.startsWith("slot") ? "slot" : "bound");
    const strat = fitStratifiedShrinkage(obs, stratumOf, { minGroupsPerStratum: 5 });
    const global = fitShrinkage(obs);

    const thinStrat = strat.get("slotThin")!.shrunk;
    const thinGlobal = global.estimates.get("slotThin")!.shrunk;
    // Stratified pulls the outlier toward the slot mean (~3), higher than the
    // global pull toward the mixed league mean (~2.25).
    expect(thinStrat).toBeGreaterThan(thinGlobal);
  });

  it("falls back to the global fit for strata with too few peers", () => {
    const obs: GroupObservation[] = [
      { key: "a", mean: 3, count: 20 },
      { key: "b", mean: 3.2, count: 20 },
      { key: "loner", mean: 9, count: 20 },
    ];
    const strat = fitStratifiedShrinkage(obs, (o) => (o.key === "loner" ? "solo" : "main"), {
      minGroupsPerStratum: 2,
    });
    const global = fitShrinkage(obs);
    // "solo" has 1 group (< 2) -> global estimate is used verbatim.
    expect(strat.get("loner")!.shrunk).toBeCloseTo(global.estimates.get("loner")!.shrunk, 6);
  });
});

describe("standardizedErrorRms (belief-manifold kernel: error in units of confidence)", () => {
  function pair(pred: number, actual: number, halfWidth: number): TruthPair {
    return {
      predicted: reconstructed(pred, [pred - halfWidth, pred + halfWidth], 0.2, makeProvenance("covariate-adjusted", ["t"], true)),
      actual,
    };
  }
  it("penalizes a miss more when the interval was tight (overconfident)", () => {
    const tight = standardizedErrorRms([pair(3, 3.5, 0.2)]); // 0.5 miss, tight band
    const wide = standardizedErrorRms([pair(3, 3.5, 2.0)]); // same miss, wide band
    expect(tight).toBeGreaterThan(wide);
  });
  it("well-sized intervals score near 1", () => {
    // half-width chosen so sd ~ the actual error magnitude -> z ~ 1.
    const z = 1.2815515655; // normalQuantile(0.9)
    const sd = 0.5;
    const p = standardizedErrorRms([
      {
        predicted: reconstructed(3, [3 - z * sd, 3 + z * sd], 0.2, makeProvenance("covariate-adjusted", ["t"], true)),
        actual: 3 + sd,
      },
    ]);
    expect(p).toBeCloseTo(1.0, 3);
  });
});

describe("skillScore (honest epistemic-alpha: measured lift over a baseline)", () => {
  function pair(pred: number, actual: number): TruthPair {
    return {
      predicted: reconstructed(pred, [pred - 1, pred + 1], 0.2, makeProvenance("covariate-adjusted", ["t"], true)),
      actual,
    };
  }
  it("is positive when the model beats the baseline and negative when it does not", () => {
    const pairs = [pair(3.0, 3.0), pair(4.0, 4.0)]; // model perfect
    const baseline = [2.5, 2.5]; // flat tendency, worse
    expect(skillScore(pairs, baseline)).toBeGreaterThan(0);

    const worse = skillScore([pair(1, 3), pair(1, 4)], [2.8, 3.8]); // baseline close, model far
    expect(worse).toBeLessThan(0);
  });
  it("guards degenerate inputs", () => {
    expect(Number.isNaN(skillScore([], []))).toBe(true);
    expect(Number.isNaN(skillScore([pair(3, 3)], [3]))).toBe(true); // baseline perfect -> undefined
  });
});
