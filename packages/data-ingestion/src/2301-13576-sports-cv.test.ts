/**
 * Tests for ./2301-13576-sports-cv (arXiv:2301.13576, lane=sports_cv).
 *
 * ACCEPTANCE GATE: The internal action benchmark is only useful iff it reproduces the paper's metric behavior: a
 * trivial baseline must score near chance on classification (validating task difficulty) and a strong
 * model must show the long-tail gap (per-class accuracy spread >= 30 points between head and tail
 * classes), mirroring the paper's 2021 74.2-vs-20.4 dynamic.
 */
import { describe, expect, it } from "vitest";
import * as mod from "./2301-13576-sports-cv";

describe("sports CV detection QA (arXiv:2301.13576)", () => {
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
