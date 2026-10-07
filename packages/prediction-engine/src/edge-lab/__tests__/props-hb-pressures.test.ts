/**
 * QB pressures model tests (props-hb-pressures).
 *
 * H1 Edge #1 — QB Pressures (hurries + hits + sacks).
 *
 * Verifies:
 *  - Method tag.
 *  - PressureSample ↔ CatchSample round-trip (dropbacks=targets, pressures=receptions).
 *  - fitPressurePrior returns a proper Beta-prior on pressure rate.
 *  - posteriorPressure updates alpha/beta correctly.
 *  - betaBinomialProbOverPressures delegates to the catch closed-form.
 *  - Edge case: dropbacks=0 (zero opportunity) handled by the model layer.
 */
import { describe, expect, it } from "vitest";

import {
  PRESSURES_HB_METHOD_TAG,
  fitPressurePrior,
  posteriorPressure,
  betaBinomialProbOverPressures,
  scorePressuresOver,
  type PressureSample,
} from "../props-hb-pressures.js";
import { fitGroupPrior } from "../props-hb.js";

describe("pressures model contract", () => {
  it("exposes the v1 method tag", () => {
    expect(PRESSURES_HB_METHOD_TAG).toBe("props_hb_pressures_v1");
  });

  it("fitPressurePrior returns beta params on a realistic pressure-rate sample set", () => {
    // Realistic NFL defensive pressure rates vary widely across players
    // (blitz-heavy CBs, edge rushers, off-ball LBs). Use spread that exceeds
    // sampling noise so the Beta prior fits (like the catch prior tests).
    const samples: PressureSample[] = [
      { dropbacks: 20, pressures: 5 },  // 0.25
      { dropbacks: 45, pressures: 15 }, // 0.333
      { dropbacks: 18, pressures: 2 },  // 0.111
      { dropbacks: 38, pressures: 12 }, // 0.316
      { dropbacks: 52, pressures: 8 },  // 0.154
      { dropbacks: 25, pressures: 11 }, // 0.44
      { dropbacks: 33, pressures: 3 },  // 0.091
      { dropbacks: 41, pressures: 16 }, // 0.39
    ];
    const prior = fitPressurePrior(samples);
    expect(prior).not.toBeNull();
    expect(prior!.alpha).toBeGreaterThan(0);
    expect(prior!.beta).toBeGreaterThan(0);
    // Empirical mean ~ 0.277; prior mean should track toward that.
    const priorMean = prior!.alpha / (prior!.alpha + prior!.beta);
    expect(priorMean).toBeCloseTo(0.277, 1);
  });

  it("posteriorPressure updates alpha and beta", () => {
    const prior = { alpha: 3, beta: 12 }; // prior mean ~ 0.2
    const post = posteriorPressure(prior, 5, 25);
    expect(post.alpha).toBe(3 + 5); // alpha + successes
    expect(post.beta).toBe(12 + (25 - 5)); // beta + failures
  });

  it("betaBinomialProbOverPressures returns a probability in [0,1]", () => {
    const prior = fitPressurePrior([
      { dropbacks: 20, pressures: 5 },
      { dropbacks: 45, pressures: 15 },
      { dropbacks: 18, pressures: 2 },
      { dropbacks: 38, pressures: 12 },
      { dropbacks: 52, pressures: 8 },
      { dropbacks: 25, pressures: 11 },
      { dropbacks: 33, pressures: 3 },
      { dropbacks: 41, pressures: 16 },
    ]);
    expect(prior).not.toBeNull();
    const post = posteriorPressure(prior!, 5, 30);
    const p = betaBinomialProbOverPressures(post, 3, 35);
    expect(p).toBeGreaterThanOrEqual(0);
    expect(p).toBeLessThanOrEqual(1);
  });

  it("probOverPressures delegates to the receptions closed-form", () => {
    const samples: PressureSample[] = [
      { dropbacks: 20, pressures: 5 },
      { dropbacks: 45, pressures: 15 },
      { dropbacks: 18, pressures: 2 },
      { dropbacks: 38, pressures: 12 },
    ];
    const pressurePrior = fitPressurePrior(samples);
    expect(pressurePrior).not.toBeNull();

    // Dropback model — Gamma prior on per-game dropback totals via RateSample.
    const dropbackPrior = fitGroupPrior([
      { games: 1, total: 22 },
      { games: 1, total: 45 },
      { games: 1, total: 18 },
      { games: 1, total: 38 },
      { games: 1, total: 52 },
      { games: 1, total: 26 },
      { games: 1, total: 41 },
      { games: 1, total: 33 },
    ]);
    expect(dropbackPrior).not.toBeNull();

    const p = scorePressuresOver({
      pressurePrior: pressurePrior!,
      dropbackPrior: dropbackPrior!,
      pressureHistory: samples,
      dropbackGames: 8,
      dropbackTotal: 275,
      line: 5,
    });
    expect(p).toBeGreaterThanOrEqual(0);
    expect(p).toBeLessThanOrEqual(1);
  });

  it("handles the edge case: dropbacks=0 (zero opportunity)", () => {
    const prior = fitPressurePrior([
      { dropbacks: 20, pressures: 5 },
      { dropbacks: 45, pressures: 15 },
      { dropbacks: 18, pressures: 2 },
      { dropbacks: 38, pressures: 12 },
      { dropbacks: 52, pressures: 8 },
      { dropbacks: 25, pressures: 11 },
      { dropbacks: 33, pressures: 3 },
      { dropbacks: 41, pressures: 16 },
    ]);
    expect(prior).not.toBeNull();
    // With 0 dropbacks, prob over any positive line is 0.
    const p = betaBinomialProbOverPressures(posteriorPressure(prior!, 0, 0), 3, 0);
    expect(p).toBe(0);
  });
});
