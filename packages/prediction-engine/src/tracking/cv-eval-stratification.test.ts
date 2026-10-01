import { describe, expect, it } from "vitest";
import { stratifyEval } from "./cv-eval-stratification.js";
import { playerDetection } from "./cv-detector-contract.js";

describe("cv-eval-stratification (K3)", () => {
  it("exact fixture: one cell at recall 0.3333 / precision 1.0", () => {
    // Three overlapping gt boxes (high occlusion), all small/wide/sideline.
    const gt = [
      { x: 0, y: 0, width: 40, height: 20 },
      { x: 10, y: 0, width: 40, height: 20 },
      { x: 20, y: 0, width: 40, height: 20 },
    ];
    // One detection exactly on gt[0] → TP; gt[1], gt[2] → FN.
    const frames = [
      {
        detections: [playerDetection(0, 0, 40, 20, "KC")],
        groundTruth: gt,
        view: "sideline" as const,
      },
    ];
    const report = stratifyEval(frames, {
      sizeMedianArea: 1000, // all areas (800) < 1000 → small
      worstCellMinN: 1,
    });
    const cell = report.cells.find(
      (c) => c.key === "high-occlusion/small-box/wide-aspect/sideline/low-contrast",
    );
    expect(cell).toBeDefined();
    expect(cell!.tp).toBe(1);
    expect(cell!.fn).toBe(2);
    expect(cell!.fp).toBe(0);
    expect(cell!.recall).toBeCloseTo(0.3333, 4);
    expect(cell!.precision).toBe(1.0);
    expect(report.overall.recall).toBeCloseTo(0.3333, 4);
    expect(report.overall.precision).toBe(1.0);
  });

  it("IoU < 0.5 does not match (binding AWS criterion)", () => {
    const gt = [{ x: 0, y: 0, width: 40, height: 20 }];
    // Detection shifted 25px right: IoU = 15*20 / (800+800-300) = 300/1300 ≈ 0.23.
    const frames = [
      {
        detections: [playerDetection(25, 0, 40, 20, "KC")],
        groundTruth: gt,
        view: "sideline" as const,
      },
    ];
    const report = stratifyEval(frames, { sizeMedianArea: 1000, worstCellMinN: 1 });
    expect(report.overall.tp).toBe(0);
    expect(report.overall.fp).toBe(1);
    expect(report.overall.fn).toBe(1);
  });

  it("recommendation names the worst cell and a gather count", () => {
    const gt = [
      { x: 0, y: 0, width: 40, height: 20 },
      { x: 10, y: 0, width: 40, height: 20 },
      { x: 20, y: 0, width: 40, height: 20 },
    ];
    const frames = [
      {
        detections: [playerDetection(0, 0, 40, 20, "KC")],
        groundTruth: gt,
        view: "sideline" as const,
      },
    ];
    const report = stratifyEval(frames, { sizeMedianArea: 1000, worstCellMinN: 1 });
    expect(report.worstCells.length).toBeGreaterThan(0);
    expect(report.worstCells[0]!.recall).toBeCloseTo(0.3333, 4);
    expect(report.recommendation).toMatch(
      /gather \d+ more frames matching .*high-occlusion\/small-box\/wide-aspect\/sideline\/low-contrast/,
    );
  });

  it("empty eval set does not throw; 32 cells materialize", () => {
    const report = stratifyEval([]);
    expect(report.cells).toHaveLength(32);
    expect(report.worstCells).toHaveLength(0);
    expect(report.overall.tp).toBe(0);
    expect(typeof report.recommendation).toBe("string");
  });

  it("center-distance criterion (MDPI option) matches within 20px", () => {
    const gt = [{ x: 100, y: 100, width: 40, height: 20 }];
    // Center at (120,110); detection center at (130,110) → 10px < 20px.
    const frames = [
      {
        detections: [playerDetection(110, 100, 40, 20, "KC")],
        groundTruth: gt,
        view: "endzone" as const,
      },
    ];
    const report = stratifyEval(frames, {
      matchCriterion: { kind: "centerDistance", thresholdPx: 20 },
      sizeMedianArea: 1000,
      worstCellMinN: 1,
    });
    expect(report.overall.tp).toBe(1);
    expect(report.overall.fn).toBe(0);
  });
});
