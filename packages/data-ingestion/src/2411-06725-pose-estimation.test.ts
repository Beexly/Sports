/**
 * Tests for ./2411-06725-pose-estimation (arXiv:2411.06725, lane=sports_cv).
 *
 * ACCEPTANCE GATE: Reimplementation must land within 2 mm of the paper's Protocol #2 values (CPN: 32.2 mm, GT: 22.3 mm) on Human3.6M, and each ablated component must reproduce the reported degradation pattern, before any GSE integration.
 */

import { describe, expect, it } from "vitest";
import * as mod from "./2411-06725-pose-estimation";

describe("2411-06725 GTA-Net: An IoT-Integrated 3D Human Pose", () => {
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
