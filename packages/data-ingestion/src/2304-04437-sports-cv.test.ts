/**
 * Tests for ./2304-04437-sports-cv (arXiv:2304.04437, lane=sports_cv).
 *
 * ACCEPTANCE GATE: Ray-cast method must beat MeTRAbs by >=3 cm on 3D error AND >=8 deg on knee-angle error on the
 * synthetic football-field set (matching the paper's own margins: 10.33->6.41 cm, 20.31->9.91 deg)
 * with reprojection error <=3 px, before any real-broadcast pilot; if geometry-injection does not beat
 * MeTRAbs off-the-shelf by those margins, the extra pipeline complexity is unjustified.
 */
import { describe, expect, it } from "vitest";
import * as mod from "./2304-04437-sports-cv";

describe("sports CV detection QA (arXiv:2304.04437)", () => {
  it("computes IoU", () => {
    const b = { x1: 0, y1: 0, x2: 2, y2: 2 };
    expect(mod.iou(b, b)).toBeCloseTo(1, 10);
    expect(mod.iou(b, { x1: 5, y1: 5, x2: 6, y2: 6 })).toBeCloseTo(0, 10);
    // intersection 1, union 7
    expect(mod.iou(b, { x1: 1, y1: 1, x2: 3, y2: 3 })).toBeCloseTo(1 / 7, 6);
    expect(mod.iou({ x1: 0, y1: 0, x2: 0, y2: 2 }, b)).toBeNull();
  });

  it("suppresses overlapping duplicates", () => {
    const boxes = [
      { x1: 0, y1: 0, x2: 2, y2: 2, score: 0.9 },
      { x1: 0, y1: 0, x2: 2, y2: 2, score: 0.8 },
      { x1: 10, y1: 10, x2: 12, y2: 12, score: 0.7 },
    ];
    const kept = mod.nonMaxSuppression(boxes, 0.5)!;
    expect(kept).toHaveLength(2);
    expect(kept[0]!.score).toBe(0.9);
    expect(mod.nonMaxSuppression(boxes, 2)).toBeNull();
  });

  it("scores precision and recall by greedy matching", () => {
    const gt = [{ x1: 0, y1: 0, x2: 2, y2: 2 }];
    const dets = [
      { x1: 0, y1: 0, x2: 2, y2: 2, score: 0.9 },
      { x1: 10, y1: 10, x2: 12, y2: 12, score: 0.4 },
    ];
    const r = mod.precisionRecallAtIou(dets, gt, 0.5)!;
    expect(r.tp).toBe(1);
    expect(r.fp).toBe(1);
    expect(r.fn).toBe(0);
    expect(r.precision).toBeCloseTo(0.5, 10);
    expect(r.recall).toBeCloseTo(1, 10);
  });
});
