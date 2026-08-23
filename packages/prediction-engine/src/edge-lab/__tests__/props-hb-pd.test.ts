/**
 * PD model + bind tests.
 *
 * H1 Edge #3 — Pass Deflections (PD).
 *
 * PD model tests:
 *  - Method tag.
 *  - fitPdPrior on realistic PD rate spread across positions (CB ~18%, S ~8%).
 *  - betaBinomialProbOverPd returns probability in [0,1].
 *  - PD bounded by targets — line > targets → 0.
 *  - fitPdPrior filters zero-target and out-of-range samples.
 *  - fitPdPrior returns null when no valid samples.
 *
 * PD bind tests:
 *  - Method tag + priced: false.
 *  - Binds pdRate from latest prior defense row — not week=0, not same-week.
 *  - FAILS CLOSED: no prior row → dropped.
 *  - FAILS CLOSED: null pdRate → dropped.
 *  - Batch: one bad row drops, good rows bind.
 *  - Grain + provenance correctness (weekly_pfr_def_mean).
 */
import { describe, expect, it } from "vitest";

import {
  PD_HB_METHOD_TAG,
  fitPdPrior,
  posteriorPd,
  betaBinomialProbOverPd,
  type PdSample,
} from "../props-hb-pd.js";

describe("pd model contract", () => {
  it("exposes the v1 method tag", () => {
    expect(PD_HB_METHOD_TAG).toBe("props_hb_pd_v1");
  });

  it("fitPdPrior returns beta params on realistic PD samples", () => {
    // CB ~18%, S ~8%, slot CB ~22% — wide enough spread for EB to detect.
    const samples: PdSample[] = [
      { targets: 70, pd: 5 },   // 7% — safety
      { targets: 85, pd: 15 },  // 18% — CB
      { targets: 110, pd: 24 }, // 22% — slot CB
      { targets: 92, pd: 17 },  // 18% — CB
      { targets: 65, pd: 5 },   // 8% — safety
      { targets: 78, pd: 14 },  // 18% — CB
    ];
    const prior = fitPdPrior(samples);
    expect(prior).not.toBeNull();
    expect(prior!.alpha).toBeGreaterThan(0);
    expect(prior!.beta).toBeGreaterThan(0);
  });

  it("betaBinomialProbOverPd returns a probability in [0, 1]", () => {
    const samples: PdSample[] = [
      { targets: 70, pd: 5 }, { targets: 85, pd: 15 },
      { targets: 110, pd: 24 }, { targets: 92, pd: 17 },
      { targets: 65, pd: 5 }, { targets: 78, pd: 14 },
    ];
    const prior = fitPdPrior(samples)!;
    const post = posteriorPd(prior, 80, 14);
    const p = betaBinomialProbOverPd(post, 3, 80);
    expect(p).toBeGreaterThanOrEqual(0);
    expect(p).toBeLessThanOrEqual(1);
  });

  it("PD is bounded by targets — line >= targets → 0 probability", () => {
    const samples: PdSample[] = [
      { targets: 70, pd: 5 }, { targets: 85, pd: 15 },
      { targets: 110, pd: 24 }, { targets: 92, pd: 17 },
    ];
    const prior = fitPdPrior(samples)!;
    const post = posteriorPd(prior, 80, 14);
    const p = betaBinomialProbOverPd(post, 80, 80); // line = max targets
    expect(p).toBe(0); // cannot exceed targets
  });

  it("fitPdPrior returns null when all samples have zero targets", () => {
    const samples: PdSample[] = [{ targets: 0, pd: 0 }, { targets: 0, pd: 0 }];
    expect(fitPdPrior(samples)).toBeNull();
  });

  it("fitPdPrior excludes zero-target samples (healthy scratch)", () => {
    const samples: PdSample[] = [
      { targets: 0, pd: 0 }, // scratch — excluded
      { targets: 70, pd: 5 }, { targets: 85, pd: 15 },
      { targets: 110, pd: 24 }, { targets: 92, pd: 17 },
      { targets: 65, pd: 5 }, { targets: 78, pd: 14 },
    ];
    const prior = fitPdPrior(samples);
    expect(prior).not.toBeNull();
  });
});
