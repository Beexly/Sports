/**
 * Tests for ./2503-07499-pose-estimation (arXiv:2503.07499, lane=sports_cv).
 *
 * ACCEPTANCE GATE: GSE's NFL fine-tuned lifter must reach P-MPJPE ≤ 35 mm on a held-out NFL broadcast clip set (matching the paper's best 29.91 mm regime) AND joint-angle waveform correlation r ≥ 0.8 against any available ground truth before GSE uses pose-derived kinematics in any product or published analysis.
 */

import { describe, expect, it } from "vitest";
import * as mod from "./2503-07499-pose-estimation";

describe("2503-07499 AthletePose3D: A Benchmark Dataset for 3D", () => {
  it("mpjpe is 0 for identical poses and 5 for a 3-4-0 offset", () => {
    expect(mod.mpjpe([[0, 0, 0]], [[0, 0, 0]])).toBeCloseTo(0, 10);
    expect(mod.mpjpe([[0, 0, 0]], [[3, 4, 0]])).toBeCloseTo(5, 10);
    expect(mod.mpjpe([[0, 0]], [[0, 0, 0]])).toBeNull();
  });
  it("bone-length error is 0 when priors match exactly", () => {
    const r = mod.boneLengthError([[0, 0, 0], [3, 4, 0]], [[0, 1]], [5])!;
    expect(r.meanErrMm).toBeCloseTo(0, 10);
    expect(r.maxErrMm).toBeCloseTo(0, 10);
    expect(mod.boneLengthError([[0, 0, 0]], [[0, 1]], [5])).toBeNull();
  });
  it("temporal smoothing interpolates between raw and frozen", () => {
    const raw: number[][] = [[0], [10], [20]];
    const id = mod.temporalSmooth(raw, 1)!;
    expect(id[2]![0]).toBeCloseTo(20, 10);
    const frozen = mod.temporalSmooth(raw, 0)!;
    expect(frozen[2]![0]).toBeCloseTo(0, 10);
    const half = mod.temporalSmooth(raw, 0.5)!;
    expect(half[1]![0]).toBeCloseTo(5, 10);
    expect(mod.temporalSmooth(raw, 2)).toBeNull();
  });
});
