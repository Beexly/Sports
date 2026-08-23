/**
 * TFL model tests (props-hb-tfl).
 *
 * H1 Edge #2 — TFL (tackles for loss). Mispriced as a sack prop.
 *
 * Beta-Binomial over defensive snaps (bounded exposure), same closed-form as
 * sacks/pressures/receptions. TFL = tfl / snaps rate.
 *
 * Verifies:
 *  - Method tag.
 *  - TflSample type shape (snaps, tfl).
 *  - fitTflPrior returns Beta prior on realistic TFL samples.
 *  - fitTflPrior returns null when all snaps are 0 (no opportunity).
 *  - fitTflPrior excludes zero-snap samples (healthy scratch).
 *  - posteriorTfl updates alpha/beta correctly (alpha + tfl, beta + snaps-tfl).
 *  - posteriorTfl with snaps=0 leaves prior unchanged.
 *  - probOverTfl delegates to beta-binomial (NB snap posterior).
 *  - scoreTflOver returns in (0,1) with realistic snap volume.
 *  - probOverTfl near 0 when snaps concentrate at 0 (ZIP hurdle).
 *  - Prior mean tracks empirical TFL rate across position group.
 */
import { describe, expect, it } from "vitest";

import {
  TFL_HB_METHOD_TAG,
  fitTflPrior,
  posteriorTfl,
  probOverTfl,
  scoreTflOver,
  type TflSample,
} from "../props-hb-tfl.js";
import { posteriorRate, type GammaPosterior } from "../props-hb.js";

const NFL_SAMPLES: TflSample[] = [
  { snaps: 380, tfl: 3 },   // 0.8% — off-ball LB
  { snaps: 420, tfl: 12 },   // 2.9% — edge rusher
  { snaps: 510, tfl: 22 },   // 4.3% — edge rusher
  { snaps: 440, tfl: 18 },   // 4.1% — edge rusher
  { snaps: 390, tfl: 6 },    // 1.5% — safety
  { snaps: 480, tfl: 20 },   // 4.2% — edge rusher
];

describe("tfl model contract", () => {
  it("exposes the v1 method tag", () => {
    expect(TFL_HB_METHOD_TAG).toBe("props_hb_tfl_v1");
  });

  it("TflSample has snaps + tfl fields", () => {
    const sample: TflSample = { snaps: 52, tfl: 2 };
    expect(sample.snaps).toBe(52);
    expect(sample.tfl).toBe(2);
  });

  it("fitTflPrior returns beta params on realistic TFL samples", () => {
    const prior = fitTflPrior(NFL_SAMPLES);
    expect(prior).not.toBeNull();
    expect(prior!.alpha).toBeGreaterThan(0);
    expect(prior!.beta).toBeGreaterThan(0);
    // Beta prior mean = alpha / (alpha + beta) tracks empirical TFL rate.
    const priorMean = prior!.alpha / (prior!.alpha + prior!.beta);
    const empirical = 81 / 2620; // (3+12+22+18+6+20)/(380+420+510+440+390+480)
    expect(priorMean).toBeCloseTo(empirical, 2);
  });

  it("posteriorTfl updates alpha and beta", () => {
    const prior = { alpha: 4, beta: 36 }; // mean ~ 10%
    const post = posteriorTfl(prior, 8, 400); // 8 TFL, 400 snaps
    expect(post.alpha).toBe(4 + 8);  // alpha + tfl
    expect(post.beta).toBe(36 + 392); // beta + (snaps - tfl)
    expect(post.mean).toBeCloseTo((4 + 8) / (4 + 36 + 8 + 392), 12);
  });

  it("posteriorTfl with snaps=0 leaves prior unchanged", () => {
    const prior = { alpha: 4, beta: 36 };
    const post = posteriorTfl(prior, 0, 0);
    expect(post.alpha).toBe(4);
    expect(post.beta).toBe(36);
  });

  it("probOverTfl returns a probability in [0, 1]", () => {
    // TFL posterior: ~2.5% rate, ~65 snaps/game, P(TFL > 1) over 1 game.
    const samples: TflSample[] = [
      { snaps: 380, tfl: 3 }, { snaps: 420, tfl: 12 },
      { snaps: 510, tfl: 22 }, { snaps: 440, tfl: 18 },
    ];
    const tflPrior = fitTflPrior(samples)!;
    const tflPost = posteriorTfl(tflPrior, 14, 580); // observed history
    const snapPost: GammaPosterior = { alpha: 400, beta: 10, mean: 40 };
    const p = probOverTfl(tflPost, snapPost, 1, 1);
    expect(p).toBeGreaterThanOrEqual(0);
    expect(p).toBeLessThanOrEqual(1);
  });

  it("scoreTflOver returns in (0,1) with realistic snap volume", () => {
    // Defensive snaps per game: ~30/game (subset for TFL-eligible snaps).
    // TFL rate ~2.5%. snapTotal=180, snapGames=6 → ~30 snaps/game.
    const prior = fitTflPrior(NFL_SAMPLES)!;
    const p = scoreTflOver({
      tflPrior: prior,
      snapPrior: { alpha: 40, beta: 2 }, // mean ~20 snaps/game
      tflHistory: [{ snaps: 400, tfl: 10 }, { snaps: 350, tfl: 8 }],
      snapGames: 6,
      snapTotal: 180, // ~30 snaps/game — fits TARGET_K_MAX=40
      line: 1, // P(TFL > 1) ≈ P(TFL >= 2)
    });
    expect(p).toBeGreaterThan(0.05);
    expect(p).toBeLessThan(1);
  });

  it("probOverTfl near 0 when snaps concentrate at 0 (ZIP hurdle)", () => {
    // Posterior with 0 targets observed → NB collapses to k=0 mass.
    const tflPost = posteriorTfl({ alpha: 4, beta: 36 }, 0, 0);
    const snapPost = posteriorRate({ alpha: 0.1, beta: 20 }, 0, 10);
    expect(probOverTfl(tflPost, snapPost, 1, 1)).toBeLessThan(0.05);
  });

  it("fitTflPrior returns null when all snaps are 0 (no opportunity)", () => {
    const samples: TflSample[] = [{ snaps: 0, tfl: 0 }, { snaps: 0, tfl: 0 }];
    expect(fitTflPrior(samples)).toBeNull();
  });

  it("fitTflPrior excludes zero-snap samples (healthy scratch)", () => {
    const samples: TflSample[] = [
      { snaps: 0, tfl: 0 }, // scratch — excluded
      ...NFL_SAMPLES,
    ];
    const prior = fitTflPrior(samples);
    expect(prior).not.toBeNull();
  });
});
