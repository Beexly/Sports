/**
 * Defensive snap share model tests (props-hb-def-snap-share).
 *
 * H1 Edge #4 — Defensive snap share %.
 *
 * Verifies:
 *  - Method tag.
 *  - DefSnapShareSample type shape.
 *  - fitDefSnapSharePrior returns Gamma prior on realistic snap data.
 *  - probOverDefSnapShare returns a probability in [0, 1].
 *  - probOverDefSnapShare handles 0 snaps → 0.
 *  - Edge case: healthy scratch (0 games) excluded from prior fit.
 */
import { describe, expect, it } from "vitest";

import {
  DEF_SNAP_SHARE_HB_METHOD_TAG,
  fitDefSnapSharePrior,
  posteriorDefSnapShare,
  probOverDefSnapShare,
  type DefSnapShareSample,
} from "../props-hb-def-snap-share.js";
import { fitGroupPrior } from "../props-hb.js";

describe("def snap share model contract", () => {
  it("exposes the v1 method tag", () => {
    expect(DEF_SNAP_SHARE_HB_METHOD_TAG).toBe("props_hb_def_snap_share_v1");
  });

  it("DefSnapShareSample has games + snaps fields", () => {
    const sample: DefSnapShareSample = { games: 8, snaps: 482 };
    expect(sample.games).toBe(8);
    expect(sample.snaps).toBe(482);
  });

  it("fitDefSnapSharePrior returns a Gamma prior on realistic snap data", () => {
    const samples: DefSnapShareSample[] = [
      { games: 16, snaps: 782 }, { games: 14, snaps: 590 },
      { games: 15, snaps: 633 }, { games: 12, snaps: 482 },
      { games: 13, snaps: 501 }, { games: 16, snaps: 715 },
    ];
    const prior = fitDefSnapSharePrior(samples);
    expect(prior).not.toBeNull();
    expect(prior!.alpha).toBeGreaterThan(0);
    expect(prior!.beta).toBeGreaterThan(0);
  });

  it("probOverDefSnapShare returns a probability in [0,1]", () => {
    const samples: DefSnapShareSample[] = [
      { games: 16, snaps: 782 }, { games: 14, snaps: 590 },
      { games: 15, snaps: 633 }, { games: 12, snaps: 482 },
      { games: 13, snaps: 501 }, { games: 16, snaps: 715 },
    ];
    const prior = fitDefSnapSharePrior(samples)!;
    const post = posteriorDefSnapShare(prior, 14, 620);
    const p = probOverDefSnapShare(post, 550);
    expect(p).toBeGreaterThanOrEqual(0);
    expect(p).toBeLessThanOrEqual(1);
  });

  it("probOverDefSnapShare: lower line → higher probability (monotonic)", () => {
    const samples: DefSnapShareSample[] = [
      { games: 16, snaps: 782 }, { games: 14, snaps: 590 },
      { games: 15, snaps: 633 }, { games: 12, snaps: 482 },
      { games: 13, snaps: 501 }, { games: 16, snaps: 715 },
    ];
    const prior = fitDefSnapSharePrior(samples)!;
    // Player averages ~44 snaps/game this season. Posterior shrinks toward group mean.
    const post = posteriorDefSnapShare(prior, 14, 620);
    const pBelow = probOverDefSnapShare(post, 30); // well below posterior mean (~45)
    const pAbove = probOverDefSnapShare(post, 60); // well above posterior mean
    expect(pBelow).toBeGreaterThan(pAbove);
    expect(pBelow).toBeGreaterThan(0.5);
    expect(pAbove).toBeLessThan(0.5);
  });

  it("fitDefSnapSharePrior returns null when all snaps are 0 (no opportunity)", () => {
    const samples = [{ games: 4, snaps: 0 }, { games: 3, snaps: 0 }];
    const prior = fitDefSnapSharePrior(samples);
    expect(prior).toBeNull();
  });

  it("fitDefSnapSharePrior excludes 0-game players from prior fit", () => {
    const samples: DefSnapShareSample[] = [
      { games: 0, snaps: 0 }, // healthy scratch — excluded
      { games: 16, snaps: 782 }, { games: 14, snaps: 590 },
      { games: 15, snaps: 633 }, { games: 12, snaps: 482 },
      { games: 13, snaps: 501 }, { games: 16, snaps: 715 },
    ];
    const prior = fitDefSnapSharePrior(samples);
    expect(prior).not.toBeNull();
  });
});
