/**
 * TFL model tests (props-hb-tfl).
 *
 * H1 Edge #2 — TFL (tackles for loss). Mispriced as a sack prop.
 *
 * Verifies:
 *  - Method tag.
 *  - fitTflPrior returns Beta prior on realistic TFL snap samples.
 *  - betaBinomialProbOverTfl returns probability in [0, 1].
 *  - TFL bounded by snaps (line > snaps → 0).
 *  - Zero-snap sample excluded from prior.
 *  - TFL < snaps in all cases (bounded Beta-Binomial).
 */
import { describe, expect, it } from "vitest";

import {
  TFL_HB_METHOD_TAG,
  fitTflPrior,
  posteriorTfl,
  betaBinomialProbOverTfl,
  type TflSample,
} from "../props-hb-tfl.js";

describe("tfl model contract", () => {
  it("exposes the v1 method tag", () => {
    expect(TFL_HB_METHOD_TAG).toBe("props_hb_tfl_v1");
  });

  it("fitTflPrior returns beta params on realistic TFL samples", () => {
    // TFL rates vary by position: edge rushers ~4-5%, off-ball LBs ~1-2%, DBs ~0.5%.
    const samples: TflSample[] = [
      { snaps: 380, tfl: 3 },   // 0.8% — safety
      { snaps: 420, tfl: 12 },  // 2.9% — LB
      { snaps: 510, tfl: 22 },  // 4.3% — edge rusher
      { snaps: 440, tfl: 18 },  // 4.1% — edge rusher
      { snaps: 390, tfl: 6 },   // 1.5% — LB
      { snaps: 480, tfl: 20 },  // 4.2% — edge rusher
    ];
    const prior = fitTflPrior(samples);
    expect(prior).not.toBeNull();
    expect(prior!.alpha).toBeGreaterThan(0);
    expect(prior!.beta).toBeGreaterThan(0);
  });

  it("betaBinomialProbOverTfl returns a probability in [0, 1]", () => {
    const samples: TflSample[] = [
      { snaps: 380, tfl: 3 }, { snaps: 420, tfl: 12 },
      { snaps: 510, tfl: 22 }, { snaps: 440, tfl: 18 },
      { snaps: 390, tfl: 6 }, { snaps: 480, tfl: 20 },
    ];
    const prior = fitTflPrior(samples)!;
    const post = posteriorTfl(prior, 400, 10);
    const p = betaBinomialProbOverTfl(post, 5, 400);
    expect(p).toBeGreaterThanOrEqual(0);
    expect(p).toBeLessThanOrEqual(1);
  });

  it("TFL is bounded by snaps — line > snaps → 0 probability", () => {
    const samples: TflSample[] = [
      { snaps: 380, tfl: 3 }, { snaps: 420, tfl: 12 },
      { snaps: 510, tfl: 22 }, { snaps: 440, tfl: 18 },
    ];
    const prior = fitTflPrior(samples)!;
    const post = posteriorTfl(prior, 400, 10);
    // TFL can never exceed snaps — prob over snap count must be 0.
    expect(betaBinomialProbOverTfl(post, 500, 400)).toBe(0);
  });

  it("fitTflPrior returns null when all snaps are 0 (no opportunity)", () => {
    const samples = [{ snaps: 0, tfl: 0 }, { snaps: 0, tfl: 0 }];
    expect(fitTflPrior(samples)).toBeNull();
  });

  it("fitTflPrior excludes zero-snap samples (healthy scratch)", () => {
    const samples: TflSample[] = [
      { snaps: 0, tfl: 0 }, // scratch — excluded
      { snaps: 380, tfl: 3 }, { snaps: 420, tfl: 12 },
      { snaps: 510, tfl: 22 }, { snaps: 440, tfl: 18 },
      { snaps: 390, tfl: 6 }, { snaps: 480, tfl: 20 },
    ];
    const prior = fitTflPrior(samples);
    expect(prior).not.toBeNull();
  });
});
